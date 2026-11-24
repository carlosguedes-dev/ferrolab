import React, { useState } from 'react';
import { Disc, X } from 'lucide-react';
import { calculateBarbellPlates, formatKg } from '../engines/calculations';

interface PlateCalculatorModalProps {
  initialWeightKg: number;
  defaultBarWeightKg: 10 | 12 | 20;
  availablePlatesKg: number[];
  exerciseName?: string;
  onClose: () => void;
}

const BAR_OPTIONS: { weight: number; label: string; sub: string }[] = [
  { weight: 20, label: '20 kg', sub: 'Olímpica' },
  { weight: 12, label: '12 kg', sub: 'Média / W' },
  { weight: 10, label: '10 kg', sub: 'Compacta / W' },
  { weight: 0, label: '0 kg', sub: 'Só anilhas' },
];

export const PlateCalculatorModal: React.FC<PlateCalculatorModalProps> = ({
  initialWeightKg,
  defaultBarWeightKg,
  availablePlatesKg,
  exerciseName,
  onClose,
}) => {
  const [targetWeight, setTargetWeight] = useState<number>(
    initialWeightKg > 0 ? initialWeightKg : 60,
  );
  const [barWeight, setBarWeight] = useState<number>(defaultBarWeightKg);

  const result = calculateBarbellPlates(targetWeight, barWeight, availablePlatesKg);

  // Expande lista visual de discos por lado
  const visualPlates: { weightKg: number; color: string; height: number }[] = [];
  for (const item of result.platesPerSide) {
    for (let i = 0; i < item.count; i++) {
      const h =
        item.weightKg >= 20
          ? 74
          : item.weightKg >= 15
            ? 64
            : item.weightKg >= 10
              ? 56
              : item.weightKg >= 5
                ? 46
                : 36;
      visualPlates.push({ weightKg: item.weightKg, color: item.color, height: h });
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Calculadora de anilhas">
      <div className="modal-sheet">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: 'var(--accent-volt-dim)',
                border: '1px solid var(--border-volt)',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--accent-volt)',
              }}
            >
              <Disc size={20} />
            </div>
            <div>
              <h2 className="font-display" style={{ margin: 0, fontSize: 22, textTransform: 'uppercase' }}>
                Calculadora de Anilhas
              </h2>
              {exerciseName && (
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
                  {exerciseName}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            aria-label="Fechar calculadora de anilhas"
          >
            <X size={18} />
          </button>
        </div>

        {/* Carga total alvo */}
        <div style={{ marginBottom: 14 }}>
          <label className="section-label" htmlFor="plate-target-input">
            Carga total desejada (kg)
          </label>
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setTargetWeight((w) => Math.max(0, Number((w - 2.5).toFixed(2))))}
            >
              −2,5
            </button>
            <input
              id="plate-target-input"
              type="number"
              inputMode="decimal"
              step="0.5"
              min="0"
              className="input input-compact"
              value={targetWeight}
              onChange={(e) => setTargetWeight(Math.max(0, Number(e.target.value) || 0))}
            />
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setTargetWeight((w) => Number((w + 2.5).toFixed(2)))}
            >
              +2,5
            </button>
          </div>
        </div>

        {/* Seleção da barra */}
        <div style={{ marginBottom: 16 }}>
          <span className="section-label">Peso da barra</span>
          <div className="grid-4" style={{ marginTop: 6 }}>
            {BAR_OPTIONS.map((opt) => {
              const active = barWeight === opt.weight;
              return (
                <button
                  key={opt.weight}
                  type="button"
                  onClick={() => setBarWeight(opt.weight)}
                  style={{
                    padding: '8px 6px',
                    borderRadius: 12,
                    border: active
                      ? '1.5px solid var(--accent-volt)'
                      : '1px solid var(--border-subtle)',
                    background: active ? 'var(--accent-volt-dim)' : '#0B0E14',
                    textAlign: 'center',
                  }}
                >
                  <div
                    className="font-mono"
                    style={{
                      fontWeight: 700,
                      fontSize: 14,
                      color: active ? 'var(--accent-volt)' : 'var(--text-primary)',
                    }}
                  >
                    {opt.label}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{opt.sub}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Ilustração visual da ponta da barra (1 lado) */}
        <div
          style={{
            background: '#0A0D12',
            border: '1px solid var(--border-strong)',
            borderRadius: 16,
            padding: '16px 12px',
            marginBottom: 14,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 12,
            }}
          >
            <span className="section-label">Colocar em CADA LADO</span>
            <span className="font-mono" style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent-volt)' }}>
              {formatKg(result.perSideWeightKg)} kg / lado
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              minHeight: 82,
              overflowX: 'auto',
              paddingBottom: 4,
            }}
          >
            {/* Haste interna da barra */}
            <div
              style={{
                width: 44,
                height: 12,
                background: 'linear-gradient(180deg, #94A3B8, #475569)',
                borderRadius: '4px 0 0 4px',
                flexShrink: 0,
              }}
            />
            {/* Colarinho da manga */}
            <div
              style={{
                width: 10,
                height: 28,
                background: '#CBD5E1',
                borderRadius: 3,
                flexShrink: 0,
                marginRight: 4,
              }}
            />
            {/* Anilhas */}
            {visualPlates.length === 0 ? (
              <div
                style={{
                  flex: 1,
                  height: 16,
                  background: 'linear-gradient(180deg, #64748B, #334155)',
                  borderRadius: '0 4px 4px 0',
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: 10,
                  fontSize: 11,
                  color: '#E2E8F0',
                }}
              >
                Apenas a barra ({barWeight} kg)
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  {visualPlates.map((p, idx) => (
                    <div
                      key={`${p.weightKg}-${idx}`}
                      title={`${p.weightKg} kg`}
                      style={{
                        width: p.weightKg >= 15 ? 24 : 20,
                        height: p.height,
                        background: p.color,
                        borderRadius: 5,
                        border: '1px solid rgba(0,0,0,0.45)',
                        display: 'grid',
                        placeItems: 'center',
                        color: p.weightKg === 15 || p.weightKg === 5 ? '#0A0D12' : '#FFFFFF',
                        fontSize: 10,
                        fontWeight: 800,
                        fontFamily: 'var(--font-mono)',
                        flexShrink: 0,
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.28)',
                      }}
                    >
                      {p.weightKg}
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    flex: 1,
                    minWidth: 28,
                    height: 16,
                    background: 'linear-gradient(180deg, #64748B, #334155)',
                    borderRadius: '0 4px 4px 0',
                    marginLeft: 3,
                  }}
                />
              </>
            )}
          </div>

          {/* Lista textual clara das anilhas */}
          {result.platesPerSide.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
              {result.platesPerSide.map((p) => (
                <span
                  key={p.weightKg}
                  className="pill"
                  style={{
                    borderColor: p.color,
                    color: '#F1F5FB',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 99,
                      background: p.color,
                    }}
                  />
                  {p.count}× {formatKg(p.weightKg)} kg
                </span>
              ))}
            </div>
          )}

          <div
            style={{
              marginTop: 12,
              paddingTop: 10,
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 12,
              color: 'var(--text-secondary)',
            }}
          >
            <span>
              Total real montado:{' '}
              <strong className="font-mono" style={{ color: 'var(--text-primary)' }}>
                {formatKg(result.achievableWeightKg)} kg
              </strong>
            </span>
            {!result.exactMatch && (
              <span style={{ color: '#FBBF24' }}>
                Diferença: {result.differenceKg > 0 ? '-' : '+'}
                {formatKg(Math.abs(result.differenceKg))} kg
              </span>
            )}
          </div>
        </div>

        <button type="button" className="btn btn-primary btn-block" onClick={onClose}>
          Pronto, voltar ao treino
        </button>
      </div>
    </div>
  );
};
