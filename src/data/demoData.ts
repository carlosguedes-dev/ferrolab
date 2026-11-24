import type {
  BodyWeightEntry,
  CardioLog,
  SessionExerciseLog,
  WorkoutDayTemplate,
  WorkoutSession,
} from '../types/workout';
import { calculateExerciseTonnage } from '../engines/calculations';

/**
 * Gera 4 semanas realistas de treinos de exemplo (opt-in pelo usuário) para
 * demonstrar progressão dupla, gráficos de 1RM, tonelagem, volume semanal 10–20 e perda de gordura.
 */
export function generateFourWeeksDemoData(program: WorkoutDayTemplate[]): {
  sessions: WorkoutSession[];
  bodyWeights: BodyWeightEntry[];
  standaloneCardio: CardioLog[];
  machineNotes: Record<string, string>;
} {
  const baseWeights: Record<string, number> = {
    'supino-reto': 80,
    'remada-baixa': 64,
    'crucifixo-peck-deck': 55,
    'puxada-alta-aberta': 60,
    'desenvolvimento-ombros': 24,
    'elevacao-lateral-halteres': 12,
    'triceps-frances': 26,
    'triceps-corda': 24,
    'rosca-scott': 30,
    'rosca-martelo': 14,
    'agachamento-hack-smith': 110,
    'mesa-flexora-a': 50,
    'cadeira-extensora-a': 65,
    'cadeira-flexora-a': 55,
    'cadeira-adutora': 50,
    'cadeira-abdutora-a': 55,
    'panturrilha-em-pe': 70,
    'prancha-isometrica': 5,
    'panturrilha-sentado-a': 45,
    'abdominal-polia-crunch': 35,
    'barra-fixa-puxada-neutra': 72,
    'supino-inclinado-halteres': 30,
    'remada-serrote': 32,
    'crossover-supino-convergente': 30,
    'elevacao-lateral-polia': 10,
    'face-pull': 22,
    'rosca-direta-w': 32,
    'triceps-barra-reta': 30,
    'rosca-inclinada-halteres': 12,
    'triceps-testa-halteres': 12,
    'leg-press-45': 200,
    'cadeira-flexora-b': 58,
    'cadeira-extensora-b': 65,
    'mesa-flexora-ou-pe': 48,
    'gluteo-maquina-coice': 45,
    'cadeira-abdutora-b': 58,
    'panturrilha-leg-press': 130,
    'abdominal-maquina-polia': 40,
    'panturrilha-sentado-b': 46,
    'abdominal-infra': 0,
  };

  const today = new Date();
  const dayOffsetToMonday = today.getDay() === 0 ? -6 : 1 - today.getDay();
  const thisMonday = new Date(today);
  thisMonday.setDate(today.getDate() + dayOffsetToMonday);

  const sessions: WorkoutSession[] = [];
  const standaloneCardio: CardioLog[] = [];
  const bodyWeights: BodyWeightEntry[] = [];

  // 4 semanas: 3 semanas passadas completas + semana atual até ontem/hoje
  for (let w = 3; w >= 0; w--) {
    const weekMonday = new Date(thisMonday);
    weekMonday.setDate(thisMonday.getDate() - w * 7);
    const progressionIndex = 3 - w; // 0, 1, 2, 3

    // Peso corporal em jejum caindo gradualmente (~0.45 kg/sem)
    for (let d = 0; d < 7; d++) {
      const dt = new Date(weekMonday);
      dt.setDate(weekMonday.getDate() + d);
      if (dt > today) continue;
      if (d === 0 || d === 2 || d === 4 || d === 5 || d === 6) {
        const dayIndex = progressionIndex * 7 + d;
        const fluctuation = Math.sin(dayIndex * 1.4) * 0.25;
        const weight = Number((86.4 - dayIndex * 0.068 + fluctuation).toFixed(1));
        const iso = toISO(dt);
        bodyWeights.push({
          id: `demo-bw-${iso}`,
          date: iso,
          weightKg: weight,
          fasting: true,
          notes: d === 6 ? 'Em jejum pós-descanso' : undefined,
        });
      }
    }

    // Treinos Terça (1), Quarta (2), Quinta (3), Sexta (4) a partir de Segunda
    program.forEach((dayTemplate, dayIdx) => {
      const dt = new Date(weekMonday);
      dt.setDate(weekMonday.getDate() + (dayIdx + 1)); // +1=Ter, +2=Qua, +3=Qui, +4=Sex
      if (dt > today) return;

      const iso = toISO(dt);
      const startMs = new Date(`${iso}T18:30:00`).getTime();
      const durationSeconds = (58 + (dayIdx % 3) * 6 + progressionIndex) * 60;
      let totalTonnage = 0;
      let validSetsCount = 0;

      const exerciseLogs: SessionExerciseLog[] = dayTemplate.exercises.map((ex, exIdx) => {
        const base = baseWeights[ex.id] ?? 30;
        // Sobe carga nas semanas 2 e 3 ou sobe reps dentro da faixa
        const bump =
          progressionIndex >= 2 && !ex.isIsometric
            ? ex.loadIncrementKg * (progressionIndex === 3 ? 2 : 1)
            : 0;
        const weight = base + bump;
        const hitCeilingThisWeek = progressionIndex === 1 || progressionIndex === 3;

        const sets = [];
        // Primeiro exercício ganha 3 séries de aquecimento marcadas corretamente
        if (exIdx === 0) {
          [
            { pct: 50, reps: 8 },
            { pct: 70, reps: 4 },
            { pct: 85, reps: 2 },
          ].forEach((wu, wuIdx) => {
            sets.push({
              id: `demo-wu-${iso}-${ex.id}-${wuIdx}`,
              isWarmup: true,
              warmupPercent: wu.pct,
              weightKg: Math.round(((weight * wu.pct) / 100) / ex.loadIncrementKg) * ex.loadIncrementKg,
              reps: wu.reps,
              rir: null,
              completed: true,
              completedAt: startMs + wuIdx * 90_000,
            });
          });
        }

        for (let s = 0; s < ex.targetSets; s++) {
          const reps = hitCeilingThisWeek
            ? ex.repMax
            : Math.min(ex.repMax, ex.repMin + (s === 0 ? 1 : 0));
          sets.push({
            id: `demo-set-${iso}-${ex.id}-${s}`,
            isWarmup: false,
            weightKg: weight,
            reps,
            rir: s === ex.targetSets - 1 ? 1 : 2,
            completed: true,
            completedAt: startMs + (exIdx * 6 + s + 3) * 90_000,
          });
          validSetsCount += 1;
        }

        totalTonnage += calculateExerciseTonnage(sets, !!ex.isIsometric, !!ex.isUnilateral);

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
          sets,
        };
      });

      const cardioLog: CardioLog | undefined = dayTemplate.cardio.enabled
        ? {
            id: `demo-cardio-${iso}`,
            date: iso,
            modality: dayTemplate.cardio.modalitySuggestion,
            minutes: dayTemplate.cardio.targetMinutesMin || 20,
            distanceKm: dayTemplate.cardio.optional ? 1.5 : 1.9,
            speedKmh: dayTemplate.cardio.optional ? 5.0 : 5.6,
            inclinePercent: dayTemplate.cardio.optional ? 2 : 6,
            completed: true,
          }
        : undefined;

      sessions.push({
        id: `demo-session-${iso}-${dayTemplate.id}`,
        workoutDayId: dayTemplate.id,
        workoutTitle: `${dayTemplate.title} — ${dayTemplate.subtitle}`,
        date: iso,
        startedAt: startMs,
        finishedAt: startMs + durationSeconds * 1000,
        durationSeconds,
        exercises: exerciseLogs,
        cardio: cardioLog,
        totalTonnageKg: Math.round(totalTonnage),
        validSetsCount,
        prCount: progressionIndex >= 2 ? 2 : 0,
        notes:
          progressionIndex === 3
            ? 'Excelente estabilidade de força mantendo o déficit calórico.'
            : undefined,
      });
    });

    // Sábado cardio opcional (35 min caminhada leve)
    const sat = new Date(weekMonday);
    sat.setDate(weekMonday.getDate() + 5);
    if (sat <= today) {
      const satIso = toISO(sat);
      standaloneCardio.push({
        id: `demo-sat-cardio-${satIso}`,
        date: satIso,
        modality: 'Caminhada leve ao ar livre (Zona 2)',
        minutes: 35,
        distanceKm: 3.3,
        speedKmh: 5.6,
        completed: true,
        notes: 'Cardio leve de sábado para manter o déficit calórico.',
      });
    }
  }

  return {
    sessions: sessions.sort((a, b) => b.finishedAt - a.finishedAt),
    bodyWeights: bodyWeights.sort((a, b) => a.date.localeCompare(b.date)),
    standaloneCardio,
    machineNotes: {
      'supino-reto': 'Banco alinhado na trava 2 · Pegada 2 dedos fora da marca lisa',
      'agachamento-hack-smith': 'Pés baixos na plataforma, afastamento largura dos ombros',
      'cadeira-extensora-a': 'Encosto furo 4 · Almofada furo 3',
      'cadeira-flexora-a': 'Encosto furo 3 · Trava coxa no máximo',
      'leg-press-45': 'Encosto pino 2 · Pés médios/altos',
    },
  };
}

function toISO(dt: Date): string {
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}
