import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  Disc,
  Flame,
  HeartPulse,
  Play,
  Scale,
  Sparkles,
  X,
} from 'lucide-react';
import type {
  ActiveWorkoutDraft,
  BodyWeightEntry,
  CardioLog,
  DeloadAlert,
  ExerciseTemplate,
  WorkoutDayId,
  WorkoutDayTemplate,
  WorkoutSession,
} from '../types/workout';
import { REST_DAYS } from '../data/programPreset';
import { formatKg, getTodayISO } from '../engines/calculations';
import { getWeekStartISO } from '../engines/analytics';
import {
  EASE_PREMIUM,
  SegmentedControl,
  SheetModal,
  SubScreenSlide,
} from './MotionPrimitives';

interface TodayAndProgramViewProps {
  mode: 'today' | 'program';
  program: WorkoutDayTemplate[];
  sessions: WorkoutSession[];
  bodyWeights: BodyWeightEntry[];
  activeDraft: ActiveWorkoutDraft | null;
  deloadAlert: DeloadAlert;
  isDemoDataLoaded: boolean;
  onStartWorkout: (dayId: WorkoutDayId) => void;
  onResumeWorkout: () => void;
  onLogStandaloneCardio: (log: CardioLog) => void;
  onQuickLogWeight: (weightKg: number, fasting: boolean) => void;
  onOpenExerciseDetail: (dayId: WorkoutDayId, ex: ExerciseTemplate) => void;
  onOpenPlateCalc: () => void;
  onLoadDemoData: () => void;
  onClearDemoData: () => void;
}

const WEEK_STRIP = [
  { label: 'S', jsDay: 1, isLift: false },
  { label: 'T', jsDay: 2, isLift: true },
  { label: 'Q', jsDay: 3, isLift: true },
  { label: 'Q', jsDay: 4, isLift: true },
  { label: 'S', jsDay: 5, isLift: true },
  { label: 'S', jsDay: 6, isLift: false },
  { label: 'D', jsDay: 0, isLift: false },
];

export const TodayAndProgramView: React.FC<TodayAndProgramViewProps> = ({
  mode,
  program,
  sessions,
  bodyWeights,
  activeDraft,
  deloadAlert,
  isDemoDataLoaded,
  onStartWorkout,
  onResumeWorkout,
  onLogStandaloneCardio,
  onQuickLogWeight,
  onOpenExerciseDetail,
  onOpenPlateCalc,
  onLoadDemoData,
  onClearDemoData,
}) => {
  const now = new Date();
  const jsDay = now.getDay();
  const todayWorkout = program.find((d) => d.jsDayIndex === jsDay) ?? null;
  const todayRest = REST_DAYS.find((r) => r.jsDayIndex === jsDay) ?? null;

  // Estado da tela Ficha
  const [fichaTab, setFichaTab] = useState<string>(todayWorkout?.id ?? 'upper-a');

  // Sheets limpos (separam informação secundária da tela principal!)
  const [weightSheetOpen, setWeightSheetOpen] = useState(false);
  const [cardioSheetOpen, setCardioSheetOpen] = useState(false);
  const [deloadSheetOpen, setDeloadSheetOpen] = useState(false);

  const latestWeight = useMemo(
    () => [...bodyWeights].sort((a, b) => b.date.localeCompare(a.date))[0] ?? null,
    [bodyWeights],
  );
  const [weightDraft, setWeightDraft] = useState<string>(
    latestWeight ? String(latestWeight.weightKg) : '',
  );
  const [cardioMin, setCardioMin] = useState(35);
  const [cardioDist, setCardioDist] = useState('3.2');

  const currentWeekStart = useMemo(() => getWeekStartISO(now), []);
  const completedDaysThisWeek = useMemo(() => {
    const set = new Set<number>();
    for (const s of sessions) {
      if (getWeekStartISO(s.date) === currentWeekStart) {
        const dt = new Date(`${s.date}T12:00:00`);
        set.add(dt.getDay());
      }
    }
    return set;
  }, [sessions, currentWeekStart]);

  const dateFormatted = useMemo(
    () =>
      now
        .toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' })
        .replace('.', ''),
    [],
  );

  // =========================================================================
  // TELA "FICHA" — Limpa, segmentada por dia e sem poluição
  // =========================================================================
  if (mode === 'program') {
    const selectedDay = program.find((d) => d.id === fichaTab) ?? null;
    const totalWeeklySets = program.reduce(
      (sum, d) => sum + d.exercises.reduce((a, e) => a + e.targetSets, 0),
      0,
    );

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div className="t-kicker">Upper / Lower · 4 dias</div>
            <h1 className="t-title" style={{ marginTop: 4 }}>
              Ficha Semanal
            </h1>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="t-mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--volt)' }}>
              {totalWeeklySets}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-tertiary)' }}>séries/sem</div>
          </div>
        </div>

        <SegmentedControl
          id="ficha-days"
          value={fichaTab}
          onChange={setFichaTab}
          options={[
            { value: 'upper-a', label: 'TER' },
            { value: 'lower-a', label: 'QUA' },
            { value: 'upper-b', label: 'QUI' },
            { value: 'lower-b', label: 'SEX' },
            { value: 'rest', label: 'DESC' },
          ]}
        />

        <AnimatePresence mode="wait">
          {selectedDay ? (
            <SubScreenSlide screenKey={selectedDay.id}>
              {/* Cabeçalho limpo do dia */}
              <div className="fl-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div>
                  <div className="t-kicker">{selectedDay.dayName}</div>
                  <h2 className="t-display" style={{ margin: '4px 0 3px', fontSize: 30, fontWeight: 800 }}>
                    {selectedDay.title}
                  </h2>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-secondary)' }}>
                    {selectedDay.subtitle}
                  </p>
                </div>
                <button
                  type="button"
                  className="fl-btn fl-btn-volt fl-btn-sm"
                  onClick={() => onStartWorkout(selectedDay.id)}
                >
                  <Play size={14} fill="#070904" /> Treinar
                </button>
              </div>

              {/* Lista limpa de exercícios */}
              <div className="fl-list-group">
                {selectedDay.exercises.map((ex, idx) => (
                  <button
                    key={ex.id}
                    type="button"
                    className="fl-list-row"
                    onClick={() => onOpenExerciseDetail(selectedDay.id, ex)}
                    style={{
                      borderLeft: ex.bisetGroup
                        ? '3px solid var(--ember)'
                        : idx === 0
                          ? '3px solid var(--volt)'
                          : '3px solid transparent',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                      <span
                        className="t-mono"
                        style={{
                          width: 28,
                          fontSize: 12.5,
                          fontWeight: 700,
                          color: ex.bisetGroup
                            ? '#ff8c66'
                            : idx === 0
                              ? 'var(--volt)'
                              : 'var(--ink-tertiary)',
                          flexShrink: 0,
                        }}
                      >
                        {ex.orderLabel}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 14.5,
                            fontWeight: 600,
                            color: 'var(--ink-primary)',
                            lineHeight: 1.25,
                          }}
                        >
                          {ex.name}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: 'var(--ink-tertiary)',
                            marginTop: 2,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <span className="t-mono" style={{ color: 'var(--ink-secondary)' }}>
                            {ex.targetSets}×{ex.repMin}–{ex.repMax}
                            {ex.isIsometric ? 's' : ''}
                          </span>
                          <span>·</span>
                          <span>{ex.restLabel}</span>
                          {idx === 0 && (
                            <>
                              <span>·</span>
                              <span style={{ color: 'var(--amber)' }}>+ Aquec.</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={17} color="var(--ink-tertiary)" style={{ flexShrink: 0 }} />
                  </button>
                ))}
              </div>

              {/* Linha discreta de cardio do dia */}
              <div
                className="fl-card fl-card-compact"
                style={{ display: 'flex', alignItems: 'center', gap: 12 }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 11,
                    background: selectedDay.cardio.enabled ? 'var(--ember-soft)' : 'rgba(255,255,255,0.04)',
                    display: 'grid',
                    placeItems: 'center',
                    color: selectedDay.cardio.enabled ? '#ff8c66' : 'var(--ink-tertiary)',
                    flexShrink: 0,
                  }}
                >
                  <HeartPulse size={17} />
                </div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{selectedDay.cardio.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-secondary)' }}>
                    {selectedDay.cardio.modalitySuggestion}
                  </div>
                </div>
              </div>
            </SubScreenSlide>
          ) : (
            <SubScreenSlide screenKey="rest">
              <div className="fl-list-group">
                {REST_DAYS.map((rd) => (
                  <div key={rd.dayOfWeek} className="fl-list-row" style={{ alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <span
                        className="t-mono"
                        style={{
                          width: 34,
                          fontSize: 12,
                          fontWeight: 700,
                          color: rd.optionalCardio ? 'var(--cyan)' : 'var(--ink-tertiary)',
                          marginTop: 2,
                        }}
                      >
                        {rd.shortDay}
                      </span>
                      <div>
                        <div style={{ fontSize: 14.5, fontWeight: 600 }}>{rd.title}</div>
                        <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--ink-secondary)' }}>
                          {rd.description}
                        </p>
                        {rd.optionalCardio && (
                          <div style={{ marginTop: 6, fontSize: 12, fontWeight: 600, color: 'var(--cyan)' }}>
                            Meta opcional: {rd.optionalCardio.label}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SubScreenSlide>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // =========================================================================
  // TELA "HOJE" — Editorial, espaçosa, zero poluição visual
  // =========================================================================
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Saudação editorial + fita semanal minimalista */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div className="t-kicker" style={{ textTransform: 'capitalize' }}>
              {dateFormatted}
            </div>
            <h1 className="t-title" style={{ fontSize: 28, marginTop: 3 }}>
              {todayWorkout ? 'Pronto para treinar' : 'Recuperação ativa'}
            </h1>
          </div>
          <span className="t-mono" style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>
            {completedDaysThisWeek.size}/4 sem
          </span>
        </div>

        {/* Fita dos 7 dias da semana */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 6,
            padding: '10px 10px',
            borderRadius: 18,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--hairline)',
          }}
        >
          {WEEK_STRIP.map((d, i) => {
            const isToday = d.jsDay === jsDay;
            const isDone = completedDaysThisWeek.has(d.jsDay);
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 0',
                  borderRadius: 12,
                  background: isToday ? 'rgba(255,255,255,0.05)' : 'transparent',
                }}
              >
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: isToday ? 700 : 500,
                    color: isToday ? 'var(--ink-primary)' : 'var(--ink-tertiary)',
                  }}
                >
                  {d.label}
                </span>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 99,
                    background: isDone
                      ? 'var(--volt)'
                      : d.isLift
                        ? 'rgba(255,255,255,0.16)'
                        : 'rgba(255,255,255,0.05)',
                    boxShadow: isDone ? '0 0 10px rgba(204,255,0,0.6)' : 'none',
                    outline: isToday ? '2px solid rgba(204,255,0,0.45)' : 'none',
                    outlineOffset: 2,
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Aviso discreto de sessão pausada */}
      {activeDraft && (
        <motion.button
          type="button"
          whileTap={{ scale: 0.985 }}
          onClick={onResumeWorkout}
          className="fl-card fl-card-compact"
          style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderColor: 'var(--ember-border)',
            background: 'linear-gradient(135deg, rgba(255,98,46,0.14), var(--bg-elevated))',
            textAlign: 'left',
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#ff8c66', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Sessão em andamento
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>
              {activeDraft.workoutTitle.split('—')[0]}
            </div>
          </div>
          <span className="fl-btn fl-btn-ember fl-btn-xs">
            Retomar <ArrowRight size={13} />
          </span>
        </motion.button>
      )}

      {/* Aviso discreto de Deload (só se recomendado) */}
      {deloadAlert.shouldDeload && (
        <button
          type="button"
          onClick={() => setDeloadSheetOpen(true)}
          className="fl-card fl-card-compact"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            borderColor: 'var(--amber-border)',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={17} color="var(--amber)" />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#fde68a' }}>
                Deload sugerido esta semana
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-secondary)' }}>
                Toque para ver o protocolo de recuperação
              </div>
            </div>
          </div>
          <ChevronRight size={16} color="var(--ink-tertiary)" />
        </button>
      )}

      {/* HERO CARD ÚNICO DO DIA */}
      {todayWorkout ? (
        <motion.div
          className="fl-hero-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: EASE_PREMIUM }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="fl-pill fl-pill-volt">{todayWorkout.dayName}</span>
            <span className="t-mono" style={{ fontSize: 12, color: 'var(--ink-secondary)' }}>
              {todayWorkout.exercises.length} estações ·{' '}
              {todayWorkout.exercises.reduce((a, e) => a + e.targetSets, 0)} séries
            </span>
          </div>

          <h2
            className="t-display"
            style={{ margin: '18px 0 6px', fontSize: 44, fontWeight: 800, letterSpacing: '0.01em' }}
          >
            {todayWorkout.title}
          </h2>
          <p style={{ margin: '0 0 22px', fontSize: 14.5, color: 'var(--ink-secondary)' }}>
            {todayWorkout.subtitle}
            {todayWorkout.cardio.enabled
              ? ` · ${todayWorkout.cardio.targetMinutesMin} min cardio`
              : ''}
          </p>

          <button
            type="button"
            className="fl-btn fl-btn-volt fl-btn-block"
            onClick={() => onStartWorkout(todayWorkout.id)}
          >
            <Play size={18} fill="#070904" />
            Iniciar {todayWorkout.title}
          </button>
        </motion.div>
      ) : (
        <motion.div
          className="fl-hero-card"
          style={{
            background:
              'radial-gradient(circle at 90% 12%, rgba(56,189,248,0.14), transparent 55%), linear-gradient(160deg, #151923 0%, #0d1017 100%)',
          }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: EASE_PREMIUM }}
        >
          <span className="fl-pill fl-pill-cyan">{todayRest?.dayName ?? 'Descanso'}</span>
          <h2 className="t-display" style={{ margin: '16px 0 6px', fontSize: 38, fontWeight: 800 }}>
            Descanso de Pesos
          </h2>
          <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--ink-secondary)' }}>
            {todayRest?.optionalCardio
              ? 'Meta opcional de hoje: 30 a 40 min de caminhada leve para sustentar o déficit calórico.'
              : 'Recupere o sistema nervoso para render no máximo na sequência Terça a Sexta.'}
          </p>
          <button
            type="button"
            className="fl-btn fl-btn-surface fl-btn-block"
            onClick={() => setCardioSheetOpen(true)}
          >
            <HeartPulse size={17} color="var(--cyan)" />
            Registrar cardio leve opcional
          </button>
        </motion.div>
      )}

      {/* 2 Atalhos Silenciosos: Peso em Jejum + Anilhas */}
      <div className="fl-grid-2">
        <button
          type="button"
          className="fl-card fl-card-compact"
          style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 10 }}
          onClick={() => {
            setWeightDraft(latestWeight ? String(latestWeight.weightKg) : '');
            setWeightSheetOpen(true);
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Scale size={17} color="var(--cyan)" />
            <ChevronRight size={15} color="var(--ink-tertiary)" />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>Peso em jejum</div>
            <div className="t-mono" style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>
              {latestWeight ? `${formatKg(latestWeight.weightKg)} kg` : 'Registrar'}
            </div>
          </div>
        </button>

        <button
          type="button"
          className="fl-card fl-card-compact"
          style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 10 }}
          onClick={onOpenPlateCalc}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Disc size={17} color="var(--volt)" />
            <ChevronRight size={15} color="var(--ink-tertiary)" />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>Calculadora</div>
            <div style={{ fontSize: 17, fontWeight: 700, marginTop: 3 }}>Anilhas</div>
          </div>
        </button>
      </div>

      {/* Lista limpa para iniciar qualquer dia da ficha */}
      <div>
        <div className="t-kicker" style={{ marginBottom: 10, paddingLeft: 4 }}>
          Treinos da semana (Ter → Sex)
        </div>
        <div className="fl-list-group">
          {program.map((day) => {
            const last = sessions.find((s) => s.workoutDayId === day.id);
            const isToday = day.jsDayIndex === jsDay;
            return (
              <button
                key={day.id}
                type="button"
                className="fl-list-row"
                onClick={() => onStartWorkout(day.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                  <span
                    className="t-mono"
                    style={{
                      width: 34,
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: isToday ? 'var(--volt)' : 'var(--ink-tertiary)',
                    }}
                  >
                    {day.shortDay}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{day.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-tertiary)', marginTop: 1 }}>
                      {day.subtitle}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  {last && (
                    <span className="t-mono" style={{ fontSize: 11.5, color: 'var(--ink-tertiary)' }}>
                      {last.date.split('-').reverse().slice(0, 2).join('/')}
                    </span>
                  )}
                  <ChevronRight size={16} color="var(--ink-tertiary)" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Atalho discreto para dados de demonstração */}
      {sessions.length === 0 ? (
        <button
          type="button"
          className="fl-btn fl-btn-ghost fl-btn-sm fl-btn-block"
          onClick={onLoadDemoData}
        >
          <Sparkles size={14} color="var(--volt)" />
          Ver demo com 4 semanas simuladas
        </button>
      ) : isDemoDataLoaded ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 14px',
            borderRadius: 14,
            background: 'var(--amber-soft)',
            fontSize: 12,
            color: '#fde68a',
          }}
        >
          <span>Modo demonstração ativo</span>
          <button type="button" className="fl-btn fl-btn-xs fl-btn-danger" onClick={onClearDemoData}>
            Zerar p/ meus dados
          </button>
        </div>
      ) : null}

      {/* Sheet: Registrar Peso em Jejum */}
      <AnimatePresence>
        {weightSheetOpen && (
          <SheetModal ariaLabel="Registrar peso corporal em jejum" onClose={() => setWeightSheetOpen(false)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div className="t-kicker">Acompanhamento de corte</div>
                <h3 className="t-title" style={{ fontSize: 21, marginTop: 2 }}>
                  Peso em Jejum
                </h3>
              </div>
              <button type="button" className="fl-icon-btn" onClick={() => setWeightSheetOpen(false)} aria-label="Fechar">
                <X size={18} />
              </button>
            </div>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              placeholder="Ex.: 84.5"
              aria-label="Peso corporal em jejum em kg"
              className="fl-input t-mono"
              style={{ fontSize: 24, textAlign: 'center', fontWeight: 700, marginBottom: 16 }}
              value={weightDraft}
              onChange={(e) => setWeightDraft(e.target.value)}
            />
            <button
              type="button"
              className="fl-btn fl-btn-volt fl-btn-block"
              onClick={() => {
                const num = Number(weightDraft.replace(',', '.'));
                if (Number.isFinite(num) && num >= 25 && num <= 300) {
                  onQuickLogWeight(num, true);
                  setWeightSheetOpen(false);
                }
              }}
            >
              Salvar peso de hoje
            </button>
          </SheetModal>
        )}
      </AnimatePresence>

      {/* Sheet: Registrar Cardio de Dia de Descanso */}
      <AnimatePresence>
        {cardioSheetOpen && (
          <SheetModal ariaLabel="Registrar cardio leve" onClose={() => setCardioSheetOpen(false)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div className="t-kicker">Cardio leve · Zona 2</div>
                <h3 className="t-title" style={{ fontSize: 21, marginTop: 2 }}>
                  Registrar Caminhada
                </h3>
              </div>
              <button type="button" className="fl-icon-btn" onClick={() => setCardioSheetOpen(false)} aria-label="Fechar">
                <X size={18} />
              </button>
            </div>
            <div className="fl-grid-2" style={{ marginBottom: 16 }}>
              <div>
                <label className="t-kicker" htmlFor="rest-c-min">Minutos</label>
                <input
                  id="rest-c-min"
                  type="number"
                  className="fl-input t-mono"
                  style={{ marginTop: 6, textAlign: 'center', fontWeight: 700 }}
                  value={cardioMin}
                  onChange={(e) => setCardioMin(Math.max(1, Number(e.target.value) || 30))}
                />
              </div>
              <div>
                <label className="t-kicker" htmlFor="rest-c-dist">Distância (km)</label>
                <input
                  id="rest-c-dist"
                  type="number"
                  step="0.1"
                  className="fl-input t-mono"
                  style={{ marginTop: 6, textAlign: 'center', fontWeight: 700 }}
                  value={cardioDist}
                  onChange={(e) => setCardioDist(e.target.value)}
                />
              </div>
            </div>
            <button
              type="button"
              className="fl-btn fl-btn-volt fl-btn-block"
              onClick={() => {
                onLogStandaloneCardio({
                  id: `rest-cardio-${Date.now()}`,
                  date: getTodayISO(),
                  modality: 'Caminhada leve / Cardio Zona 2',
                  minutes: cardioMin,
                  distanceKm: cardioDist ? Number(cardioDist) : undefined,
                  completed: true,
                });
                setCardioSheetOpen(false);
              }}
            >
              Salvar cardio no histórico
            </button>
          </SheetModal>
        )}
      </AnimatePresence>

      {/* Sheet: Protocolo de Deload */}
      <AnimatePresence>
        {deloadSheetOpen && (
          <SheetModal ariaLabel="Protocolo inteligente de Deload" onClose={() => setDeloadSheetOpen(false)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Flame size={18} color="var(--amber)" />
                <h3 className="t-title" style={{ fontSize: 20 }}>Protocolo de Deload</h3>
              </div>
              <button type="button" className="fl-icon-btn" onClick={() => setDeloadSheetOpen(false)} aria-label="Fechar">
                <X size={18} />
              </button>
            </div>
            <p style={{ margin: '0 0 14px', fontSize: 13.5, color: 'var(--ink-secondary)' }}>
              {deloadAlert.summary}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {deloadAlert.protocolTips.map((tip, i) => (
                <div key={i} className="fl-card fl-card-compact" style={{ fontSize: 13 }}>
                  {tip}
                </div>
              ))}
            </div>
            <button type="button" className="fl-btn fl-btn-surface fl-btn-block" onClick={() => setDeloadSheetOpen(false)}>
              Entendido
            </button>
          </SheetModal>
        )}
      </AnimatePresence>
    </div>
  );
};
