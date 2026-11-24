import type {
  BodyWeightEntry,
  CardioLog,
  CoreMuscleGroup,
  MuscleGroup,
  OneRMFormula,
  WorkoutDayTemplate,
  WorkoutSession,
} from '../types/workout';
import { CORE_MUSCLE_TARGETS, getWeeklyPlannedMuscleSets } from '../data/programPreset';
import { getBestSet1RM } from './calculations';

/**
 * Retorna início da semana (Segunda-feira 00:00) para uma data ISO ou Date.
 */
export function getWeekStartISO(dateInput: Date | string): string {
  const d =
    typeof dateInput === 'string'
      ? new Date(`${dateInput}T12:00:00`)
      : new Date(dateInput.getTime());
  const day = d.getDay(); // 0=Dom..6=Sáb
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dayNum = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dayNum}`;
}

export interface WeeklyMuscleVolumeItem {
  muscle: CoreMuscleGroup;
  label: string;
  completedSets: number;
  plannedSets: number;
  minTarget: number;
  maxTarget: number;
  color: string;
  inTargetZone: boolean;
}

/**
 * Medidor semanal de séries válidas por grupo muscular (semana atual ou mais recente com treinos).
 * Exclui séries de aquecimento e séries não concluídas.
 */
export function computeWeeklyMuscleVolume(
  sessions: WorkoutSession[],
  program: WorkoutDayTemplate[],
  referenceWeekStartISO?: string,
): {
  weekStartISO: string;
  items: WeeklyMuscleVolumeItem[];
  adductorsCompleted: number;
  adductorsPlanned: number;
} {
  const planned = getWeeklyPlannedMuscleSets(program);

  // Se o usuário ainda não treinou nesta semana calendário, usa a semana atual (0 concluídas, mostrando meta planejada)
  const targetWeek = referenceWeekStartISO ?? getWeekStartISO(new Date());

  const completedCounts: Record<MuscleGroup, number> = {
    peito: 0,
    costas: 0,
    ombros: 0,
    triceps: 0,
    biceps: 0,
    quadriceps: 0,
    posterior: 0,
    gluteos: 0,
    panturrilha: 0,
    abdomen: 0,
    adutores: 0,
  };

  for (const s of sessions) {
    if (getWeekStartISO(s.date) !== targetWeek) continue;
    for (const ex of s.exercises) {
      const validSets = ex.sets.filter((st) => !st.isWarmup && st.completed).length;
      completedCounts[ex.primaryMuscle] =
        (completedCounts[ex.primaryMuscle] || 0) + validSets;
    }
  }

  const coreKeys = Object.keys(CORE_MUSCLE_TARGETS) as CoreMuscleGroup[];
  const items: WeeklyMuscleVolumeItem[] = coreKeys.map((muscle) => {
    const meta = CORE_MUSCLE_TARGETS[muscle];
    const plannedSets = planned[muscle] || meta.plannedSets;
    const completedSets = completedCounts[muscle] || 0;
    return {
      muscle,
      label: meta.label,
      completedSets,
      plannedSets,
      minTarget: meta.minSets,
      maxTarget: meta.maxSets,
      color: meta.color,
      inTargetZone: plannedSets >= meta.minSets && plannedSets <= meta.maxSets,
    };
  });

  return {
    weekStartISO: targetWeek,
    items,
    adductorsCompleted: completedCounts.adutores,
    adductorsPlanned: planned.adutores,
  };
}

export interface ExerciseProgressPoint {
  date: string;
  label: string;
  estimated1RM: number;
  maxWeightKg: number;
  bestReps: number;
  sessionTonnageKg: number;
}

export function getExerciseProgressSeries(
  exerciseId: string,
  sessions: WorkoutSession[],
  formula: OneRMFormula = 'epley',
): ExerciseProgressPoint[] {
  const sorted = [...sessions].sort((a, b) => a.finishedAt - b.finishedAt);
  const points: ExerciseProgressPoint[] = [];

  for (const s of sorted) {
    const ex = s.exercises.find((e) => e.exerciseId === exerciseId);
    if (!ex) continue;
    const validSets = ex.sets.filter((st) => !st.isWarmup && st.completed);
    if (validSets.length === 0) continue;

    const { best1RM, bestReps } = getBestSet1RM(validSets, formula, !!ex.isIsometric);
    const maxWeightKg = Math.max(...validSets.map((st) => st.weightKg));
    const tonnage = validSets.reduce((acc, st) => acc + st.weightKg * st.reps, 0);

    const [, m, d] = s.date.split('-');
    points.push({
      date: s.date,
      label: `${d}/${m}`,
      estimated1RM: best1RM,
      maxWeightKg,
      bestReps,
      sessionTonnageKg: Math.round(tonnage),
    });
  }
  return points;
}

export interface SessionTonnagePoint {
  id: string;
  date: string;
  label: string;
  workoutDayId: WorkoutSession['workoutDayId'];
  workoutTitle: string;
  tonnageKg: number;
  validSets: number;
  durationMin: number;
}

export function getSessionTonnageSeries(sessions: WorkoutSession[]): SessionTonnagePoint[] {
  return [...sessions]
    .sort((a, b) => a.finishedAt - b.finishedAt)
    .slice(-16)
    .map((s) => {
      const [, m, d] = s.date.split('-');
      return {
        id: s.id,
        date: s.date,
        label: `${d}/${m}`,
        workoutDayId: s.workoutDayId,
        workoutTitle: s.workoutTitle,
        tonnageKg: Math.round(s.totalTonnageKg),
        validSets: s.validSetsCount,
        durationMin: Math.round(s.durationSeconds / 60),
      };
    });
}

export interface ConsistencyDayCell {
  date: string;
  hasWorkout: boolean;
  hasCardio: boolean;
  workoutTitle?: string;
  cardioMinutes?: number;
  isToday: boolean;
}

export function buildConsistencyHeatmap(
  sessions: WorkoutSession[],
  standaloneCardio: CardioLog[],
  weeks = 8,
): {
  cells: ConsistencyDayCell[];
  totalWorkouts: number;
  totalCardioDays: number;
  weeklyAdherencePct: number;
  currentWeekCount: number;
} {
  const workoutByDate = new Map<string, WorkoutSession>();
  const cardioByDate = new Map<string, number>();

  for (const s of sessions) {
    workoutByDate.set(s.date, s);
    if (s.cardio?.completed && s.cardio.minutes > 0) {
      cardioByDate.set(s.date, (cardioByDate.get(s.date) ?? 0) + s.cardio.minutes);
    }
  }
  for (const c of standaloneCardio) {
    if (c.completed && c.minutes > 0) {
      cardioByDate.set(c.date, (cardioByDate.get(c.date) ?? 0) + c.minutes);
    }
  }

  const today = new Date();
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Alinha ao domingo desta semana para formar grade perfeita de 7 colunas (Seg..Dom)
  const day = today.getDay();
  const endSunday = new Date(today);
  endSunday.setDate(today.getDate() + (day === 0 ? 0 : 7 - day));

  const totalDays = weeks * 7;
  const cells: ConsistencyDayCell[] = [];
  for (let i = totalDays - 1; i >= 0; i--) {
    const dt = new Date(endSunday);
    dt.setDate(endSunday.getDate() - i);
    const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    const ws = workoutByDate.get(iso);
    const cm = cardioByDate.get(iso);
    cells.push({
      date: iso,
      hasWorkout: Boolean(ws),
      hasCardio: Boolean(cm && cm > 0),
      workoutTitle: ws?.workoutTitle,
      cardioMinutes: cm,
      isToday: iso === todayISO,
    });
  }

  const currentWeekStart = getWeekStartISO(today);
  const currentWeekCount = sessions.filter(
    (s) => getWeekStartISO(s.date) === currentWeekStart,
  ).length;

  // Aderência nas últimas 4 semanas com dados (meta 4 treinos/semana)
  const uniqueWeeks = new Set(sessions.map((s) => getWeekStartISO(s.date)));
  const weeksDenominator = Math.max(1, Math.min(4, uniqueWeeks.size));
  const recentWeeksList = Array.from(uniqueWeeks).sort().slice(-weeksDenominator);
  const recentWorkouts = sessions.filter((s) =>
    recentWeeksList.includes(getWeekStartISO(s.date)),
  ).length;
  const weeklyAdherencePct =
    sessions.length === 0
      ? 0
      : Math.min(100, Math.round((recentWorkouts / (weeksDenominator * 4)) * 100));

  return {
    cells,
    totalWorkouts: sessions.length,
    totalCardioDays: cardioByDate.size,
    weeklyAdherencePct,
    currentWeekCount,
  };
}

export interface BodyWeightChartPoint {
  date: string;
  label: string;
  weightKg: number;
  movingAvg7d: number;
  hadWorkout: boolean;
  hadCardio: boolean;
  workoutTitle?: string;
}

export function buildBodyWeightSeries(
  bodyWeights: BodyWeightEntry[],
  sessions: WorkoutSession[],
  standaloneCardio: CardioLog[],
): BodyWeightChartPoint[] {
  const workoutDates = new Map(sessions.map((s) => [s.date, s.workoutTitle]));
  const cardioDates = new Set<string>([
    ...sessions.filter((s) => s.cardio?.completed).map((s) => s.date),
    ...standaloneCardio.filter((c) => c.completed).map((c) => c.date),
  ]);

  const sorted = [...bodyWeights]
    .filter((b) => b.weightKg > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  return sorted.map((entry, idx) => {
    const windowSlice = sorted.slice(Math.max(0, idx - 6), idx + 1);
    const avg =
      windowSlice.reduce((sum, item) => sum + item.weightKg, 0) / windowSlice.length;
    const [, m, d] = entry.date.split('-');
    return {
      date: entry.date,
      label: `${d}/${m}`,
      weightKg: entry.weightKg,
      movingAvg7d: Number(avg.toFixed(2)),
      hadWorkout: workoutDates.has(entry.date),
      hadCardio: cardioDates.has(entry.date),
      workoutTitle: workoutDates.get(entry.date),
    };
  });
}
