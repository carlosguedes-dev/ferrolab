import React, { useState } from 'react';
import { X } from 'lucide-react';
import { calculateBarbellPlates, formatKg } from '../engines/calculations';
import { SheetModal } from './MotionPrimitives';

interface PlateCalculatorModalProps {
  initialWeightKg: number;
  defaultBarWeightKg: 10 | 12 | 20;
  availablePlatesKg: number[];
  exerciseName?: string;
  onClose: () => void;
}

const BAR_OPTIONS = [
  { weight: 20, label: '20 kg', sub: 'Olímpica' },
  { weight: 12, label: '12 kg', sub: 'Média' },
  { weight: 10, label: '10 kg', sub: 'Barra W' },
  { weight: 0, label: '0 kg', sub: 'Anilhas' },
];

export const PlateCalculatorModal: React.FC<PlateCalculatorModalProps> = ({
  initialWeightKg,
  defaultBarWeightKg,
  availablePlatesKg,
  exerciseName,
  onClose,
}) => {
  const [targetWeight, setTargetWeight] = useState<number>(initialWeightKg > 0 ? initialWeightKg : 60);
  const [barWeight, setBarWeight] = useState<number>(defaultBarWeightKg);
  const result = calculateBarbellPlates(targetWeight, barWeight, availablePlatesKg);

  const visualPlates: { weightKg: number; color: string; height: number }[] = [];
  for (const item of result.platesPerSide) {
    for (let i = 0; i < item.count; i++) {
      const h =
        item.weightKg >= 20 ? 74 : item.weightKg >= 15 ? 64 : item.weightKg >= 10 ? 56 : item.weightKg >= 5 ? 46 : 36;
      visualPlates.push({ weightKg: item.weightKg, color: item.color, height: h });
    }
  }

  return (
    <SheetModal ariaLabel="Calculadora de anilhas" onClose={onClose}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div className="t-kicker">{exerciseName ?? 'Montagem rápida'}</div>
          <h2 className="t-title" style={{ fontSize: 22, marginTop: 2 }}>
            Calculadora de Anilhas
          </h2>
        </div>
        <button type="button" className="fl-icon-btn" onClick={onClose} aria-label="Fechar">
          <X size={18} />
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button
          type="button"
          className="fl-btn fl-btn-surface fl-btn-sm t-mono"
          onClick={() => setTargetWeight((w) => Math.max(0, Number((w - 2.5).toFixed(2))))}
        >
          −2,5
        </button>
        <input
          type="number"
          inputMode="decimal"
          step="0.5"
          aria-label="Carga total desejada em kg"
          className="fl-input t-mono"
          style={{ textAlign: 'center', fontWeight: 700, fontSize: 20 }}
          value={targetWeight}
          onChange={(e) => setTargetWeight(Math.max(0, Number(e.target.value) || 0))}
        />
        <button
          type="button"
          className="fl-btn fl-btn-surface fl-btn-sm t-mono"
          onClick={() => setTargetWeight((w) => Number((w + 2.5).toFixed(2)))}
        >
          +2,5
        </button>
      </div>

      <div className="fl-grid-4" style={{ marginBottom: 16 }}>
        {BAR_OPTIONS.map((opt) => {
          const active = barWeight === opt.weight;
          return (
            <button
              key={opt.weight}
              type="button"
              onClick={() => setBarWeight(opt.weight)}
              style={{
                padding: '9px 4px',
                borderRadius: 13,
                background: active ? 'var(--volt-soft)' : 'var(--bg-canvas)',
                border: active ? '1px solid var(--volt-border)' : '1px solid var(--hairline)',
                textAlign: 'center',
              }}
            >
              <div className="t-mono" style={{ fontSize: 13.5, fontWeight: 700, color: active ? 'var(--volt)' : 'var(--ink-primary)' }}>
                {opt.label}
              </div>
              <div style={{ fontSize: 10, color: 'var(--ink-tertiary)', marginTop: 1 }}>{opt.sub}</div>
            </button>
          );
        })}
      </div>

      <div className="fl-card fl-card-compact" style={{ background: 'var(--bg-canvas)', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
          <span className="t-kicker">Cada lado</span>
          <span className="t-mono" style={{ fontSize: 24, fontWeight: 700, color: 'var(--volt)' }}>
            {formatKg(result.perSideWeightKg)} kg / lado
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', minHeight: 80, overflowX: 'auto' }}>
          <div style={{ width: 40, height: 11, background: 'linear-gradient(180deg,#94A3B8,#475569)', borderRadius: '4px 0 0 4px', flexShrink: 0 }} />
          <div style={{ width: 9, height: 26, background: '#CBD5E1', borderRadius: 3, marginRight: 4, flexShrink: 0 }} />
          {visualPlates.length === 0 ? (
            <div style={{ flex: 1, height: 15, background: '#334155', borderRadius: '0 4px 4px 0', display: 'flex', alignItems: 'center', paddingLeft: 10, fontSize: 11, color: '#CBD5E1' }}>
              Apenas barra ({barWeight} kg)
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                {visualPlates.map((p, idx) => (
                  <div
                    key={`${p.weightKg}-${idx}`}
                    style={{
                      width: p.weightKg >= 15 ? 24 : 20,
                      height: p.height,
                      background: p.color,
                      borderRadius: 6,
                      display: 'grid',
                      placeItems: 'center',
                      color: p.weightKg === 15 || p.weightKg === 5 ? '#07080B' : '#FFF',
                      fontSize: 10,
                      fontWeight: 800,
                      fontFamily: 'var(--font-mono)',
                      flexShrink: 0,
                    }}
                  >
                    {p.weightKg}
                  </div>
                ))}
              </div>
              <div style={{ flex: 1, minWidth: 26, height: 15, background: '#334155', borderRadius: '0 4px 4px 0', marginLeft: 3 }} />
            </>
          )}
        </div>

        {result.platesPerSide.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
            {result.platesPerSide.map((p) => (
              <span key={p.weightKg} className="fl-pill t-mono">
                <span style={{ width: 7, height: 7, borderRadius: 99, background: p.color }} />
                {p.count}× {formatKg(p.weightKg)} kg
              </span>
            ))}
          </div>
        )}

        <div className="fl-divider" style={{ margin: '12px 0 8px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-secondary)' }}>
          <span>Total montado: <strong className="t-mono">{formatKg(result.achievableWeightKg)} kg</strong></span>
          {!result.exactMatch && (
            <span style={{ color: 'var(--amber)' }}>
              dif. {result.differenceKg > 0 ? '-' : '+'}{formatKg(Math.abs(result.differenceKg))} kg
            </span>
          )}
        </div>
      </div>

      <button type="button" className="fl-btn fl-btn-volt fl-btn-block" onClick={onClose}>
        Pronto, voltar ao treino
      </button>
    </SheetModal>
  );
};
