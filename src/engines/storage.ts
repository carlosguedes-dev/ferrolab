import type {
  AppStateData,
  BodyWeightEntry,
  CardioLog,
  UserConsentState,
  UserSettings,
  WorkoutSession,
} from '../types/workout';
import { cloneDefaultProgram } from '../data/programPreset';
import { DEFAULT_PLATES_KG, getTodayISO } from './calculations';

export const STORAGE_KEY = 'ferrolab_state_v1';
export const SHADOW_BACKUP_KEY = 'ferrolab_state_shadow_v1';
export const SCHEMA_VERSION = 1;
export const LEGAL_CONSENT_VERSION = '2026-11-v1';

export function createDefaultSettings(): UserSettings {
  return {
    formula1RM: 'epley',
    defaultBarWeightKg: 20,
    availablePlatesKg: [...DEFAULT_PLATES_KG],
    soundEnabled: true,
    vibrationEnabled: true,
    autoWakeLock: true,
    autoStartRestTimer: true,
    autoGenerateWarmups: true,
    showRirColumn: true,
    lastBackupAt: null,
    workoutsSinceLastBackup: 0,
    isDemoDataLoaded: false,
  };
}

export function createDefaultConsent(): UserConsentState {
  return {
    acceptedVersion: null,
    acceptedAt: null,
    ageConfirmed18OrGuardian: false,
    healthDataConsent: false,
    healthDisclaimerAcknowledged: false,
  };
}

export function createInitialAppState(): AppStateData {
  return {
    schemaVersion: SCHEMA_VERSION,
    program: cloneDefaultProgram(),
    sessions: [],
    standaloneCardio: [],
    bodyWeights: [],
    machineNotes: {},
    activeDraft: null,
    settings: createDefaultSettings(),
    consent: createDefaultConsent(),
  };
}

export interface StorageLoadResult {
  state: AppStateData;
  recoveredFromShadow: boolean;
  storageError: string | null;
}

function isValidStateShape(candidate: unknown): candidate is AppStateData {
  if (!candidate || typeof candidate !== 'object') return false;
  const obj = candidate as Record<string, unknown>;
  return (
    typeof obj.schemaVersion === 'number' &&
    Array.isArray(obj.program) &&
    obj.program.length > 0 &&
    Array.isArray(obj.sessions) &&
    Array.isArray(obj.bodyWeights) &&
    typeof obj.settings === 'object' &&
    obj.settings !== null
  );
}

function normalizeLoadedState(raw: AppStateData): AppStateData {
  const defaults = createInitialAppState();
  return {
    schemaVersion: SCHEMA_VERSION,
    program: Array.isArray(raw.program) && raw.program.length > 0 ? raw.program : defaults.program,
    sessions: Array.isArray(raw.sessions) ? raw.sessions : [],
    standaloneCardio: Array.isArray(raw.standaloneCardio) ? raw.standaloneCardio : [],
    bodyWeights: Array.isArray(raw.bodyWeights) ? raw.bodyWeights : [],
    machineNotes: raw.machineNotes && typeof raw.machineNotes === 'object' ? raw.machineNotes : {},
    activeDraft: raw.activeDraft ?? null,
    settings: { ...defaults.settings, ...(raw.settings ?? {}) },
    consent: { ...defaults.consent, ...(raw.consent ?? {}) },
  };
}

/**
 * Carregamento resiliente com fallback automático para cópia sombra (shadow backup)
 * caso o armazenamento principal sofra corrupção parcial (proteção CDC anti-perda de dados).
 */
export function loadAppState(): StorageLoadResult {
  try {
    const rawPrimary = window.localStorage.getItem(STORAGE_KEY);
    if (rawPrimary) {
      const parsed: unknown = JSON.parse(rawPrimary);
      if (isValidStateShape(parsed)) {
        return {
          state: normalizeLoadedState(parsed),
          recoveredFromShadow: false,
          storageError: null,
        };
      }
    }

    const rawShadow = window.localStorage.getItem(SHADOW_BACKUP_KEY);
    if (rawShadow) {
      const parsedShadow: unknown = JSON.parse(rawShadow);
      if (isValidStateShape(parsedShadow)) {
        window.localStorage.setItem(STORAGE_KEY, rawShadow);
        return {
          state: normalizeLoadedState(parsedShadow),
          recoveredFromShadow: true,
          storageError: null,
        };
      }
    }

    return {
      state: createInitialAppState(),
      recoveredFromShadow: false,
      storageError: null,
    };
  } catch (err) {
    // Tenta shadow backup em caso de JSON malformado no principal
    try {
      const rawShadow = window.localStorage.getItem(SHADOW_BACKUP_KEY);
      if (rawShadow) {
        const parsedShadow: unknown = JSON.parse(rawShadow);
        if (isValidStateShape(parsedShadow)) {
          return {
            state: normalizeLoadedState(parsedShadow),
            recoveredFromShadow: true,
            storageError: null,
          };
        }
      }
    } catch {
      // ignora erro secundário
    }

    return {
      state: createInitialAppState(),
      recoveredFromShadow: false,
      storageError:
        err instanceof Error
          ? err.message
          : 'Não foi possível acessar o armazenamento local do navegador.',
    };
  }
}

export function saveAppState(state: AppStateData): { ok: boolean; error?: string } {
  try {
    const serialized = JSON.stringify(state);
    window.localStorage.setItem(STORAGE_KEY, serialized);
    window.localStorage.setItem(SHADOW_BACKUP_KEY, serialized);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : 'Espaço de armazenamento local cheio ou bloqueado pelo navegador.',
    };
  }
}

export function wipeAllLocalData(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(SHADOW_BACKUP_KEY);
  } catch {
    // ignore
  }
}

export function getStorageFootprintBytes(): number {
  try {
    const primary = window.localStorage.getItem(STORAGE_KEY) ?? '';
    return new Blob([primary]).size;
  } catch {
    return 0;
  }
}

// =========================================================================
// EXPORTAÇÃO E IMPORTAÇÃO JSON / CSV
// =========================================================================

export interface JsonBackupEnvelope {
  app: 'FerroLab';
  exportedAt: string;
  schemaVersion: number;
  checksum: string;
  data: AppStateData;
}

function simpleChecksum(text: string): string {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function serializeBackupJSON(state: AppStateData): string {
  const payload = JSON.stringify(state);
  const envelope: JsonBackupEnvelope = {
    app: 'FerroLab',
    exportedAt: new Date().toISOString(),
    schemaVersion: SCHEMA_VERSION,
    checksum: simpleChecksum(payload),
    data: state,
  };
  return JSON.stringify(envelope, null, 2);
}

export function parseBackupJSON(rawText: string): {
  ok: boolean;
  data?: AppStateData;
  error?: string;
} {
  try {
    const parsed: unknown = JSON.parse(rawText);
    if (!parsed || typeof parsed !== 'object') {
      return { ok: false, error: 'Arquivo JSON vazio ou estrutura inválida.' };
    }
    const maybeEnvelope = parsed as Partial<JsonBackupEnvelope>;
    const candidateData =
      maybeEnvelope.app === 'FerroLab' && maybeEnvelope.data
        ? maybeEnvelope.data
        : parsed;

    if (!isValidStateShape(candidateData)) {
      return {
        ok: false,
        error: 'O arquivo JSON não contém um backup válido do FerroLab.',
      };
    }

    if (maybeEnvelope.app === 'FerroLab' && maybeEnvelope.checksum && maybeEnvelope.data) {
      const expected = simpleChecksum(JSON.stringify(maybeEnvelope.data));
      if (expected !== maybeEnvelope.checksum) {
        return {
          ok: false,
          error:
            'Integridade do backup comprometida (checksum divergente). Verifique se o arquivo foi editado ou truncado.',
        };
      }
    }

    return { ok: true, data: normalizeLoadedState(candidateData) };
  } catch {
    return {
      ok: false,
      error: 'Erro de sintaxe JSON. Selecione um arquivo .json exportado pelo FerroLab.',
    };
  }
}

function escapeCsvCell(val: string | number | boolean | null | undefined): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(';') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Exporta histórico completo de séries + cardio + peso corporal em CSV (UTF-8 com BOM e delimitador ';' para Excel PT-BR).
 */
export function serializeBackupCSV(state: AppStateData): string {
  const headers = [
    'tipo',
    'data',
    'treino_id',
    'treino_titulo',
    'duracao_min',
    'exercicio_id',
    'exercicio_nome',
    'grupo_muscular',
    'serie_num',
    'aquecimento',
    'carga_kg',
    'reps_ou_seg',
    'rir',
    'concluida',
    'cardio_modalidade',
    'cardio_min',
    'cardio_dist_km',
    'peso_jejum_kg',
    'notas',
  ];

  const rows: string[] = [headers.join(';')];

  for (const session of state.sessions) {
    const durMin = Math.round(session.durationSeconds / 60);
    for (const ex of session.exercises) {
      ex.sets.forEach((s, idx) => {
        rows.push(
          [
            'SERIE',
            session.date,
            session.workoutDayId,
            session.workoutTitle,
            durMin,
            ex.exerciseId,
            ex.exerciseName,
            ex.primaryMuscle,
            idx + 1,
            s.isWarmup ? 'SIM' : 'NAO',
            s.weightKg,
            s.reps,
            s.rir ?? '',
            s.completed ? 'SIM' : 'NAO',
            '',
            '',
            '',
            '',
            ex.sessionNote ?? session.notes ?? '',
          ]
            .map(escapeCsvCell)
            .join(';'),
        );
      });
    }
    if (session.cardio && session.cardio.completed) {
      rows.push(
        [
          'CARDIO',
          session.date,
          session.workoutDayId,
          session.workoutTitle,
          durMin,
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          'SIM',
          session.cardio.modality,
          session.cardio.minutes,
          session.cardio.distanceKm ?? '',
          '',
          session.cardio.notes ?? '',
        ]
          .map(escapeCsvCell)
          .join(';'),
      );
    }
  }

  for (const c of state.standaloneCardio) {
    rows.push(
      [
        'CARDIO_AVULSO',
        c.date,
        '',
        'Cardio Dia de Descanso',
        c.minutes,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        c.completed ? 'SIM' : 'NAO',
        c.modality,
        c.minutes,
        c.distanceKm ?? '',
        '',
        c.notes ?? '',
      ]
        .map(escapeCsvCell)
        .join(';'),
    );
  }

  for (const bw of state.bodyWeights) {
    rows.push(
      [
        'PESO_CORPORAL',
        bw.date,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        bw.fasting ? 'JEJUM' : 'NAO_JEJUM',
        '',
        '',
        '',
        bw.weightKg,
        bw.notes ?? '',
      ]
        .map(escapeCsvCell)
        .join(';'),
    );
  }

  return '\uFEFF' + rows.join('\n');
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

/**
 * Importa arquivo CSV exportado pelo FerroLab, mesclando sessões, cardios e registros de peso corporal.
 */
export function parseBackupCSV(
  rawText: string,
  currentState: AppStateData,
): {
  ok: boolean;
  importedSessions: number;
  importedBodyWeights: number;
  importedCardios: number;
  nextState?: AppStateData;
  error?: string;
} {
  const cleaned = rawText.replace(/^\uFEFF/, '').trim();
  if (!cleaned) {
    return {
      ok: false,
      importedSessions: 0,
      importedBodyWeights: 0,
      importedCardios: 0,
      error: 'Arquivo CSV vazio.',
    };
  }

  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return {
      ok: false,
      importedSessions: 0,
      importedBodyWeights: 0,
      importedCardios: 0,
      error: 'CSV sem linhas de dados.',
    };
  }

  const delimiter = lines[0].includes(';') ? ';' : ',';
  const headers = parseCsvLine(lines[0], delimiter).map((h) => h.trim().toLowerCase());
  const idx = (name: string) => headers.indexOf(name);

  if (idx('tipo') === -1 || idx('data') === -1) {
    return {
      ok: false,
      importedSessions: 0,
      importedBodyWeights: 0,
      importedCardios: 0,
      error: 'Cabeçalho CSV não reconhecido. Utilize um CSV exportado pelo FerroLab.',
    };
  }

  const sessionsMap = new Map<string, WorkoutSession>();
  const newBodyWeights: BodyWeightEntry[] = [];
  const newStandaloneCardio: CardioLog[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i], delimiter);
    const tipo = (cols[idx('tipo')] ?? '').trim().toUpperCase();
    const data = (cols[idx('data')] ?? getTodayISO()).trim();

    if (tipo === 'PESO_CORPORAL') {
      const weight = Number((cols[idx('peso_jejum_kg')] ?? '').replace(',', '.'));
      if (Number.isFinite(weight) && weight > 0) {
        newBodyWeights.push({
          id: `bw-csv-${data}-${i}`,
          date: data,
          weightKg: weight,
          fasting: (cols[idx('concluida')] ?? '').toUpperCase() !== 'NAO_JEJUM',
          notes: cols[idx('notas')] || undefined,
        });
      }
      continue;
    }

    if (tipo === 'CARDIO_AVULSO') {
      const mins = Number(cols[idx('cardio_min')] ?? 0);
      if (mins > 0) {
        newStandaloneCardio.push({
          id: `cardio-csv-${data}-${i}`,
          date: data,
          modality: cols[idx('cardio_modalidade')] || 'Caminhada leve',
          minutes: mins,
          distanceKm: cols[idx('cardio_dist_km')]
            ? Number(cols[idx('cardio_dist_km')].replace(',', '.'))
            : undefined,
          notes: cols[idx('notas')] || undefined,
          completed: true,
        });
      }
      continue;
    }

    if (tipo === 'SERIE' || tipo === 'CARDIO') {
      const dayId = (cols[idx('treino_id')] || 'upper-a') as WorkoutSession['workoutDayId'];
      const key = `${data}__${dayId}`;
      let session = sessionsMap.get(key);
      if (!session) {
        const durMin = Number(cols[idx('duracao_min')] ?? 60);
        const startMs = new Date(`${data}T18:00:00`).getTime();
        session = {
          id: `csv-session-${key}-${i}`,
          workoutDayId: dayId,
          workoutTitle: cols[idx('treino_titulo')] || dayId,
          date: data,
          startedAt: Number.isFinite(startMs) ? startMs : Date.now(),
          finishedAt: (Number.isFinite(startMs) ? startMs : Date.now()) + durMin * 60_000,
          durationSeconds: Math.max(60, durMin * 60),
          exercises: [],
          totalTonnageKg: 0,
          validSetsCount: 0,
          prCount: 0,
        };
        sessionsMap.set(key, session);
      }

      if (tipo === 'CARDIO') {
        session.cardio = {
          id: `session-cardio-${key}`,
          date: data,
          modality: cols[idx('cardio_modalidade')] || 'Cardio',
          minutes: Number(cols[idx('cardio_min')] ?? 20),
          distanceKm: cols[idx('cardio_dist_km')]
            ? Number(cols[idx('cardio_dist_km')].replace(',', '.'))
            : undefined,
          notes: cols[idx('notas')] || undefined,
          completed: true,
        };
      } else {
        const exId = cols[idx('exercicio_id')] || `ex-${i}`;
        let exLog = session.exercises.find((e) => e.exerciseId === exId);
        if (!exLog) {
          exLog = {
            exerciseId: exId,
            exerciseName: cols[idx('exercicio_nome')] || exId,
            orderLabel: String(session.exercises.length + 1),
            primaryMuscle: (cols[idx('grupo_muscular')] || 'peito') as WorkoutSession['exercises'][0]['primaryMuscle'],
            equipment: 'maquina',
            sets: [],
          };
          session.exercises.push(exLog);
        }
        const isWarmup = (cols[idx('aquecimento')] ?? '').toUpperCase() === 'SIM';
        const weightKg = Number((cols[idx('carga_kg')] ?? '0').replace(',', '.'));
        const reps = Number(cols[idx('reps_ou_seg')] ?? '0');
        const rirRaw = cols[idx('rir')];
        const rir = rirRaw !== undefined && rirRaw !== '' ? Number(rirRaw) : null;
        const completed = (cols[idx('concluida')] ?? 'SIM').toUpperCase() === 'SIM';

        exLog.sets.push({
          id: `csv-set-${i}`,
          isWarmup,
          weightKg: Number.isFinite(weightKg) ? weightKg : 0,
          reps: Number.isFinite(reps) ? reps : 0,
          rir: Number.isFinite(rir) ? rir : null,
          completed,
        });

        if (!isWarmup && completed) {
          session.validSetsCount += 1;
          session.totalTonnageKg += Math.max(0, weightKg) * Math.max(0, reps);
        }
      }
    }
  }

  const importedSessionsList = Array.from(sessionsMap.values());
  if (
    importedSessionsList.length === 0 &&
    newBodyWeights.length === 0 &&
    newStandaloneCardio.length === 0
  ) {
    return {
      ok: false,
      importedSessions: 0,
      importedBodyWeights: 0,
      importedCardios: 0,
      error: 'Nenhum registro válido encontrado no CSV.',
    };
  }

  // Mescla evitando duplicatas óbvias por data + treino
  const existingSessionKeys = new Set(
    currentState.sessions.map((s) => `${s.date}__${s.workoutDayId}`),
  );
  const mergedSessions = [
    ...currentState.sessions,
    ...importedSessionsList.filter((s) => !existingSessionKeys.has(`${s.date}__${s.workoutDayId}`)),
  ].sort((a, b) => b.finishedAt - a.finishedAt);

  const existingBwDates = new Set(currentState.bodyWeights.map((b) => b.date));
  const mergedBw = [
    ...currentState.bodyWeights,
    ...newBodyWeights.filter((b) => !existingBwDates.has(b.date)),
  ].sort((a, b) => a.date.localeCompare(b.date));

  const mergedCardio = [...currentState.standaloneCardio, ...newStandaloneCardio];

  return {
    ok: true,
    importedSessions: importedSessionsList.length,
    importedBodyWeights: newBodyWeights.length,
    importedCardios: newStandaloneCardio.length,
    nextState: {
      ...currentState,
      sessions: mergedSessions,
      bodyWeights: mergedBw,
      standaloneCardio: mergedCardio,
    },
  };
}

export function triggerFileDownload(
  content: string,
  filename: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
