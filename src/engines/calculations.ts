import type {
  OneRMFormula,
  OneRMResult,
  PlateBreakdown,
  SetEntry,
} from '../types/workout';

/**
 * Arredonda uma carga para o incremento prático de academia (ex.: 1 kg ou 2 kg).
 */
export function roundToGymIncrement(weightKg: number, incrementKg = 1): number {
  if (!Number.isFinite(weightKg) || weightKg <= 0) return 0;
  const step = incrementKg > 0 ? incrementKg : 1;
  return Math.round(weightKg / step) * step;
}

/**
 * Calcula 1RM estimado em tempo real pela fórmula de Epley e de Brzycki.
 * - Epley: w * (1 + r / 30)
 * - Brzycki: w * 36 / (37 - r)  (válida até 36 reps; acima disso recorre à Epley)
 */
export function calculate1RM(
  weightKg: number,
  reps: number,
  formula: OneRMFormula = 'epley',
  incrementKg = 1,
): OneRMResult {
  const safeWeight = Math.max(0, Number.isFinite(weightKg) ? weightKg : 0);
  const safeReps = Math.max(0, Math.floor(Number.isFinite(reps) ? reps : 0));

  if (safeWeight === 0 || safeReps === 0) {
    return {
      epley: 0,
      brzycki: 0,
      selected: 0,
      formula,
      percentages: [50, 70, 85, 90].map((percent) => ({
        percent,
        weightKg: 0,
        label: getPercentageLabel(percent),
      })),
    };
  }

  if (safeReps === 1) {
    const rounded = Number(safeWeight.toFixed(1));
    return {
      epley: rounded,
      brzycki: rounded,
      selected: rounded,
      formula,
      percentages: buildPercentageTable(rounded, incrementKg),
    };
  }

  const epleyRaw = safeWeight * (1 + safeReps / 30);
  const brzyckiRaw =
    safeReps < 37 ? (safeWeight * 36) / (37 - safeReps) : epleyRaw;

  const epley = Number(epleyRaw.toFixed(1));
  const brzycki = Number(brzyckiRaw.toFixed(1));
  const selected = formula === 'brzycki' ? brzycki : epley;

  return {
    epley,
    brzycki,
    selected,
    formula,
    percentages: buildPercentageTable(selected, incrementKg),
  };
}

function getPercentageLabel(percent: number): string {
  switch (percent) {
    case 50:
      return 'Aquecimento / Velocidade';
    case 70:
      return 'Volume / Hipertrofia';
    case 85:
      return 'Força (5–6 reps)';
    case 90:
      return 'Força Pesada (3–4 reps)';
    default:
      return `${percent}% 1RM`;
  }
}

function buildPercentageTable(oneRM: number, incrementKg: number) {
  return [50, 70, 85, 90].map((percent) => ({
    percent,
    weightKg: roundToGymIncrement((oneRM * percent) / 100, incrementKg),
    label: getPercentageLabel(percent),
  }));
}

/**
 * Obtém o melhor 1RM estimado entre séries VÁLIDAS (nunca inclui aquecimento nem isométricos).
 */
export function getBestSet1RM(
  sets: SetEntry[],
  formula: OneRMFormula = 'epley',
  isIsometric = false,
): { best1RM: number; bestWeightKg: number; bestReps: number } {
  if (isIsometric) {
    return { best1RM: 0, bestWeightKg: 0, bestReps: 0 };
  }
  let best1RM = 0;
  let bestWeightKg = 0;
  let bestReps = 0;
  for (const s of sets) {
    if (s.isWarmup || !s.completed) continue;
    if (s.weightKg <= 0 || s.reps <= 0) continue;
    const est = calculate1RM(s.weightKg, s.reps, formula).selected;
    if (est > best1RM) {
      best1RM = est;
      bestWeightKg = s.weightKg;
      bestReps = s.reps;
    }
  }
  return { best1RM, bestWeightKg, bestReps };
}

/**
 * Gera automaticamente séries de aquecimento progressivo antes do 1º exercício do dia:
 * - 50% da carga de trabalho × 8 reps
 * - 70% da carga de trabalho × 4 reps
 * - 85% da carga de trabalho × 2 reps
 * Todas marcadas com isWarmup: true para nunca contaminar séries válidas ou 1RM.
 */
export function generateProgressiveWarmupSets(
  workingWeightKg: number,
  incrementKg = 2,
  minWeightKg = 0,
): SetEntry[] {
  const baseWeight = Math.max(0, workingWeightKg);
  const scheme = [
    { percent: 50, reps: 8 },
    { percent: 70, reps: 4 },
    { percent: 85, reps: 2 },
  ];

  return scheme.map((step, idx) => {
    const raw = (baseWeight * step.percent) / 100;
    const rounded =
      baseWeight > 0
        ? Math.max(minWeightKg, roundToGymIncrement(raw, incrementKg))
        : 0;
    return {
      id: `warmup-${step.percent}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
      isWarmup: true,
      warmupPercent: step.percent,
      weightKg: rounded,
      reps: step.reps,
      rir: null,
      completed: false,
    };
  });
}

/**
 * Calcula tonelagem total de uma lista de séries VÁLIDAS (exclui aquecimento e isométricos sem peso).
 */
export function calculateExerciseTonnage(
  sets: SetEntry[],
  isIsometric = false,
  isUnilateral = false,
): number {
  if (isIsometric) return 0;
  const mult = isUnilateral ? 2 : 1;
  return sets.reduce((sum, s) => {
    if (s.isWarmup || !s.completed) return sum;
    return sum + Math.max(0, s.weightKg) * Math.max(0, s.reps) * mult;
  }, 0);
}

const PLATE_COLORS: Record<number, string> = {
  25: '#EF4444', // vermelho olímpico
  20: '#3B82F6', // azul olímpico
  15: '#FACC15', // amarelo olímpico
  10: '#22C55E', // verde olímpico
  5: '#E2E8F0', // branco/prata
  2.5: '#F97316', // laranja
  1.25: '#94A3B8', // grafite
  1: '#A855F7', // roxo
  0.5: '#64748B', // zinco
};

export const DEFAULT_PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];

/**
 * Calculadora rápida de anilhas por lado da barra (10 kg, 12 kg, 20 kg ou 0 kg para máquinas/Leg Press).
 */
export function calculateBarbellPlates(
  targetWeightKg: number,
  barWeightKg: number,
  availablePlatesKg: number[] = DEFAULT_PLATES_KG,
): PlateBreakdown {
  const safeTarget = Math.max(0, Number.isFinite(targetWeightKg) ? targetWeightKg : 0);
  const safeBar = Math.max(0, Number.isFinite(barWeightKg) ? barWeightKg : 0);

  if (safeTarget <= safeBar) {
    return {
      targetWeightKg: safeTarget,
      barWeightKg: safeBar,
      achievableWeightKg: safeBar,
      differenceKg: Number((safeBar - safeTarget).toFixed(2)),
      perSideWeightKg: 0,
      platesPerSide: [],
      exactMatch: safeTarget === safeBar,
    };
  }

  const sortedPlates = [...availablePlatesKg]
    .filter((p) => p > 0)
    .sort((a, b) => b - a);

  const desiredPerSide = (safeTarget - safeBar) / 2;
  let remaining = desiredPerSide;
  const platesPerSide: { weightKg: number; count: number; color: string }[] = [];

  for (const plate of sortedPlates) {
    // tolerância para ponto flutuante (ex: 1.25 kg)
    const count = Math.floor((remaining + 1e-6) / plate);
    if (count > 0) {
      platesPerSide.push({
        weightKg: plate,
        count,
        color: PLATE_COLORS[plate] ?? '#94A3B8',
      });
      remaining = Number((remaining - count * plate).toFixed(4));
    }
  }

  const loadedPerSide = Number((desiredPerSide - remaining).toFixed(2));
  const achievableWeightKg = Number((safeBar + loadedPerSide * 2).toFixed(2));
  const differenceKg = Number((safeTarget - achievableWeightKg).toFixed(2));

  return {
    targetWeightKg: safeTarget,
    barWeightKg: safeBar,
    achievableWeightKg,
    differenceKg,
    perSideWeightKg: loadedPerSide,
    platesPerSide,
    exactMatch: Math.abs(differenceKg) < 0.01,
  };
}

export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatKg(val: number): string {
  if (!Number.isFinite(val)) return '0';
  return Number.isInteger(val) ? String(val) : val.toFixed(1).replace('.', ',');
}

export function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
