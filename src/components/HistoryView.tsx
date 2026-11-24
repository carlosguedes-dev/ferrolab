import React, { useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Dumbbell,
  Flame,
  HeartPulse,
  Search,
  Trash2,
  Trophy,
  X,
} from 'lucide-react';
import type { CardioLog, OneRMFormula, WorkoutSession } from '../types/workout';
import { calculate1RM, formatDuration, formatKg } from '../engines/calculations';
import { SegmentedControl, SheetModal, SubScreenSlide } from './MotionPrimitives';

interface HistoryViewProps {
  sessions: WorkoutSession[];
  standaloneCardio: CardioLog[];
  formula1RM: OneRMFormula;
  onDeleteSession: (id: string) => void;
}

const WEEKDAYS_PT = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
const MONTHS_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const DAY_DOTS: Record<WorkoutSession['workoutDayId'], string> = {
  'upper-a': '#CCFF00',
  'lower-a': '#38BDF8',
  'upper-b': '#FF622E',
  'lower-b': '#A78BFA',
};

export const HistoryView: React.FC<HistoryViewProps> = ({
  sessions,
  standaloneCardio,
  formula1RM,
  onDeleteSession,
}) => {
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [inspectSession, setInspectSession] = useState<WorkoutSession | null>(null);

  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, WorkoutSession[]>();
    for (const s of sessions) {
      const list = map.get(s.date) ?? [];
      list.push(s);
      map.set(s.date, list);
    }
    return map;
  }, [sessions]);

  const cardioByDate = useMemo(() => {
    const map = new Map<string, CardioLog[]>();
    for (const c of standaloneCardio) {
      const list = map.get(c.date) ?? [];
      list.push(c);
      map.set(c.date, list);
    }
    return map;
  }, [standaloneCardio]);

  const calendarDays = useMemo(() => {
    const firstOfMonth = new Date(calYear, calMonth, 1);
    const jsDay = firstOfMonth.getDay();
    const offsetMonday = jsDay === 0 ? 6 : jsDay - 1;
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

    const cells: { iso: string | null; dayNum: number | null }[] = [];
    for (let i = 0; i < offsetMonday; i++) cells.push({ iso: null, dayNum: null });
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ iso, dayNum: d });
    }
    return cells;
  }, [calYear, calMonth]);

  const filteredSessions = useMemo(() => {
    let list = [...sessions].sort((a, b) => b.finishedAt - a.finishedAt);
    if (selectedDate && viewMode === 'calendar') {
      list = list.filter((s) => s.date === selectedDate);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.workoutTitle.toLowerCase().includes(q) ||
          s.date.includes(q) ||
          s.exercises.some((e) => e.exerciseName.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [sessions, selectedDate, viewMode, search]);

  const changeMonth = (delta: number) => {
    const next = new Date(calYear, calMonth + delta, 1);
    setCalYear(next.getFullYear());
    setCalMonth(next.getMonth());
    setSelectedDate(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <div className="t-kicker">Diário de treinos</div>
        <h1 className="t-title" style={{ marginTop: 4 }}>
          Histórico
        </h1>
      </div>

      <SegmentedControl
        id="history-view"
        variant="dark"
        value={viewMode}
        onChange={(v) => {
          setViewMode(v as 'calendar' | 'list');
          if (v === 'list') setSelectedDate(null);
        }}
        options={[
          { value: 'calendar', label: 'Calendário' },
          { value: 'list', label: `Sessões (${sessions.length})` },
        ]}
      />

      <AnimatePresence mode="wait">
        {viewMode === 'calendar' && (
          <SubScreenSlide screenKey="cal">
            <div className="fl-card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <button type="button" className="fl-icon-btn" onClick={() => changeMonth(-1)} aria-label="Mês anterior">
                  <ChevronLeft size={17} />
                </button>
                <span style={{ fontWeight: 700, fontSize: 15 }}>
                  {MONTHS_PT[calMonth]} {calYear}
                </span>
                <button type="button" className="fl-icon-btn" onClick={() => changeMonth(1)} aria-label="Próximo mês">
                  <ChevronRight size={17} />
                </button>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: 4,
                  textAlign: 'center',
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--ink-tertiary)',
                  marginBottom: 8,
                }}
              >
                {WEEKDAYS_PT.map((w, i) => (
                  <span key={i}>{w}</span>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                {calendarDays.map((cell, idx) => {
                  if (!cell.iso || !cell.dayNum) return <div key={`e-${idx}`} />;
                  const daySessions = sessionsByDate.get(cell.iso) ?? [];
                  const dayCardios = cardioByDate.get(cell.iso) ?? [];
                  const hasWorkout = daySessions.length > 0;
                  const hasCardio =
                    dayCardios.length > 0 || daySessions.some((s) => s.cardio?.completed);
                  const isSelected = selectedDate === cell.iso;
                  const dotColor = hasWorkout ? DAY_DOTS[daySessions[0].workoutDayId] : undefined;

                  return (
                    <button
                      key={cell.iso}
                      type="button"
                      onClick={() => setSelectedDate(isSelected ? null : cell.iso)}
                      style={{
                        height: 42,
                        borderRadius: 12,
                        background: isSelected
                          ? 'var(--volt-soft)'
                          : hasWorkout
                            ? 'rgba(255,255,255,0.04)'
                            : 'transparent',
                        border: isSelected
                          ? '1px solid var(--volt-border)'
                          : '1px solid transparent',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                      }}
                    >
                      <span
                        className="t-mono"
                        style={{
                          fontSize: 13,
                          fontWeight: hasWorkout ? 700 : 400,
                          color: isSelected
                            ? 'var(--volt)'
                            : hasWorkout
                              ? 'var(--ink-primary)'
                              : 'var(--ink-tertiary)',
                        }}
                      >
                        {cell.dayNum}
                      </span>
                      <div style={{ display: 'flex', gap: 3, height: 5 }}>
                        {hasWorkout && (
                          <span style={{ width: 5, height: 5, borderRadius: 99, background: dotColor }} />
                        )}
                        {hasCardio && (
                          <span style={{ width: 5, height: 5, borderRadius: 99, background: 'var(--ember)' }} />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedDate && (
                <div style={{ marginTop: 12, textAlign: 'center' }}>
                  <button
                    type="button"
                    className="fl-btn fl-btn-ghost fl-btn-xs"
                    onClick={() => setSelectedDate(null)}
                  >
                    Filtro: {selectedDate.split('-').reverse().join('/')} · Limpar
                  </button>
                </div>
              )}
            </div>
          </SubScreenSlide>
        )}
      </AnimatePresence>

      {/* Busca discreta quando em modo lista */}
      {viewMode === 'list' && (
        <div style={{ position: 'relative' }}>
          <Search
            size={15}
            color="var(--ink-tertiary)"
            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            className="fl-input"
            style={{ paddingLeft: 40, minHeight: 42, fontSize: 13.5 }}
            placeholder="Buscar exercício, treino ou data..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {/* Lista limpa de sessões (toque abre sheet detalhada) */}
      {filteredSessions.length === 0 ? (
        <div className="fl-card" style={{ textAlign: 'center', padding: '32px 20px' }}>
          <Dumbbell size={26} color="var(--ink-tertiary)" style={{ marginBottom: 10 }} />
          <div style={{ fontWeight: 600, fontSize: 15 }}>Nenhum treino encontrado</div>
          <p className="t-subtitle" style={{ fontSize: 13 }}>
            {selectedDate
              ? 'Sem registro de musculação nesta data.'
              : 'Conclua seu primeiro treino para construir seu histórico.'}
          </p>
        </div>
      ) : (
        <div className="fl-list-group">
          {filteredSessions.map((s) => (
            <button
              key={s.id}
              type="button"
              className="fl-list-row"
              onClick={() => setInspectSession(s)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <span
                  style={{
                    width: 4,
                    height: 36,
                    borderRadius: 99,
                    background: DAY_DOTS[s.workoutDayId],
                    flexShrink: 0,
                  }}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>
                    {s.workoutTitle.split('—')[0].trim()}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-tertiary)', marginTop: 2, display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span className="t-mono">{s.date.split('-').reverse().join('/')}</span>
                    <span>·</span>
                    <span className="t-mono">{formatDuration(s.durationSeconds)}</span>
                    {s.prCount > 0 && (
                      <span style={{ color: 'var(--volt)', fontWeight: 700 }}>
                        · {s.prCount} PR
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div className="t-mono" style={{ fontSize: 14, fontWeight: 700 }}>
                  {s.totalTonnageKg.toLocaleString('pt-BR')} kg
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-tertiary)' }}>
                  {s.validSetsCount} séries
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Sheet de Detalhes Completos da Sessão (separa detalhes da listagem!) */}
      <AnimatePresence>
        {inspectSession && (
          <SheetModal ariaLabel="Detalhes da sessão de treino" onClose={() => setInspectSession(null)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <div className="t-kicker t-mono">
                  {inspectSession.date.split('-').reverse().join('/')} ·{' '}
                  {formatDuration(inspectSession.durationSeconds)}
                </div>
                <h2 className="t-title" style={{ fontSize: 22, marginTop: 3 }}>
                  {inspectSession.workoutTitle}
                </h2>
              </div>
              <button
                type="button"
                className="fl-icon-btn"
                onClick={() => setInspectSession(null)}
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="fl-grid-3" style={{ marginBottom: 16 }}>
              <div className="fl-card fl-card-compact" style={{ textAlign: 'center' }}>
                <div className="t-kicker">Tonelagem</div>
                <div className="t-mono" style={{ fontSize: 16, fontWeight: 700, marginTop: 4, color: 'var(--volt)' }}>
                  {inspectSession.totalTonnageKg.toLocaleString('pt-BR')} kg
                </div>
              </div>
              <div className="fl-card fl-card-compact" style={{ textAlign: 'center' }}>
                <div className="t-kicker">Séries</div>
                <div className="t-mono" style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>
                  {inspectSession.validSetsCount}
                </div>
              </div>
              <div className="fl-card fl-card-compact" style={{ textAlign: 'center' }}>
                <div className="t-kicker">Recordes</div>
                <div className="t-mono" style={{ fontSize: 16, fontWeight: 700, marginTop: 4, color: 'var(--amber)' }}>
                  {inspectSession.prCount} PR
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {inspectSession.exercises.map((ex) => {
                const validSets = ex.sets.filter((st) => !st.isWarmup && st.completed);
                const warmups = ex.sets.filter((st) => st.isWarmup && st.completed);
                if (validSets.length === 0 && warmups.length === 0) return null;
                const bestEst = !ex.isIsometric
                  ? Math.max(
                      0,
                      ...validSets.map((st) => calculate1RM(st.weightKg, st.reps, formula1RM).selected),
                    )
                  : 0;
                return (
                  <div key={ex.exerciseId} className="fl-card fl-card-compact">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 600 }}>{ex.exerciseName}</span>
                      {bestEst > 0 && (
                        <span className="t-mono" style={{ fontSize: 11.5, color: 'var(--cyan)' }}>
                          1RM {formatKg(bestEst)}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      {warmups.map((w) => (
                        <span key={w.id} className="fl-pill fl-pill-amber t-mono">
                          <Flame size={10} /> {formatKg(w.weightKg)}×{w.reps}
                        </span>
                      ))}
                      {validSets.map((st, idx) => (
                        <span
                          key={st.id}
                          className={`fl-pill t-mono ${st.prTypes?.length ? 'fl-pill-volt' : ''}`}
                        >
                          {st.prTypes?.length ? <Trophy size={10} /> : `#${idx + 1}`}{' '}
                          {formatKg(st.weightKg)}×{st.reps}
                          {ex.isIsometric ? 's' : ''}
                          {typeof st.rir === 'number' ? ` · R${st.rir}` : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {inspectSession.cardio?.completed && (
              <div
                className="fl-card fl-card-compact"
                style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}
              >
                <HeartPulse size={16} color="#ff8c66" />
                <span style={{ fontSize: 13 }}>
                  Cardio: <strong>{inspectSession.cardio.minutes} min</strong> ·{' '}
                  {inspectSession.cardio.modality}
                </span>
              </div>
            )}

            {inspectSession.notes && (
              <p style={{ margin: '12px 0 0', fontSize: 13, color: 'var(--ink-secondary)', fontStyle: 'italic' }}>
                “{inspectSession.notes}”
              </p>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button
                type="button"
                className="fl-btn fl-btn-danger fl-btn-sm"
                onClick={() => {
                  onDeleteSession(inspectSession.id);
                  setInspectSession(null);
                }}
              >
                <Trash2 size={14} /> Excluir
              </button>
              <button
                type="button"
                className="fl-btn fl-btn-surface fl-btn-sm"
                style={{ flex: 1 }}
                onClick={() => setInspectSession(null)}
              >
                <Clock size={14} /> Fechar
              </button>
            </div>
          </SheetModal>
        )}
      </AnimatePresence>
    </div>
  );
};
