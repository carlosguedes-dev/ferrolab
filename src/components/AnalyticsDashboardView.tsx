import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Flame,
  Scale,
  Trash2,
  TrendingDown,
  TrendingUp,
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
  'upper-a': '#C8FF2E',
  'lower-a': '#22D3EE',
  'upper-b': '#FF6B2C',
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
  const allExercises = useMemo(
    () =>
      program.flatMap((d) =>
        d.exercises
          .filter((e) => !e.isIsometric)
          .map((e) => ({ id: e.id, name: `${d.shortDay} · ${e.name}` })),
      ),
    [program],
  );

  const [selectedExId, setSelectedExId] = useState<string>(
    allExercises[0]?.id ?? 'supino-reto',
  );
  const [activePointIdx, setActivePointIdx] = useState<number | null>(null);
  const [activeBarIdx, setActiveBarIdx] = useState<number | null>(null);
  const [activeBwIdx, setActiveBwIdx] = useState<number | null>(null);
  const [volumeView, setVolumeView] = useState<'week' | 'plan'>('week');

  // Novo registro de peso corporal
  const [bwInput, setBwInput] = useState('');
  const [bwDate, setBwDate] = useState(getTodayISO());
  const [bwFasting, setBwFasting] = useState(true);

  const exSeries = useMemo(
    () => getExerciseProgressSeries(selectedExId, sessions, formula1RM),
    [selectedExId, sessions, formula1RM],
  );

  const tonnageSeries = useMemo(() => getSessionTonnageSeries(sessions), [sessions]);

  // Escolhe a semana atual ou a semana mais recente com treinos para o medidor
  const latestWeekStart = useMemo(() => {
    if (sessions.length === 0) return getWeekStartISO(new Date());
    const sorted = [...sessions].sort((a, b) => b.finishedAt - a.finishedAt);
    const currentWeek = getWeekStartISO(new Date());
    const hasThisWeek = sorted.some((s) => getWeekStartISO(s.date) === currentWeek);
    return hasThisWeek ? currentWeek : getWeekStartISO(sorted[0].date);
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
  };

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header do Painel */}
      <div className="card">
        <span className="pill pill-volt">ANALYTICS DE FORÇA & CORTE</span>
        <h2 className="font-display" style={{ margin: '6px 0 2px', fontSize: 28 }}>
          Painel de Desempenho
        </h2>
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-secondary)' }}>
          Evolução de 1RM, carga máxima, tonelagem, volume semanal (10–20 séries), consistência e peso em jejum.
        </p>
      </div>

      {/* Monitor de Fadiga & Deload */}
      <div className={`card ${deloadAlert.shouldDeload ? 'card-amber' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          {deloadAlert.shouldDeload ? (
            <AlertTriangle size={20} color="#FBBF24" style={{ flexShrink: 0, marginTop: 2 }} />
          ) : (
            <CheckCircle2 size={20} color="#10B981" style={{ flexShrink: 0, marginTop: 2 }} />
          )}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <strong style={{ fontSize: 14 }}>
                {deloadAlert.shouldDeload ? 'Deload Sugerido (Fadiga Acumulada)' : 'Status de Fadiga & Deload'}
              </strong>
              {deloadAlert.weightTrendKgPerWeek !== null && (
                <span className={`pill ${deloadAlert.inCaloricDeficit ? 'pill-cyan' : ''} font-mono`}>
                  {deloadAlert.weightTrendKgPerWeek > 0 ? '+' : ''}
                  {deloadAlert.weightTrendKgPerWeek} kg/sem
                </span>
              )}
            </div>
            <p style={{ margin: '5px 0 0', fontSize: 12.5, color: 'var(--text-secondary)' }}>
              {deloadAlert.summary}
            </p>
            {deloadAlert.stagnatedExercises.length > 0 && (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {deloadAlert.stagnatedExercises.map((st) => (
                  <div
                    key={st.exerciseId}
                    style={{
                      fontSize: 11.5,
                      padding: '6px 9px',
                      borderRadius: 8,
                      background: '#0A0D12',
                      border: '1px solid rgba(245,158,11,0.3)',
                      color: '#FDE68A',
                    }}
                  >
                    <strong>{st.exerciseName}:</strong> {st.reason}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 1. GRÁFICO: CURVA DE EVOLUÇÃO DE 1RM ESTIMADO E CARGA MÁXIMA */}
      <div className="card card-cyan">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div>
            <span className="section-label">1 · Força Relativa & Absoluta</span>
            <h3 className="font-display" style={{ margin: '2px 0 0', fontSize: 21 }}>
              Evolução do 1RM & Carga Máxima
            </h3>
          </div>
          <TrendingUp size={18} color="#22D3EE" />
        </div>

        <select
          aria-label="Selecionar exercício para gráfico de 1RM"
          className="input"
          style={{ minHeight: 40, fontSize: 13, marginBottom: 10 }}
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

        {exSeries.length === 0 ? (
          <div style={{ padding: '20px 8px', textAlign: 'center', fontSize: 12.5, color: 'var(--text-muted)' }}>
            Registre sessões deste exercício para visualizar a curva semanal de 1RM ({formula1RM === 'epley' ? 'Epley' : 'Brzycki'}) e carga máxima.
          </div>
        ) : (
          <>
            {selectedExPoint && (
              <div
                className="grid-3"
                style={{
                  marginBottom: 10,
                  background: '#0A0D12',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 11,
                  padding: '8px 10px',
                }}
              >
                <div>
                  <div className="section-label">Data</div>
                  <div className="font-mono" style={{ fontWeight: 700, fontSize: 14 }}>
                    {selectedExPoint.label}
                  </div>
                </div>
                <div>
                  <div className="section-label" style={{ color: '#22D3EE' }}>1RM est.</div>
                  <div className="font-mono" style={{ fontWeight: 800, fontSize: 15, color: '#22D3EE' }}>
                    {formatKg(selectedExPoint.estimated1RM)} kg
                  </div>
                </div>
                <div>
                  <div className="section-label" style={{ color: '#C8FF2E' }}>Carga máx</div>
                  <div className="font-mono" style={{ fontWeight: 800, fontSize: 15, color: '#C8FF2E' }}>
                    {formatKg(selectedExPoint.maxWeightKg)} kg
                  </div>
                </div>
              </div>
            )}

            <DualLineSvgChart
              data={exSeries}
              activeIdx={activePointIdx}
              onSelectIdx={setActivePointIdx}
            />

            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 6, fontSize: 11, color: 'var(--text-secondary)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 10, height: 3, background: '#22D3EE', borderRadius: 2 }} />
                1RM Estimado ({formula1RM})
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 10, height: 3, background: '#C8FF2E', borderRadius: 2 }} />
                Carga Máxima (kg)
              </span>
            </div>
          </>
        )}
      </div>

      {/* 2. GRÁFICO: VOLUME TOTAL (TONELAGEM) POR SESSÃO */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div>
            <span className="section-label">2 · Carga Total Movida</span>
            <h3 className="font-display" style={{ margin: '2px 0 0', fontSize: 21 }}>
              Volume Total (Tonelagem) por Sessão
            </h3>
          </div>
          <BarChart3 size={18} color="#C8FF2E" />
        </div>

        {tonnageSeries.length === 0 ? (
          <div style={{ padding: '20px 8px', textAlign: 'center', fontSize: 12.5, color: 'var(--text-muted)' }}>
            Finalize seus treinos para acompanhar a evolução de tonelagem (kg totais por sessão).
          </div>
        ) : (
          <>
            {selectedBar && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#0A0D12',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 11,
                  padding: '8px 11px',
                  marginBottom: 10,
                }}
              >
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{selectedBar.workoutTitle}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {selectedBar.label} · {selectedBar.validSets} séries válidas · {selectedBar.durationMin} min
                  </div>
                </div>
                <div className="font-mono" style={{ fontSize: 18, fontWeight: 800, color: DAY_BAR_COLORS[selectedBar.workoutDayId] }}>
                  {selectedBar.tonnageKg.toLocaleString('pt-BR')} kg
                </div>
              </div>
            )}

            <TonnageBarSvgChart
              data={tonnageSeries}
              activeIdx={activeBarIdx}
              onSelectIdx={setActiveBarIdx}
            />
          </>
        )}
      </div>

      {/* 3. MEDIDOR SEMANAL DE SÉRIES VÁLIDAS POR GRUPO MUSCULAR (META 10–20) */}
      <div className="card card-volt">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
          <div>
            <span className="section-label">3 · Medidor de Volume Direto (Meta 10–20)</span>
            <h3 className="font-display" style={{ margin: '2px 0 0', fontSize: 21 }}>
              Séries Válidas por Grupo Muscular
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: 11.5, color: 'var(--text-secondary)' }}>
              Semana de {weeklyVolume.weekStartISO.split('-').reverse().join('/')} · Aquecimentos excluídos.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              type="button"
              className={`btn btn-xs ${volumeView === 'week' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setVolumeView('week')}
            >
              Semana
            </button>
            <button
              type="button"
              className={`btn btn-xs ${volumeView === 'plan' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setVolumeView('plan')}
            >
              Meta Ficha
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {weeklyVolume.items.map((item) => {
            const value = volumeView === 'week' ? item.completedSets : item.plannedSets;
            const pct = Math.min(100, (value / 20) * 100);
            const inSweetSpot = value >= item.minTarget && value <= item.maxTarget;

            return (
              <div key={item.muscle}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    fontSize: 12.5,
                    marginBottom: 4,
                  }}
                >
                  <span style={{ fontWeight: 700 }}>{item.label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="font-mono" style={{ fontWeight: 800, color: inSweetSpot ? '#34D399' : 'var(--text-primary)' }}>
                      {volumeView === 'week'
                        ? `${item.completedSets}/${item.plannedSets}`
                        : `${item.plannedSets} séries`}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: 99,
                        background: inSweetSpot
                          ? 'rgba(16, 185, 129, 0.18)'
                          : 'rgba(255, 255, 255, 0.06)',
                        color: inSweetSpot ? '#34D399' : 'var(--text-muted)',
                      }}
                    >
                      {inSweetSpot ? '10–20 OK' : `Meta ${item.plannedSets}`}
                    </span>
                  </div>
                </div>

                {/* Barra com zona alvo 10–20 destacada (50% a 100% da escala de 20) */}
                <div
                  style={{
                    position: 'relative',
                    height: 10,
                    background: '#0A0D12',
                    borderRadius: 99,
                    border: '1px solid var(--border-subtle)',
                    overflow: 'hidden',
                  }}
                >
                  {/* Zona ideal 10–20 (50% a 100%) */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '50%',
                      right: 0,
                      top: 0,
                      bottom: 0,
                      background: 'rgba(16, 185, 129, 0.12)',
                      borderLeft: '1px dashed rgba(16, 185, 129, 0.55)',
                    }}
                  />
                  {/* Preenchimento */}
                  <div
                    style={{
                      position: 'relative',
                      height: '100%',
                      width: `${pct}%`,
                      background: item.color,
                      borderRadius: 99,
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            marginTop: 12,
            paddingTop: 10,
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 11.5,
            color: 'var(--text-secondary)',
          }}
        >
          <span>Grupo auxiliar — Adutores (Quarta 5A):</span>
          <strong className="font-mono">
            {weeklyVolume.adductorsCompleted}/{weeklyVolume.adductorsPlanned} séries
          </strong>
        </div>
      </div>

      {/* 4. MAPA DE FREQUÊNCIA / CONSISTÊNCIA SEMANAL */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <span className="section-label">4 · Regularidade (Últimas 8 Semanas)</span>
            <h3 className="font-display" style={{ margin: '2px 0 0', fontSize: 21 }}>
              Mapa de Consistência Semanal
            </h3>
          </div>
          <Flame size={18} color="#FF6B2C" />
        </div>

        <div className="grid-3" style={{ marginBottom: 12 }}>
          <div style={{ background: '#0A0D12', borderRadius: 10, padding: '8px 10px', border: '1px solid var(--border-subtle)' }}>
            <div className="section-label">Aderência</div>
            <div className="font-mono" style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent-volt)' }}>
              {consistency.weeklyAdherencePct}%
            </div>
          </div>
          <div style={{ background: '#0A0D12', borderRadius: 10, padding: '8px 10px', border: '1px solid var(--border-subtle)' }}>
            <div className="section-label">Esta semana</div>
            <div className="font-mono" style={{ fontSize: 20, fontWeight: 800 }}>
              {consistency.currentWeekCount}/4
            </div>
          </div>
          <div style={{ background: '#0A0D12', borderRadius: 10, padding: '8px 10px', border: '1px solid var(--border-subtle)' }}>
            <div className="section-label">Dias cardio</div>
            <div className="font-mono" style={{ fontSize: 20, fontWeight: 800, color: '#FF8B57' }}>
              {consistency.totalCardioDays}
            </div>
          </div>
        </div>

        {/* Grade 7 colunas (Seg..Dom) × 8 linhas */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 5,
            textAlign: 'center',
            fontSize: 10,
            color: 'var(--text-muted)',
            marginBottom: 4,
          }}
        >
          {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((l, i) => (
            <span key={i} style={{ fontWeight: i >= 1 && i <= 4 ? 800 : 500, color: i >= 1 && i <= 4 ? 'var(--text-secondary)' : undefined }}>
              {l}
            </span>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5 }}>
          {consistency.cells.map((cell) => {
            let bg = '#0B0E14';
            let border = '1px solid rgba(255,255,255,0.06)';
            if (cell.hasWorkout && cell.hasCardio) {
              bg = 'linear-gradient(135deg, #C8FF2E, #FF6B2C)';
              border = '1px solid #C8FF2E';
            } else if (cell.hasWorkout) {
              bg = '#C8FF2E';
              border = '1px solid #C8FF2E';
            } else if (cell.hasCardio) {
              bg = 'rgba(255, 107, 44, 0.72)';
              border = '1px solid #FF6B2C';
            }

            return (
              <div
                key={cell.date}
                title={`${cell.date}${cell.workoutTitle ? ` · ${cell.workoutTitle}` : ''}${cell.cardioMinutes ? ` · Cardio ${cell.cardioMinutes} min` : ''}`}
                style={{
                  height: 22,
                  borderRadius: 6,
                  background: bg,
                  border: cell.isToday ? '2px solid #22D3EE' : border,
                }}
              />
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 8, fontSize: 10.5, color: 'var(--text-muted)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: '#C8FF2E' }} /> Musculação
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: '#FF6B2C' }} /> Cardio
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: 'linear-gradient(135deg,#C8FF2E,#FF6B2C)' }} /> Ambos
          </span>
        </div>
      </div>

      {/* 5. EVOLUÇÃO DO PESO CORPORAL EM JEJUM INTEGRADO A TREINO & CARDIO */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <span className="section-label">5 · Perda de Gordura & Recomposição</span>
            <h3 className="font-display" style={{ margin: '2px 0 0', fontSize: 21 }}>
              Peso Corporal em Jejum + Treino & Cardio
            </h3>
          </div>
          {deloadAlert.inCaloricDeficit ? (
            <TrendingDown size={18} color="#22D3EE" />
          ) : (
            <Scale size={18} color="#22D3EE" />
          )}
        </div>

        {/* Form rápido para lançar peso em jejum */}
        <form onSubmit={handleSaveWeight} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr auto', gap: 6 }}>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              placeholder="Peso (kg)"
              aria-label="Peso corporal em kg"
              className="input input-compact"
              value={bwInput}
              onChange={(e) => setBwInput(e.target.value)}
            />
            <input
              type="date"
              aria-label="Data da pesagem"
              className="input"
              style={{ minHeight: 40, fontSize: 12.5, padding: '6px 8px' }}
              value={bwDate}
              onChange={(e) => setBwDate(e.target.value)}
            />
            <button type="submit" className="btn btn-primary btn-sm">
              Lançar
            </button>
          </div>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
            <input
              type="checkbox"
              checked={bwFasting}
              onChange={(e) => setBwFasting(e.target.checked)}
            />
            Pesagem em jejum matinal (padrão ouro para tendência de corte)
          </label>
        </form>

        {bwSeries.length === 0 ? (
          <div style={{ padding: '16px 8px', textAlign: 'center', fontSize: 12.5, color: 'var(--text-muted)' }}>
            Lance seu peso corporal em jejum acima para acompanhar a curva de perda de gordura junto aos dias de treino e cardio.
          </div>
        ) : (
          <>
            {selectedBwPoint && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#0A0D12',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 11,
                  padding: '8px 11px',
                  marginBottom: 10,
                }}
              >
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>
                    {selectedBwPoint.label} · Média móvel 7d:{' '}
                    <span className="font-mono" style={{ color: '#22D3EE' }}>
                      {formatKg(selectedBwPoint.movingAvg7d)} kg
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 3 }}>
                    {selectedBwPoint.hadWorkout && (
                      <span className="pill pill-volt" style={{ padding: '1px 6px', fontSize: 10 }}>
                        Treino: {selectedBwPoint.workoutTitle?.split('—')[0]}
                      </span>
                    )}
                    {selectedBwPoint.hadCardio && (
                      <span className="pill pill-ember" style={{ padding: '1px 6px', fontSize: 10 }}>
                        <Activity size={9} /> Cardio
                      </span>
                    )}
                  </div>
                </div>
                <div className="font-mono" style={{ fontSize: 20, fontWeight: 800 }}>
                  {formatKg(selectedBwPoint.weightKg)} kg
                </div>
              </div>
            )}

            <BodyWeightSvgChart
              data={bwSeries}
              activeIdx={activeBwIdx}
              onSelectIdx={setActiveBwIdx}
            />

            {/* Últimos registros com opção de apagar */}
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
              {[...bodyWeights]
                .sort((a, b) => b.date.localeCompare(a.date))
                .slice(0, 5)
                .map((b) => (
                  <div
                    key={b.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: 12,
                      padding: '6px 9px',
                      borderRadius: 9,
                      background: '#0A0D12',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <span>
                      <strong className="font-mono">{b.date.split('-').reverse().join('/')}</strong> ·{' '}
                      {b.fasting ? 'Em jejum' : 'Alimentado'}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <strong className="font-mono" style={{ color: '#22D3EE' }}>
                        {formatKg(b.weightKg)} kg
                      </strong>
                      <button
                        type="button"
                        onClick={() => onDeleteBodyWeight(b.id)}
                        aria-label={`Remover pesagem de ${b.date}`}
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// GRÁFICOS SVG INTERATIVOS RESPONSIVOS (DARK THEME HIGH-CONTRAST)
// ============================================================================

const DualLineSvgChart: React.FC<{
  data: ReturnType<typeof getExerciseProgressSeries>;
  activeIdx: number | null;
  onSelectIdx: (i: number) => void;
}> = ({ data, activeIdx, onSelectIdx }) => {
  const width = 460;
  const height = 185;
  const padL = 38;
  const padR = 14;
  const padT = 16;
  const padB = 26;

  const allVals = data.flatMap((d) => [d.estimated1RM, d.maxWeightKg]);
  const minVal = Math.max(0, Math.floor(Math.min(...allVals) * 0.92));
  const maxVal = Math.ceil(Math.max(...allVals) * 1.06) || 100;
  const span = Math.max(1, maxVal - minVal);

  const xFor = (i: number) =>
    data.length === 1
      ? (padL + width - padR) / 2
      : padL + (i / (data.length - 1)) * (width - padL - padR);
  const yFor = (v: number) =>
    padT + ((maxVal - v) / span) * (height - padT - padB);

  const path1RM = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(d.estimated1RM).toFixed(1)}`)
    .join(' ');
  const pathMax = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(d.maxWeightKg).toFixed(1)}`)
    .join(' ');

  const highlighted = activeIdx !== null ? activeIdx : data.length - 1;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="Gráfico de evolução de 1RM e carga máxima">
      {[0, 0.5, 1].map((t) => {
        const y = padT + t * (height - padT - padB);
        const val = Math.round(maxVal - t * span);
        return (
          <g key={t}>
            <line x1={padL} y1={y} x2={width - padR} y2={y} stroke="rgba(255,255,255,0.07)" strokeDasharray="3 3" />
            <text x={padL - 6} y={y + 4} textAnchor="end" fill="#66758D" fontSize="10" fontFamily="JetBrains Mono">
              {val}
            </text>
          </g>
        );
      })}

      <path d={path1RM} fill="none" stroke="#22D3EE" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d={pathMax} fill="none" stroke="#C8FF2E" strokeWidth="2.4" strokeDasharray="5 3" strokeLinecap="round" strokeLinejoin="round" />

      {data.map((d, i) => {
        const cx = xFor(i);
        const isSel = i === highlighted;
        return (
          <g key={d.date + i} onClick={() => onSelectIdx(i)} style={{ cursor: 'pointer' }}>
            <circle cx={cx} cy={yFor(d.estimated1RM)} r={isSel ? 5.5 : 3.8} fill="#22D3EE" stroke="#090B0E" strokeWidth="2" />
            <circle cx={cx} cy={yFor(d.maxWeightKg)} r={isSel ? 5 : 3.4} fill="#C8FF2E" stroke="#090B0E" strokeWidth="2" />
            <text x={cx} y={height - 6} textAnchor="middle" fill={isSel ? '#F1F5FB' : '#66758D'} fontSize="10" fontFamily="JetBrains Mono">
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
  const width = 460;
  const height = 175;
  const padL = 44;
  const padR = 10;
  const padT = 14;
  const padB = 26;

  const maxVal = Math.max(...data.map((d) => d.tonnageKg), 1000);
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const barSlot = plotW / Math.max(1, data.length);
  const barW = Math.min(28, Math.max(10, barSlot * 0.64));
  const highlighted = activeIdx !== null ? activeIdx : data.length - 1;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="Gráfico de tonelagem por sessão">
      {[0, 0.5, 1].map((t) => {
        const y = padT + t * plotH;
        const val = Math.round(maxVal * (1 - t));
        return (
          <g key={t}>
            <line x1={padL} y1={y} x2={width - padR} y2={y} stroke="rgba(255,255,255,0.07)" strokeDasharray="3 3" />
            <text x={padL - 6} y={y + 4} textAnchor="end" fill="#66758D" fontSize="9.5" fontFamily="JetBrains Mono">
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
        const color = DAY_BAR_COLORS[d.workoutDayId];

        return (
          <g key={d.id} onClick={() => onSelectIdx(i)} style={{ cursor: 'pointer' }}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={h}
              rx="4"
              fill={color}
              opacity={isSel ? 1 : 0.62}
              stroke={isSel ? '#FFFFFF' : 'none'}
              strokeWidth={isSel ? 1.4 : 0}
            />
            {(data.length <= 8 || i % 2 === 0 || isSel) && (
              <text x={x + barW / 2} y={height - 6} textAnchor="middle" fill={isSel ? '#F1F5FB' : '#66758D'} fontSize="9.5" fontFamily="JetBrains Mono">
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
  const width = 460;
  const height = 190;
  const padL = 40;
  const padR = 14;
  const padT = 16;
  const padB = 38;

  const vals = data.map((d) => d.weightKg);
  const minVal = Math.floor(Math.min(...vals) - 0.6);
  const maxVal = Math.ceil(Math.max(...vals) + 0.6);
  const span = Math.max(1, maxVal - minVal);

  const xFor = (i: number) =>
    data.length === 1
      ? (padL + width - padR) / 2
      : padL + (i / (data.length - 1)) * (width - padL - padR);
  const yFor = (v: number) =>
    padT + ((maxVal - v) / span) * (height - padT - padB);

  const rawPath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(d.weightKg).toFixed(1)}`)
    .join(' ');
  const avgPath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(d.movingAvg7d).toFixed(1)}`)
    .join(' ');

  const highlighted = activeIdx !== null ? activeIdx : data.length - 1;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="Gráfico de peso corporal em jejum integrado a treinos e cardio">
      {[0, 0.5, 1].map((t) => {
        const y = padT + t * (height - padT - padB);
        const val = (maxVal - t * span).toFixed(1);
        return (
          <g key={t}>
            <line x1={padL} y1={y} x2={width - padR} y2={y} stroke="rgba(255,255,255,0.07)" strokeDasharray="3 3" />
            <text x={padL - 6} y={y + 4} textAnchor="end" fill="#66758D" fontSize="9.5" fontFamily="JetBrains Mono">
              {val}
            </text>
          </g>
        );
      })}

      {/* Linha de peso diário */}
      <path d={rawPath} fill="none" stroke="rgba(241, 245, 251, 0.35)" strokeWidth="1.6" />
      {/* Tendência média móvel 7 dias */}
      <path d={avgPath} fill="none" stroke="#22D3EE" strokeWidth="2.8" strokeLinecap="round" />

      {data.map((d, i) => {
        const cx = xFor(i);
        const isSel = i === highlighted;
        return (
          <g key={d.date + i} onClick={() => onSelectIdx(i)} style={{ cursor: 'pointer' }}>
            <circle cx={cx} cy={yFor(d.weightKg)} r={isSel ? 5 : 3.2} fill={isSel ? '#C8FF2E' : '#F1F5FB'} stroke="#090B0E" strokeWidth="1.5" />
            {/* Marcadores integrados de treino (verde) e cardio (laranja) na base */}
            {d.hadWorkout && <rect x={cx - 3.5} y={height - 24} width="7" height="5" rx="1.5" fill="#C8FF2E" />}
            {d.hadCardio && <circle cx={cx} cy={height - 14} r="2.8" fill="#FF6B2C" />}
            {(data.length <= 7 || i % Math.ceil(data.length / 6) === 0 || isSel) && (
              <text x={cx} y={height - 2} textAnchor="middle" fill={isSel ? '#F1F5FB' : '#66758D'} fontSize="9" fontFamily="JetBrains Mono">
                {d.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
};
