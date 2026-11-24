import React, { useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Dumbbell,
  Flame,
  HeartPulse,
  List,
  Search,
  Trash2,
  Trophy,
} from 'lucide-react';
import type { CardioLog, OneRMFormula, WorkoutSession } from '../types/workout';
import { calculate1RM, formatDuration, formatKg } from '../engines/calculations';

interface HistoryViewProps {
  sessions: WorkoutSession[];
  standaloneCardio: CardioLog[];
  formula1RM: OneRMFormula;
  onDeleteSession: (id: string) => void;
}

const WEEKDAYS_PT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
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

const DAY_ACCENTS: Record<WorkoutSession['workoutDayId'], string> = {
  'upper-a': '#C8FF2E',
  'lower-a': '#22D3EE',
  'upper-b': '#FF6B2C',
  'lower-b': '#A78BFA',
};

export const HistoryView: React.FC<HistoryViewProps> = ({
  sessions,
  standaloneCardio,
  formula1RM,
  onDeleteSession,
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(sessions[0]?.id ?? null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth()); // 0..11

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
    const jsDay = firstOfMonth.getDay(); // 0=Dom..6=Sáb
    const offsetMonday = jsDay === 0 ? 6 : jsDay - 1;
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

    const cells: { iso: string | null; dayNum: number | null }[] = [];
    for (let i = 0; i < offsetMonday; i++) {
      cells.push({ iso: null, dayNum: null });
    }
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <div>
            <span className="pill pill-cyan">DIÁRIO DE TREINOS</span>
            <h2 className="font-display" style={{ margin: '6px 0 0', fontSize: 26 }}>
              Histórico Completo
            </h2>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className={`btn btn-xs ${viewMode === 'calendar' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setViewMode('calendar')}
            >
              <CalendarIcon size={13} /> Calendário
            </button>
            <button
              type="button"
              className={`btn btn-xs ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => {
                setViewMode('list');
                setSelectedDate(null);
              }}
            >
              <List size={13} /> Lista
            </button>
          </div>
        </div>

        <div style={{ position: 'relative', marginTop: 10 }}>
          <Search
            size={15}
            color="#66758D"
            style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            className="input"
            style={{ paddingLeft: 34, minHeight: 40, fontSize: 13.5 }}
            placeholder="Filtrar por exercício, treino ou data (ex.: Supino)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Calendário mensal interativo */}
      {viewMode === 'calendar' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <button type="button" className="btn btn-ghost btn-xs" onClick={() => changeMonth(-1)} aria-label="Mês anterior">
              <ChevronLeft size={16} />
            </button>
            <strong className="font-display" style={{ fontSize: 20, letterSpacing: '0.04em' }}>
              {MONTHS_PT[calMonth]} {calYear}
            </strong>
            <button type="button" className="btn btn-ghost btn-xs" onClick={() => changeMonth(1)} aria-label="Próximo mês">
              <ChevronRight size={16} />
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 5,
              textAlign: 'center',
              marginBottom: 6,
              fontSize: 10.5,
              fontWeight: 700,
              color: 'var(--text-muted)',
            }}
          >
            {WEEKDAYS_PT.map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5 }}>
            {calendarDays.map((cell, idx) => {
              if (!cell.iso || !cell.dayNum) {
                return <div key={`empty-${idx}`} />;
              }
              const daySessions = sessionsByDate.get(cell.iso) ?? [];
              const dayCardios = cardioByDate.get(cell.iso) ?? [];
              const hasWorkout = daySessions.length > 0;
              const hasCardio =
                dayCardios.length > 0 || daySessions.some((s) => s.cardio?.completed);
              const isSelected = selectedDate === cell.iso;
              const accent = hasWorkout ? DAY_ACCENTS[daySessions[0].workoutDayId] : undefined;

              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => setSelectedDate(isSelected ? null : cell.iso)}
                  style={{
                    height: 44,
                    borderRadius: 10,
                    background: isSelected
                      ? 'rgba(200, 255, 46, 0.22)'
                      : hasWorkout
                        ? 'rgba(255,255,255,0.06)'
                        : '#0A0D12',
                    border: isSelected
                      ? '1.5px solid var(--accent-volt)'
                      : hasWorkout
                        ? `1px solid ${accent}`
                        : '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 3,
                  }}
                >
                  <span
                    className="font-mono"
                    style={{
                      fontSize: 12.5,
                      fontWeight: hasWorkout ? 800 : 500,
                      color: hasWorkout ? 'var(--text-primary)' : 'var(--text-secondary)',
                    }}
                  >
                    {cell.dayNum}
                  </span>
                  <div style={{ display: 'flex', gap: 3 }}>
                    {hasWorkout && (
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 99,
                          background: accent,
                        }}
                      />
                    )}
                    {hasCardio && (
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 99,
                          background: '#FF6B2C',
                        }}
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 10,
              marginTop: 12,
              fontSize: 10.5,
              color: 'var(--text-muted)',
              justifyContent: 'center',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 7, height: 7, borderRadius: 99, background: '#C8FF2E' }} /> Sup A
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 7, height: 7, borderRadius: 99, background: '#22D3EE' }} /> Inf A
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 7, height: 7, borderRadius: 99, background: '#FF6B2C' }} /> Sup B / Cardio
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 7, height: 7, borderRadius: 99, background: '#A78BFA' }} /> Inf B
            </span>
          </div>

          {selectedDate && (
            <div style={{ marginTop: 10, textAlign: 'center' }}>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => setSelectedDate(null)}
              >
                Mostrando {selectedDate.split('-').reverse().join('/')} · Ver todos
              </button>
            </div>
          )}
        </div>
      )}

      {/* Lista cronológica de sessões */}
      {filteredSessions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 26 }}>
          <Dumbbell size={28} color="#66758D" style={{ marginBottom: 8 }} />
          <div style={{ fontWeight: 700, fontSize: 15 }}>Nenhum treino encontrado</div>
          <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--text-secondary)' }}>
            {selectedDate
              ? 'Não há treinos de musculação registrados nesta data.'
              : 'Finalize seu primeiro treino na aba Treino ou ative o modo demonstração para visualizar o histórico.'}
          </p>
        </div>
      ) : (
        filteredSessions.map((session) => {
          const isExpanded = expandedId === session.id;
          const accent = DAY_ACCENTS[session.workoutDayId];
          return (
            <div
              key={session.id}
              className="card"
              style={{ borderLeft: `3px solid ${accent}` }}
            >
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : session.id)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 10,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
                    <span className="pill font-mono">{session.date.split('-').reverse().join('/')}</span>
                    <span className="pill font-mono">
                      <Clock size={10} /> {formatDuration(session.durationSeconds)}
                    </span>
                    {session.prCount > 0 && (
                      <span className="pill pill-volt">
                        <Trophy size={10} /> {session.prCount} PR
                      </span>
                    )}
                  </div>
                  <h3 className="font-display" style={{ margin: 0, fontSize: 21 }}>
                    {session.workoutTitle}
                  </h3>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>
                    <strong className="font-mono" style={{ color: 'var(--text-primary)' }}>
                      {session.totalTonnageKg.toLocaleString('pt-BR')} kg
                    </strong>{' '}
                    tonelagem · {session.validSetsCount} séries válidas
                    {session.cardio?.completed ? ` · Cardio ${session.cardio.minutes}m` : ''}
                  </div>
                </div>

                {isExpanded ? <ChevronUp size={18} color="#9AA7BC" /> : <ChevronDown size={18} color="#9AA7BC" />}
              </button>

              {isExpanded && (
                <div style={{ marginTop: 12 }}>
                  <div className="divider" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {session.exercises.map((ex) => {
                      const validSets = ex.sets.filter((s) => !s.isWarmup && s.completed);
                      const warmups = ex.sets.filter((s) => s.isWarmup && s.completed);
                      if (validSets.length === 0 && warmups.length === 0) return null;

                      const bestEst = !ex.isIsometric
                        ? Math.max(
                            0,
                            ...validSets.map(
                              (s) => calculate1RM(s.weightKg, s.reps, formula1RM).selected,
                            ),
                          )
                        : 0;

                      return (
                        <div
                          key={ex.exerciseId}
                          style={{
                            background: '#0A0D12',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 11,
                            padding: '9px 10px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
                            <strong style={{ fontSize: 13 }}>{ex.exerciseName}</strong>
                            {bestEst > 0 && (
                              <span className="font-mono" style={{ fontSize: 11, color: 'var(--accent-cyan)' }}>
                                1RM {formatKg(bestEst)} kg
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                            {warmups.map((w) => (
                              <span
                                key={w.id}
                                className="pill pill-amber font-mono"
                                style={{ fontSize: 10.5, padding: '2px 7px' }}
                              >
                                <Flame size={9} /> {formatKg(w.weightKg)}×{w.reps}
                              </span>
                            ))}
                            {validSets.map((s, idx) => (
                              <span
                                key={s.id}
                                className={`pill font-mono ${s.prTypes?.length ? 'pill-volt' : ''}`}
                                style={{ fontSize: 11, padding: '2px 7px' }}
                              >
                                #{idx + 1} {formatKg(s.weightKg)}kg×{s.reps}
                                {ex.isIsometric ? 's' : ''}
                                {typeof s.rir === 'number' ? ` (RIR ${s.rir})` : ''}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {session.cardio?.completed && (
                    <div
                      style={{
                        marginTop: 8,
                        padding: '8px 10px',
                        borderRadius: 10,
                        background: 'var(--accent-ember-dim)',
                        fontSize: 12,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 7,
                      }}
                    >
                      <HeartPulse size={14} color="#FF8B57" />
                      <span>
                        Cardio: {session.cardio.minutes} min · {session.cardio.modality}
                        {session.cardio.distanceKm ? ` · ${session.cardio.distanceKm} km` : ''}
                      </span>
                    </div>
                  )}

                  {session.notes && (
                    <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      “{session.notes}”
                    </p>
                  )}

                  <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="btn btn-danger btn-xs"
                      onClick={() => onDeleteSession(session.id)}
                    >
                      <Trash2 size={12} /> Remover sessão
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};
