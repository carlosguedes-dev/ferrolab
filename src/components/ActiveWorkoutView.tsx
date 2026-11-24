import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Disc,
  Flame,
  Info,
  Link2,
  ListChecks,
  Pause,
  Play,
  Plus,
  Sun,
  Timer,
  Trash2,
  TrendingUp,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import type {
  ActiveWorkoutDraft,
  CardioLog,
  ExerciseTemplate,
  OneRMFormula,
  RestTimerState,
  SessionExerciseLog,
  SetEntry,
  WorkoutDayTemplate,
  WorkoutSession,
} from '../types/workout';
import {
  calculate1RM,
  calculateExerciseTonnage,
  formatDuration,
  formatKg,
  generateProgressiveWarmupSets,
  getBestSet1RM,
} from '../engines/calculations';
import {
  computeDoubleProgression,
  detectSetPRs,
  getLastExerciseLog,
} from '../engines/progression';
import { playPRFanfareCue, playSetCheckedCue } from '../engines/audio';
import { MUSCLE_LABELS } from '../data/programPreset';
import { IsometricTimerInline } from './IsometricTimerInline';
import {
  SPRING_SNAPPY,
  SheetModal,
  SubScreenSlide,
} from './MotionPrimitives';

interface ActiveWorkoutViewProps {
  draft: ActiveWorkoutDraft;
  dayTemplate: WorkoutDayTemplate;
  sessions: WorkoutSession[];
  machineNotes: Record<string, string>;
  formula1RM: OneRMFormula;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  autoStartRestTimer: boolean;
  showRirColumn: boolean;
  wakeLockSupported: boolean;
  wakeLockActive: boolean;
  wakeLockEnabled: boolean;
  onToggleWakeLock: () => void;
  onUpdateDraft: (updater: (prev: ActiveWorkoutDraft) => ActiveWorkoutDraft) => void;
  onStartRestTimer: (timer: RestTimerState) => void;
  onOpenAnatomy: (exercise: ExerciseTemplate, bestWeight: number, bestReps: number) => void;
  onOpenPlateCalc: (weightKg: number, exerciseName: string, barWeight?: 0 | 10 | 12 | 20) => void;
  onFinishWorkout: () => void;
  onDiscardWorkout: () => void;
  onShowToast: (msg: string, variant: 'pr' | 'info' | 'error') => void;
}

type StationBlock =
  | { kind: 'single'; index: number; log: SessionExerciseLog; template: ExerciseTemplate }
  | {
      kind: 'biset';
      group: string;
      indexA: number;
      indexB: number;
      logA: SessionExerciseLog;
      logB: SessionExerciseLog;
      templateA: ExerciseTemplate;
      templateB: ExerciseTemplate;
    }
  | { kind: 'cardio' };

export const ActiveWorkoutView: React.FC<ActiveWorkoutViewProps> = ({
  draft,
  dayTemplate,
  sessions,
  machineNotes,
  formula1RM,
  soundEnabled,
  vibrationEnabled,
  autoStartRestTimer,
  showRirColumn,
  wakeLockSupported,
  wakeLockActive,
  wakeLockEnabled,
  onToggleWakeLock,
  onUpdateDraft,
  onStartRestTimer,
  onOpenAnatomy,
  onOpenPlateCalc,
  onFinishWorkout,
  onDiscardWorkout,
  onShowToast,
}) => {
  const [elapsedSec, setElapsedSec] = useState(() =>
    Math.max(0, Math.floor((Date.now() - draft.startedAt) / 1000)),
  );
  const [stationIdx, setStationIdx] = useState(0);
  const [slideDir, setSlideDir] = useState(1);
  const [viewMode, setViewMode] = useState<'focus' | 'all'>('focus');
  const [mapSheetOpen, setMapSheetOpen] = useState(false);
  const [finishSheetOpen, setFinishSheetOpen] = useState(false);
  const [cardioTimerRunning, setCardioTimerRunning] = useState(false);
  const [cardioTimerSec, setCardioTimerSec] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setElapsedSec(Math.max(0, Math.floor((Date.now() - draft.startedAt) / 1000)));
    }, 1000);
    return () => window.clearInterval(id);
  }, [draft.startedAt]);

  useEffect(() => {
    if (!cardioTimerRunning) return;
    const id = window.setInterval(() => setCardioTimerSec((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [cardioTimerRunning]);

  const templateMap = useMemo(() => {
    const map = new Map<string, ExerciseTemplate>();
    for (const ex of dayTemplate.exercises) map.set(ex.id, ex);
    return map;
  }, [dayTemplate.exercises]);

  const liveStats = useMemo(() => {
    let completedValid = 0;
    let plannedValid = 0;
    let tonnage = 0;
    let prs = 0;
    for (const ex of draft.exercises) {
      for (const s of ex.sets) {
        if (!s.isWarmup) {
          plannedValid += 1;
          if (s.completed) {
            completedValid += 1;
            if (s.prTypes && s.prTypes.length > 0) prs += 1;
          }
        }
      }
      tonnage += calculateExerciseTonnage(ex.sets, !!ex.isIsometric, !!ex.isUnilateral);
    }
    return { completedValid, plannedValid, tonnage: Math.round(tonnage), prs };
  }, [draft.exercises]);

  const stations = useMemo<StationBlock[]>(() => {
    const result: StationBlock[] = [];
    for (let i = 0; i < draft.exercises.length; i++) {
      const log = draft.exercises[i];
      const tpl = templateMap.get(log.exerciseId) ?? dayTemplate.exercises[i];
      if (!tpl) continue;
      const nextLog = draft.exercises[i + 1];
      const nextTpl = nextLog
        ? templateMap.get(nextLog.exerciseId) ?? dayTemplate.exercises[i + 1]
        : undefined;

      if (
        log.bisetGroup &&
        log.bisetRole === 'A' &&
        nextLog &&
        nextLog.bisetGroup === log.bisetGroup &&
        nextLog.bisetRole === 'B' &&
        nextTpl
      ) {
        result.push({
          kind: 'biset',
          group: log.bisetGroup,
          indexA: i,
          indexB: i + 1,
          logA: log,
          logB: nextLog,
          templateA: tpl,
          templateB: nextTpl,
        });
        i += 1;
      } else {
        result.push({ kind: 'single', index: i, log, template: tpl });
      }
    }
    if (dayTemplate.cardio.enabled) {
      result.push({ kind: 'cardio' });
    }
    return result;
  }, [draft.exercises, templateMap, dayTemplate]);

  const safeStationIdx = Math.min(stationIdx, Math.max(0, stations.length - 1));
  const currentStation = stations[safeStationIdx];

  const goToStation = (nextIndex: number) => {
    const clamped = Math.max(0, Math.min(stations.length - 1, nextIndex));
    setSlideDir(clamped >= safeStationIdx ? 1 : -1);
    setStationIdx(clamped);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const updateSetField = (
    exIndex: number,
    setIndex: number,
    patch: Partial<SetEntry>,
    autoSyncWarmupIncKg?: number,
  ) => {
    onUpdateDraft((prev) => {
      const nextEx = [...prev.exercises];
      const ex = { ...nextEx[exIndex] };
      const nextSets = [...ex.sets];
      const targetSet = nextSets[setIndex];
      nextSets[setIndex] = { ...targetSet, ...patch };

      if (
        exIndex === 0 &&
        !targetSet.isWarmup &&
        typeof patch.weightKg === 'number' &&
        autoSyncWarmupIncKg
      ) {
        const firstWorkingIndex = nextSets.findIndex((s) => !s.isWarmup);
        if (setIndex === firstWorkingIndex) {
          const base = patch.weightKg;
          for (let i = 0; i < nextSets.length; i++) {
            const wu = nextSets[i];
            if (wu.isWarmup && !wu.completed && wu.warmupPercent) {
              nextSets[i] = {
                ...wu,
                weightKg:
                  base > 0
                    ? Math.round(((base * wu.warmupPercent) / 100) / autoSyncWarmupIncKg) *
                      autoSyncWarmupIncKg
                    : 0,
              };
            }
          }
        }
      }

      ex.sets = nextSets;
      nextEx[exIndex] = ex;
      return { ...prev, exercises: nextEx };
    });
  };

  const toggleSetComplete = (
    exIndex: number,
    setIndex: number,
    template: ExerciseTemplate,
    partnerBOrderLabel?: string,
  ) => {
    const currentSet = draft.exercises[exIndex]?.sets[setIndex];
    if (!currentSet) return;
    const nextCompleted = !currentSet.completed;

    let prTypes: SetEntry['prTypes'] = undefined;
    if (nextCompleted && !currentSet.isWarmup) {
      const candidate: SetEntry = { ...currentSet, completed: true };
      const detected = detectSetPRs(
        template.id,
        candidate,
        sessions,
        formula1RM,
        !!template.isIsometric,
      );
      if (detected.length > 0) {
        prTypes = detected;
        playPRFanfareCue(soundEnabled, vibrationEnabled);
        const label = detected.includes('1rm')
          ? 'Novo PR de 1RM!'
          : detected.includes('weight')
            ? 'Novo PR de Carga!'
            : 'Novo Recorde!';
        onShowToast(
          `${label} ${template.name}: ${formatKg(candidate.weightKg)} kg × ${candidate.reps}${template.isIsometric ? 's' : ''}`,
          'pr',
        );
      } else {
        playSetCheckedCue(soundEnabled, vibrationEnabled);
      }
    } else if (nextCompleted && currentSet.isWarmup) {
      playSetCheckedCue(soundEnabled, vibrationEnabled);
    }

    updateSetField(exIndex, setIndex, {
      completed: nextCompleted,
      completedAt: nextCompleted ? Date.now() : undefined,
      prTypes: nextCompleted ? prTypes : undefined,
    });

    if (nextCompleted && autoStartRestTimer) {
      if (template.bisetRole === 'A' && !currentSet.isWarmup) {
        onShowToast(
          `${template.orderLabel} concluído — sem descanso! Siga direto para ${partnerBOrderLabel ?? 'B'}.`,
          'info',
        );
        return;
      }
      const restSec = currentSet.isWarmup ? 45 : template.restSeconds;
      if (restSec > 0) {
        const now = Date.now();
        onStartRestTimer({
          exerciseName: currentSet.isWarmup
            ? `Aquecimento · ${template.name}`
            : template.bisetRole === 'B'
              ? `Pós-Biset (${template.orderLabel})`
              : template.name,
          durationSeconds: restSec,
          remainingSeconds: restSec,
          startedAt: now,
          endsAt: now + restSec * 1000,
          paused: false,
        });
      }
    }
  };

  const addSetToExercise = (exIndex: number, isWarmup: boolean) => {
    onUpdateDraft((prev) => {
      const nextEx = [...prev.exercises];
      const ex = { ...nextEx[exIndex] };
      const lastWorking = [...ex.sets].reverse().find((s) => !s.isWarmup);
      const newSet: SetEntry = {
        id: `set-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        isWarmup,
        weightKg: isWarmup
          ? Math.round(((lastWorking?.weightKg ?? 40) * 0.5) / 2) * 2
          : lastWorking?.weightKg ?? 0,
        reps: isWarmup ? 6 : lastWorking?.reps ?? 8,
        rir: null,
        completed: false,
      };
      if (isWarmup) {
        const firstWorkingIdx = ex.sets.findIndex((s) => !s.isWarmup);
        const copy = [...ex.sets];
        if (firstWorkingIdx === -1) copy.push(newSet);
        else copy.splice(firstWorkingIdx, 0, newSet);
        ex.sets = copy;
      } else {
        ex.sets = [...ex.sets, newSet];
      }
      nextEx[exIndex] = ex;
      return { ...prev, exercises: nextEx };
    });
  };

  const removeSetFromExercise = (exIndex: number, setIndex: number) => {
    onUpdateDraft((prev) => {
      const nextEx = [...prev.exercises];
      const ex = { ...nextEx[exIndex] };
      if (ex.sets.length <= 1) return prev;
      ex.sets = ex.sets.filter((_, i) => i !== setIndex);
      nextEx[exIndex] = ex;
      return { ...prev, exercises: nextEx };
    });
  };

  const applySuggestedWeight = (
    exIndex: number,
    weightKg: number,
    isFirstEx: boolean,
    incKg: number,
  ) => {
    onUpdateDraft((prev) => {
      const nextEx = [...prev.exercises];
      const ex = { ...nextEx[exIndex] };
      ex.sets = ex.sets.map((s) => {
        if (s.isWarmup && s.warmupPercent) {
          return {
            ...s,
            weightKg: Math.round(((weightKg * s.warmupPercent) / 100) / incKg) * incKg,
          };
        }
        return s.completed ? s : { ...s, weightKg };
      });
      nextEx[exIndex] = ex;
      return { ...prev, exercises: nextEx };
    });
    onShowToast(
      isFirstEx
        ? `${formatKg(weightKg)} kg aplicado (+ aquecimento ajustado)`
        : `${formatKg(weightKg)} kg aplicado às séries`,
      'info',
    );
  };

  const regenerateWarmupsForFirst = (exIndex: number, template: ExerciseTemplate) => {
    const ex = draft.exercises[exIndex];
    const firstWorking = ex.sets.find((s) => !s.isWarmup);
    const baseWeight = firstWorking?.weightKg ?? 0;
    const warmups = generateProgressiveWarmupSets(
      baseWeight,
      template.loadIncrementKg,
      template.defaultBarWeightKg && template.defaultBarWeightKg > 0
        ? Math.min(template.defaultBarWeightKg, baseWeight)
        : 0,
    );
    onUpdateDraft((prev) => {
      const nextEx = [...prev.exercises];
      const target = { ...nextEx[exIndex] };
      target.sets = [...warmups, ...target.sets.filter((s) => !s.isWarmup)];
      nextEx[exIndex] = target;
      return { ...prev, exercises: nextEx, warmupsEnabled: true };
    });
    onShowToast('Aquecimento (50% · 70% · 85%) atualizado.', 'info');
  };

  const updateCardio = (patch: Partial<CardioLog>) => {
    onUpdateDraft((prev) => ({
      ...prev,
      cardio: {
        id: prev.cardio?.id ?? `cardio-${Date.now()}`,
        date: prev.date,
        modality: prev.cardio?.modality ?? dayTemplate.cardio.modalitySuggestion,
        minutes: prev.cardio?.minutes ?? (dayTemplate.cardio.targetMinutesMin || 20),
        distanceKm: prev.cardio?.distanceKm,
        speedKmh: prev.cardio?.speedKmh,
        notes: prev.cardio?.notes ?? '',
        completed: prev.cardio?.completed ?? false,
        ...patch,
      },
    }));
  };

  const renderExerciseSurface = (
    exIndex: number,
    log: SessionExerciseLog,
    template: ExerciseTemplate,
    partnerBOrderLabel?: string,
  ) => {
    const isFirstExercise = exIndex === 0;
    const progression = computeDoubleProgression(template, sessions);
    const prevLog = getLastExerciseLog(template.id, sessions);
    const { best1RM, bestWeightKg, bestReps } = getBestSet1RM(
      log.sets,
      formula1RM,
      !!template.isIsometric,
    );
    const firstValidSet = log.sets.find((s) => !s.isWarmup);
    const previewWeight =
      bestWeightKg || firstValidSet?.weightKg || progression.suggestedWeightKg || 0;
    const previewReps = bestReps || firstValidSet?.reps || template.repMax;
    const live1RM =
      !template.isIsometric && previewWeight > 0 && previewReps > 0
        ? calculate1RM(previewWeight, previewReps, formula1RM, template.loadIncrementKg)
        : null;
    const pinnedNote = machineNotes[template.id] ?? '';

    const warmupSets = log.sets
      .map((s, idx) => ({ set: s, idx }))
      .filter((item) => item.set.isWarmup);
    const workingSets = log.sets
      .map((s, idx) => ({ set: s, idx }))
      .filter((item) => !item.set.isWarmup);

    const gridCols = showRirColumn
      ? '34px 1fr 1fr 40px 44px'
      : '34px 1fr 1fr 44px';

    return (
      <div
        key={log.exerciseId}
        id={`exercise-card-${log.exerciseId}`}
        className="fl-card"
        style={{ padding: '18px 16px' }}
      >
        {/* Cabeçalho limpo e editorial */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div className="t-kicker" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: template.bisetGroup ? '#ff8c66' : 'var(--volt)' }}>
                #{template.orderLabel}
              </span>
              <span>·</span>
              <span>{MUSCLE_LABELS[template.primaryMuscle]}</span>
              <span>·</span>
              <span className="t-mono">
                {template.targetSets}×{template.repMin}–{template.repMax}
                {template.isIsometric ? 's' : ''}
              </span>
            </div>
            <h2
              style={{
                margin: '6px 0 4px',
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
              }}
            >
              {template.name}
            </h2>
            <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ink-secondary)' }}>
              {template.techniqueCue}
            </p>
          </div>
        </div>

        {/* Nota fixa do aparelho (discreta) */}
        {pinnedNote && (
          <button
            type="button"
            onClick={() => onOpenAnatomy(template, previewWeight, previewReps)}
            style={{
              marginTop: 10,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              color: 'var(--cyan)',
            }}
          >
            <Bookmark size={12} />
            <span>{pinnedNote}</span>
          </button>
        )}

        {/* Linha única de ferramentas silenciosas */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
          <button
            type="button"
            className="fl-btn fl-btn-ghost fl-btn-xs"
            onClick={() => onOpenAnatomy(template, previewWeight, previewReps)}
          >
            <Info size={13} /> Anatomia & Técnica
          </button>
          {live1RM && live1RM.selected > 0 && (
            <button
              type="button"
              className="fl-btn fl-btn-ghost fl-btn-xs t-mono"
              style={{ color: 'var(--cyan)' }}
              onClick={() => onOpenAnatomy(template, previewWeight, previewReps)}
            >
              <Zap size={12} /> 1RM {formatKg(best1RM || live1RM.selected)}
            </button>
          )}
          {!template.isIsometric && (
            <button
              type="button"
              className="fl-btn fl-btn-ghost fl-btn-xs"
              onClick={() =>
                onOpenPlateCalc(previewWeight || 60, template.name, template.defaultBarWeightKg)
              }
            >
              <Disc size={13} /> Anilhas
            </button>
          )}
        </div>

        {/* Barra de Progressão Dupla em 1 linha limpa */}
        {progression.suggestedWeightKg !== null && (
          <div
            style={{
              marginTop: 12,
              padding: '10px 12px',
              borderRadius: 14,
              background:
                progression.status === 'progress' ? 'var(--volt-soft)' : 'var(--bg-elevated-2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <TrendingUp
                size={15}
                color={progression.status === 'progress' ? 'var(--volt)' : 'var(--ink-secondary)'}
                style={{ flexShrink: 0 }}
              />
              <span
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: progression.status === 'progress' ? 'var(--volt)' : 'var(--ink-primary)',
                }}
              >
                {progression.headline}
              </span>
            </div>
            <button
              type="button"
              className={`fl-btn fl-btn-xs ${
                progression.status === 'progress' ? 'fl-btn-volt' : 'fl-btn-surface'
              }`}
              onClick={() =>
                applySuggestedWeight(
                  exIndex,
                  progression.suggestedWeightKg!,
                  isFirstExercise,
                  template.loadIncrementKg,
                )
              }
            >
              Aplicar
            </button>
          </div>
        )}

        {/* Aquecimento progressivo separado visualmente (somente 1º exercício ou se adicionado) */}
        {warmupSets.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                  color: 'var(--amber)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <Flame size={12} /> Aquecimento progressivo (não conta no 1RM)
              </span>
              {isFirstExercise && (
                <button
                  type="button"
                  style={{ fontSize: 11, color: 'var(--ink-tertiary)' }}
                  onClick={() => regenerateWarmupsForFirst(exIndex, template)}
                >
                  Recalcular
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {warmupSets.map(({ set, idx }) => (
                <div
                  key={set.id}
                  className={`fl-set-row warmup ${set.completed ? 'done' : ''}`}
                  style={{ gridTemplateColumns: gridCols }}
                >
                  <div style={{ textAlign: 'center' }}>
                    <span
                      className="t-mono"
                      style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--amber)' }}
                    >
                      {set.warmupPercent ? `${set.warmupPercent}%` : 'AQ'}
                    </span>
                    <span style={{ display: 'none' }}>
                      SÉRIE DE AQUECIMENTO ({set.warmupPercent ?? 50}%)
                    </span>
                  </div>

                  <div className="fl-stepper">
                    <button
                      type="button"
                      className="fl-stepper-btn"
                      aria-label="Diminuir carga"
                      onClick={() =>
                        updateSetField(exIndex, idx, {
                          weightKg: Math.max(0, set.weightKg - template.loadIncrementKg),
                        })
                      }
                    >
                      −
                    </button>
                    <input
                      type="number"
                      inputMode="decimal"
                      aria-label="Carga em kg"
                      className="fl-stepper-val"
                      value={set.weightKg}
                      onChange={(e) =>
                        updateSetField(exIndex, idx, {
                          weightKg: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                    />
                    <button
                      type="button"
                      className="fl-stepper-btn"
                      aria-label="Aumentar carga"
                      onClick={() =>
                        updateSetField(exIndex, idx, {
                          weightKg: set.weightKg + template.loadIncrementKg,
                        })
                      }
                    >
                      +
                    </button>
                  </div>

                  <div className="fl-stepper">
                    <button
                      type="button"
                      className="fl-stepper-btn"
                      aria-label="Diminuir repetições"
                      onClick={() =>
                        updateSetField(exIndex, idx, { reps: Math.max(0, set.reps - 1) })
                      }
                    >
                      −
                    </button>
                    <input
                      type="number"
                      inputMode="numeric"
                      aria-label="Repetições"
                      className="fl-stepper-val"
                      value={set.reps}
                      onChange={(e) =>
                        updateSetField(exIndex, idx, {
                          reps: Math.max(0, Math.floor(Number(e.target.value) || 0)),
                        })
                      }
                    />
                    <button
                      type="button"
                      className="fl-stepper-btn"
                      aria-label="Aumentar repetições"
                      onClick={() => updateSetField(exIndex, idx, { reps: set.reps + 1 })}
                    >
                      +
                    </button>
                  </div>

                  {showRirColumn && (
                    <span style={{ textAlign: 'center', fontSize: 11, color: 'var(--ink-tertiary)' }}>
                      —
                    </span>
                  )}

                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.88 }}
                    aria-label={set.completed ? 'Desmarcar série concluída' : 'Marcar série concluída'}
                    aria-pressed={set.completed}
                    className={`fl-check-circle ${set.completed ? 'warmup-done' : ''}`}
                    onClick={() => toggleSetComplete(exIndex, idx, template, partnerBOrderLabel)}
                  >
                    <Check size={19} strokeWidth={2.8} />
                  </motion.button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Séries Válidas */}
        <div style={{ marginTop: 16 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: gridCols,
              gap: 8,
              padding: '0 10px 6px 12px',
              fontSize: 10.5,
              fontWeight: 600,
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              color: 'var(--ink-tertiary)',
              textAlign: 'center',
            }}
          >
            <span>Série</span>
            <span>{template.isIsometric ? 'Extra kg' : 'Carga kg'}</span>
            <span>{template.isIsometric ? 'Tempo' : 'Reps'}</span>
            {showRirColumn && <span>RIR</span>}
            <span>OK</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {workingSets.map(({ set, idx }, validPos) => {
              const prevComparable = prevLog?.validSets[validPos];
              return (
                <div
                  key={set.id}
                  className={`fl-set-row ${set.completed ? 'done' : ''} ${
                    set.prTypes?.length ? 'pr' : ''
                  }`}
                  style={{ gridTemplateColumns: gridCols }}
                >
                  {/* Número + ghost anterior clicável */}
                  <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <span
                      className="t-mono"
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: set.completed ? 'var(--volt)' : 'var(--ink-secondary)',
                      }}
                    >
                      {validPos + 1}
                    </span>
                    {set.prTypes?.length ? (
                      <Trophy size={11} color="var(--volt)" />
                    ) : prevComparable ? (
                      <button
                        type="button"
                        title="Copiar carga e reps do treino anterior"
                        onClick={() =>
                          updateSetField(
                            exIndex,
                            idx,
                            { weightKg: prevComparable.weightKg, reps: prevComparable.reps },
                            isFirstExercise ? template.loadIncrementKg : undefined,
                          )
                        }
                        className="t-mono"
                        style={{
                          fontSize: 9.5,
                          color: 'var(--ink-tertiary)',
                          lineHeight: 1,
                        }}
                      >
                        {formatKg(prevComparable.weightKg)}×{prevComparable.reps}
                      </button>
                    ) : null}
                  </div>

                  {/* Carga */}
                  <div className="fl-stepper">
                    <button
                      type="button"
                      className="fl-stepper-btn"
                      aria-label="Diminuir carga"
                      onClick={() =>
                        updateSetField(
                          exIndex,
                          idx,
                          {
                            weightKg: Math.max(
                              0,
                              Number((set.weightKg - template.loadIncrementKg).toFixed(1)),
                            ),
                          },
                          isFirstExercise ? template.loadIncrementKg : undefined,
                        )
                      }
                    >
                      −
                    </button>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.5"
                      min="0"
                      aria-label="Carga em kg"
                      className="fl-stepper-val"
                      value={set.weightKg}
                      onChange={(e) =>
                        updateSetField(
                          exIndex,
                          idx,
                          { weightKg: Math.max(0, Number(e.target.value) || 0) },
                          isFirstExercise ? template.loadIncrementKg : undefined,
                        )
                      }
                    />
                    <button
                      type="button"
                      className="fl-stepper-btn"
                      aria-label="Aumentar carga"
                      onClick={() =>
                        updateSetField(
                          exIndex,
                          idx,
                          {
                            weightKg: Number((set.weightKg + template.loadIncrementKg).toFixed(1)),
                          },
                          isFirstExercise ? template.loadIncrementKg : undefined,
                        )
                      }
                    >
                      +
                    </button>
                  </div>

                  {/* Reps ou Isométrico */}
                  {template.isIsometric ? (
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <IsometricTimerInline
                        targetMinSec={template.repMin}
                        targetMaxSec={template.repMax}
                        currentSeconds={set.reps}
                        soundEnabled={soundEnabled}
                        vibrationEnabled={vibrationEnabled}
                        onChangeSeconds={(sec) => updateSetField(exIndex, idx, { reps: sec })}
                        onFinishTarget={(sec) => {
                          updateSetField(exIndex, idx, { reps: sec });
                          if (!set.completed) {
                            toggleSetComplete(exIndex, idx, template, partnerBOrderLabel);
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="fl-stepper">
                      <button
                        type="button"
                        className="fl-stepper-btn"
                        aria-label="Diminuir repetições"
                        onClick={() =>
                          updateSetField(exIndex, idx, { reps: Math.max(0, set.reps - 1) })
                        }
                      >
                        −
                      </button>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        aria-label="Repetições"
                        className="fl-stepper-val"
                        value={set.reps}
                        onChange={(e) =>
                          updateSetField(exIndex, idx, {
                            reps: Math.max(0, Math.floor(Number(e.target.value) || 0)),
                          })
                        }
                      />
                      <button
                        type="button"
                        className="fl-stepper-btn"
                        aria-label="Aumentar repetições"
                        onClick={() => updateSetField(exIndex, idx, { reps: set.reps + 1 })}
                      >
                        +
                      </button>
                    </div>
                  )}

                  {/* RIR */}
                  {showRirColumn && (
                    <button
                      type="button"
                      aria-label="Definir RIR"
                      onClick={() => {
                        const cycle: (number | null)[] = [null, 0, 1, 2, 3, 4];
                        const nextRir = cycle[(cycle.indexOf(set.rir ?? null) + 1) % cycle.length];
                        updateSetField(exIndex, idx, { rir: nextRir });
                      }}
                      className="t-mono"
                      style={{
                        height: 44,
                        borderRadius: 12,
                        background:
                          typeof set.rir === 'number'
                            ? set.rir === 0
                              ? 'var(--rose-soft)'
                              : 'var(--bg-canvas)'
                            : 'var(--bg-canvas)',
                        border: '1px solid var(--hairline)',
                        fontSize: 12.5,
                        fontWeight: 700,
                        color:
                          typeof set.rir === 'number' ? 'var(--ink-primary)' : 'var(--ink-tertiary)',
                      }}
                    >
                      {typeof set.rir === 'number' ? set.rir : '–'}
                    </button>
                  )}

                  {/* Checkmark circular */}
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.86 }}
                    transition={SPRING_SNAPPY}
                    aria-label={set.completed ? 'Desmarcar série concluída' : 'Marcar série concluída'}
                    aria-pressed={set.completed}
                    className={`fl-check-circle ${set.completed ? 'done' : ''}`}
                    onClick={() => toggleSetComplete(exIndex, idx, template, partnerBOrderLabel)}
                  >
                    <Check size={19} strokeWidth={2.8} />
                  </motion.button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rodapé minimalista: + Série / Remover última */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="fl-btn fl-btn-ghost fl-btn-xs"
              onClick={() => addSetToExercise(exIndex, false)}
            >
              <Plus size={13} /> Série
            </button>
            <button
              type="button"
              className="fl-btn fl-btn-ghost fl-btn-xs"
              onClick={() => addSetToExercise(exIndex, true)}
            >
              <Flame size={12} color="var(--amber)" /> Aquec.
            </button>
          </div>
          {log.sets.length > 1 && (
            <button
              type="button"
              className="fl-btn fl-btn-ghost fl-btn-xs"
              style={{ color: 'var(--ink-tertiary)' }}
              aria-label="Remover última série"
              onClick={() => removeSetFromExercise(exIndex, log.sets.length - 1)}
            >
              <Trash2 size={12} /> Remover
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderStation = (block: StationBlock) => {
    if (block.kind === 'single') {
      return renderExerciseSurface(block.index, block.log, block.template);
    }

    if (block.kind === 'biset') {
      const roundsTotal = Math.max(
        block.logA.sets.filter((s) => !s.isWarmup).length,
        block.logB.sets.filter((s) => !s.isWarmup).length,
      );
      const roundsDone = Math.min(
        block.logA.sets.filter((s) => !s.isWarmup && s.completed).length,
        block.logB.sets.filter((s) => !s.isWarmup && s.completed).length,
      );

      return (
        <div
          key={block.group}
          data-testid={`biset-${block.group}`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            padding: 10,
            borderRadius: 28,
            background: 'rgba(255, 98, 46, 0.05)',
            border: '1px solid var(--ember-border)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '4px 8px 0',
            }}
          >
            <span className="fl-pill fl-pill-ember">
              <Link2 size={12} /> Biset {block.templateA.orderLabel} + {block.templateB.orderLabel} · Rodada{' '}
              {Math.min(roundsDone + 1, roundsTotal)}/{roundsTotal}
            </span>
            <span style={{ fontSize: 11, color: '#ff9c7a' }}>
              Descanso só após {block.templateB.orderLabel}
            </span>
          </div>

          {renderExerciseSurface(
            block.indexA,
            block.logA,
            block.templateA,
            block.templateB.orderLabel,
          )}
          {renderExerciseSurface(block.indexB, block.logB, block.templateB)}
        </div>
      );
    }

    // Estação dedicada de Cardio Pós-Treino
    return (
      <div className="fl-card" style={{ padding: 20 }}>
        <div className="t-kicker" style={{ color: '#ff8c66' }}>
          Finalização · Déficit Calórico
        </div>
        <h2 className="t-title" style={{ marginTop: 4 }}>
          Cardio Pós-Treino
        </h2>
        <p className="t-subtitle">{dayTemplate.cardio.label}</p>

        <div
          style={{
            marginTop: 18,
            padding: 18,
            borderRadius: 18,
            background: 'var(--bg-canvas)',
            border: '1px solid var(--hairline)',
            textAlign: 'center',
          }}
        >
          <div className="t-kicker">Cronômetro</div>
          <div className="t-mono" style={{ fontSize: 42, fontWeight: 700, margin: '6px 0 14px', color: '#ff8c66' }}>
            {formatDuration(cardioTimerSec)}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
            <button
              type="button"
              className={`fl-btn fl-btn-sm ${cardioTimerRunning ? 'fl-btn-ember' : 'fl-btn-surface'}`}
              onClick={() => setCardioTimerRunning((r) => !r)}
            >
              {cardioTimerRunning ? <Pause size={15} /> : <Play size={15} />}
              {cardioTimerRunning ? 'Pausar' : 'Iniciar'}
            </button>
            {cardioTimerSec > 0 && (
              <button
                type="button"
                className="fl-btn fl-btn-volt fl-btn-sm"
                onClick={() => {
                  setCardioTimerRunning(false);
                  const mins = Math.max(1, Math.round(cardioTimerSec / 60));
                  updateCardio({ minutes: mins, completed: true });
                  onShowToast(`Cardio de ${mins} min registrado!`, 'info');
                }}
              >
                Salvar {Math.max(1, Math.round(cardioTimerSec / 60))} min
              </button>
            )}
          </div>
        </div>

        <div className="fl-grid-2" style={{ marginTop: 14 }}>
          <div>
            <label className="t-kicker" htmlFor="c-min">Minutos</label>
            <input
              id="c-min"
              type="number"
              className="fl-input t-mono"
              style={{ marginTop: 6, textAlign: 'center', fontWeight: 700 }}
              value={draft.cardio?.minutes ?? dayTemplate.cardio.targetMinutesMin}
              onChange={(e) =>
                updateCardio({ minutes: Math.max(0, Number(e.target.value) || 0) })
              }
            />
          </div>
          <div>
            <label className="t-kicker" htmlFor="c-dist">Distância (km)</label>
            <input
              id="c-dist"
              type="number"
              step="0.1"
              className="fl-input t-mono"
              style={{ marginTop: 6, textAlign: 'center', fontWeight: 700 }}
              placeholder="1.8"
              value={draft.cardio?.distanceKm ?? ''}
              onChange={(e) =>
                updateCardio({ distanceKm: e.target.value ? Number(e.target.value) : undefined })
              }
            />
          </div>
        </div>

        <button
          type="button"
          className={`fl-btn fl-btn-block ${draft.cardio?.completed ? 'fl-btn-volt' : 'fl-btn-surface'}`}
          style={{ marginTop: 16 }}
          onClick={() => updateCardio({ completed: !draft.cardio?.completed })}
        >
          <Activity size={17} />
          {draft.cardio?.completed ? 'Cardio Concluído ✓' : 'Marcar Cardio como Concluído'}
        </button>
      </div>
    );
  };

  const progressPct =
    liveStats.plannedValid > 0
      ? Math.min(100, (liveStats.completedValid / liveStats.plannedValid) * 100)
      : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Barra superior minimalista da sessão */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="fl-live-dot" />
            <span className="t-mono" style={{ fontSize: 15, fontWeight: 700 }}>
              {formatDuration(elapsedSec)}
            </span>
            <span style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>·</span>
            <span className="t-mono" style={{ fontSize: 12.5, color: 'var(--ink-secondary)' }}>
              {liveStats.completedValid}/{liveStats.plannedValid}
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-tertiary)', marginTop: 2 }}>
            {dayTemplate.title} · {liveStats.tonnage.toLocaleString('pt-BR')} kg
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            className={`fl-icon-btn ${wakeLockActive || wakeLockEnabled ? 'active' : ''}`}
            onClick={onToggleWakeLock}
            title={
              wakeLockSupported
                ? wakeLockActive
                  ? 'Tela sempre ativa: ligada'
                  : 'Tela sempre ativa'
                : 'Wake Lock não suportado'
            }
            aria-label="Alternar tela sempre ativa"
          >
            <Sun size={17} />
          </button>
          <button
            type="button"
            className={`fl-icon-btn ${mapSheetOpen ? 'active' : ''}`}
            onClick={() => setMapSheetOpen(true)}
            title="Mapa da sessão e timer manual"
            aria-label="Abrir mapa da sessão"
          >
            <ListChecks size={17} />
          </button>
          <button
            type="button"
            className="fl-btn fl-btn-volt fl-btn-xs"
            style={{ minHeight: 40, padding: '0 14px' }}
            onClick={() => setFinishSheetOpen(true)}
          >
            Finalizar
          </button>
        </div>
      </div>

      {/* Barra fina de progresso total */}
      <div
        style={{
          height: 3,
          borderRadius: 99,
          background: 'rgba(255,255,255,0.07)',
          overflow: 'hidden',
        }}
      >
        <motion.div
          style={{ height: '100%', background: 'var(--volt)' }}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Área principal: Foco (1 estação animada por vez) OU Visão Completa */}
      {viewMode === 'focus' ? (
        <AnimatePresence mode="wait">
          <SubScreenSlide
            screenKey={`station-${safeStationIdx}`}
            direction={slideDir}
          >
            {currentStation && renderStation(currentStation)}
          </SubScreenSlide>
        </AnimatePresence>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {stations.map((st, idx) => (
            <div key={idx}>{renderStation(st)}</div>
          ))}
        </div>
      )}

      {/* Barra inferior de navegação entre estações (modo foco — 1 mão!) */}
      {viewMode === 'focus' && (
        <div className="fl-station-bar">
          <button
            type="button"
            className="fl-icon-btn"
            style={{ width: 48, height: 42, borderRadius: 14 }}
            disabled={safeStationIdx === 0}
            onClick={() => goToStation(safeStationIdx - 1)}
            aria-label="Estação anterior"
          >
            <ChevronLeft size={20} />
          </button>

          <button
            type="button"
            onClick={() => setMapSheetOpen(true)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 42,
            }}
          >
            <span className="t-mono" style={{ fontSize: 12.5, fontWeight: 700 }}>
              Estação {safeStationIdx + 1} / {stations.length}
            </span>
            <span style={{ fontSize: 10.5, color: 'var(--ink-tertiary)' }}>
              Toque p/ ver todas · {viewMode === 'focus' ? 'Modo Foco' : 'Lista'}
            </span>
          </button>

          {safeStationIdx < stations.length - 1 ? (
            <button
              type="button"
              className="fl-btn fl-btn-volt"
              style={{ width: 48, minHeight: 42, padding: 0, borderRadius: 14 }}
              onClick={() => goToStation(safeStationIdx + 1)}
              aria-label="Próxima estação"
            >
              <ChevronRight size={20} />
            </button>
          ) : (
            <button
              type="button"
              className="fl-btn fl-btn-volt"
              style={{ width: 48, minHeight: 42, padding: 0, borderRadius: 14 }}
              onClick={() => setFinishSheetOpen(true)}
              aria-label="Finalizar treino"
            >
              <Check size={20} strokeWidth={2.8} />
            </button>
          )}
        </div>
      )}

      {/* Sheet: Mapa da Sessão + Timer Manual + Alternar Foco/Lista */}
      <AnimatePresence>
        {mapSheetOpen && (
          <SheetModal ariaLabel="Mapa da sessão" onClose={() => setMapSheetOpen(false)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <div className="t-kicker">{dayTemplate.title}</div>
                <h3 className="t-title" style={{ fontSize: 21, marginTop: 2 }}>
                  Mapa da Sessão
                </h3>
              </div>
              <button type="button" className="fl-icon-btn" onClick={() => setMapSheetOpen(false)} aria-label="Fechar">
                <X size={18} />
              </button>
            </div>

            {/* Alternar Foco vs Lista */}
            <div className="fl-grid-2" style={{ marginBottom: 14 }}>
              <button
                type="button"
                className={`fl-btn fl-btn-xs ${viewMode === 'focus' ? 'fl-btn-volt' : 'fl-btn-surface'}`}
                onClick={() => {
                  setViewMode('focus');
                  setMapSheetOpen(false);
                }}
              >
                Modo Foco (1 por vez)
              </button>
              <button
                type="button"
                className={`fl-btn fl-btn-xs ${viewMode === 'all' ? 'fl-btn-volt' : 'fl-btn-surface'}`}
                onClick={() => {
                  setViewMode('all');
                  setMapSheetOpen(false);
                }}
              >
                Ver todas juntas
              </button>
            </div>

            {/* Timer manual rápido */}
            <div style={{ marginBottom: 14 }}>
              <div className="t-kicker" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Timer size={12} /> Descanso manual rápido
              </div>
              <div className="fl-grid-4">
                {[60, 90, 120, 180].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    className="fl-btn fl-btn-surface fl-btn-xs t-mono"
                    onClick={() => {
                      const now = Date.now();
                      onStartRestTimer({
                        exerciseName: 'Descanso manual',
                        durationSeconds: sec,
                        remainingSeconds: sec,
                        startedAt: now,
                        endsAt: now + sec * 1000,
                        paused: false,
                      });
                      setMapSheetOpen(false);
                    }}
                  >
                    {sec >= 120 ? `${sec / 60}m` : `${sec}s`}
                  </button>
                ))}
              </div>
            </div>

            {/* Lista clicável das estações */}
            <div className="fl-list-group" style={{ marginBottom: 14 }}>
              {stations.map((st, idx) => {
                let title = 'Cardio Pós-Treino';
                let badge = 'CARDIO';
                let done = false;
                let progress = '';
                if (st.kind === 'single') {
                  title = st.template.name;
                  badge = st.template.orderLabel;
                  const valid = st.log.sets.filter((s) => !s.isWarmup);
                  const c = valid.filter((s) => s.completed).length;
                  done = valid.length > 0 && c === valid.length;
                  progress = `${c}/${valid.length}`;
                } else if (st.kind === 'biset') {
                  title = `${st.templateA.name} + ${st.templateB.name}`;
                  badge = `${st.templateA.orderLabel}+${st.templateB.orderLabel}`;
                  const vA = st.logA.sets.filter((s) => !s.isWarmup);
                  const vB = st.logB.sets.filter((s) => !s.isWarmup);
                  const c =
                    vA.filter((s) => s.completed).length + vB.filter((s) => s.completed).length;
                  const tot = vA.length + vB.length;
                  done = tot > 0 && c === tot;
                  progress = `${c}/${tot}`;
                } else {
                  done = Boolean(draft.cardio?.completed);
                  progress = done ? 'OK' : `${dayTemplate.cardio.targetMinutesMin}m`;
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    className="fl-list-row"
                    style={{
                      padding: '12px 14px',
                      background: idx === safeStationIdx ? 'rgba(204,255,0,0.06)' : undefined,
                    }}
                    onClick={() => {
                      setViewMode('focus');
                      goToStation(idx);
                      setMapSheetOpen(false);
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <span
                        className="t-mono"
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: done ? 'var(--emerald)' : 'var(--volt)',
                          width: 44,
                          flexShrink: 0,
                        }}
                      >
                        {badge}
                      </span>
                      <span
                        style={{
                          fontSize: 13.5,
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {title}
                      </span>
                    </div>
                    <span className="t-mono" style={{ fontSize: 11.5, color: done ? 'var(--emerald)' : 'var(--ink-tertiary)' }}>
                      {done ? '✓' : progress}
                    </span>
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="fl-btn fl-btn-surface fl-btn-sm"
                style={{ flex: 1 }}
                onClick={() => {
                  setMapSheetOpen(false);
                  onOpenPlateCalc(60, 'Calculadora rápida', 20);
                }}
              >
                <Disc size={15} /> Anilhas
              </button>
              <button
                type="button"
                className="fl-btn fl-btn-danger fl-btn-sm"
                onClick={() => {
                  setMapSheetOpen(false);
                  onDiscardWorkout();
                }}
              >
                Descartar
              </button>
            </div>
          </SheetModal>
        )}
      </AnimatePresence>

      {/* Sheet: Finalizar Sessão (com notas + salvaguarda de séries pendentes) */}
      <AnimatePresence>
        {finishSheetOpen && (
          <SheetModal ariaLabel="Finalizar sessão de treino" onClose={() => setFinishSheetOpen(false)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <div className="t-kicker">Encerrar sessão</div>
                <h3 className="t-title" style={{ fontSize: 22, marginTop: 2 }}>
                  Finalizar & Salvar Treino
                </h3>
              </div>
              <button type="button" className="fl-icon-btn" onClick={() => setFinishSheetOpen(false)} aria-label="Fechar">
                <X size={18} />
              </button>
            </div>

            <div className="fl-grid-3" style={{ marginBottom: 14 }}>
              <div className="fl-card fl-card-compact" style={{ textAlign: 'center' }}>
                <div className="t-kicker">Séries</div>
                <div className="t-mono" style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>
                  {liveStats.completedValid}/{liveStats.plannedValid}
                </div>
              </div>
              <div className="fl-card fl-card-compact" style={{ textAlign: 'center' }}>
                <div className="t-kicker">Tonelagem</div>
                <div className="t-mono" style={{ fontSize: 16, fontWeight: 700, marginTop: 5, color: 'var(--cyan)' }}>
                  {liveStats.tonnage.toLocaleString('pt-BR')}
                </div>
              </div>
              <div className="fl-card fl-card-compact" style={{ textAlign: 'center' }}>
                <div className="t-kicker">PRs</div>
                <div className="t-mono" style={{ fontSize: 18, fontWeight: 700, marginTop: 4, color: 'var(--volt)' }}>
                  {liveStats.prs}
                </div>
              </div>
            </div>

            {liveStats.completedValid < liveStats.plannedValid && (
              <p style={{ margin: '0 0 12px', fontSize: 12.5, color: '#fde68a' }}>
                Há {liveStats.plannedValid - liveStats.completedValid} séries ainda não marcadas —
                somente as séries concluídas serão contabilizadas.
              </p>
            )}

            <label className="t-kicker" htmlFor="finish-notes">
              Notas da sessão (opcional)
            </label>
            <textarea
              id="finish-notes"
              className="fl-input"
              rows={2}
              style={{ marginTop: 6, marginBottom: 16, resize: 'none' }}
              placeholder="Sono, energia, pump ou observações..."
              value={draft.notes}
              onChange={(e) => onUpdateDraft((prev) => ({ ...prev, notes: e.target.value }))}
            />

            <button
              type="button"
              className="fl-btn fl-btn-volt fl-btn-block"
              onClick={() => {
                setFinishSheetOpen(false);
                onFinishWorkout();
              }}
            >
              <Check size={18} strokeWidth={2.8} />
              Confirmar e Salvar Treino
            </button>
          </SheetModal>
        )}
      </AnimatePresence>
    </div>
  );
};
