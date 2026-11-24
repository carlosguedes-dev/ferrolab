import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import {
  Activity,
  BarChart3,
  CalendarClock,
  ClipboardList,
  Dumbbell,
  SlidersHorizontal,
  Trophy,
  WifiOff,
} from 'lucide-react';
import type {
  ActiveWorkoutDraft,
  AppStateData,
  BodyWeightEntry,
  CardioLog,
  ExerciseTemplate,
  RestTimerState,
  SessionExerciseLog,
  SetEntry,
  UserConsentState,
  UserSettings,
  WorkoutDayId,
  WorkoutSession,
} from './types/workout';
import { cloneDefaultProgram } from './data/programPreset';
import { generateFourWeeksDemoData } from './data/demoData';
import {
  calculateExerciseTonnage,
  generateProgressiveWarmupSets,
  getTodayISO,
} from './engines/calculations';
import { computeDoubleProgression, getLastExerciseLog } from './engines/progression';
import { evaluateDeloadNeed } from './engines/deload';
import { playRestCompleteCue } from './engines/audio';
import {
  createInitialAppState,
  LEGAL_CONSENT_VERSION,
  loadAppState,
  saveAppState,
  serializeBackupJSON,
  triggerFileDownload,
  wipeAllLocalData,
} from './engines/storage';
import { useWakeLock } from './hooks/useWakeLock';
import { TodayAndProgramView } from './components/TodayAndProgramView';
import { ActiveWorkoutView } from './components/ActiveWorkoutView';
import { HistoryView } from './components/HistoryView';
import { AnalyticsDashboardView } from './components/AnalyticsDashboardView';
import { SettingsAndToolsView } from './components/SettingsAndToolsView';
import { RestTimerDock } from './components/RestTimerDock';
import { PlateCalculatorModal } from './components/PlateCalculatorModal';
import { ExerciseDetailModal } from './components/ExerciseDetailModal';
import { WorkoutSummaryModal } from './components/WorkoutSummaryModal';
import { ConsentOnboardingModal } from './components/ConsentOnboardingModal';
import { LegalDocsModal } from './components/LegalDocsModal';
import { ConsentRequiredPage, NotFoundPage } from './components/ErrorPages';
import { SPRING_SNAPPY, ScreenTransition } from './components/MotionPrimitives';

type TabRoute = 'treino' | 'ficha' | 'historico' | 'evolucao' | 'ajustes';

function parseHashRoute(hash: string): {
  tab: TabRoute | 'not-found';
  raw: string;
  legalDoc?: 'privacy' | 'terms';
} {
  const cleaned = hash.replace(/^#\/?/, '').trim().toLowerCase();
  if (!cleaned || cleaned === 'treino') return { tab: 'treino', raw: cleaned };
  if (cleaned === 'ficha') return { tab: 'ficha', raw: cleaned };
  if (cleaned === 'historico') return { tab: 'historico', raw: cleaned };
  if (cleaned === 'evolucao') return { tab: 'evolucao', raw: cleaned };
  if (cleaned === 'ajustes' || cleaned === 'ferramentas') return { tab: 'ajustes', raw: cleaned };
  if (cleaned === 'privacidade') return { tab: 'ajustes', raw: cleaned, legalDoc: 'privacy' };
  if (cleaned === 'termos') return { tab: 'ajustes', raw: cleaned, legalDoc: 'terms' };
  return { tab: 'not-found', raw: `/${cleaned}` };
}

export const App: React.FC = () => {
  const initialLoad = useMemo(() => loadAppState(), []);
  const [state, setState] = useState<AppStateData>(initialLoad.state);
  const [storageWarning, setStorageWarning] = useState<string | null>(
    initialLoad.recoveredFromShadow
      ? 'Recuperação automática: dados restaurados da cópia sombra local.'
      : initialLoad.storageError,
  );

  const [routeState, setRouteState] = useState(() => parseHashRoute(window.location.hash));
  const [legalDocModal, setLegalDocModal] = useState<'privacy' | 'terms' | null>(
    routeState.legalDoc ?? null,
  );
  const [consentDeclined, setConsentDeclined] = useState(false);

  const [showingActiveSession, setShowingActiveSession] = useState<boolean>(
    Boolean(initialLoad.state.activeDraft),
  );
  const [restTimer, setRestTimer] = useState<RestTimerState | null>(null);
  const [plateCalcState, setPlateCalcState] = useState<{
    open: boolean;
    weightKg: number;
    exerciseName?: string;
    barWeightKg?: 10 | 12 | 20;
  }>({ open: false, weightKg: 60 });
  const [detailModalState, setDetailModalState] = useState<{
    dayId: WorkoutDayId;
    exercise: ExerciseTemplate;
    bestWeight: number;
    bestReps: number;
  } | null>(null);
  const [summarySession, setSummarySession] = useState<WorkoutSession | null>(null);
  const [toast, setToast] = useState<{ msg: string; variant: 'pr' | 'info' | 'error' } | null>(
    null,
  );
  const [isOffline, setIsOffline] = useState<boolean>(
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );

  const showToast = useCallback((msg: string, variant: 'pr' | 'info' | 'error' = 'info') => {
    setToast({ msg, variant });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3800);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const onHashChange = () => {
      const parsed = parseHashRoute(window.location.hash);
      setRouteState(parsed);
      if (parsed.legalDoc) setLegalDocModal(parsed.legalDoc);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    const res = saveAppState(state);
    if (!res.ok && res.error) {
      setStorageWarning(`Falha ao salvar localmente: ${res.error}. Exporte seu JSON.`);
    }
  }, [state]);

  const shouldKeepAwake = Boolean(
    showingActiveSession && state.activeDraft && state.settings.autoWakeLock,
  );
  const wakeLock = useWakeLock(shouldKeepAwake);

  useEffect(() => {
    if (!restTimer || restTimer.paused) return;
    const id = window.setInterval(() => {
      setRestTimer((prev) => {
        if (!prev || prev.paused) return prev;
        const remaining = Math.max(0, Math.ceil((prev.endsAt - Date.now()) / 1000));
        if (remaining <= 0) {
          playRestCompleteCue(state.settings.soundEnabled, state.settings.vibrationEnabled);
          showToast(`Descanso finalizado — próxima série!`, 'info');
          return null;
        }
        return { ...prev, remainingSeconds: remaining };
      });
    }, 250);
    return () => window.clearInterval(id);
  }, [restTimer, state.settings.soundEnabled, state.settings.vibrationEnabled, showToast]);

  const navigateTo = useCallback((tab: TabRoute) => {
    window.location.hash = `#/${tab}`;
    setRouteState({ tab, raw: tab });
    if (tab !== 'treino') setShowingActiveSession(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const deloadAlert = useMemo(
    () => evaluateDeloadNeed(state.sessions, state.bodyWeights, state.settings.formula1RM),
    [state.sessions, state.bodyWeights, state.settings.formula1RM],
  );

  const startWorkout = useCallback(
    (dayId: WorkoutDayId) => {
      const template = state.program.find((d) => d.id === dayId);
      if (!template) return;

      const exercises: SessionExerciseLog[] = template.exercises.map((ex, idx) => {
        const progression = computeDoubleProgression(ex, state.sessions);
        const prev = getLastExerciseLog(ex.id, state.sessions);
        const initialWeight = progression.suggestedWeightKg ?? prev?.validSets[0]?.weightKg ?? 0;

        const workingSets: SetEntry[] = Array.from({ length: ex.targetSets }).map((_, sIdx) => ({
          id: `w-${ex.id}-${sIdx}-${Date.now()}`,
          isWarmup: false,
          weightKg: initialWeight,
          reps:
            progression.status === 'progress'
              ? ex.repMin
              : prev?.validSets[sIdx]?.reps ?? ex.repMin,
          rir: null,
          completed: false,
        }));

        const warmupSets =
          idx === 0 && state.settings.autoGenerateWarmups
            ? generateProgressiveWarmupSets(
                initialWeight,
                ex.loadIncrementKg,
                ex.defaultBarWeightKg && ex.defaultBarWeightKg > 0
                  ? Math.min(ex.defaultBarWeightKg, initialWeight)
                  : 0,
              )
            : [];

        return {
          exerciseId: ex.id,
          exerciseName: ex.name,
          orderLabel: ex.orderLabel,
          primaryMuscle: ex.primaryMuscle,
          equipment: ex.equipment,
          isIsometric: ex.isIsometric,
          isUnilateral: ex.isUnilateral,
          bisetGroup: ex.bisetGroup,
          bisetRole: ex.bisetRole,
          sets: [...warmupSets, ...workingSets],
        };
      });

      const draft: ActiveWorkoutDraft = {
        id: `draft-${Date.now()}`,
        workoutDayId: template.id,
        workoutTitle: `${template.title} — ${template.subtitle}`,
        date: getTodayISO(),
        startedAt: Date.now(),
        exercises,
        cardio: template.cardio.enabled
          ? {
              id: `cardio-${Date.now()}`,
              date: getTodayISO(),
              modality: template.cardio.modalitySuggestion,
              minutes: template.cardio.targetMinutesMin || 20,
              completed: false,
            }
          : undefined,
        notes: '',
        warmupsEnabled: state.settings.autoGenerateWarmups,
      };

      setState((prev) => ({ ...prev, activeDraft: draft }));
      setShowingActiveSession(true);
      navigateTo('treino');
    },
    [state.program, state.sessions, state.settings.autoGenerateWarmups, navigateTo],
  );

  const finishWorkout = useCallback(() => {
    const draft = state.activeDraft;
    if (!draft) return;

    const finishedAt = Date.now();
    const durationSeconds = Math.max(60, Math.floor((finishedAt - draft.startedAt) / 1000));
    let totalTonnage = 0;
    let validSetsCount = 0;
    let prCount = 0;

    for (const ex of draft.exercises) {
      totalTonnage += calculateExerciseTonnage(ex.sets, !!ex.isIsometric, !!ex.isUnilateral);
      for (const s of ex.sets) {
        if (!s.isWarmup && s.completed) {
          validSetsCount += 1;
          if (s.prTypes && s.prTypes.length > 0) prCount += 1;
        }
      }
    }

    if (validSetsCount === 0 && !draft.cardio?.completed) {
      showToast('Conclua pelo menos 1 série válida antes de salvar.', 'error');
      return;
    }

    const session: WorkoutSession = {
      id: `session-${finishedAt}`,
      workoutDayId: draft.workoutDayId,
      workoutTitle: draft.workoutTitle,
      date: draft.date,
      startedAt: draft.startedAt,
      finishedAt,
      durationSeconds,
      exercises: draft.exercises,
      cardio: draft.cardio?.completed ? draft.cardio : undefined,
      totalTonnageKg: Math.round(totalTonnage),
      validSetsCount,
      prCount,
      notes: draft.notes.trim() || undefined,
    };

    setState((prev) => ({
      ...prev,
      sessions: [session, ...prev.sessions],
      activeDraft: null,
      settings: {
        ...prev.settings,
        workoutsSinceLastBackup: prev.settings.workoutsSinceLastBackup + 1,
      },
    }));
    setRestTimer(null);
    setShowingActiveSession(false);
    setSummarySession(session);
  }, [state.activeDraft, showToast]);

  const discardWorkout = useCallback(() => {
    setState((prev) => ({ ...prev, activeDraft: null }));
    setRestTimer(null);
    setShowingActiveSession(false);
    showToast('Sessão descartada.', 'info');
  }, [showToast]);

  const updateExerciseInProgram = useCallback(
    (dayId: WorkoutDayId, updated: ExerciseTemplate) => {
      setState((prev) => ({
        ...prev,
        program: prev.program.map((d) =>
          d.id === dayId
            ? { ...d, exercises: d.exercises.map((e) => (e.id === updated.id ? updated : e)) }
            : d,
        ),
        activeDraft:
          prev.activeDraft && prev.activeDraft.workoutDayId === dayId
            ? {
                ...prev.activeDraft,
                exercises: prev.activeDraft.exercises.map((e) =>
                  e.exerciseId === updated.id ? { ...e, exerciseName: updated.name } : e,
                ),
              }
            : prev.activeDraft,
      }));
      showToast(`"${updated.name}" atualizado.`, 'info');
    },
    [showToast],
  );

  const hasValidConsent =
    state.consent.acceptedVersion === LEGAL_CONSENT_VERSION &&
    state.consent.ageConfirmed18OrGuardian &&
    state.consent.healthDataConsent &&
    state.consent.healthDisclaimerAcknowledged;

  if (!hasValidConsent && consentDeclined) {
    return (
      <ConsentRequiredPage
        onReviewConsent={() => setConsentDeclined(false)}
        onExportBeforeLeaving={() =>
          triggerFileDownload(
            serializeBackupJSON(state),
            `ferrolab-backup-${getTodayISO()}.json`,
            'application/json;charset=utf-8',
          )
        }
        onWipeData={() => {
          wipeAllLocalData();
          setState(createInitialAppState());
          setConsentDeclined(false);
        }}
      />
    );
  }

  const activeDayTemplate = state.activeDraft
    ? state.program.find((d) => d.id === state.activeDraft?.workoutDayId) ?? state.program[0]
    : null;
  const isWorkoutMode = Boolean(routeState.tab === 'treino' && showingActiveSession && state.activeDraft && activeDayTemplate);

  const navItems: { id: TabRoute; label: string; icon: React.ReactNode }[] = [
    {
      id: 'treino',
      label: state.activeDraft ? 'Ativo' : 'Treino',
      icon: state.activeDraft ? <Activity size={19} /> : <Dumbbell size={19} />,
    },
    { id: 'ficha', label: 'Ficha', icon: <ClipboardList size={19} /> },
    { id: 'historico', label: 'Histórico', icon: <CalendarClock size={19} /> },
    { id: 'evolucao', label: 'Evolução', icon: <BarChart3 size={19} /> },
    { id: 'ajustes', label: 'Ajustes', icon: <SlidersHorizontal size={19} /> },
  ];

  return (
    <MotionConfig reducedMotion="user">
      <div className="fl-shell">
        {/* Header minimalista e silencioso */}
        <header className="fl-header">
          <button
            type="button"
            onClick={() => navigateTo('treino')}
            aria-label="Ir para o início do FerroLab"
            style={{ display: 'flex', alignItems: 'center', gap: 10 }}
          >
            <img
              src="./icon-192.png"
              alt="FerroLab"
              width={32}
              height={32}
              style={{
                borderRadius: 9,
                border: '1px solid var(--hairline-strong)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.45)',
              }}
            />
            <span
              className="t-display"
              style={{ fontSize: 22, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase' }}
            >
              Ferro<span style={{ color: 'var(--volt)' }}>Lab</span>
            </span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isOffline && (
              <span className="fl-pill fl-pill-amber">
                <WifiOff size={11} /> Offline
              </span>
            )}
          </div>
        </header>

        {storageWarning && (
          <div
            style={{
              margin: '0 20px 10px',
              padding: '10px 14px',
              borderRadius: 14,
              background: 'var(--amber-soft)',
              color: '#fde68a',
              fontSize: 12,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span>{storageWarning}</span>
            <button type="button" className="fl-btn fl-btn-ghost fl-btn-xs" onClick={() => setStorageWarning(null)}>
              OK
            </button>
          </div>
        )}

        {/* Transição animada entre telas */}
        <main className={`fl-main ${isWorkoutMode ? 'workout-active' : ''}`}>
          <AnimatePresence mode="wait">
            {routeState.tab === 'not-found' && (
              <ScreenTransition routeKey="404">
                <NotFoundPage invalidRoute={routeState.raw} onGoHome={() => navigateTo('treino')} />
              </ScreenTransition>
            )}

            {routeState.tab === 'treino' &&
              (isWorkoutMode && state.activeDraft && activeDayTemplate ? (
                <ScreenTransition routeKey="workout-active">
                  <ActiveWorkoutView
                    draft={state.activeDraft}
                    dayTemplate={activeDayTemplate}
                    sessions={state.sessions}
                    machineNotes={state.machineNotes}
                    formula1RM={state.settings.formula1RM}
                    soundEnabled={state.settings.soundEnabled}
                    vibrationEnabled={state.settings.vibrationEnabled}
                    autoStartRestTimer={state.settings.autoStartRestTimer}
                    showRirColumn={state.settings.showRirColumn}
                    wakeLockSupported={wakeLock.isSupported}
                    wakeLockActive={wakeLock.isActive}
                    wakeLockEnabled={state.settings.autoWakeLock}
                    onToggleWakeLock={() =>
                      setState((prev) => ({
                        ...prev,
                        settings: { ...prev.settings, autoWakeLock: !prev.settings.autoWakeLock },
                      }))
                    }
                    onUpdateDraft={(updater) =>
                      setState((prev) =>
                        prev.activeDraft ? { ...prev, activeDraft: updater(prev.activeDraft) } : prev,
                      )
                    }
                    onStartRestTimer={(timer) => setRestTimer(timer)}
                    onOpenAnatomy={(exercise, bestWeight, bestReps) =>
                      setDetailModalState({
                        dayId: activeDayTemplate.id,
                        exercise,
                        bestWeight,
                        bestReps,
                      })
                    }
                    onOpenPlateCalc={(weightKg, exerciseName, barWeight) =>
                      setPlateCalcState({
                        open: true,
                        weightKg,
                        exerciseName,
                        barWeightKg:
                          barWeight === 10 || barWeight === 12 || barWeight === 20
                            ? barWeight
                            : state.settings.defaultBarWeightKg,
                      })
                    }
                    onFinishWorkout={finishWorkout}
                    onDiscardWorkout={discardWorkout}
                    onShowToast={showToast}
                  />
                </ScreenTransition>
              ) : (
                <ScreenTransition routeKey="today">
                  <TodayAndProgramView
                    mode="today"
                    program={state.program}
                    sessions={state.sessions}
                    bodyWeights={state.bodyWeights}
                    activeDraft={state.activeDraft}
                    deloadAlert={deloadAlert}
                    isDemoDataLoaded={state.settings.isDemoDataLoaded}
                    onStartWorkout={startWorkout}
                    onResumeWorkout={() => setShowingActiveSession(true)}
                    onLogStandaloneCardio={(log: CardioLog) => {
                      setState((prev) => ({
                        ...prev,
                        standaloneCardio: [log, ...prev.standaloneCardio],
                      }));
                      showToast(`Cardio de ${log.minutes} min salvo.`, 'info');
                    }}
                    onQuickLogWeight={(weightKg, fasting) => {
                      const today = getTodayISO();
                      const entry: BodyWeightEntry = {
                        id: `bw-${Date.now()}`,
                        date: today,
                        weightKg: Number(weightKg.toFixed(1)),
                        fasting,
                      };
                      setState((prev) => ({
                        ...prev,
                        bodyWeights: [
                          ...prev.bodyWeights.filter((b) => b.date !== today),
                          entry,
                        ].sort((a, b) => a.date.localeCompare(b.date)),
                      }));
                      showToast(`Peso em jejum (${entry.weightKg} kg) registrado.`, 'info');
                    }}
                    onOpenExerciseDetail={(dayId, ex) =>
                      setDetailModalState({ dayId, exercise: ex, bestWeight: 0, bestReps: ex.repMax })
                    }
                    onOpenPlateCalc={() =>
                      setPlateCalcState({
                        open: true,
                        weightKg: 60,
                        barWeightKg: state.settings.defaultBarWeightKg,
                      })
                    }
                    onLoadDemoData={() => {
                      const demo = generateFourWeeksDemoData(state.program);
                      setState((prev) => ({
                        ...prev,
                        sessions: demo.sessions,
                        bodyWeights: demo.bodyWeights,
                        standaloneCardio: demo.standaloneCardio,
                        machineNotes: { ...demo.machineNotes, ...prev.machineNotes },
                        settings: { ...prev.settings, isDemoDataLoaded: true },
                      }));
                      showToast('4 semanas simuladas carregadas!', 'pr');
                    }}
                    onClearDemoData={() => {
                      setState((prev) => ({
                        ...prev,
                        sessions: [],
                        bodyWeights: [],
                        standaloneCardio: [],
                        settings: { ...prev.settings, isDemoDataLoaded: false },
                      }));
                      showToast('Dados demo removidos.', 'info');
                    }}
                  />
                </ScreenTransition>
              ))}

            {routeState.tab === 'ficha' && (
              <ScreenTransition routeKey="ficha">
                <TodayAndProgramView
                  mode="program"
                  program={state.program}
                  sessions={state.sessions}
                  bodyWeights={state.bodyWeights}
                  activeDraft={state.activeDraft}
                  deloadAlert={deloadAlert}
                  isDemoDataLoaded={state.settings.isDemoDataLoaded}
                  onStartWorkout={startWorkout}
                  onResumeWorkout={() => {
                    navigateTo('treino');
                    setShowingActiveSession(true);
                  }}
                  onLogStandaloneCardio={() => {}}
                  onQuickLogWeight={() => {}}
                  onOpenExerciseDetail={(dayId, ex) =>
                    setDetailModalState({ dayId, exercise: ex, bestWeight: 0, bestReps: ex.repMax })
                  }
                  onOpenPlateCalc={() =>
                    setPlateCalcState({
                      open: true,
                      weightKg: 60,
                      barWeightKg: state.settings.defaultBarWeightKg,
                    })
                  }
                  onLoadDemoData={() => {}}
                  onClearDemoData={() => {}}
                />
              </ScreenTransition>
            )}

            {routeState.tab === 'historico' && (
              <ScreenTransition routeKey="historico">
                <HistoryView
                  sessions={state.sessions}
                  standaloneCardio={state.standaloneCardio}
                  formula1RM={state.settings.formula1RM}
                  onDeleteSession={(id) => {
                    setState((prev) => ({
                      ...prev,
                      sessions: prev.sessions.filter((s) => s.id !== id),
                    }));
                    showToast('Sessão removida.', 'info');
                  }}
                />
              </ScreenTransition>
            )}

            {routeState.tab === 'evolucao' && (
              <ScreenTransition routeKey="evolucao">
                <AnalyticsDashboardView
                  program={state.program}
                  sessions={state.sessions}
                  standaloneCardio={state.standaloneCardio}
                  bodyWeights={state.bodyWeights}
                  formula1RM={state.settings.formula1RM}
                  deloadAlert={deloadAlert}
                  onAddBodyWeight={(entry) => {
                    setState((prev) => ({
                      ...prev,
                      bodyWeights: [
                        ...prev.bodyWeights.filter((b) => b.date !== entry.date),
                        entry,
                      ].sort((a, b) => a.date.localeCompare(b.date)),
                    }));
                    showToast(`Peso ${entry.weightKg} kg salvo.`, 'info');
                  }}
                  onDeleteBodyWeight={(id) =>
                    setState((prev) => ({
                      ...prev,
                      bodyWeights: prev.bodyWeights.filter((b) => b.id !== id),
                    }))
                  }
                />
              </ScreenTransition>
            )}

            {routeState.tab === 'ajustes' && (
              <ScreenTransition routeKey="ajustes">
                <SettingsAndToolsView
                  state={state}
                  onUpdateSettings={(patch: Partial<UserSettings>) =>
                    setState((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }))
                  }
                  onImportFullState={(nextState) => setState({ ...nextState, consent: state.consent })}
                  onResetProgramOnly={() => {
                    setState((prev) => ({ ...prev, program: cloneDefaultProgram() }));
                    showToast('Ficha Upper/Lower restaurada.', 'info');
                  }}
                  onRevokeConsent={() => {
                    setState((prev) => ({
                      ...prev,
                      consent: {
                        acceptedVersion: null,
                        acceptedAt: null,
                        ageConfirmed18OrGuardian: false,
                        healthDataConsent: false,
                        healthDisclaimerAcknowledged: false,
                      },
                    }));
                    setConsentDeclined(true);
                  }}
                  onWipeAllData={() => {
                    wipeAllLocalData();
                    setRestTimer(null);
                    setShowingActiveSession(false);
                    setState(createInitialAppState());
                    showToast('Dados locais apagados permanentemente.', 'info');
                  }}
                  onOpenLegalDoc={(doc) => setLegalDocModal(doc)}
                  onOpenPlateCalc={() =>
                    setPlateCalcState({
                      open: true,
                      weightKg: 60,
                      barWeightKg: state.settings.defaultBarWeightKg,
                    })
                  }
                  onLoadDemoData={() => {
                    const demo = generateFourWeeksDemoData(state.program);
                    setState((prev) => ({
                      ...prev,
                      sessions: demo.sessions,
                      bodyWeights: demo.bodyWeights,
                      standaloneCardio: demo.standaloneCardio,
                      machineNotes: { ...demo.machineNotes, ...prev.machineNotes },
                      settings: { ...prev.settings, isDemoDataLoaded: true },
                    }));
                    showToast('Dados simulados carregados!', 'pr');
                  }}
                  onClearDemoData={() => {
                    setState((prev) => ({
                      ...prev,
                      sessions: [],
                      bodyWeights: [],
                      standaloneCardio: [],
                      settings: { ...prev.settings, isDemoDataLoaded: false },
                    }));
                    showToast('Dados simulados limpos.', 'info');
                  }}
                  onShowToast={showToast}
                />
              </ScreenTransition>
            )}
          </AnimatePresence>
        </main>

        {/* Floating Rest Timer */}
        <AnimatePresence>
          {restTimer && (
            <RestTimerDock
              timer={restTimer}
              onAdjust={(delta) =>
                setRestTimer((prev) => {
                  if (!prev) return null;
                  const nextRem = Math.max(5, prev.remainingSeconds + delta);
                  return {
                    ...prev,
                    durationSeconds: Math.max(prev.durationSeconds, nextRem),
                    remainingSeconds: nextRem,
                    endsAt: Date.now() + nextRem * 1000,
                  };
                })
              }
              onTogglePause={() =>
                setRestTimer((prev) =>
                  prev
                    ? prev.paused
                      ? { ...prev, paused: false, endsAt: Date.now() + prev.remainingSeconds * 1000 }
                      : { ...prev, paused: true }
                    : null,
                )
              }
              onSkip={() => setRestTimer(null)}
            />
          )}
        </AnimatePresence>

        {/* Floating Spring Bottom Navigation Dock */}
        <div className="fl-nav-wrap">
          <nav className="fl-nav-dock" aria-label="Navegação principal">
            {navItems.map((item) => {
              const active = routeState.tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`fl-nav-btn ${active ? 'active' : ''}`}
                  onClick={() => navigateTo(item.id)}
                >
                  {active && (
                    <motion.span
                      layoutId="fl-nav-pill"
                      className="fl-nav-pill"
                      transition={SPRING_SNAPPY}
                    />
                  )}
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Modais / Sheets Animados */}
        <AnimatePresence>
          {plateCalcState.open && (
            <PlateCalculatorModal
              initialWeightKg={plateCalcState.weightKg}
              defaultBarWeightKg={plateCalcState.barWeightKg ?? state.settings.defaultBarWeightKg}
              availablePlatesKg={state.settings.availablePlatesKg}
              exerciseName={plateCalcState.exerciseName}
              onClose={() => setPlateCalcState((p) => ({ ...p, open: false }))}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {detailModalState && (
            <ExerciseDetailModal
              exercise={detailModalState.exercise}
              bestWeightKg={detailModalState.bestWeight}
              bestReps={detailModalState.bestReps}
              formula1RM={state.settings.formula1RM}
              machineNote={state.machineNotes[detailModalState.exercise.id] ?? ''}
              onSaveMachineNote={(note) => {
                setState((prev) => ({
                  ...prev,
                  machineNotes: { ...prev.machineNotes, [detailModalState.exercise.id]: note.trim() },
                }));
                showToast('Anotação fixa salva.', 'info');
              }}
              onUpdateExercise={(updated) => updateExerciseInProgram(detailModalState.dayId, updated)}
              onClose={() => setDetailModalState(null)}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {summarySession && (
            <WorkoutSummaryModal
              session={summarySession}
              onClose={() => {
                setSummarySession(null);
                navigateTo('evolucao');
              }}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {!hasValidConsent && (
            <ConsentOnboardingModal
              onAccept={(consent: UserConsentState) => {
                setState((prev) => ({ ...prev, consent }));
                setConsentDeclined(false);
              }}
              onOpenLegalDoc={(doc) => setLegalDocModal(doc)}
              onDecline={() => setConsentDeclined(true)}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {legalDocModal && (
            <LegalDocsModal
              doc={legalDocModal}
              onSwitchDoc={(doc) => setLegalDocModal(doc)}
              onClose={() => setLegalDocModal(null)}
            />
          )}
        </AnimatePresence>

        {/* Toast Animado */}
        <AnimatePresence>
          {toast && (
            <motion.div
              className={`fl-toast ${
                toast.variant === 'pr'
                  ? 'fl-toast-pr'
                  : toast.variant === 'error'
                    ? 'fl-toast-error'
                    : 'fl-toast-info'
              }`}
              role="status"
              aria-live="polite"
              initial={{ opacity: 0, y: -16, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: -12, x: '-50%' }}
              transition={SPRING_SNAPPY}
            >
              {toast.variant === 'pr' && <Trophy size={16} style={{ flexShrink: 0 }} />}
              <span>{toast.msg}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
};

export default App;
