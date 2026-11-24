import type {
  BodyWeightEntry,
  DeloadAlert,
  OneRMFormula,
  WorkoutSession,
} from '../types/workout';
import { getBestSet1RM } from './calculations';

/**
 * Calcula tendência semanal de peso corporal em jejum (kg/semana) nos últimos 14–28 dias.
 * Valor negativo indica déficit calórico ativo.
 */
export function computeBodyWeightTrendKgPerWeek(
  bodyWeights: BodyWeightEntry[],
): number | null {
  const fastingEntries = [...bodyWeights]
    .filter((b) => b.fasting && b.weightKg > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (fastingEntries.length < 3) return null;

  const recent = fastingEntries.slice(-14);
  const first = recent[0];
  const last = recent[recent.length - 1];
  const daysSpan =
    (new Date(`${last.date}T12:00:00`).getTime() -
      new Date(`${first.date}T12:00:00`).getTime()) /
    (1000 * 60 * 60 * 24);

  if (daysSpan < 5) return null;

  // Regressão linear simples para reduzir ruído de retenção hídrica diária
  const t0 = new Date(`${first.date}T12:00:00`).getTime();
  const points = recent.map((e) => ({
    x: (new Date(`${e.date}T12:00:00`).getTime() - t0) / (1000 * 60 * 60 * 24),
    y: e.weightKg,
  }));

  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumXX = points.reduce((s, p) => s + p.x * p.x, 0);
  const denom = n * sumXX - sumX * sumX;
  if (Math.abs(denom) < 1e-6) return null;

  const slopePerDay = (n * sumXY - sumX * sumY) / denom;
  return Number((slopePerDay * 7).toFixed(2));
}

/**
 * Alerta inteligente de Deload:
 * Monitora se o 1RM estimado ou carga máxima estagnou ou caiu por 2 semanas seguidas
 * (3 sessões consecutivas de um exercício sem evolução ou com queda, especialmente em déficit calórico).
 */
export function evaluateDeloadNeed(
  sessions: WorkoutSession[],
  bodyWeights: BodyWeightEntry[],
  formula: OneRMFormula = 'epley',
): DeloadAlert {
  const weightTrend = computeBodyWeightTrendKgPerWeek(bodyWeights);
  const inCaloricDeficit = weightTrend !== null && weightTrend <= -0.15;

  // Agrupa histórico cronológico por exercício (somente séries válidas)
  const byExercise = new Map<
    string,
    { name: string; points: { date: string; best1RM: number; avgRir: number | null }[] }
  >();

  const chronological = [...sessions].sort((a, b) => a.finishedAt - b.finishedAt);

  for (const s of chronological) {
    for (const ex of s.exercises) {
      if (ex.isIsometric) continue;
      const { best1RM } = getBestSet1RM(ex.sets, formula, false);
      if (best1RM <= 0) continue;

      const rirs = ex.sets
        .filter((st) => !st.isWarmup && st.completed && typeof st.rir === 'number')
        .map((st) => st.rir as number);
      const avgRir =
        rirs.length > 0
          ? Number((rirs.reduce((a, b) => a + b, 0) / rirs.length).toFixed(1))
          : null;

      const existing = byExercise.get(ex.exerciseId) ?? {
        name: ex.exerciseName,
        points: [],
      };
      existing.name = ex.exerciseName;
      existing.points.push({ date: s.date, best1RM, avgRir });
      byExercise.set(ex.exerciseId, existing);
    }
  }

  const stagnatedExercises: DeloadAlert['stagnatedExercises'] = [];

  for (const [exerciseId, data] of byExercise.entries()) {
    if (data.points.length < 3) continue;
    const recent3 = data.points.slice(-3);
    const [p0, p1, p2] = recent3;

    // Verifica janela temporal de pelo menos ~10 dias (2 semanas seguidas)
    const spanDays =
      (new Date(`${p2.date}T12:00:00`).getTime() -
        new Date(`${p0.date}T12:00:00`).getTime()) /
      (1000 * 60 * 60 * 24);

    if (spanDays < 10) continue;

    const droppedTwoWeeks = p1.best1RM < p0.best1RM && p2.best1RM <= p1.best1RM;
    const stagnatedTwoWeeks =
      p1.best1RM <= p0.best1RM + 0.25 &&
      p2.best1RM <= p0.best1RM + 0.25 &&
      (p2.best1RM < p0.best1RM - 0.5 ||
        (p2.avgRir !== null && p2.avgRir <= 0.5) ||
        inCaloricDeficit);

    if (droppedTwoWeeks || stagnatedTwoWeeks) {
      const reason = droppedTwoWeeks
        ? `Queda contínua de 1RM (${p0.best1RM} → ${p2.best1RM} kg) em 2 semanas`
        : `Estagnação por 2 semanas em ${p2.best1RM} kg${inCaloricDeficit ? ' durante déficit calórico' : ''}`;

      stagnatedExercises.push({
        exerciseId,
        exerciseName: data.name,
        reason,
        weeksAffected: Math.max(2, Math.round(spanDays / 7)),
        previousPeak1RM: p0.best1RM,
        recent1RM: p2.best1RM,
      });
    }
  }

  const protocolTips = [
    'Reduza o volume semanal em 40–50% (faça 2 séries válidas por exercício em vez de 3–4).',
    'Mantenha técnica impecável reduzindo 10% a 15% das cargas principais (RIR 3–4).',
    'Mantenha o aporte de proteína alto e priorize 7–9 h de sono para dissipar fadiga neural.',
    'Na semana seguinte, retome as cargas de trabalho com energia renovada.',
  ];

  if (stagnatedExercises.length >= 2 || (stagnatedExercises.length >= 1 && inCaloricDeficit)) {
    return {
      shouldDeload: true,
      severity: 'recommended',
      inCaloricDeficit,
      weightTrendKgPerWeek: weightTrend,
      stagnatedExercises,
      summary: inCaloricDeficit
        ? `Alerta de Deload: ${stagnatedExercises.length} exercício(s) estagnaram ou caíram por 2 semanas enquanto seu peso caiu (${weightTrend} kg/sem). Uma semana de deload vai preservar sua massa magra e recuperar força.`
        : `Alerta de Deload: ${stagnatedExercises.length} exercícios apresentaram estagnação/queda por 2 semanas seguidas. Considere 1 semana de descarga de fadiga.`,
      protocolTips,
    };
  }

  if (stagnatedExercises.length === 1) {
    return {
      shouldDeload: false,
      severity: 'watch',
      inCaloricDeficit,
      weightTrendKgPerWeek: weightTrend,
      stagnatedExercises,
      summary: `Ponto de atenção em ${stagnatedExercises[0].exerciseName}: acompanhe sono, RIR e ingestão calórica na próxima sessão.`,
      protocolTips,
    };
  }

  return {
    shouldDeload: false,
    severity: 'none',
    inCaloricDeficit,
    weightTrendKgPerWeek: weightTrend,
    stagnatedExercises: [],
    summary:
      'Fadiga sob controle — suas cargas e 1RM seguem consistentes sem sinais de overreaching.',
    protocolTips,
  };
}
