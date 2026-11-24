import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowDown,
  Bookmark,
  Check,
  Disc,
  Flame,
  HeartPulse,
  Info,
  Link2,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Sun,
  Trash2,
  TrendingUp,
  Trophy,
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
import { AnatomyIllustration } from './AnatomyIllustration';
import { IsometricTimerInline } from './IsometricTimerInline';

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

type RenderBlock =
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
    };

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
  const [cardioTimerRunning, setCardioTimerRunning] = useState(false);
  const [cardioTimerSec, setCardioTimerSec] = useState(0);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [confirmPartialFinish, setConfirmPartialFinish] = useState(false);
  const [showQuickTimer, setShowQuickTimer] = useState(false);

  // Cronômetro geral da sessão
  useEffect(() => {
    const id = window.setInterval(() => {
      setElapsedSec(Math.max(0, Math.floor((Date.now() - draft.startedAt) / 1000)));
    }, 1000);
    return () => window.clearInterval(id);
  }, [draft.startedAt]);

  // Cronômetro embutido para o cardio pós-treino
  useEffect(() => {
    if (!cardioTimerRunning) return;
    const id = window.setInterval(() => {
      setCardioTimerSec((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [cardioTimerRunning]);

  const templateMap = useMemo(() => {
    const map = new Map<string, ExerciseTemplate>();
    for (const ex of dayTemplate.exercises) {
      map.set(ex.id, ex);
    }
    return map;
  }, [dayTemplate.exercises]);

  // Métricas vivas da sessão atual (exclui aquecimentos)
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

  // Agrupa exercícios consecutivos que compartilham bisetGroup
  const blocks = useMemo<RenderBlock[]>(() => {
    const result: RenderBlock[] = [];
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
        i += 1; // pula B pois já foi agrupado
      } else {
        result.push({ kind: 'single', index: i, log, template: tpl });
      }
    }
    return result;
  }, [draft.exercises, templateMap, dayTemplate.exercises]);

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

      // Se editou a carga da 1ª série válida do 1º exercício do dia, sincroniza automaticamente
      // séries de aquecimento ainda não concluídas (50%, 70%, 85%)
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
            : 'Novo Recorde de Volume!';
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

    // Regra inteligente do timer de descanso:
    // - Se Biset A: NÃO dispara descanso (orienta seguir imediatamente para B!)
    // - Se série de aquecimento: descanso curto opcional (45 s)
    // - Se série válida normal ou Biset B: dispara automaticamente o descanso exato do exercício
    if (nextCompleted && autoStartRestTimer) {
      if (template.bisetRole === 'A' && !currentSet.isWarmup) {
        onShowToast(
          `Série ${template.orderLabel} concluída — sem descanso! Vá direto para ${partnerBOrderLabel ?? 'B'}.`,
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
              ? `Pós-Biset (${template.orderLabel}) · ${template.name}`
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

  const applySuggestedWeight = (exIndex: number, weightKg: number, isFirstEx: boolean, incKg: number) => {
    onUpdateDraft((prev) => {
      const nextEx = [...prev.exercises];
      const ex = { ...nextEx[exIndex] };
      const updatedSets = ex.sets.map((s) => {
        if (s.isWarmup && s.warmupPercent) {
          return {
            ...s,
            weightKg: Math.round(((weightKg * s.warmupPercent) / 100) / incKg) * incKg,
          };
        }
        return s.completed ? s : { ...s, weightKg };
      });
      ex.sets = updatedSets;
      nextEx[exIndex] = ex;
      return { ...prev, exercises: nextEx };
    });
    if (isFirstEx) {
      onShowToast(`Carga ${formatKg(weightKg)} kg aplicada (e aquecimento recalculado)!`, 'info');
    } else {
      onShowToast(`Carga ${formatKg(weightKg)} kg aplicada às séries pendentes.`, 'info');
    }
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
      const workingOnly = target.sets.filter((s) => !s.isWarmup);
      target.sets = [...warmups, ...workingOnly];
      nextEx[exIndex] = target;
      return { ...prev, exercises: nextEx, warmupsEnabled: true };
    });
    onShowToast('Séries de aquecimento (50%×8 · 70%×4 · 85%×2) atualizadas!', 'info');
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
        inclinePercent: prev.cardio?.inclinePercent,
        speedKmh: prev.cardio?.speedKmh,
        notes: prev.cardio?.notes ?? '',
        completed: prev.cardio?.completed ?? false,
        ...patch,
      },
    }));
  };

  const renderExerciseCard = (
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

    // Fallback para exibir 1RM do primeiro set preenchido mesmo antes de concluir
    const firstValidSet = log.sets.find((s) => !s.isWarmup);
    const previewWeight = bestWeightKg || firstValidSet?.weightKg || progression.suggestedWeightKg || 0;
    const previewReps = bestReps || firstValidSet?.reps || template.repMax;
    const live1RM =
      !template.isIsometric && previewWeight > 0 && previewReps > 0
        ? calculate1RM(previewWeight, previewReps, formula1RM, template.loadIncrementKg)
        : null;

    const pinnedNote = machineNotes[template.id] ?? '';
    const hasWarmups = log.sets.some((s) => s.isWarmup);

    let workingCounter = 0;

    return (
      <div
        key={log.exerciseId}
        id={`exercise-card-${log.exerciseId}`}
        className="card"
        style={{
          padding: 12,
          scrollMarginTop: 76,
          borderColor:
            template.bisetGroup
              ? 'rgba(255, 107, 44, 0.28)'
              : isFirstExercise
                ? 'var(--border-volt)'
                : 'var(--border-subtle)',
        }}
      >
        {/* Cabeçalho do exercício com miniatura anatômica */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 5, marginBottom: 4 }}>
              <span
                className={`pill ${template.bisetGroup ? 'pill-ember' : 'pill-volt'} font-mono`}
                style={{ padding: '2px 7px' }}
              >
                {template.orderLabel}
              </span>
              <span className="pill font-mono" style={{ padding: '2px 7px' }}>
                {template.targetSets}×{template.repMin}–{template.repMax}
                {template.isIsometric ? 's' : ''}
              </span>
              <span className="pill" style={{ padding: '2px 7px' }}>
                {template.restLabel}
              </span>
              {template.isUnilateral && (
                <span className="pill pill-cyan" style={{ padding: '2px 7px' }}>
                  p/ lado
                </span>
              )}
            </div>
            <h3
              className="font-display"
              style={{ margin: 0, fontSize: 20, lineHeight: 1.12, fontWeight: 700 }}
            >
              {template.name}
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
              {template.techniqueCue}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onOpenAnatomy(template, previewWeight, previewReps)}
            title="Ver anatomia, execução, 1RM e ajustes"
            aria-label={`Ver anatomia e ajustes de ${template.name}`}
          >
            <AnatomyIllustration
              diagram={template.anatomyDiagram}
              primaryMuscle={template.primaryMuscle}
              secondaryMuscles={template.secondaryMuscles}
              compact
            />
          </button>
        </div>

        {/* Anotação fixa do aparelho (se houver) */}
        {pinnedNote && (
          <button
            type="button"
            onClick={() => onOpenAnatomy(template, previewWeight, previewReps)}
            style={{
              marginTop: 8,
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 9px',
              borderRadius: 9,
              background: 'rgba(34, 211, 238, 0.08)',
              border: '1px solid rgba(34, 211, 238, 0.26)',
              color: '#A5F3FC',
              fontSize: 11.5,
              textAlign: 'left',
            }}
          >
            <Bookmark size={12} style={{ flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {pinnedNote}
            </span>
          </button>
        )}

        {/* Banner de Progressão Dupla Inteligente */}
        <div
          style={{
            marginTop: 9,
            padding: '8px 10px',
            borderRadius: 11,
            background:
              progression.status === 'progress'
                ? 'var(--accent-volt-dim)'
                : progression.status === 'consolidate'
                  ? 'var(--accent-amber-dim)'
                  : 'rgba(255,255,255,0.035)',
            border:
              progression.status === 'progress'
                ? '1px solid var(--border-volt)'
                : progression.status === 'consolidate'
                  ? '1px solid rgba(245,158,11,0.4)'
                  : '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 12,
                fontWeight: 700,
                color:
                  progression.status === 'progress'
                    ? 'var(--accent-volt)'
                    : progression.status === 'consolidate'
                      ? '#FBBF24'
                      : 'var(--text-primary)',
              }}
            >
              <TrendingUp size={13} />
              <span>{progression.headline}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
              {progression.detail}
            </div>
          </div>

          {progression.suggestedWeightKg !== null && (
            <button
              type="button"
              className={`btn btn-xs ${progression.status === 'progress' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flexShrink: 0 }}
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
          )}
        </div>

        {/* Barra de ferramentas rápidas do exercício: 1RM ao vivo, Anatomia, Anilhas, Aquecimento */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 6,
            marginTop: 8,
            marginBottom: 10,
          }}
        >
          {live1RM && live1RM.selected > 0 && (
            <button
              type="button"
              className="pill pill-cyan font-mono"
              onClick={() => onOpenAnatomy(template, previewWeight, previewReps)}
              title="Ver tabela completa de percentuais 1RM"
            >
              <Zap size={11} />
              1RM {formatKg(best1RM || live1RM.selected)} kg · 85%={formatKg(live1RM.percentages[2].weightKg)}
            </button>
          )}
          <button
            type="button"
            className="pill"
            onClick={() => onOpenAnatomy(template, previewWeight, previewReps)}
          >
            <Info size={11} /> Técnica / Trocar
          </button>
          {!template.isIsometric && (
            <button
              type="button"
              className="pill"
              onClick={() =>
                onOpenPlateCalc(
                  previewWeight || 60,
                  template.name,
                  template.defaultBarWeightKg,
                )
              }
            >
              <Disc size={11} /> Anilhas
            </button>
          )}
          {isFirstExercise && (
            <button
              type="button"
              className="pill pill-amber"
              onClick={() => regenerateWarmupsForFirst(exIndex, template)}
            >
              <Flame size={11} /> {hasWarmups ? 'Recalc. aquec.' : 'Gerar aquec.'}
            </button>
          )}
        </div>

        {/* Cabeçalho da tabela de séries */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: showRirColumn
              ? '36px 1fr 1fr 44px 44px'
              : '36px 1fr 1fr 44px',
            gap: 6,
            padding: '0 6px 5px',
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--text-muted)',
            textAlign: 'center',
          }}
        >
          <span>Série</span>
          <span>{template.isIsometric ? 'Extra (kg)' : 'Carga (kg)'}</span>
          <span>{template.isIsometric ? 'Tempo (s)' : 'Reps'}</span>
          {showRirColumn && <span>RIR</span>}
          <span>OK</span>
        </div>

        {/* Linhas de séries */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {log.sets.map((set, setIdx) => {
            if (!set.isWarmup) workingCounter += 1;
            const currentValidNumber = workingCounter;
            const prevComparableSet = !set.isWarmup
              ? prevLog?.validSets[currentValidNumber - 1]
              : undefined;

            return (
              <div key={set.id} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Comparação lado a lado com o último treino + badge PR */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 4px',
                    fontSize: 10.5,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {set.isWarmup ? (
                      <span style={{ color: '#FBBF24', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <Flame size={10} /> SÉRIE DE AQUECIMENTO
                        {set.warmupPercent ? ` (${set.warmupPercent}%)` : ''} — não conta no 1RM
                      </span>
                    ) : prevComparableSet ? (
                      <button
                        type="button"
                        onClick={() =>
                          updateSetField(
                            exIndex,
                            setIdx,
                            {
                              weightKg: prevComparableSet.weightKg,
                              reps: prevComparableSet.reps,
                            },
                            isFirstExercise ? template.loadIncrementKg : undefined,
                          )
                        }
                        title="Toque para copiar carga e reps do último treino"
                        style={{ color: 'var(--text-muted)', fontSize: 10.5, textAlign: 'left' }}
                      >
                        Anterior:{' '}
                        <strong className="font-mono" style={{ color: 'var(--text-secondary)', textDecoration: 'underline dotted' }}>
                          {formatKg(prevComparableSet.weightKg)} kg × {prevComparableSet.reps}
                          {template.isIsometric ? 's' : ''}
                        </strong>
                        {typeof prevComparableSet.rir === 'number' && ` · RIR ${prevComparableSet.rir}`}
                      </button>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>
                        Série válida {currentValidNumber}
                      </span>
                    )}

                    {set.prTypes && set.prTypes.length > 0 && (
                      <span className="pill pill-volt" style={{ padding: '1px 6px', fontSize: 10 }}>
                        <Trophy size={10} /> PR!
                      </span>
                    )}
                  </div>

                  {log.sets.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSetFromExercise(exIndex, setIdx)}
                      aria-label="Remover série"
                      style={{ color: 'var(--text-muted)', padding: '2px 4px' }}
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>

                <div
                  className={`set-row ${set.isWarmup ? 'is-warmup' : ''} ${set.completed ? 'is-completed' : ''} ${set.prTypes && set.prTypes.length > 0 ? 'is-pr-row' : ''}`}
                  style={{
                    gridTemplateColumns: showRirColumn
                      ? '36px 1fr 1fr 44px 44px'
                      : '36px 1fr 1fr 44px',
                  }}
                >
                  {/* Índice ou tag AQ */}
                  <div style={{ textAlign: 'center' }}>
                    {set.isWarmup ? (
                      <span
                        className="font-mono"
                        style={{
                          display: 'inline-block',
                          fontSize: 10,
                          fontWeight: 800,
                          padding: '3px 5px',
                          borderRadius: 6,
                          background: 'rgba(245, 158, 11, 0.22)',
                          color: '#FCD34D',
                        }}
                      >
                        AQ
                      </span>
                    ) : (
                      <span
                        className="font-mono"
                        style={{
                          fontWeight: 800,
                          fontSize: 14,
                          color: set.completed ? 'var(--accent-volt)' : 'var(--text-secondary)',
                        }}
                      >
                        {currentValidNumber}
                      </span>
                    )}
                  </div>

                  {/* Stepper de Carga */}
                  <div className="stepper-cell">
                    <button
                      type="button"
                      className="stepper-btn"
                      aria-label="Diminuir carga"
                      onClick={() =>
                        updateSetField(
                          exIndex,
                          setIdx,
                          {
                            weightKg: Math.max(0, Number((set.weightKg - template.loadIncrementKg).toFixed(1))),
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
                      className="stepper-input"
                      value={set.weightKg}
                      onChange={(e) =>
                        updateSetField(
                          exIndex,
                          setIdx,
                          {
                            weightKg: Math.max(0, Number(e.target.value) || 0),
                          },
                          isFirstExercise ? template.loadIncrementKg : undefined,
                        )
                      }
                    />
                    <button
                      type="button"
                      className="stepper-btn"
                      aria-label="Aumentar carga"
                      onClick={() =>
                        updateSetField(
                          exIndex,
                          setIdx,
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

                  {/* Stepper de Reps OU Cronômetro Isométrico */}
                  {template.isIsometric ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <IsometricTimerInline
                        targetMinSec={template.repMin}
                        targetMaxSec={template.repMax}
                        currentSeconds={set.reps}
                        soundEnabled={soundEnabled}
                        vibrationEnabled={vibrationEnabled}
                        onChangeSeconds={(sec) =>
                          updateSetField(exIndex, setIdx, { reps: sec })
                        }
                        onFinishTarget={(sec) => {
                          updateSetField(exIndex, setIdx, { reps: sec });
                          if (!set.completed) {
                            toggleSetComplete(exIndex, setIdx, template, partnerBOrderLabel);
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="stepper-cell">
                      <button
                        type="button"
                        className="stepper-btn"
                        aria-label="Diminuir repetições"
                        onClick={() =>
                          updateSetField(exIndex, setIdx, {
                            reps: Math.max(0, set.reps - 1),
                          })
                        }
                      >
                        −
                      </button>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        aria-label="Repetições"
                        className="stepper-input"
                        value={set.reps}
                        onChange={(e) =>
                          updateSetField(exIndex, setIdx, {
                            reps: Math.max(0, Math.floor(Number(e.target.value) || 0)),
                          })
                        }
                      />
                      <button
                        type="button"
                        className="stepper-btn"
                        aria-label="Aumentar repetições"
                        onClick={() =>
                          updateSetField(exIndex, setIdx, {
                            reps: set.reps + 1,
                          })
                        }
                      >
                        +
                      </button>
                    </div>
                  )}

                  {/* RIR opcional (toque cíclico 1 mão: - → 0 → 1 → 2 → 3 → 4) */}
                  {showRirColumn && (
                    <button
                      type="button"
                      disabled={set.isWarmup}
                      onClick={() => {
                        const cycle: (number | null)[] = [null, 0, 1, 2, 3, 4];
                        const curIdx = cycle.indexOf(set.rir ?? null);
                        const nextRir = cycle[(curIdx + 1) % cycle.length];
                        updateSetField(exIndex, setIdx, { rir: nextRir });
                      }}
                      aria-label="Definir RIR"
                      style={{
                        height: 42,
                        borderRadius: 10,
                        border: '1px solid var(--border-subtle)',
                        background:
                          typeof set.rir === 'number'
                            ? set.rir === 0
                              ? 'rgba(244, 63, 94, 0.22)'
                              : set.rir <= 2
                                ? 'rgba(200, 255, 46, 0.14)'
                                : 'rgba(34, 211, 238, 0.14)'
                            : '#0A0D12',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        fontSize: 13,
                        color:
                          set.isWarmup
                            ? 'var(--text-muted)'
                            : typeof set.rir === 'number'
                              ? 'var(--text-primary)'
                              : 'var(--text-muted)',
                        opacity: set.isWarmup ? 0.35 : 1,
                      }}
                    >
                      {set.isWarmup ? '—' : typeof set.rir === 'number' ? set.rir : 'RIR'}
                    </button>
                  )}

                  {/* Botão concluir série (zona do polegar direito) */}
                  <button
                    type="button"
                    aria-label={set.completed ? 'Desmarcar série concluída' : 'Marcar série concluída'}
                    aria-pressed={set.completed}
                    className={`set-check-btn ${
                      set.completed
                        ? set.isWarmup
                          ? 'warmup-checked'
                          : 'checked'
                        : ''
                    }`}
                    onClick={() =>
                      toggleSetComplete(exIndex, setIdx, template, partnerBOrderLabel)
                    }
                  >
                    <Check size={20} strokeWidth={3} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Rodapé do card: + Série válida / + Aquecimento */}
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button
            type="button"
            className="btn btn-secondary btn-xs"
            style={{ flex: 1 }}
            onClick={() => addSetToExercise(exIndex, false)}
          >
            <Plus size={13} /> Série extra
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => addSetToExercise(exIndex, true)}
          >
            <Flame size={12} color="#F59E0B" /> + Aquec.
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Barra viva da sessão em andamento */}
      <div className="card card-volt" style={{ padding: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span className="pill pill-volt">
                <span className="live-dot" /> EM ANDAMENTO
              </span>
              <span className="pill font-mono">{dayTemplate.shortDay}</span>
            </div>
            <h2 className="font-display" style={{ margin: 0, fontSize: 26, lineHeight: 1.05 }}>
              {dayTemplate.title}
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--text-secondary)' }}>
              {dayTemplate.subtitle}
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div className="section-label">Duração</div>
            <div
              className="font-mono"
              style={{ fontSize: 26, fontWeight: 800, color: 'var(--accent-volt)', lineHeight: 1.1 }}
            >
              {formatDuration(elapsedSec)}
            </div>
          </div>
        </div>

        {/* Métricas em tempo real */}
        <div className="grid-3" style={{ marginTop: 12 }}>
          <div style={{ background: '#0A0D12', borderRadius: 10, padding: '8px 10px', border: '1px solid var(--border-subtle)' }}>
            <div className="section-label">Séries válidas</div>
            <div className="font-mono" style={{ fontSize: 17, fontWeight: 800, marginTop: 2 }}>
              {liveStats.completedValid}/{liveStats.plannedValid}
            </div>
          </div>
          <div style={{ background: '#0A0D12', borderRadius: 10, padding: '8px 10px', border: '1px solid var(--border-subtle)' }}>
            <div className="section-label">Tonelagem</div>
            <div className="font-mono" style={{ fontSize: 17, fontWeight: 800, marginTop: 2, color: 'var(--accent-cyan)' }}>
              {liveStats.tonnage.toLocaleString('pt-BR')} kg
            </div>
          </div>
          <div style={{ background: '#0A0D12', borderRadius: 10, padding: '8px 10px', border: '1px solid var(--border-subtle)' }}>
            <div className="section-label">Recordes PR</div>
            <div className="font-mono" style={{ fontSize: 17, fontWeight: 800, marginTop: 2, color: 'var(--accent-volt)' }}>
              {liveStats.prs}
            </div>
          </div>
        </div>

        {/* Barra de progresso da sessão */}
        <div
          style={{
            height: 6,
            background: 'rgba(255,255,255,0.08)',
            borderRadius: 99,
            overflow: 'hidden',
            marginTop: 10,
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${liveStats.plannedValid > 0 ? Math.min(100, (liveStats.completedValid / liveStats.plannedValid) * 100) : 0}%`,
              background: 'linear-gradient(90deg, #C8FF2E, #22D3EE)',
              transition: 'width 0.25s ease',
            }}
          />
        </div>

        {/* Controles rápidos de academia: Tela Ativa + Timer Manual + Anilhas */}
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <button
            type="button"
            className={`btn btn-xs ${wakeLockEnabled ? 'btn-secondary' : 'btn-ghost'}`}
            style={{
              flex: 1,
              borderColor: wakeLockActive ? 'var(--border-volt)' : undefined,
              color: wakeLockActive ? 'var(--accent-volt)' : undefined,
            }}
            onClick={onToggleWakeLock}
          >
            <Sun size={13} />
            {wakeLockSupported
              ? wakeLockActive
                ? 'Tela ativa: ON'
                : wakeLockEnabled
                  ? 'Tela: pronta'
                  : 'Tela: OFF'
              : 'Tela ativa'}
          </button>
          <button
            type="button"
            className={`btn btn-xs ${showQuickTimer ? 'btn-ember' : 'btn-secondary'}`}
            onClick={() => setShowQuickTimer((v) => !v)}
          >
            Timer
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-xs"
            onClick={() => onOpenPlateCalc(60, 'Calculadora rápida', 20)}
          >
            <Disc size={13} /> Anilhas
          </button>
        </div>

        {/* Presets rápidos de descanso manual */}
        {showQuickTimer && (
          <div className="grid-4" style={{ marginTop: 8 }}>
            {[60, 90, 120, 180].map((sec) => (
              <button
                key={sec}
                type="button"
                className="btn btn-ghost btn-xs font-mono"
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
                  setShowQuickTimer(false);
                }}
              >
                {sec >= 120 ? `${sec / 60} min` : `${sec} s`}
              </button>
            ))}
          </div>
        )}

        {/* Faixa de salto rápido entre exercícios (ergonomia 1 mão) */}
        <div className="jump-strip" style={{ marginTop: 10 }} aria-label="Atalho rápido de exercícios">
          {blocks.map((block) => {
            if (block.kind === 'single') {
              const valid = block.log.sets.filter((s) => !s.isWarmup);
              const doneCount = valid.filter((s) => s.completed).length;
              const statusClass =
                valid.length > 0 && doneCount === valid.length
                  ? 'done'
                  : doneCount > 0
                    ? 'partial'
                    : '';
              return (
                <button
                  key={block.log.exerciseId}
                  type="button"
                  className={`jump-chip ${statusClass}`}
                  onClick={() =>
                    document
                      .getElementById(`exercise-card-${block.log.exerciseId}`)
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }
                >
                  {block.template.orderLabel}
                  {statusClass === 'done' ? ' ✓' : ` (${doneCount}/${valid.length})`}
                </button>
              );
            }
            const validA = block.logA.sets.filter((s) => !s.isWarmup);
            const validB = block.logB.sets.filter((s) => !s.isWarmup);
            const doneTotal =
              validA.filter((s) => s.completed).length +
              validB.filter((s) => s.completed).length;
            const totalAll = validA.length + validB.length;
            const statusClass =
              totalAll > 0 && doneTotal === totalAll
                ? 'done'
                : doneTotal > 0
                  ? 'partial'
                  : '';
            return (
              <button
                key={block.group}
                type="button"
                className={`jump-chip ${statusClass}`}
                onClick={() =>
                  document
                    .getElementById(`exercise-card-${block.logA.exerciseId}`)
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
              >
                {block.templateA.orderLabel}+{block.templateB.orderLabel}
                {statusClass === 'done' ? ' ✓' : ''}
              </button>
            );
          })}
        </div>
      </div>

      {/* Lista de exercícios (simples e Bisets agrupados visualmente) */}
      {blocks.map((block) => {
        if (block.kind === 'single') {
          return renderExerciseCard(block.index, block.log, block.template);
        }

        const roundsTotal = Math.max(
          block.logA.sets.filter((s) => !s.isWarmup).length,
          block.logB.sets.filter((s) => !s.isWarmup).length,
        );
        const roundsDone = Math.min(
          block.logA.sets.filter((s) => !s.isWarmup && s.completed).length,
          block.logB.sets.filter((s) => !s.isWarmup && s.completed).length,
        );

        return (
          <div key={block.group} className="biset-wrapper" data-testid={`biset-${block.group}`}>
            <div className="biset-header">
              <span className="biset-badge">
                <Link2 size={13} />
                Biset {block.templateA.orderLabel} + {block.templateB.orderLabel} · Rodada {Math.min(roundsDone + 1, roundsTotal)}/{roundsTotal}
              </span>
              <span style={{ fontSize: 11, color: '#FF9C6E', fontWeight: 600 }}>
                Descanso só após {block.templateB.orderLabel} ({block.templateB.restLabel})
              </span>
            </div>

            {renderExerciseCard(
              block.indexA,
              block.logA,
              block.templateA,
              block.templateB.orderLabel,
            )}

            <div className="biset-bridge">
              <ArrowDown size={13} />
              Sem descanso — faça direto o {block.templateB.orderLabel}
              <ArrowDown size={13} />
            </div>

            {renderExerciseCard(block.indexB, block.logB, block.templateB)}
          </div>
        );
      })}

      {/* Bloco de Cardio Pós-Treino */}
      <div className={`card ${dayTemplate.cardio.enabled ? 'card-ember' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <HeartPulse size={20} color={dayTemplate.cardio.enabled ? '#FF8B57' : '#66758D'} />
            <div>
              <h3 className="font-display" style={{ margin: 0, fontSize: 20 }}>
                Cardio Pós-Treino
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
                {dayTemplate.cardio.label}
              </p>
            </div>
          </div>
          {dayTemplate.cardio.enabled && (
            <span className={`pill ${dayTemplate.cardio.optional ? 'pill-cyan' : 'pill-ember'}`}>
              {dayTemplate.cardio.optional ? 'Opcional' : 'Meta do dia'}
            </span>
          )}
        </div>

        <p style={{ margin: '8px 0 10px', fontSize: 12.5, color: 'var(--text-secondary)' }}>
          {dayTemplate.cardio.details}
        </p>

        {dayTemplate.cardio.enabled && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Cronômetro vivo de cardio */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#0A0D12',
                border: '1px solid var(--border-subtle)',
                borderRadius: 12,
                padding: '9px 12px',
              }}
            >
              <div>
                <div className="section-label">Cronômetro de cardio</div>
                <div className="font-mono" style={{ fontSize: 22, fontWeight: 800, color: '#FF8B57' }}>
                  {formatDuration(cardioTimerSec)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  className={`btn btn-xs ${cardioTimerRunning ? 'btn-ember' : 'btn-secondary'}`}
                  onClick={() => setCardioTimerRunning((r) => !r)}
                >
                  {cardioTimerRunning ? <Pause size={13} /> : <Play size={13} />}
                  {cardioTimerRunning ? 'Pausar' : 'Iniciar'}
                </button>
                {cardioTimerSec > 0 && (
                  <button
                    type="button"
                    className="btn btn-primary btn-xs"
                    onClick={() => {
                      setCardioTimerRunning(false);
                      const mins = Math.max(1, Math.round(cardioTimerSec / 60));
                      updateCardio({ minutes: mins, completed: true });
                      onShowToast(`Cardio de ${mins} min registrado!`, 'info');
                    }}
                  >
                    Salvar {Math.max(1, Math.round(cardioTimerSec / 60))}m
                  </button>
                )}
              </div>
            </div>

            <div className="grid-3">
              <div>
                <label className="section-label" htmlFor="cardio-min">Minutos</label>
                <input
                  id="cardio-min"
                  type="number"
                  inputMode="numeric"
                  className="input input-compact"
                  style={{ marginTop: 4 }}
                  value={draft.cardio?.minutes ?? dayTemplate.cardio.targetMinutesMin}
                  onChange={(e) =>
                    updateCardio({ minutes: Math.max(0, Number(e.target.value) || 0) })
                  }
                />
              </div>
              <div>
                <label className="section-label" htmlFor="cardio-dist">Dist. (km)</label>
                <input
                  id="cardio-dist"
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  className="input input-compact"
                  style={{ marginTop: 4 }}
                  placeholder="Ex: 1.8"
                  value={draft.cardio?.distanceKm ?? ''}
                  onChange={(e) =>
                    updateCardio({
                      distanceKm: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                />
              </div>
              <div>
                <label className="section-label" htmlFor="cardio-speed">Vel. (km/h)</label>
                <input
                  id="cardio-speed"
                  type="number"
                  step="0.5"
                  inputMode="decimal"
                  className="input input-compact"
                  style={{ marginTop: 4 }}
                  placeholder="5.5"
                  value={draft.cardio?.speedKmh ?? ''}
                  onChange={(e) =>
                    updateCardio({
                      speedKmh: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                />
              </div>
            </div>

            <div>
              <label className="section-label" htmlFor="cardio-mod">Modalidade</label>
              <input
                id="cardio-mod"
                className="input"
                style={{ marginTop: 4 }}
                value={draft.cardio?.modality ?? dayTemplate.cardio.modalitySuggestion}
                onChange={(e) => updateCardio({ modality: e.target.value })}
              />
            </div>

            <button
              type="button"
              className={`btn btn-sm btn-block ${draft.cardio?.completed ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => updateCardio({ completed: !draft.cardio?.completed })}
            >
              <Activity size={15} />
              {draft.cardio?.completed ? 'Cardio Concluído ✓' : 'Marcar Cardio como Concluído'}
            </button>
          </div>
        )}
      </div>

      {/* Notas gerais da sessão */}
      <div className="card">
        <label className="section-label" htmlFor="session-notes-field">
          Anotações da sessão (energia, sono, pump, articulações)
        </label>
        <textarea
          id="session-notes-field"
          className="input"
          rows={2}
          style={{ marginTop: 6, resize: 'vertical' }}
          placeholder="Ex.: Dormi 7h, força ótima no supino, leve fadiga no final..."
          value={draft.notes}
          onChange={(e) => onUpdateDraft((prev) => ({ ...prev, notes: e.target.value }))}
        />
      </div>

      {/* Ações finais da sessão */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {!confirmPartialFinish ? (
          <button
            type="button"
            className="btn btn-primary btn-block"
            style={{ minHeight: 54, fontSize: 16 }}
            onClick={() => {
              if (liveStats.completedValid > 0 && liveStats.completedValid < liveStats.plannedValid) {
                setConfirmPartialFinish(true);
              } else {
                onFinishWorkout();
              }
            }}
          >
            <Check size={20} strokeWidth={3} />
            Finalizar & Salvar Treino ({liveStats.completedValid}/{liveStats.plannedValid} séries válidas)
          </button>
        ) : (
          <div className="card card-amber">
            <p style={{ margin: '0 0 10px', fontSize: 13, color: '#FEF3C7' }}>
              Você concluiu <strong>{liveStats.completedValid}</strong> de{' '}
              <strong>{liveStats.plannedValid}</strong> séries planejadas. Deseja salvar o treino agora
              apenas com as séries concluídas?
            </p>
            <div className="grid-2">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setConfirmPartialFinish(false)}
              >
                Voltar às séries
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setConfirmPartialFinish(false);
                  onFinishWorkout();
                }}
              >
                Salvar assim mesmo
              </button>
            </div>
          </div>
        )}

        {!confirmDiscard ? (
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-block"
            onClick={() => setConfirmDiscard(true)}
          >
            Descartar treino em andamento
          </button>
        ) : (
          <div className="card" style={{ borderColor: 'rgba(244,63,94,0.5)' }}>
            <p style={{ margin: '0 0 10px', fontSize: 13, color: '#FECDD3' }}>
              Tem certeza que deseja descartar esta sessão sem salvar no histórico?
            </p>
            <div className="grid-2">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setConfirmDiscard(false)}
              >
                Continuar treinando
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={onDiscardWorkout}
              >
                <RefreshCw size={14} /> Sim, descartar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
