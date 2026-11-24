import type {
  ExerciseTemplate,
  PRType,
  ProgressionRecommendation,
  SetEntry,
  WorkoutSession,
} from '../types/workout';
import { calculate1RM, roundToGymIncrement } from './calculations';

/**
 * Encontra o log mais recente de um exercício em sessões finalizadas (excluindo aquecimento).
 */
export function getLastExerciseLog(
  exerciseId: string,
  sessions: WorkoutSession[],
): { sessionDate: string; validSets: SetEntry[] } | null {
  const sorted = [...sessions].sort((a, b) => b.finishedAt - a.finishedAt);
  for (const session of sorted) {
    const found = session.exercises.find((e) => e.exerciseId === exerciseId);
    if (!found) continue;
    const validSets = found.sets.filter((s) => !s.isWarmup && s.completed);
    if (validSets.length > 0) {
      return { sessionDate: session.date, validSets };
    }
  }
  return null;
}

/**
 * Sistema inteligente de Progressão Dupla:
 * - Analisa exclusivamente séries válidas (nunca aquecimento).
 * - Se todas as séries válidas da última sessão atingiram ou superaram o teto de repetições (`repMax`):
 *   sugere aumento de 2% a 5%, arredondado para incrementos reais de academia (1 kg ou 2 kg).
 * - Enquanto dentro da faixa-alvo sem bater o teto em todas as séries:
 *   recomenda manter a carga atual e buscar +1 repetição por série.
 * - Se ficou abaixo da faixa mínima (`repMin`) na média:
 *   recomenda consolidar/ajustar carga para preservar técnica e faixa de hipertrofia/força.
 */
export function computeDoubleProgression(
  template: ExerciseTemplate,
  sessions: WorkoutSession[],
): ProgressionRecommendation {
  const last = getLastExerciseLog(template.id, sessions);

  if (!last || last.validSets.length === 0) {
    return {
      status: 'baseline',
      suggestedWeightKg: null,
      previousWeightKg: null,
      deltaKg: 0,
      deltaPercent: 0,
      headline: 'Defina sua carga base hoje',
      detail: template.isIsometric
        ? `Mire ${template.repMin}–${template.repMax}s limpos por série (adicione anilha extra quando fechar ${template.repMax}s).`
        : `Escolha uma carga que permita ${template.repMin}–${template.repMax} reps com RIR ${template.recommendedRir ?? '1–2'}.`,
      targetSummary: `${template.targetSets}×${template.repMin}–${template.repMax}${template.isIsometric ? 's' : ''}`,
    };
  }

  const validSets = last.validSets;
  // Usa a carga de trabalho predominante (maior carga das séries válidas)
  const workingWeight = Math.max(...validSets.map((s) => s.weightKg));
  const setsToEvaluate = validSets.slice(0, Math.max(template.targetSets, validSets.length));
  const metMinimumSetVolume = validSets.length >= template.targetSets;

  const allHitCeiling =
    metMinimumSetVolume && setsToEvaluate.every((s) => s.reps >= template.repMax);

  const avgReps =
    validSets.reduce((acc, s) => acc + s.reps, 0) / validSets.length;
  const anyBelowMin = validSets.some((s) => s.reps < template.repMin);

  const step = template.loadIncrementKg >= 2 ? 2 : 1;

  // Caso especial: isométrico (ex.: Prancha 45–60s com carga extra opcional)
  if (template.isIsometric) {
    if (allHitCeiling) {
      const nextExtraLoad = workingWeight === 0 ? 2 : workingWeight + step;
      return {
        status: 'progress',
        suggestedWeightKg: nextExtraLoad,
        previousWeightKg: workingWeight,
        deltaKg: nextExtraLoad - workingWeight,
        deltaPercent: workingWeight > 0 ? Math.round(((nextExtraLoad - workingWeight) / workingWeight) * 100) : 100,
        headline: `Progredir para +${nextExtraLoad} kg extra`,
        detail: `Você fechou ${template.repMax}s em todas as séries! Adicione +${nextExtraLoad} kg de carga extra mantendo postura perfeita.`,
        targetSummary: `${template.targetSets}×${template.repMin}–${template.repMax}s`,
      };
    }
    return {
      status: 'maintain',
      suggestedWeightKg: workingWeight,
      previousWeightKg: workingWeight,
      deltaKg: 0,
      deltaPercent: 0,
      headline:
        workingWeight > 0
          ? `Manter +${workingWeight} kg — busque ${template.repMax}s`
          : `Manter peso corporal — busque ${template.repMax}s`,
      detail: `Último treino: média de ${Math.round(avgReps)}s. Sustente até bater ${template.repMax}s em todas as ${template.targetSets} séries.`,
      targetSummary: `${template.targetSets}×${template.repMin}–${template.repMax}s`,
    };
  }

  // Progressão dupla padrão (aumento de 2% a 5%, arredondado para 1 kg ou 2 kg)
  if (allHitCeiling && workingWeight > 0) {
    // 3.5% é o centro exato da faixa 2%–5%, arredondado para incremento real e garantido >= step
    const targetPercent = workingWeight >= 80 ? 0.025 : 0.04;
    const rawIncrease = workingWeight * targetPercent;
    let roundedIncrease = roundToGymIncrement(rawIncrease, step);

    // Garante que o aumento fique dentro de 2%–5% quando possível, e nunca menor que 1 incremento real
    const min2Pct = workingWeight * 0.02;
    const max5Pct = workingWeight * 0.05;
    if (roundedIncrease < step) {
      roundedIncrease = step;
    } else if (roundedIncrease < min2Pct) {
      roundedIncrease = Math.ceil(min2Pct / step) * step;
    } else if (roundedIncrease > max5Pct && roundedIncrease - step >= min2Pct) {
      roundedIncrease = Math.floor(max5Pct / step) * step;
    }

    const suggested = workingWeight + roundedIncrease;
    const pct = Number(((roundedIncrease / workingWeight) * 100).toFixed(1));

    return {
      status: 'progress',
      suggestedWeightKg: suggested,
      previousWeightKg: workingWeight,
      deltaKg: roundedIncrease,
      deltaPercent: pct,
      headline: `Subir carga para ${suggested} kg (+${roundedIncrease} kg)`,
      detail: `Teto de ${template.repMax} reps batido em todas as ${template.targetSets} séries com ${workingWeight} kg! Aumento de +${pct}% (incremento de ${step} kg) buscando ${template.repMin}–${template.repMax} reps.`,
      targetSummary: `${template.targetSets}×${template.repMin}–${template.repMax}`,
    };
  }

  if (anyBelowMin && avgReps < template.repMin) {
    const reduced = Math.max(0, workingWeight - step);
    return {
      status: 'consolidate',
      suggestedWeightKg: workingWeight,
      previousWeightKg: workingWeight,
      deltaKg: 0,
      deltaPercent: 0,
      headline: `Consolidar ${workingWeight} kg (ou ajustar para ${reduced} kg)`,
      detail: `Na última sessão a média ficou em ${avgReps.toFixed(1)} reps (abaixo de ${template.repMin}). Priorize técnica limpa e alcance ao menos ${template.repMin} reps em todas as séries.`,
      targetSummary: `${template.targetSets}×${template.repMin}–${template.repMax}`,
    };
  }

  const minAchieved = Math.min(...validSets.map((s) => s.reps));
  return {
    status: 'maintain',
    suggestedWeightKg: workingWeight,
    previousWeightKg: workingWeight,
    deltaKg: 0,
    deltaPercent: 0,
    headline: `Manter ${workingWeight} kg e buscar +1 rep`,
    detail: `Último treino: ${validSets.map((s) => `${s.weightKg}×${s.reps}`).join(' · ')}. Continue em ${workingWeight} kg até fechar ${template.repMax} reps em todas as ${template.targetSets} séries (mínimo anterior: ${minAchieved} reps).`,
    targetSummary: `${template.targetSets}×${template.repMin}–${template.repMax}`,
  };
}

/**
 * Detecta Recordes Pessoais (PRs) ao concluir uma série válida.
 * Retorna lista de PRs batidos ('weight', '1rm', 'volume') comparando contra todo histórico anterior.
 */
export function detectSetPRs(
  exerciseId: string,
  set: SetEntry,
  sessions: WorkoutSession[],
  formula: 'epley' | 'brzycki' = 'epley',
  isIsometric = false,
): PRType[] {
  if (set.isWarmup || !set.completed || set.reps <= 0) return [];
  if (!isIsometric && set.weightKg <= 0) return [];

  let maxWeight = 0;
  let max1RM = 0;
  let maxSetVolume = 0;
  let hasHistory = false;

  for (const session of sessions) {
    for (const ex of session.exercises) {
      if (ex.exerciseId !== exerciseId) continue;
      for (const s of ex.sets) {
        if (s.isWarmup || !s.completed) continue;
        hasHistory = true;
        if (s.weightKg > maxWeight) maxWeight = s.weightKg;
        if (!isIsometric && s.weightKg > 0 && s.reps > 0) {
          const est = calculate1RM(s.weightKg, s.reps, formula).selected;
          if (est > max1RM) max1RM = est;
          const vol = s.weightKg * s.reps;
          if (vol > maxSetVolume) maxSetVolume = vol;
        } else if (isIsometric && s.reps > maxSetVolume) {
          maxSetVolume = s.reps;
        }
      }
    }
  }

  // Primeiro registro absoluto do exercício não dispara PR artificialmente
  if (!hasHistory) return [];

  const prs: PRType[] = [];
  if (isIsometric) {
    if (set.weightKg > maxWeight) prs.push('weight');
    if (set.reps > maxSetVolume) prs.push('volume');
    return prs;
  }

  const current1RM = calculate1RM(set.weightKg, set.reps, formula).selected;
  const currentVol = set.weightKg * set.reps;

  if (set.weightKg > maxWeight) prs.push('weight');
  if (current1RM > max1RM + 0.2) prs.push('1rm');
  if (currentVol > maxSetVolume && prs.length === 0) prs.push('volume');

  return prs;
}
