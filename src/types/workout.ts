export type MuscleGroup =
  | 'peito'
  | 'costas'
  | 'ombros'
  | 'triceps'
  | 'biceps'
  | 'quadriceps'
  | 'posterior'
  | 'gluteos'
  | 'panturrilha'
  | 'abdomen'
  | 'adutores';

export type CoreMuscleGroup = Exclude<MuscleGroup, 'adutores'>;

export type DayKey =
  | 'domingo'
  | 'segunda'
  | 'terca'
  | 'quarta'
  | 'quinta'
  | 'sexta'
  | 'sabado';

export type WorkoutDayId = 'upper-a' | 'lower-a' | 'upper-b' | 'lower-b';

export type EquipmentType =
  | 'barra'
  | 'halteres'
  | 'maquina'
  | 'polia'
  | 'peso-corporal';

export type AnatomyDiagramKind =
  | 'bench-press'
  | 'incline-press'
  | 'cable-fly'
  | 'seated-row'
  | 'lat-pulldown'
  | 'pullup'
  | 'one-arm-row'
  | 'shoulder-press'
  | 'lateral-raise'
  | 'face-pull'
  | 'triceps-overhead'
  | 'triceps-pushdown'
  | 'triceps-skullcrusher'
  | 'biceps-scott'
  | 'biceps-hammer'
  | 'biceps-barbell'
  | 'biceps-incline'
  | 'hack-squat'
  | 'leg-press'
  | 'leg-extension'
  | 'lying-leg-curl'
  | 'seated-leg-curl'
  | 'hip-adduction'
  | 'hip-abduction'
  | 'glute-kickback'
  | 'calf-standing'
  | 'calf-seated'
  | 'plank'
  | 'cable-crunch'
  | 'leg-raise';

export interface ExerciseTemplate {
  id: string;
  orderLabel: string;
  name: string;
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  equipment: EquipmentType;
  defaultBarWeightKg?: 0 | 10 | 12 | 20;
  loadIncrementKg: number;
  targetSets: number;
  repMin: number;
  repMax: number;
  isIsometric?: boolean;
  isUnilateral?: boolean;
  restSeconds: number;
  restLabel: string;
  bisetGroup?: string;
  bisetRole?: 'A' | 'B';
  recommendedRir?: string;
  techniqueCue: string;
  executionSteps: string[];
  postureCues: string[];
  commonMistake: string;
  anatomyDiagram: AnatomyDiagramKind;
  substitutions: string[];
}

export interface CardioPlan {
  enabled: boolean;
  optional?: boolean;
  label: string;
  targetMinutesMin: number;
  targetMinutesMax: number;
  modalitySuggestion: string;
  details: string;
}

export interface WorkoutDayTemplate {
  id: WorkoutDayId;
  dayOfWeek: DayKey;
  jsDayIndex: number; // 0 = Dom, 1 = Seg, 2 = Ter, 3 = Qua, 4 = Qui, 5 = Sex, 6 = Sab
  shortDay: string;
  dayName: string;
  title: string;
  subtitle: string;
  focusTag: string;
  accent: 'volt' | 'cyan' | 'ember' | 'violet';
  exercises: ExerciseTemplate[];
  cardio: CardioPlan;
}

export interface RestDayPlan {
  dayOfWeek: DayKey;
  jsDayIndex: number;
  shortDay: string;
  dayName: string;
  title: string;
  description: string;
  optionalCardio?: CardioPlan;
}

export type PRType = 'weight' | '1rm' | 'volume';

export interface SetEntry {
  id: string;
  isWarmup: boolean;
  warmupPercent?: number;
  weightKg: number;
  reps: number; // segundos se isIsometric = true
  rir?: number | null;
  completed: boolean;
  completedAt?: number;
  prTypes?: PRType[];
}

export interface SessionExerciseLog {
  exerciseId: string;
  exerciseName: string;
  orderLabel: string;
  primaryMuscle: MuscleGroup;
  equipment: EquipmentType;
  isIsometric?: boolean;
  isUnilateral?: boolean;
  bisetGroup?: string;
  bisetRole?: 'A' | 'B';
  sets: SetEntry[];
  sessionNote?: string;
}

export interface CardioLog {
  id: string;
  date: string; // YYYY-MM-DD
  modality: string;
  minutes: number;
  distanceKm?: number;
  inclinePercent?: number;
  speedKmh?: number;
  notes?: string;
  completed: boolean;
}

export interface WorkoutSession {
  id: string;
  workoutDayId: WorkoutDayId;
  workoutTitle: string;
  date: string; // YYYY-MM-DD
  startedAt: number;
  finishedAt: number;
  durationSeconds: number;
  exercises: SessionExerciseLog[];
  cardio?: CardioLog;
  totalTonnageKg: number;
  validSetsCount: number;
  prCount: number;
  notes?: string;
}

export interface RestTimerState {
  exerciseName: string;
  durationSeconds: number;
  remainingSeconds: number;
  startedAt: number;
  endsAt: number;
  paused: boolean;
}

export interface ActiveWorkoutDraft {
  id: string;
  workoutDayId: WorkoutDayId;
  workoutTitle: string;
  date: string;
  startedAt: number;
  exercises: SessionExerciseLog[];
  cardio?: CardioLog;
  notes: string;
  warmupsEnabled: boolean;
}

export interface BodyWeightEntry {
  id: string;
  date: string; // YYYY-MM-DD
  weightKg: number;
  fasting: boolean;
  notes?: string;
}

export type OneRMFormula = 'epley' | 'brzycki';

export interface UserConsentState {
  acceptedVersion: string | null;
  acceptedAt: string | null;
  ageConfirmed18OrGuardian: boolean;
  healthDataConsent: boolean;
  healthDisclaimerAcknowledged: boolean;
}

export interface UserSettings {
  formula1RM: OneRMFormula;
  defaultBarWeightKg: 10 | 12 | 20;
  availablePlatesKg: number[];
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  autoWakeLock: boolean;
  autoStartRestTimer: boolean;
  autoGenerateWarmups: boolean;
  showRirColumn: boolean;
  lastBackupAt: string | null;
  workoutsSinceLastBackup: number;
  isDemoDataLoaded: boolean;
}

export interface AppStateData {
  schemaVersion: number;
  program: WorkoutDayTemplate[];
  sessions: WorkoutSession[];
  standaloneCardio: CardioLog[];
  bodyWeights: BodyWeightEntry[];
  machineNotes: Record<string, string>;
  activeDraft: ActiveWorkoutDraft | null;
  settings: UserSettings;
  consent: UserConsentState;
}

export interface ProgressionRecommendation {
  status: 'progress' | 'maintain' | 'consolidate' | 'baseline';
  suggestedWeightKg: number | null;
  previousWeightKg: number | null;
  deltaKg: number;
  deltaPercent: number;
  headline: string;
  detail: string;
  targetSummary: string;
}

export interface OneRMResult {
  epley: number;
  brzycki: number;
  selected: number;
  formula: OneRMFormula;
  percentages: {
    percent: number;
    weightKg: number;
    label: string;
  }[];
}

export interface PlateBreakdown {
  targetWeightKg: number;
  barWeightKg: number;
  achievableWeightKg: number;
  differenceKg: number;
  perSideWeightKg: number;
  platesPerSide: { weightKg: number; count: number; color: string }[];
  exactMatch: boolean;
}

export interface DeloadAlert {
  shouldDeload: boolean;
  severity: 'none' | 'watch' | 'recommended';
  inCaloricDeficit: boolean;
  weightTrendKgPerWeek: number | null;
  stagnatedExercises: {
    exerciseId: string;
    exerciseName: string;
    reason: string;
    weeksAffected: number;
    previousPeak1RM: number;
    recent1RM: number;
  }[];
  summary: string;
  protocolTips: string[];
}
