import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { AlertTriangle, Bookmark, CheckCircle2, RefreshCw, X } from 'lucide-react';
import type { ExerciseTemplate, OneRMFormula } from '../types/workout';
import { AnatomyIllustration } from './AnatomyIllustration';
import { calculate1RM, formatKg } from '../engines/calculations';
import { SegmentedControl, SheetModal, SubScreenSlide } from './MotionPrimitives';

interface ExerciseDetailModalProps {
  exercise: ExerciseTemplate;
  bestWeightKg: number;
  bestReps: number;
  formula1RM: OneRMFormula;
  machineNote: string;
  onSaveMachineNote: (note: string) => void;
  onUpdateExercise: (updated: ExerciseTemplate) => void;
  onClose: () => void;
}

export const ExerciseDetailModal: React.FC<ExerciseDetailModalProps> = ({
  exercise,
  bestWeightKg,
  bestReps,
  formula1RM,
  machineNote,
  onSaveMachineNote,
  onUpdateExercise,
  onClose,
}) => {
  const [tab, setTab] = useState<'anatomy' | '1rm' | 'edit'>('anatomy');
  const [noteDraft, setNoteDraft] = useState(machineNote);
  const [editName, setEditName] = useState(exercise.name);
  const [editSets, setEditSets] = useState(exercise.targetSets);
  const [editRepMin, setEditRepMin] = useState(exercise.repMin);
  const [editRepMax, setEditRepMax] = useState(exercise.repMax);
  const [editRest, setEditRest] = useState(exercise.restSeconds);
  const [editIncrement, setEditIncrement] = useState(exercise.loadIncrementKg);
  const [customSub, setCustomSub] = useState('');

  const [calcWeight, setCalcWeight] = useState(bestWeightKg > 0 ? bestWeightKg : 60);
  const [calcReps, setCalcReps] = useState(bestReps > 0 ? bestReps : exercise.repMax);
  const oneRM = calculate1RM(calcWeight, calcReps, formula1RM, exercise.loadIncrementKg);

  const handleSaveEdit = () => {
    const safeMin = Math.max(1, editRepMin);
    const safeMax = Math.max(safeMin, editRepMax);
    onUpdateExercise({
      ...exercise,
      name: editName.trim() || exercise.name,
      targetSets: Math.max(1, Math.min(10, editSets)),
      repMin: safeMin,
      repMax: safeMax,
      restSeconds: Math.max(0, editRest),
      restLabel:
        editRest === 0
          ? 'Sem descanso'
          : editRest >= 120 && editRest % 60 === 0
            ? `${editRest / 60} min`
            : `${editRest} s`,
      loadIncrementKg: editIncrement >= 2 ? 2 : 1,
    });
    onSaveMachineNote(noteDraft);
    onClose();
  };

  const handleSwapExercise = (newName: string) => {
    const clean = newName.trim();
    if (!clean) return;
    const prevName = exercise.name;
    const nextSubs = Array.from(
      new Set([prevName, ...exercise.substitutions.filter((s) => s !== clean)]),
    );
    onUpdateExercise({ ...exercise, name: clean, substitutions: nextSubs });
    setEditName(clean);
  };

  return (
    <SheetModal ariaLabel={`Detalhes de ${exercise.name}`} onClose={onClose}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
        <div>
          <div className="t-kicker t-mono" style={{ color: 'var(--volt)' }}>
            Exercício #{exercise.orderLabel} · {exercise.targetSets}×{exercise.repMin}–{exercise.repMax}
            {exercise.isIsometric ? 's' : ''}
          </div>
          <h2 className="t-title" style={{ fontSize: 20, marginTop: 4 }}>
            {exercise.name}
          </h2>
        </div>
        <button type="button" className="fl-icon-btn" onClick={onClose} aria-label="Fechar">
          <X size={18} />
        </button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <SegmentedControl
          id="ex-detail-tabs"
          variant="dark"
          value={tab}
          onChange={(v) => setTab(v as typeof tab)}
          options={[
            { value: 'anatomy', label: 'Anatomia' },
            { value: '1rm', label: '1RM & %' },
            { value: 'edit', label: 'Trocar / Ajustes' },
          ]}
        />
      </div>

      <AnimatePresence mode="wait">
        {tab === 'anatomy' && (
          <SubScreenSlide screenKey="anatomy">
            <AnatomyIllustration
              diagram={exercise.anatomyDiagram}
              primaryMuscle={exercise.primaryMuscle}
              secondaryMuscles={exercise.secondaryMuscles}
            />

            <div className="fl-card fl-card-compact" style={{ fontSize: 13, color: 'var(--ink-primary)' }}>
              <strong style={{ color: 'var(--volt)' }}>Foco:</strong> {exercise.techniqueCue}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="t-kicker">Execução</div>
              {exercise.executionSteps.map((step, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    gap: 9,
                    fontSize: 13,
                    color: 'var(--ink-secondary)',
                    background: 'var(--bg-canvas)',
                    padding: '10px 12px',
                    borderRadius: 12,
                  }}
                >
                  <CheckCircle2 size={15} color="var(--volt)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>{step}</span>
                </div>
              ))}
            </div>

            <div
              style={{
                display: 'flex',
                gap: 8,
                background: 'var(--rose-soft)',
                borderRadius: 12,
                padding: '10px 12px',
                fontSize: 12.5,
                color: '#fecdd3',
              }}
            >
              <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>
                <strong>Evite:</strong> {exercise.commonMistake}
              </span>
            </div>

            <div>
              <label className="t-kicker" htmlFor="machine-note-in" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Bookmark size={12} color="var(--cyan)" /> Anotação fixa do aparelho
              </label>
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <input
                  id="machine-note-in"
                  className="fl-input"
                  style={{ minHeight: 42, fontSize: 13.5 }}
                  placeholder="Ex.: Banco pino 3 · Trava coxa furo 5"
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                />
                <button
                  type="button"
                  className="fl-btn fl-btn-surface fl-btn-sm"
                  onClick={() => onSaveMachineNote(noteDraft)}
                >
                  Salvar
                </button>
              </div>
            </div>
          </SubScreenSlide>
        )}

        {tab === '1rm' && (
          <SubScreenSlide screenKey="1rm">
            {exercise.isIsometric ? (
              <div className="fl-card" style={{ textAlign: 'center', fontSize: 13.5, color: 'var(--ink-secondary)' }}>
                Exercício isométrico por tempo ({exercise.repMin}–{exercise.repMax}s). Acompanhe a evolução pelo tempo sustentado e carga extra.
              </div>
            ) : (
              <>
                <div className="fl-grid-2">
                  <div>
                    <label className="t-kicker" htmlFor="ex-rm-w">Carga (kg)</label>
                    <input
                      id="ex-rm-w"
                      type="number"
                      inputMode="decimal"
                      className="fl-input t-mono"
                      style={{ marginTop: 6, textAlign: 'center', fontWeight: 700, fontSize: 18 }}
                      value={calcWeight}
                      onChange={(e) => setCalcWeight(Math.max(0, Number(e.target.value) || 0))}
                    />
                  </div>
                  <div>
                    <label className="t-kicker" htmlFor="ex-rm-r">Reps</label>
                    <input
                      id="ex-rm-r"
                      type="number"
                      inputMode="numeric"
                      className="fl-input t-mono"
                      style={{ marginTop: 6, textAlign: 'center', fontWeight: 700, fontSize: 18 }}
                      value={calcReps}
                      onChange={(e) => setCalcReps(Math.max(1, Number(e.target.value) || 1))}
                    />
                  </div>
                </div>

                <div className="fl-card fl-card-compact" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div className="t-kicker">1RM ({formula1RM})</div>
                    <div className="t-mono" style={{ fontSize: 30, fontWeight: 700, color: 'var(--cyan)', marginTop: 2 }}>
                      {formatKg(oneRM.selected)} kg
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--ink-tertiary)' }}>
                    <div>Epley: <span className="t-mono" style={{ color: 'var(--ink-secondary)' }}>{formatKg(oneRM.epley)}</span></div>
                    <div>Brzycki: <span className="t-mono" style={{ color: 'var(--ink-secondary)' }}>{formatKg(oneRM.brzycki)}</span></div>
                  </div>
                </div>

                <div className="fl-list-group">
                  {oneRM.percentages.map((row) => (
                    <div key={row.percent} className="fl-list-row" style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className="fl-pill fl-pill-cyan t-mono">{row.percent}%</span>
                        <span style={{ fontSize: 13, color: 'var(--ink-secondary)' }}>{row.label}</span>
                      </div>
                      <span className="t-mono" style={{ fontSize: 15, fontWeight: 700 }}>
                        {formatKg(row.weightKg)} kg
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </SubScreenSlide>
        )}

        {tab === 'edit' && (
          <SubScreenSlide screenKey="edit">
            <div>
              <div className="t-kicker" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                <RefreshCw size={12} color="var(--volt)" /> Substituições rápidas
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {exercise.substitutions.map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    className="fl-btn fl-btn-surface fl-btn-xs"
                    onClick={() => handleSwapExercise(sub)}
                  >
                    Trocar p/ {sub}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input
                  className="fl-input"
                  style={{ minHeight: 40, fontSize: 13 }}
                  placeholder="Outra variação..."
                  value={customSub}
                  onChange={(e) => setCustomSub(e.target.value)}
                />
                <button
                  type="button"
                  className="fl-btn fl-btn-ghost fl-btn-sm"
                  onClick={() => {
                    if (customSub.trim()) {
                      handleSwapExercise(customSub);
                      setCustomSub('');
                    }
                  }}
                >
                  Trocar
                </button>
              </div>
            </div>

            <div className="fl-divider" style={{ margin: '4px 0' }} />

            <div>
              <label className="t-kicker" htmlFor="ed-name">Nome do exercício</label>
              <input id="ed-name" className="fl-input" style={{ marginTop: 6 }} value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>

            <div className="fl-grid-3">
              <div>
                <label className="t-kicker" htmlFor="ed-sets">Séries</label>
                <input id="ed-sets" type="number" className="fl-input t-mono" style={{ marginTop: 6, textAlign: 'center' }} value={editSets} onChange={(e) => setEditSets(Number(e.target.value) || 1)} />
              </div>
              <div>
                <label className="t-kicker" htmlFor="ed-rmin">{exercise.isIsometric ? 'Seg mín' : 'Rep mín'}</label>
                <input id="ed-rmin" type="number" className="fl-input t-mono" style={{ marginTop: 6, textAlign: 'center' }} value={editRepMin} onChange={(e) => setEditRepMin(Number(e.target.value) || 1)} />
              </div>
              <div>
                <label className="t-kicker" htmlFor="ed-rmax">{exercise.isIsometric ? 'Seg máx' : 'Rep máx'}</label>
                <input id="ed-rmax" type="number" className="fl-input t-mono" style={{ marginTop: 6, textAlign: 'center' }} value={editRepMax} onChange={(e) => setEditRepMax(Number(e.target.value) || 1)} />
              </div>
            </div>

            <div className="fl-grid-2">
              <div>
                <label className="t-kicker" htmlFor="ed-rest">Descanso (s)</label>
                <input id="ed-rest" type="number" step="15" className="fl-input t-mono" style={{ marginTop: 6, textAlign: 'center' }} value={editRest} onChange={(e) => setEditRest(Math.max(0, Number(e.target.value) || 0))} />
              </div>
              <div>
                <label className="t-kicker" htmlFor="ed-inc">Incremento</label>
                <select id="ed-inc" className="fl-input" style={{ marginTop: 6 }} value={editIncrement} onChange={(e) => setEditIncrement(Number(e.target.value))}>
                  <option value={1}>1 kg</option>
                  <option value={2}>2 kg</option>
                </select>
              </div>
            </div>

            <button type="button" className="fl-btn fl-btn-volt fl-btn-block" onClick={handleSaveEdit}>
              Salvar alterações na ficha
            </button>
          </SubScreenSlide>
        )}
      </AnimatePresence>
    </SheetModal>
  );
};
