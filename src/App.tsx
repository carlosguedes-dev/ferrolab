import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  CalendarClock,
  ClipboardList,
  Dumbbell,
  SlidersHorizontal,
  Sun,
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
      ? 'Recuperação automática ativada: seus dados foram restaurados a partir da cópia sombra local.'
      : initialLoad.storageError,
  );

  // Roteamento por hash (suporta 404 real e funciona em qualquer host estático / GitHub Pages)
  const [routeState, setRouteState] = useState(() => parseHashRoute(window.location.hash));
  const [legalDocModal, setLegalDocModal] = useState<'privacy' | 'terms' | null>(
    routeState.legalDoc ?? null,
  );
  const [consentDeclined, setConsentDeclined] = useState(false);

  // Estado UI transitório
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
    const t = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(t);
  }, [toast]);

  // Escuta mudanças de hash
  useEffect(() => {
    const onHashChange = () => {
      const parsed = parseHashRoute(window.location.hash);
      setRouteState(parsed);
      if (parsed.legalDoc) setLegalDocModal(parsed.legalDoc);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Monitoramento online/offline
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

  // Autosave local automático (principal + cópia sombra)
  useEffect(() => {
    const res = saveAppState(state);
    if (!res.ok && res.error) {
      setStorageWarning(`Falha ao salvar localmente: ${res.error}. Exporte seu JSON!`);
    }
  }, [state]);

  // Tela sempre ativa durante sessão em andamento
  const shouldKeepAwake = Boolean(
    showingActiveSession && state.activeDraft && state.settings.autoWakeLock,
  );
  const wakeLock = useWakeLock(shouldKeepAwake);

  // Tick do timer regressivo de descanso
  useEffect(() => {
    if (!restTimer || restTimer.paused) return;
    const id = window.setInterval(() => {
      setRestTimer((prev) => {
        if (!prev || prev.paused) return prev;
        const remaining = Math.max(0, Math.ceil((prev.endsAt - Date.now()) / 1000));
        if (remaining <= 0) {
          playRestCompleteCue(state.settings.soundEnabled, state.settings.vibrationEnabled);
          showToast(`Descanso finalizado! Próxima série em ${prev.exerciseName}.`, 'info');
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
  }, []);

  const deloadAlert = useMemo(
    () =>
      evaluateDeloadNeed(
        state.sessions,
        state.bodyWeights,
        state.settings.formula1RM,
      ),
    [state.sessions, state.bodyWeights, state.settings.formula1RM],
  );

  // =========================================================================
  // AÇÕES DE TREINO
  // =========================================================================

  const startWorkout = useCallback(
    (dayId: WorkoutDayId) => {
      const template = state.program.find((d) => d.id === dayId);
      if (!template) return;

      const exercises: SessionExerciseLog[] = template.exercises.map((ex, idx) => {
        const progression = computeDoubleProgression(ex, state.sessions);
        const prev = getLastExerciseLog(ex.id, state.sessions);
        const initialWeight =
          progression.suggestedWeightKg ?? prev?.validSets[0]?.weightKg ?? 0;

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

        // Gerador automático de aquecimento progressivo no 1º exercício do dia (50%×8, 70%×4, 85%×2)
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
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
      showToast('Conclua pelo menos 1 série válida (ou cardio) antes de salvar o treino.', 'error');
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
    showToast('Sessão em andamento descartada.', 'info');
  }, [showToast]);

  const updateExerciseInProgram = useCallback(
    (dayId: WorkoutDayId, updated: ExerciseTemplate) => {
      setState((prev) => {
        const nextProgram = prev.program.map((d) =>
          d.id === dayId
            ? {
                ...d,
                exercises: d.exercises.map((e) => (e.id === updated.id ? updated : e)),
              }
            : d,
        );
        // Sincroniza nome se houver treino ativo deste dia
        const nextDraft =
          prev.activeDraft && prev.activeDraft.workoutDayId === dayId
            ? {
                ...prev.activeDraft,
                exercises: prev.activeDraft.exercises.map((e) =>
                  e.exerciseId === updated.id ? { ...e, exerciseName: updated.name } : e,
                ),
              }
            : prev.activeDraft;

        return { ...prev, program: nextProgram, activeDraft: nextDraft };
      });
      showToast(`Exercício "${updated.name}" atualizado!`, 'info');
    },
    [showToast],
  );

  // =========================================================================
  // CONSENTIMENTO LGPD / ECA
  // =========================================================================
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

  return (
    <div className="app-shell">
      {/* Top Header Compacto */}
      <header className="app-topbar">
        <button
          type="button"
          className="brand-lockup"
          onClick={() => navigateTo('treino')}
          aria-label="Ir para o início do FerroLab"
        >
          <div className="brand-badge">
            <Dumbbell size={18} color="#C8FF2E" />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div className="brand-title">
              Ferro<span>Lab</span>
            </div>
            <div className="brand-sub">Força · Recomposição · Local-First</div>
          </div>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isOffline && (
            <span className="pill pill-amber" title="Modo offline ativo">
              <WifiOff size={11} /> Offline
            </span>
          )}
          {showingActiveSession && state.activeDraft && (
            <button
              type="button"
              className={`pill ${wakeLock.isActive ? 'pill-volt' : ''}`}
              onClick={() =>
                setState((prev) => ({
                  ...prev,
                  settings: { ...prev.settings, autoWakeLock: !prev.settings.autoWakeLock },
                }))
              }
              title="Alternar tela sempre ativa durante o treino"
            >
              <Sun size={11} /> {wakeLock.isActive ? 'Tela ON' : 'Tela'}
            </button>
          )}
        </div>
      </header>

      {/* Banner de aviso de armazenamento / recuperação sombra */}
      {storageWarning && (
        <div
          style={{
            margin: '10px 14px 0',
            padding: '9px 12px',
            borderRadius: 12,
            background: 'var(--accent-amber-dim)',
            border: '1px solid rgba(245, 158, 11, 0.45)',
            color: '#FEF3C7',
            fontSize: 12,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>{storageWarning}</span>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => setStorageWarning(null)}
          >
            OK
          </button>
        </div>
      )}

      {/* Conteúdo Principal */}
      <main className="app-main">
        {routeState.tab === 'not-found' && (
          <NotFoundPage
            invalidRoute={routeState.raw}
            onGoHome={() => navigateTo('treino')}
          />
        )}

        {routeState.tab === 'treino' &&
          (showingActiveSession && state.activeDraft && activeDayTemplate ? (
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
          ) : (
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
                showToast(`Cardio de ${log.minutes} min registrado!`, 'info');
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
                showToast(`Peso em jejum (${entry.weightKg} kg) registrado!`, 'info');
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
                showToast('4 semanas de demonstração carregadas! Explore Evolução & Histórico.', 'pr');
              }}
              onClearDemoData={() => {
                setState((prev) => ({
                  ...prev,
                  sessions: [],
                  bodyWeights: [],
                  standaloneCardio: [],
                  settings: { ...prev.settings, isDemoDataLoaded: false },
                }));
                showToast('Dados de demonstração removidos. Pronto para seus treinos reais!', 'info');
              }}
            />
          ))}

        {routeState.tab === 'ficha' && (
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
        )}

        {routeState.tab === 'historico' && (
          <HistoryView
            sessions={state.sessions}
            standaloneCardio={state.standaloneCardio}
            formula1RM={state.settings.formula1RM}
            onDeleteSession={(id) => {
              setState((prev) => ({
                ...prev,
                sessions: prev.sessions.filter((s) => s.id !== id),
              }));
              showToast('Sessão removida do histórico.', 'info');
            }}
          />
        )}

        {routeState.tab === 'evolucao' && (
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
              showToast(`Pesagem ${entry.weightKg} kg salva!`, 'info');
            }}
            onDeleteBodyWeight={(id) => {
              setState((prev) => ({
                ...prev,
                bodyWeights: prev.bodyWeights.filter((b) => b.id !== id),
              }));
            }}
          />
        )}

        {routeState.tab === 'ajustes' && (
          <SettingsAndToolsView
            state={state}
            onUpdateSettings={(patch: Partial<UserSettings>) =>
              setState((prev) => ({
                ...prev,
                settings: { ...prev.settings, ...patch },
              }))
            }
            onImportFullState={(nextState) => {
              setState({
                ...nextState,
                consent: state.consent,
              });
            }}
            onResetProgramOnly={() => {
              setState((prev) => ({ ...prev, program: cloneDefaultProgram() }));
              showToast('Ficha Upper/Lower definitiva restaurada para o padrão!', 'info');
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
              showToast('Todos os dados locais foram permanentemente apagados (LGPD).', 'info');
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
              showToast('Dados simulados de 4 semanas carregados!', 'pr');
            }}
            onClearDemoData={() => {
              setState((prev) => ({
                ...prev,
                sessions: [],
                bodyWeights: [],
                standaloneCardio: [],
                settings: { ...prev.settings, isDemoDataLoaded: false },
              }));
              showToast('Dados simulados removidos.', 'info');
            }}
            onShowToast={showToast}
          />
        )}
      </main>

      {/* Dock flutuante do Timer Regressivo de Descanso */}
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
            setRestTimer((prev) => {
              if (!prev) return null;
              if (prev.paused) {
                return {
                  ...prev,
                  paused: false,
                  endsAt: Date.now() + prev.remainingSeconds * 1000,
                };
              }
              return { ...prev, paused: true };
            })
          }
          onSkip={() => setRestTimer(null)}
        />
      )}

      {/* Navegação Inferior Fixa (Ergonomia 1 Mão) */}
      <nav className="bottom-nav" aria-label="Navegação principal">
        <button
          type="button"
          className={`nav-item ${routeState.tab === 'treino' ? 'active' : ''}`}
          onClick={() => navigateTo('treino')}
        >
          {state.activeDraft ? <Activity size={20} /> : <Dumbbell size={20} />}
          <span>{state.activeDraft ? 'Ativo' : 'Treino'}</span>
        </button>
        <button
          type="button"
          className={`nav-item ${routeState.tab === 'ficha' ? 'active' : ''}`}
          onClick={() => navigateTo('ficha')}
        >
          <ClipboardList size={20} />
          <span>Ficha</span>
        </button>
        <button
          type="button"
          className={`nav-item ${routeState.tab === 'historico' ? 'active' : ''}`}
          onClick={() => navigateTo('historico')}
        >
          <CalendarClock size={20} />
          <span>Histórico</span>
        </button>
        <button
          type="button"
          className={`nav-item ${routeState.tab === 'evolucao' ? 'active' : ''}`}
          onClick={() => navigateTo('evolucao')}
        >
          <BarChart3 size={20} />
          <span>Evolução</span>
        </button>
        <button
          type="button"
          className={`nav-item ${routeState.tab === 'ajustes' ? 'active' : ''}`}
          onClick={() => navigateTo('ajustes')}
        >
          <SlidersHorizontal size={20} />
          <span>Ajustes</span>
        </button>
      </nav>

      {/* Modais */}
      {plateCalcState.open && (
        <PlateCalculatorModal
          initialWeightKg={plateCalcState.weightKg}
          defaultBarWeightKg={plateCalcState.barWeightKg ?? state.settings.defaultBarWeightKg}
          availablePlatesKg={state.settings.availablePlatesKg}
          exerciseName={plateCalcState.exerciseName}
          onClose={() => setPlateCalcState((p) => ({ ...p, open: false }))}
        />
      )}

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
              machineNotes: {
                ...prev.machineNotes,
                [detailModalState.exercise.id]: note.trim(),
              },
            }));
            showToast('Anotação fixa do aparelho salva!', 'info');
          }}
          onUpdateExercise={(updated) =>
            updateExerciseInProgram(detailModalState.dayId, updated)
          }
          onClose={() => setDetailModalState(null)}
        />
      )}

      {summarySession && (
        <WorkoutSummaryModal
          session={summarySession}
          onClose={() => {
            setSummarySession(null);
            navigateTo('evolucao');
          }}
        />
      )}

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

      {legalDocModal && (
        <LegalDocsModal
          doc={legalDocModal}
          onSwitchDoc={(doc) => setLegalDocModal(doc)}
          onClose={() => setLegalDocModal(null)}
        />
      )}

      {/* Toast flutuante */}
      {toast && (
        <div
          className={`toast-banner ${
            toast.variant === 'pr'
              ? 'toast-pr'
              : toast.variant === 'error'
                ? 'toast-error'
                : 'toast-info'
          }`}
          role="status"
          aria-live="polite"
        >
          {toast.variant === 'pr' && <Trophy size={18} style={{ flexShrink: 0 }} />}
          <span>{toast.msg}</span>
        </div>
      )}
    </div>
  );
};

export default App;
