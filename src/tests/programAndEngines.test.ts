import { describe, expect, it } from 'vitest';
import {
  CORE_MUSCLE_TARGETS,
  DEFAULT_UPPER_LOWER_PROGRAM,
  REST_DAYS,
  getWeeklyPlannedMuscleSets,
} from '../data/programPreset';
import {
  calculate1RM,
  calculateBarbellPlates,
  calculateExerciseTonnage,
  generateProgressiveWarmupSets,
  getBestSet1RM,
} from '../engines/calculations';
import { computeDoubleProgression, detectSetPRs } from '../engines/progression';
import { evaluateDeloadNeed } from '../engines/deload';
import {
  createInitialAppState,
  parseBackupCSV,
  parseBackupJSON,
  serializeBackupCSV,
  serializeBackupJSON,
} from '../engines/storage';
import { generateFourWeeksDemoData } from '../data/demoData';
import type { WorkoutSession } from '../types/workout';

describe('Ficha definitiva Upper/Lower 4 dias (Terça a Sexta)', () => {
  it('contém exatamente 4 dias de musculação (Terça a Sexta) e 3 dias de descanso (Sáb, Dom, Seg)', () => {
    expect(DEFAULT_UPPER_LOWER_PROGRAM.map((d) => d.dayOfWeek)).toEqual([
      'terca',
      'quarta',
      'quinta',
      'sexta',
    ]);
    expect(REST_DAYS.map((d) => d.dayOfWeek)).toEqual(['sabado', 'domingo', 'segunda']);
    expect(REST_DAYS[0].optionalCardio?.targetMinutesMin).toBe(30);
    expect(REST_DAYS[0].optionalCardio?.targetMinutesMax).toBe(40);
  });

  it('garante exatamente as séries válidas diretas semanais por grupo muscular (todos entre 10 e 20)', () => {
    const counts = getWeeklyPlannedMuscleSets(DEFAULT_UPPER_LOWER_PROGRAM);
    expect(counts.peito).toBe(14);
    expect(counts.costas).toBe(14);
    expect(counts.ombros).toBe(12);
    expect(counts.triceps).toBe(10);
    expect(counts.biceps).toBe(11);
    expect(counts.quadriceps).toBe(14);
    expect(counts.posterior).toBe(14);
    expect(counts.gluteos).toBe(10);
    expect(counts.panturrilha).toBe(12);
    expect(counts.abdomen).toBe(12);

    for (const [key, meta] of Object.entries(CORE_MUSCLE_TARGETS)) {
      const actual = counts[key as keyof typeof counts];
      expect(actual).toBe(meta.plannedSets);
      expect(actual).toBeGreaterThanOrEqual(10);
      expect(actual).toBeLessThanOrEqual(20);
    }
  });

  it('configura corretamente todos os Bisets (descanso 0 no A e descanso exato no B) e cardios de cada dia', () => {
    const terca = DEFAULT_UPPER_LOWER_PROGRAM[0];
    const quarta = DEFAULT_UPPER_LOWER_PROGRAM[1];
    const quinta = DEFAULT_UPPER_LOWER_PROGRAM[2];
    const sexta = DEFAULT_UPPER_LOWER_PROGRAM[3];

    expect(terca.cardio.enabled).toBe(true);
    expect(terca.cardio.targetMinutesMin).toBe(20);
    expect(quarta.cardio.enabled).toBe(false);
    expect(quinta.cardio.enabled).toBe(true);
    expect(quinta.cardio.targetMinutesMin).toBe(20);
    expect(sexta.cardio.enabled).toBe(true);
    expect(sexta.cardio.optional).toBe(true);

    // Verifica que todo Biset A tem restSeconds = 0 e todo Biset B tem restSeconds >= 60
    const allExercises = DEFAULT_UPPER_LOWER_PROGRAM.flatMap((d) => d.exercises);
    const bisetAs = allExercises.filter((e) => e.bisetRole === 'A');
    const bisetBs = allExercises.filter((e) => e.bisetRole === 'B');
    expect(bisetAs.length).toBe(9);
    expect(bisetBs.length).toBe(9);
    for (const a of bisetAs) expect(a.restSeconds).toBe(0);
    for (const b of bisetBs) expect(b.restSeconds).toBeGreaterThanOrEqual(60);

    // Prancha abdominal é isométrica 45-60s
    const prancha = quarta.exercises.find((e) => e.id === 'prancha-isometrica');
    expect(prancha?.isIsometric).toBe(true);
    expect(prancha?.repMin).toBe(45);
    expect(prancha?.repMax).toBe(60);
  });
});

describe('Calculadora automática de 1RM (Epley e Brzycki)', () => {
  it('calcula Epley e Brzycki com precisão e tabela 50%, 70%, 85% e 90%', () => {
    const res = calculate1RM(100, 6, 'epley', 2);
    // Epley: 100 * (1 + 6/30) = 120.0
    expect(res.epley).toBe(120);
    // Brzycki: 100 * 36 / (37 - 6) = 116.1
    expect(res.brzycki).toBe(116.1);
    expect(res.selected).toBe(120);
    expect(res.percentages.map((p) => p.percent)).toEqual([50, 70, 85, 90]);
    expect(res.percentages.find((p) => p.percent === 50)?.weightKg).toBe(60);
    expect(res.percentages.find((p) => p.percent === 70)?.weightKg).toBe(84);
    expect(res.percentages.find((p) => p.percent === 85)?.weightKg).toBe(102);
    expect(res.percentages.find((p) => p.percent === 90)?.weightKg).toBe(108);
  });

  it('nunca contamina 1RM nem tonelagem com séries de aquecimento', () => {
    const warmups = generateProgressiveWarmupSets(100, 2);
    expect(warmups).toHaveLength(3);
    expect(warmups.map((w) => [w.warmupPercent, w.weightKg, w.reps, w.isWarmup])).toEqual([
      [50, 50, 8, true],
      [70, 70, 4, true],
      [85, 86, 2, true],
    ]);

    const setsWithWarmup = [
      { ...warmups[0], weightKg: 200, reps: 10, completed: true }, // aquecimento com peso absurdo não pode contar
      { id: 'v1', isWarmup: false, weightKg: 80, reps: 5, completed: true },
    ];
    const best = getBestSet1RM(setsWithWarmup, 'epley');
    expect(best.bestWeightKg).toBe(80);
    expect(best.best1RM).toBeCloseTo(93.3, 1);
    expect(calculateExerciseTonnage(setsWithWarmup)).toBe(400);
  });
});

describe('Progressão Dupla Inteligente & PRs', () => {
  const supino = DEFAULT_UPPER_LOWER_PROGRAM[0].exercises[0]; // 4x4-6, inc 2kg

  it('recomenda manter carga quando dentro da faixa sem bater teto em todas as séries', () => {
    const prevSession: WorkoutSession = {
      id: 's1',
      workoutDayId: 'upper-a',
      workoutTitle: 'Superior A',
      date: '2026-11-10',
      startedAt: 1000,
      finishedAt: 2000,
      durationSeconds: 3600,
      totalTonnageKg: 1600,
      validSetsCount: 4,
      prCount: 0,
      exercises: [
        {
          exerciseId: supino.id,
          exerciseName: supino.name,
          orderLabel: '1',
          primaryMuscle: 'peito',
          equipment: 'barra',
          sets: [
            { id: '1', isWarmup: false, weightKg: 80, reps: 6, completed: true },
            { id: '2', isWarmup: false, weightKg: 80, reps: 6, completed: true },
            { id: '3', isWarmup: false, weightKg: 80, reps: 5, completed: true },
            { id: '4', isWarmup: false, weightKg: 80, reps: 5, completed: true },
          ],
        },
      ],
    };

    const rec = computeDoubleProgression(supino, [prevSession]);
    expect(rec.status).toBe('maintain');
    expect(rec.suggestedWeightKg).toBe(80);
  });

  it('sugere aumento de 2% a 5% arredondado para incremento real quando bate o teto em todas as séries válidas', () => {
    const prevSession: WorkoutSession = {
      id: 's2',
      workoutDayId: 'upper-a',
      workoutTitle: 'Superior A',
      date: '2026-11-17',
      startedAt: 1000,
      finishedAt: 3000,
      durationSeconds: 3600,
      totalTonnageKg: 1920,
      validSetsCount: 4,
      prCount: 0,
      exercises: [
        {
          exerciseId: supino.id,
          exerciseName: supino.name,
          orderLabel: '1',
          primaryMuscle: 'peito',
          equipment: 'barra',
          sets: [
            { id: 'w', isWarmup: true, weightKg: 40, reps: 2, completed: true }, // aquecimento ignorado!
            { id: '1', isWarmup: false, weightKg: 80, reps: 6, completed: true },
            { id: '2', isWarmup: false, weightKg: 80, reps: 6, completed: true },
            { id: '3', isWarmup: false, weightKg: 80, reps: 6, completed: true },
            { id: '4', isWarmup: false, weightKg: 80, reps: 6, completed: true },
          ],
        },
      ],
    };

    const rec = computeDoubleProgression(supino, [prevSession]);
    expect(rec.status).toBe('progress');
    expect(rec.suggestedWeightKg).toBe(82); // +2 kg = +2.5% dentro da faixa 2%–5%
    expect(rec.deltaPercent).toBeGreaterThanOrEqual(2);
    expect(rec.deltaPercent).toBeLessThanOrEqual(5);

    // Detecta PR quando usuário levanta 82 kg x 6
    const prs = detectSetPRs(
      supino.id,
      { id: 'new', isWarmup: false, weightKg: 82, reps: 6, completed: true },
      [prevSession],
    );
    expect(prs).toContain('weight');
    expect(prs).toContain('1rm');
  });
});

describe('Calculadora de Anilhas & Alerta de Deload', () => {
  it('calcula anilhas exatas por lado para barras de 10 kg, 12 kg e 20 kg', () => {
    const b20 = calculateBarbellPlates(100, 20);
    expect(b20.perSideWeightKg).toBe(40);
    expect(b20.exactMatch).toBe(true);
    expect(b20.platesPerSide.map((p) => `${p.count}x${p.weightKg}`)).toEqual(['1x25', '1x15']);

    const b12 = calculateBarbellPlates(52, 12);
    expect(b12.perSideWeightKg).toBe(20);
    expect(b12.platesPerSide.map((p) => `${p.count}x${p.weightKg}`)).toEqual(['1x20']);

    const b10 = calculateBarbellPlates(35, 10);
    expect(b10.perSideWeightKg).toBe(12.5);
    expect(b10.platesPerSide.map((p) => `${p.count}x${p.weightKg}`)).toEqual(['1x10', '1x2.5']);
  });

  it('dispara alerta inteligente de deload após 2 semanas seguidas de queda/estagnação em déficit calórico', () => {
    const makeSession = (id: string, date: string, ts: number, weight: number, reps: number): WorkoutSession => ({
      id,
      workoutDayId: 'upper-a',
      workoutTitle: 'Superior A',
      date,
      startedAt: ts,
      finishedAt: ts + 3600_000,
      durationSeconds: 3600,
      totalTonnageKg: weight * reps * 4,
      validSetsCount: 4,
      prCount: 0,
      exercises: [
        {
          exerciseId: 'supino-reto',
          exerciseName: 'Supino reto',
          orderLabel: '1',
          primaryMuscle: 'peito',
          equipment: 'barra',
          sets: [{ id: 'a', isWarmup: false, weightKg: weight, reps, rir: 0, completed: true }],
        },
      ],
    });

    const sessions = [
      makeSession('s1', '2026-11-01', 1000, 90, 6),
      makeSession('s2', '2026-11-08', 2000, 88, 5),
      makeSession('s3', '2026-11-15', 3000, 86, 5),
    ];

    const bodyWeights = [
      { id: 'b1', date: '2026-11-01', weightKg: 86.0, fasting: true },
      { id: 'b2', date: '2026-11-05', weightKg: 85.4, fasting: true },
      { id: 'b3', date: '2026-11-10', weightKg: 84.8, fasting: true },
      { id: 'b4', date: '2026-11-15', weightKg: 84.2, fasting: true },
    ];

    const alert = evaluateDeloadNeed(sessions, bodyWeights, 'epley');
    expect(alert.inCaloricDeficit).toBe(true);
    expect(alert.shouldDeload).toBe(true);
    expect(alert.stagnatedExercises.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Exportação e Importação de Backup JSON e CSV', () => {
  it('realiza ida e volta completa em JSON validando checksum e rejeitando corrupção', () => {
    const state = createInitialAppState();
    const demo = generateFourWeeksDemoData(state.program);
    state.sessions = demo.sessions;
    state.bodyWeights = demo.bodyWeights;
    state.standaloneCardio = demo.standaloneCardio;

    const json = serializeBackupJSON(state);
    const parsed = parseBackupJSON(json);
    expect(parsed.ok).toBe(true);
    expect(parsed.data?.sessions.length).toBe(state.sessions.length);

    // Corrompe um caractere nos dados mantendo JSON válido -> checksum deve barrar
    const tampered = json.replace(state.sessions[0].workoutTitle, 'TREINO ADULTERADO');
    const bad = parseBackupJSON(tampered);
    expect(bad.ok).toBe(false);
  });

  it('exporta e reimporta corretamente sessões, cardio e peso corporal em CSV', () => {
    const state = createInitialAppState();
    const demo = generateFourWeeksDemoData(state.program);
    state.sessions = demo.sessions.slice(0, 2);
    state.bodyWeights = demo.bodyWeights.slice(0, 3);
    state.standaloneCardio = demo.standaloneCardio.slice(0, 1);

    const csv = serializeBackupCSV(state);
    const emptyState = createInitialAppState();
    const imported = parseBackupCSV(csv, emptyState);

    expect(imported.ok).toBe(true);
    expect(imported.importedSessions).toBe(2);
    expect(imported.importedBodyWeights).toBe(3);
    expect(imported.importedCardios).toBe(1);
    expect(imported.nextState?.sessions.length).toBe(2);
  });
});
