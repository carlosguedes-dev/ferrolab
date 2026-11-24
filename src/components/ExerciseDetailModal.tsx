import React, { useState } from 'react';
import {
  AlertTriangle,
  Bookmark,
  CheckCircle2,
  RefreshCw,
  Sliders,
  X,
} from 'lucide-react';
import type { ExerciseTemplate, OneRMFormula } from '../types/workout';
import { AnatomyIllustration } from './AnatomyIllustration';
import { calculate1RM, formatKg } from '../engines/calculations';

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

  // Estado interativo da calculadora 1RM na aba 1RM
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
    onUpdateExercise({
      ...exercise,
      name: clean,
      substitutions: nextSubs,
    });
    setEditName(clean);
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={`Detalhes de ${exercise.name}`}>
      <div className="modal-sheet">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <div>
            <span className="pill pill-volt" style={{ marginBottom: 6 }}>
              Exercício {exercise.orderLabel}
            </span>
            <h2 className="font-display" style={{ margin: 0, fontSize: 23, lineHeight: 1.15 }}>
              {exercise.name}
            </h2>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        {/* Sub-abas */}
        <div className="grid-3" style={{ margin: '14px 0' }}>
          <button
            type="button"
            className={`btn btn-sm ${tab === 'anatomy' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTab('anatomy')}
          >
            Anatomia
          </button>
          <button
            type="button"
            className={`btn btn-sm ${tab === '1rm' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTab('1rm')}
          >
            1RM & %
          </button>
          <button
            type="button"
            className={`btn btn-sm ${tab === 'edit' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTab('edit')}
          >
            Trocar / Ajustes
          </button>
        </div>

        {tab === 'anatomy' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <AnatomyIllustration
              diagram={exercise.anatomyDiagram}
              primaryMuscle={exercise.primaryMuscle}
              secondaryMuscles={exercise.secondaryMuscles}
            />

            <div
              style={{
                background: 'var(--accent-volt-dim)',
                border: '1px solid var(--border-volt)',
                borderRadius: 12,
                padding: '10px 12px',
                fontSize: 13,
                color: '#ECFFB3',
              }}
            >
              <strong>Foco chave:</strong> {exercise.techniqueCue}
            </div>

            <div>
              <div className="section-label" style={{ marginBottom: 6 }}>
                Execução correta passo a passo
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {exercise.executionSteps.map((step, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      gap: 8,
                      fontSize: 13.5,
                      color: 'var(--text-primary)',
                      background: '#0B0E14',
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <CheckCircle2 size={16} color="#C8FF2E" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="section-label" style={{ marginBottom: 6 }}>
                Postura & alinhamento
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text-secondary)', fontSize: 13 }}>
                {exercise.postureCues.map((cue, idx) => (
                  <li key={idx} style={{ marginBottom: 4 }}>
                    {cue}
                  </li>
                ))}
              </ul>
            </div>

            <div
              style={{
                display: 'flex',
                gap: 8,
                background: 'var(--accent-danger-dim)',
                border: '1px solid rgba(244,63,94,0.35)',
                borderRadius: 12,
                padding: '9px 11px',
                fontSize: 12.5,
                color: '#FECDD3',
              }}
            >
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>
                <strong>Erro comum a evitar:</strong> {exercise.commonMistake}
              </span>
            </div>

            {/* Anotação fixa do aparelho */}
            <div>
              <label className="section-label" htmlFor="machine-note-input" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Bookmark size={12} color="#22D3EE" />
                Anotação fixa do aparelho (altura do banco, pino, pegada)
              </label>
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <input
                  id="machine-note-input"
                  className="input"
                  placeholder="Ex.: Banco pino 3 · Trava coxa furo 5 · Pegada média"
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => onSaveMachineNote(noteDraft)}
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === '1rm' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {exercise.isIsometric ? (
              <div className="card" style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13.5 }}>
                  Exercício isométrico por tempo ({exercise.repMin}–{exercise.repMax}s). A estimativa de 1RM não se aplica a isometria — acompanhe a evolução pelo tempo sustentado e carga extra.
                </p>
              </div>
            ) : (
              <>
                <div className="grid-2">
                  <div>
                    <label className="section-label" htmlFor="rm-weight-in">
                      Carga (kg)
                    </label>
                    <input
                      id="rm-weight-in"
                      type="number"
                      inputMode="decimal"
                      className="input input-compact"
                      style={{ marginTop: 6 }}
                      value={calcWeight}
                      onChange={(e) => setCalcWeight(Math.max(0, Number(e.target.value) || 0))}
                    />
                  </div>
                  <div>
                    <label className="section-label" htmlFor="rm-reps-in">
                      Repetições
                    </label>
                    <input
                      id="rm-reps-in"
                      type="number"
                      inputMode="numeric"
                      className="input input-compact"
                      style={{ marginTop: 6 }}
                      value={calcReps}
                      onChange={(e) => setCalcReps(Math.max(1, Number(e.target.value) || 1))}
                    />
                  </div>
                </div>

                <div
                  className="card card-cyan"
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div>
                    <div className="section-label">1RM Estimado ({formula1RM === 'epley' ? 'Epley' : 'Brzycki'})</div>
                    <div className="font-mono" style={{ fontSize: 32, fontWeight: 800, color: 'var(--accent-cyan)' }}>
                      {formatKg(oneRM.selected)} kg
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-secondary)' }}>
                    <div>
                      Epley: <strong className="font-mono">{formatKg(oneRM.epley)} kg</strong>
                    </div>
                    <div>
                      Brzycki: <strong className="font-mono">{formatKg(oneRM.brzycki)} kg</strong>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="section-label" style={{ marginBottom: 6 }}>
                    Tabela de percentuais de referência
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {oneRM.percentages.map((row) => (
                      <div
                        key={row.percent}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: '#0B0E14',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 11,
                          padding: '10px 12px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span className="pill pill-cyan font-mono">{row.percent}%</span>
                          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                            {row.label}
                          </span>
                        </div>
                        <span className="font-mono" style={{ fontSize: 16, fontWeight: 800 }}>
                          {formatKg(row.weightKg)} kg
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'edit' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div className="section-label" style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                <RefreshCw size={12} color="#C8FF2E" />
                Substituições biomecânicas rápidas (1 toque)
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {exercise.substitutions.map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    className="btn btn-secondary btn-xs"
                    onClick={() => handleSwapExercise(sub)}
                  >
                    Trocar p/ {sub}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <input
                  className="input"
                  style={{ minHeight: 38, fontSize: 13 }}
                  placeholder="Ou digite outra variação..."
                  value={customSub}
                  onChange={(e) => setCustomSub(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
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

            <div className="divider" />

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sliders size={14} color="#22D3EE" />
              <span className="section-label">Editar parâmetros do exercício</span>
            </div>

            <div>
              <label className="section-label" htmlFor="edit-ex-name">Nome</label>
              <input
                id="edit-ex-name"
                className="input"
                style={{ marginTop: 4 }}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>

            <div className="grid-3">
              <div>
                <label className="section-label" htmlFor="edit-sets">Séries</label>
                <input
                  id="edit-sets"
                  type="number"
                  className="input input-compact"
                  style={{ marginTop: 4 }}
                  value={editSets}
                  onChange={(e) => setEditSets(Number(e.target.value) || 1)}
                />
              </div>
              <div>
                <label className="section-label" htmlFor="edit-rmin">
                  {exercise.isIsometric ? 'Seg mín' : 'Rep mín'}
                </label>
                <input
                  id="edit-rmin"
                  type="number"
                  className="input input-compact"
                  style={{ marginTop: 4 }}
                  value={editRepMin}
                  onChange={(e) => setEditRepMin(Number(e.target.value) || 1)}
                />
              </div>
              <div>
                <label className="section-label" htmlFor="edit-rmax">
                  {exercise.isIsometric ? 'Seg máx' : 'Rep máx'}
                </label>
                <input
                  id="edit-rmax"
                  type="number"
                  className="input input-compact"
                  style={{ marginTop: 4 }}
                  value={editRepMax}
                  onChange={(e) => setEditRepMax(Number(e.target.value) || 1)}
                />
              </div>
            </div>

            <div className="grid-2">
              <div>
                <label className="section-label" htmlFor="edit-rest">Descanso (s)</label>
                <input
                  id="edit-rest"
                  type="number"
                  step="15"
                  className="input input-compact"
                  style={{ marginTop: 4 }}
                  value={editRest}
                  onChange={(e) => setEditRest(Math.max(0, Number(e.target.value) || 0))}
                />
              </div>
              <div>
                <label className="section-label" htmlFor="edit-inc">Incremento carga</label>
                <select
                  id="edit-inc"
                  className="input"
                  style={{ marginTop: 4 }}
                  value={editIncrement}
                  onChange={(e) => setEditIncrement(Number(e.target.value))}
                >
                  <option value={1}>1 kg (Halteres / Polia)</option>
                  <option value={2}>2 kg (Barra / Máquina)</option>
                </select>
              </div>
            </div>

            <button type="button" className="btn btn-primary btn-block" onClick={handleSaveEdit}>
              Salvar alterações na ficha
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
