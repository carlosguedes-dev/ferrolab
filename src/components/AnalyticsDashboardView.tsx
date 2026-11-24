import React, { useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import type {
  BodyWeightEntry,
  CardioLog,
  DeloadAlert,
  OneRMFormula,
  WorkoutDayTemplate,
  WorkoutSession,
} from '../types/workout';
import {
  buildBodyWeightSeries,
  buildConsistencyHeatmap,
  computeWeeklyMuscleVolume,
  getExerciseProgressSeries,
  getSessionTonnageSeries,
  getWeekStartISO,
} from '../engines/analytics';
import { formatKg, getTodayISO } from '../engines/calculations';
import { SegmentedControl, SheetModal, SubScreenSlide } from './MotionPrimitives';

interface AnalyticsDashboardViewProps {
  program: WorkoutDayTemplate[];
  sessions: WorkoutSession[];
  standaloneCardio: CardioLog[];
  bodyWeights: BodyWeightEntry[];
  formula1RM: OneRMFormula;
  deloadAlert: DeloadAlert;
  onAddBodyWeight: (entry: BodyWeightEntry) => void;
  onDeleteBodyWeight: (id: string) => void;
}

const DAY_BAR_COLORS: Record<WorkoutSession['workoutDayId'], string> = {
  'upper-a': '#CCFF00',
  'lower-a': '#38BDF8',
  'upper-b': '#FF622E',
  'lower-b': '#A78BFA',
};

export const AnalyticsDashboardView: React.FC<AnalyticsDashboardViewProps> = ({
  program,
  sessions,
  standaloneCardio,
  bodyWeights,
  formula1RM,
  deloadAlert,
  onAddBodyWeight,
  onDeleteBodyWeight,
}) => {
  const [subTab, setSubTab] = useState<'forca' | 'volume' | 'corpo' | 'ritmo'>('forca');

  const allExercises = useMemo(
    () =>
      program.flatMap((d) =>
        d.exercises
          .filter((e) => !e.isIsometric)
          .map((e) => ({ id: e.id, name: `${d.shortDay} · ${e.name}` })),
      ),
    [program],
  );

  const [selectedExId, setSelectedExId] = useState<string>(allExercises[0]?.id ?? 'supino-reto');
  const [activePointIdx, setActivePointIdx] = useState<number | null>(null);
  const [activeBarIdx, setActiveBarIdx] = useState<number | null>(null);
  const [activeBwIdx, setActiveBwIdx] = useState<number | null>(null);
  const [volumeView, setVolumeView] = useState<'week' | 'plan'>('week');
  const [bwSheetOpen, setBwSheetOpen] = useState(false);

  const [bwInput, setBwInput] = useState('');
  const [bwDate, setBwDate] = useState(getTodayISO());
  const [bwFasting, setBwFasting] = useState(true);

  const exSeries = useMemo(
    () => getExerciseProgressSeries(selectedExId, sessions, formula1RM),
    [selectedExId, sessions, formula1RM],
  );
  const tonnageSeries = useMemo(() => getSessionTonnageSeries(sessions), [sessions]);

  const latestWeekStart = useMemo(() => {
    if (sessions.length === 0) return getWeekStartISO(new Date());
    const sorted = [...sessions].sort((a, b) => b.finishedAt - a.finishedAt);
    const currentWeek = getWeekStartISO(new Date());
    return sorted.some((s) => getWeekStartISO(s.date) === currentWeek)
      ? currentWeek
      : getWeekStartISO(sorted[0].date);
  }, [sessions]);

  const weeklyVolume = useMemo(
    () => computeWeeklyMuscleVolume(sessions, program, latestWeekStart),
    [sessions, program, latestWeekStart],
  );

  const consistency = useMemo(
    () => buildConsistencyHeatmap(sessions, standaloneCardio, 8),
    [sessions, standaloneCardio],
  );

  const bwSeries = useMemo(
    () => buildBodyWeightSeries(bodyWeights, sessions, standaloneCardio),
    [bodyWeights, sessions, standaloneCardio],
  );

  const selectedExPoint =
    exSeries.length > 0
      ? exSeries[activePointIdx !== null && activePointIdx < exSeries.length ? activePointIdx : exSeries.length - 1]
      : null;

  const selectedBar =
    tonnageSeries.length > 0
      ? tonnageSeries[activeBarIdx !== null && activeBarIdx < tonnageSeries.length ? activeBarIdx : tonnageSeries.length - 1]
      : null;

  const selectedBwPoint =
    bwSeries.length > 0
      ? bwSeries[activeBwIdx !== null && activeBwIdx < bwSeries.length ? activeBwIdx : bwSeries.length - 1]
      : null;

  const handleSaveWeight = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(bwInput.replace(',', '.'));
    if (!Number.isFinite(num) || num < 25 || num > 300) return;
    onAddBodyWeight({
      id: `bw-${Date.now()}`,
      date: bwDate || getTodayISO(),
      weightKg: Number(num.toFixed(1)),
      fasting: bwFasting,
    });
    setBwInput('');
    setBwSheetOpen(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <div className="t-kicker">Desempenho & recomposição</div>
        <h1 className="t-title" style={{ marginTop: 4 }}>
          Evolução
        </h1>
      </div>

      {/* 4 Telas Separadas com transição suave (zero sobrecarga visual!) */}
      <SegmentedControl
        id="analytics-tabs"
        value={subTab}
        onChange={(v) => setSubTab(v as typeof subTab)}
        options={[
          { value: 'forca', label: 'Força' },
          { value: 'volume', label: 'Volume' },
          { value: 'corpo', label: 'Corpo' },
          { value: 'ritmo', label: 'Ritmo' },
        ]}
      />

      <AnimatePresence mode="wait">
        {/* SUB-TELA 1: FORÇA (1RM & CARGA MÁXIMA) */}
        {subTab === 'forca' && (
          <SubScreenSlide screenKey="forca">
            <select
              aria-label="Selecionar exercício para gráfico de 1RM"
              className="fl-input"
              style={{ fontSize: 13.5 }}
              value={selectedExId}
              onChange={(e) => {
                setSelectedExId(e.target.value);
                setActivePointIdx(null);
              }}
            >
              {allExercises.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name}
                </option>
              ))}
            </select>

            <div className="fl-card">
              <div className="t-kicker">Evolução do 1RM & Carga Máxima</div>
              {selectedExPoint ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', margin: '10px 0 18px' }}>
                  <div>
                    <div className="t-mono" style={{ fontSize: 34, fontWeight: 700, color: 'var(--cyan)', lineHeight: 1 }}>
                      {formatKg(selectedExPoint.estimated1RM)} <span style={{ fontSize: 15, color: 'var(--ink-secondary)' }}>kg</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-tertiary)', marginTop: 4 }}>
                      1RM estimado ({formula1RM}) · {selectedExPoint.label}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="t-mono" style={{ fontSize: 20, fontWeight: 700, color: 'var(--volt)' }}>
                      {formatKg(selectedExPoint.maxWeightKg)} kg
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-tertiary)' }}>Carga máx</div>
                  </div>
                </div>
              ) : (
                <p className="t-subtitle" style={{ marginTop: 12 }}>
                  Registre treinos deste exercício para visualizar a evolução de 1RM e carga máxima.
                </p>
              )}

              {exSeries.length > 0 && (
                <>
                  <DualLineSvgChart
                    data={exSeries}
                    activeIdx={activePointIdx}
                    onSelectIdx={setActivePointIdx}
                  />
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 18, marginTop: 12, fontSize: 11.5, color: 'var(--ink-tertiary)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 10, height: 3, borderRadius: 99, background: 'var(--cyan)' }} />
                      1RM estimado
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 10, height: 3, borderRadius: 99, background: 'var(--volt)' }} />
                      Carga máxima
                    </span>
                  </div>
                </>
              )}
            </div>
          </SubScreenSlide>
        )}

        {/* SUB-TELA 2: VOLUME (MEDIDOR 10–20 SÉRIES + TONELAGEM) */}
        {subTab === 'volume' && (
          <SubScreenSlide screenKey="volume">
            <div className="fl-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <div className="t-kicker">Meta 10 a 20 séries/sem</div>
                  <h2 style={{ margin: '3px 0 0', fontSize: 18, fontWeight: 700 }}>
                    Séries Válidas por Grupo Muscular
                  </h2>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    type="button"
                    className={`fl-btn fl-btn-xs ${volumeView === 'week' ? 'fl-btn-volt' : 'fl-btn-ghost'}`}
                    onClick={() => setVolumeView('week')}
                  >
                    Semana
                  </button>
                  <button
                    type="button"
                    className={`fl-btn fl-btn-xs ${volumeView === 'plan' ? 'fl-btn-volt' : 'fl-btn-ghost'}`}
                    onClick={() => setVolumeView('plan')}
                  >
                    Meta Ficha
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {weeklyVolume.items.map((item) => {
                  const val = volumeView === 'week' ? item.completedSets : item.plannedSets;
                  const pct = Math.min(100, (val / 20) * 100);
                  const inTarget = val >= item.minTarget && val <= item.maxTarget;

                  return (
                    <div key={item.muscle}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                        <span style={{ fontWeight: 600 }}>{item.label}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="t-mono" style={{ fontWeight: 700, color: inTarget ? 'var(--emerald)' : 'var(--ink-primary)' }}>
                            {volumeView === 'week' ? `${item.completedSets}/${item.plannedSets}` : `${item.plannedSets}`}
                          </span>
                          <span style={{ fontSize: 10.5, color: inTarget ? 'var(--emerald)' : 'var(--ink-tertiary)' }}>
                            {inTarget ? '10–20 OK' : `meta ${item.plannedSets}`}
                          </span>
                        </div>
                      </div>
                      <div
                        style={{
                          position: 'relative',
                          height: 7,
                          borderRadius: 99,
                          background: 'var(--bg-canvas)',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            left: '50%',
                            right: 0,
                            top: 0,
                            bottom: 0,
                            background: 'rgba(52, 211, 153, 0.1)',
                            borderLeft: '1px dashed rgba(52, 211, 153, 0.45)',
                          }}
                        />
                        <div
                          style={{
                            position: 'relative',
                            height: '100%',
                            width: `${pct}%`,
                            borderRadius: 99,
                            background: item.color,
                            transition: 'width 0.35s ease',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="fl-divider" />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-tertiary)' }}>
                <span>Adutores (auxiliar Quarta 5A)</span>
                <span className="t-mono">
                  {weeklyVolume.adductorsCompleted}/{weeklyVolume.adductorsPlanned} séries
                </span>
              </div>
            </div>

            {/* Tonelagem por sessão */}
            <div className="fl-card">
              <div className="t-kicker">Volume Total (Tonelagem) por Sessão</div>
              {selectedBar ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '8px 0 14px' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{selectedBar.workoutTitle.split('—')[0]}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>
                      {selectedBar.label} · {selectedBar.validSets} séries
                    </div>
                  </div>
                  <div className="t-mono" style={{ fontSize: 22, fontWeight: 700, color: DAY_BAR_COLORS[selectedBar.workoutDayId] }}>
                    {selectedBar.tonnageKg.toLocaleString('pt-BR')} kg
                  </div>
                </div>
              ) : (
                <p className="t-subtitle" style={{ marginTop: 10 }}>
                  Finalize sessões para acompanhar sua tonelagem total.
                </p>
              )}

              {tonnageSeries.length > 0 && (
                <TonnageBarSvgChart
                  data={tonnageSeries}
                  activeIdx={activeBarIdx}
                  onSelectIdx={setActiveBarIdx}
                />
              )}
            </div>
          </SubScreenSlide>
        )}

        {/* SUB-TELA 3: CORPO (PESO EM JEJUM + CARDIO + DELOAD) */}
        {subTab === 'corpo' && (
          <SubScreenSlide screenKey="corpo">
            <div className="fl-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
                <div>
                  <div className="t-kicker">Peso Corporal em Jejum + Treino & Cardio</div>
                  {selectedBwPoint ? (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 6 }}>
                      <span className="t-mono" style={{ fontSize: 32, fontWeight: 700, lineHeight: 1 }}>
                        {formatKg(selectedBwPoint.weightKg)} kg
                      </span>
                      <span className="t-mono" style={{ fontSize: 12.5, color: 'var(--cyan)' }}>
                        média 7d: {formatKg(selectedBwPoint.movingAvg7d)}
                      </span>
                    </div>
                  ) : (
                    <p className="t-subtitle" style={{ marginTop: 6 }}>
                      Registre seu peso em jejum para acompanhar a tendência de corte.
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  className="fl-btn fl-btn-volt fl-btn-xs"
                  onClick={() => setBwSheetOpen(true)}
                >
                  <Plus size={14} /> Peso
                </button>
              </div>

              {bwSeries.length > 0 && (
                <>
                  <BodyWeightSvgChart
                    data={bwSeries}
                    activeIdx={activeBwIdx}
                    onSelectIdx={setActiveBwIdx}
                  />
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginTop: 10, fontSize: 11, color: 'var(--ink-tertiary)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 9, height: 3, background: 'var(--cyan)' }} /> Média 7d
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 7, height: 5, borderRadius: 2, background: 'var(--volt)' }} /> Treino
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--ember)' }} /> Cardio
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Monitor de Fadiga & Deload */}
            <div className="fl-card fl-card-compact" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              {deloadAlert.shouldDeload ? (
                <AlertTriangle size={19} color="var(--amber)" style={{ flexShrink: 0, marginTop: 2 }} />
              ) : (
                <CheckCircle2 size={19} color="var(--emerald)" style={{ flexShrink: 0, marginTop: 2 }} />
              )}
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {deloadAlert.shouldDeload ? 'Alerta de Deload Ativo' : 'Fadiga & Recuperação'}
                </div>
                <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--ink-secondary)' }}>
                  {deloadAlert.summary}
                </p>
              </div>
            </div>

            {/* Últimas pesagens */}
            {bodyWeights.length > 0 && (
              <div className="fl-list-group">
                {[...bodyWeights]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .slice(0, 6)
                  .map((b) => (
                    <div key={b.id} className="fl-list-row" style={{ padding: '12px 16px' }}>
                      <div>
                        <span className="t-mono" style={{ fontSize: 13.5, fontWeight: 600 }}>
                          {b.date.split('-').reverse().join('/')}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--ink-tertiary)', marginLeft: 8 }}>
                          {b.fasting ? 'Jejum' : 'Alimentado'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span className="t-mono" style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--cyan)' }}>
                          {formatKg(b.weightKg)} kg
                        </span>
                        <button
                          type="button"
                          onClick={() => onDeleteBodyWeight(b.id)}
                          aria-label={`Remover pesagem ${b.date}`}
                          style={{ color: 'var(--ink-tertiary)' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </SubScreenSlide>
        )}

        {/* SUB-TELA 4: RITMO (MAPA DE CONSISTÊNCIA SEMANAL) */}
        {subTab === 'ritmo' && (
          <SubScreenSlide screenKey="ritmo">
            <div className="fl-grid-3">
              <div className="fl-card fl-card-compact" style={{ textAlign: 'center' }}>
                <div className="t-kicker">Aderência</div>
                <div className="t-mono" style={{ fontSize: 24, fontWeight: 700, color: 'var(--volt)', marginTop: 4 }}>
                  {consistency.weeklyAdherencePct}%
                </div>
              </div>
              <div className="fl-card fl-card-compact" style={{ textAlign: 'center' }}>
                <div className="t-kicker">Semana</div>
                <div className="t-mono" style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>
                  {consistency.currentWeekCount}/4
                </div>
              </div>
              <div className="fl-card fl-card-compact" style={{ textAlign: 'center' }}>
                <div className="t-kicker">Cardios</div>
                <div className="t-mono" style={{ fontSize: 24, fontWeight: 700, color: '#ff8c66', marginTop: 4 }}>
                  {consistency.totalCardioDays}
                </div>
              </div>
            </div>

            <div className="fl-card">
              <div className="t-kicker" style={{ marginBottom: 14 }}>
                Mapa de Consistência Semanal (8 semanas)
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: 6,
                  textAlign: 'center',
                  fontSize: 11,
                  color: 'var(--ink-tertiary)',
                  marginBottom: 8,
                }}
              >
                {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((l, i) => (
                  <span key={i} style={{ fontWeight: i >= 1 && i <= 4 ? 700 : 400 }}>
                    {l}
                  </span>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
                {consistency.cells.map((cell) => {
                  let bg = 'var(--bg-canvas)';
                  if (cell.hasWorkout && cell.hasCardio) {
                    bg = 'linear-gradient(135deg, #CCFF00, #FF622E)';
                  } else if (cell.hasWorkout) {
                    bg = '#CCFF00';
                  } else if (cell.hasCardio) {
                    bg = 'rgba(255, 98, 46, 0.72)';
                  }

                  return (
                    <div
                      key={cell.date}
                      title={`${cell.date}${cell.workoutTitle ? ` · ${cell.workoutTitle}` : ''}`}
                      style={{
                        height: 26,
                        borderRadius: 8,
                        background: bg,
                        border: cell.isToday
                          ? '2px solid var(--cyan)'
                          : '1px solid var(--hairline)',
                      }}
                    />
                  );
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 14, fontSize: 11, color: 'var(--ink-tertiary)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: 'var(--volt)' }} /> Musculação
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: 'var(--ember)' }} /> Cardio
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: 'linear-gradient(135deg,#CCFF00,#FF622E)' }} /> Ambos
                </span>
              </div>
            </div>
          </SubScreenSlide>
        )}
      </AnimatePresence>

      {/* Sheet de Lançar Peso Corporal */}
      <AnimatePresence>
        {bwSheetOpen && (
          <SheetModal ariaLabel="Lançar peso corporal" onClose={() => setBwSheetOpen(false)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <div className="t-kicker">Controle de corte</div>
                <h3 className="t-title" style={{ fontSize: 21, marginTop: 2 }}>
                  Nova Pesagem
                </h3>
              </div>
              <button type="button" className="fl-icon-btn" onClick={() => setBwSheetOpen(false)} aria-label="Fechar">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveWeight} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="fl-grid-2">
                <div>
                  <label className="t-kicker" htmlFor="bw-modal-kg">Peso (kg)</label>
                  <input
                    id="bw-modal-kg"
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    placeholder="84.2"
                    aria-label="Peso corporal em kg"
                    className="fl-input t-mono"
                    style={{ marginTop: 6, textAlign: 'center', fontWeight: 700, fontSize: 18 }}
                    value={bwInput}
                    onChange={(e) => setBwInput(e.target.value)}
                  />
                </div>
                <div>
                  <label className="t-kicker" htmlFor="bw-modal-date">Data</label>
                  <input
                    id="bw-modal-date"
                    type="date"
                    className="fl-input"
                    style={{ marginTop: 6 }}
                    value={bwDate}
                    onChange={(e) => setBwDate(e.target.value)}
                  />
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-secondary)' }}>
                <input
                  type="checkbox"
                  checked={bwFasting}
                  onChange={(e) => setBwFasting(e.target.checked)}
                  style={{ accentColor: 'var(--volt)' }}
                />
                Em jejum matinal
              </label>

              <button type="submit" className="fl-btn fl-btn-volt fl-btn-block">
                Lançar
              </button>
            </form>
          </SheetModal>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// GRÁFICOS SVG REFINADOS (MINIMALISTAS COM GRADIENTE SUTIL)
// ============================================================================

const DualLineSvgChart: React.FC<{
  data: ReturnType<typeof getExerciseProgressSeries>;
  activeIdx: number | null;
  onSelectIdx: (i: number) => void;
}> = ({ data, activeIdx, onSelectIdx }) => {
  const width = 420;
  const height = 180;
  const padL = 36;
  const padR = 14;
  const padT = 14;
  const padB = 26;

  const allVals = data.flatMap((d) => [d.estimated1RM, d.maxWeightKg]);
  const minVal = Math.max(0, Math.floor(Math.min(...allVals) * 0.92));
  const maxVal = Math.ceil(Math.max(...allVals) * 1.06) || 100;
  const span = Math.max(1, maxVal - minVal);

  const xFor = (i: number) =>
    data.length === 1
      ? (padL + width - padR) / 2
      : padL + (i / (data.length - 1)) * (width - padL - padR);
  const yFor = (v: number) => padT + ((maxVal - v) / span) * (height - padT - padB);

  const path1RM = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(d.estimated1RM).toFixed(1)}`)
    .join(' ');
  const area1RM = `${path1RM} L ${xFor(data.length - 1).toFixed(1)} ${height - padB} L ${xFor(0).toFixed(1)} ${height - padB} Z`;
  const pathMax = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(d.maxWeightKg).toFixed(1)}`)
    .join(' ');

  const highlighted = activeIdx !== null ? activeIdx : data.length - 1;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="Curva de 1RM e carga máxima">
      <defs>
        <linearGradient id="cyanArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((t) => {
        const y = padT + t * (height - padT - padB);
        return (
          <g key={t}>
            <line x1={padL} y1={y} x2={width - padR} y2={y} stroke="rgba(255,255,255,0.05)" />
            <text x={padL - 8} y={y + 4} textAnchor="end" fill="#606A7C" fontSize="10" fontFamily="JetBrains Mono">
              {Math.round(maxVal - t * span)}
            </text>
          </g>
        );
      })}

      <path d={area1RM} fill="url(#cyanArea)" />
      <path d={path1RM} fill="none" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d={pathMax} fill="none" stroke="#CCFF00" strokeWidth="2" strokeDasharray="4 4" strokeLinecap="round" />

      {data.map((d, i) => {
        const cx = xFor(i);
        const isSel = i === highlighted;
        return (
          <g key={d.date + i} onClick={() => onSelectIdx(i)} style={{ cursor: 'pointer' }}>
            <circle cx={cx} cy={yFor(d.estimated1RM)} r={isSel ? 5.5 : 3.2} fill="#38BDF8" stroke="#111319" strokeWidth="2" />
            <circle cx={cx} cy={yFor(d.maxWeightKg)} r={isSel ? 4.8 : 2.8} fill="#CCFF00" stroke="#111319" strokeWidth="2" />
            <text x={cx} y={height - 6} textAnchor="middle" fill={isSel ? '#F5F7FB' : '#606A7C'} fontSize="10" fontFamily="JetBrains Mono">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

const TonnageBarSvgChart: React.FC<{
  data: ReturnType<typeof getSessionTonnageSeries>;
  activeIdx: number | null;
  onSelectIdx: (i: number) => void;
}> = ({ data, activeIdx, onSelectIdx }) => {
  const width = 420;
  const height = 165;
  const padL = 40;
  const padR = 8;
  const padT = 12;
  const padB = 26;

  const maxVal = Math.max(...data.map((d) => d.tonnageKg), 1000);
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const barSlot = plotW / Math.max(1, data.length);
  const barW = Math.min(24, Math.max(9, barSlot * 0.56));
  const highlighted = activeIdx !== null ? activeIdx : data.length - 1;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="Tonelagem por sessão">
      {[0, 0.5, 1].map((t) => {
        const y = padT + t * plotH;
        const val = Math.round(maxVal * (1 - t));
        return (
          <g key={t}>
            <line x1={padL} y1={y} x2={width - padR} y2={y} stroke="rgba(255,255,255,0.05)" />
            <text x={padL - 8} y={y + 4} textAnchor="end" fill="#606A7C" fontSize="9.5" fontFamily="JetBrains Mono">
              {val >= 1000 ? `${(val / 1000).toFixed(1)}t` : val}
            </text>
          </g>
        );
      })}

      {data.map((d, i) => {
        const h = Math.max(4, (d.tonnageKg / maxVal) * plotH);
        const x = padL + i * barSlot + (barSlot - barW) / 2;
        const y = padT + plotH - h;
        const isSel = i === highlighted;
        return (
          <g key={d.id} onClick={() => onSelectIdx(i)} style={{ cursor: 'pointer' }}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={h}
              rx="6"
              fill={DAY_BAR_COLORS[d.workoutDayId]}
              opacity={isSel ? 1 : 0.45}
            />
            {(data.length <= 8 || i % 2 === 0 || isSel) && (
              <text x={x + barW / 2} y={height - 6} textAnchor="middle" fill={isSel ? '#F5F7FB' : '#606A7C'} fontSize="9.5" fontFamily="JetBrains Mono">
                {d.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
};

const BodyWeightSvgChart: React.FC<{
  data: ReturnType<typeof buildBodyWeightSeries>;
  activeIdx: number | null;
  onSelectIdx: (i: number) => void;
}> = ({ data, activeIdx, onSelectIdx }) => {
  const width = 420;
  const height = 185;
  const padL = 38;
  const padR = 12;
  const padT = 14;
  const padB = 38;

  const vals = data.map((d) => d.weightKg);
  const minVal = Math.floor(Math.min(...vals) - 0.6);
  const maxVal = Math.ceil(Math.max(...vals) + 0.6);
  const span = Math.max(1, maxVal - minVal);

  const xFor = (i: number) =>
    data.length === 1
      ? (padL + width - padR) / 2
      : padL + (i / (data.length - 1)) * (width - padL - padR);
  const yFor = (v: number) => padT + ((maxVal - v) / span) * (height - padT - padB);

  const rawPath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(d.weightKg).toFixed(1)}`)
    .join(' ');
  const avgPath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(d.movingAvg7d).toFixed(1)}`)
    .join(' ');

  const highlighted = activeIdx !== null ? activeIdx : data.length - 1;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="Evolução do peso corporal em jejum">
      {[0, 0.5, 1].map((t) => {
        const y = padT + t * (height - padT - padB);
        return (
          <g key={t}>
            <line x1={padL} y1={y} x2={width - padR} y2={y} stroke="rgba(255,255,255,0.05)" />
            <text x={padL - 8} y={y + 4} textAnchor="end" fill="#606A7C" fontSize="9.5" fontFamily="JetBrains Mono">
              {(maxVal - t * span).toFixed(1)}
            </text>
          </g>
        );
      })}
      <path d={rawPath} fill="none" stroke="rgba(245,247,251,0.24)" strokeWidth="1.5" />
      <path d={avgPath} fill="none" stroke="#38BDF8" strokeWidth="2.6" strokeLinecap="round" />

      {data.map((d, i) => {
        const cx = xFor(i);
        const isSel = i === highlighted;
        return (
          <g key={d.date + i} onClick={() => onSelectIdx(i)} style={{ cursor: 'pointer' }}>
            <circle cx={cx} cy={yFor(d.weightKg)} r={isSel ? 5 : 3} fill={isSel ? '#CCFF00' : '#F5F7FB'} stroke="#111319" strokeWidth="1.5" />
            {d.hadWorkout && <rect x={cx - 3.5} y={height - 24} width="7" height="4.5" rx="1.5" fill="#CCFF00" />}
            {d.hadCardio && <circle cx={cx} cy={height - 14} r="2.6" fill="#FF622E" />}
            {(data.length <= 7 || i % Math.ceil(data.length / 6) === 0 || isSel) && (
              <text x={cx} y={height - 2} textAnchor="middle" fill={isSel ? '#F5F7FB' : '#606A7C'} fontSize="9" fontFamily="JetBrains Mono">
                {d.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
};
