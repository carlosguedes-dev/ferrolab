import React, { useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  ChevronRight,
  Clock,
  Disc,
  Dumbbell,
  Flame,
  HeartPulse,
  Info,
  Link2,
  Play,
  Scale,
  Sparkles,
} from 'lucide-react';
import type {
  ActiveWorkoutDraft,
  BodyWeightEntry,
  CardioLog,
  DeloadAlert,
  ExerciseTemplate,
  WorkoutDayId,
  WorkoutDayTemplate,
  WorkoutSession,
} from '../types/workout';
import { REST_DAYS } from '../data/programPreset';
import { formatKg, getTodayISO } from '../engines/calculations';

interface TodayAndProgramViewProps {
  mode: 'today' | 'program';
  program: WorkoutDayTemplate[];
  sessions: WorkoutSession[];
  bodyWeights: BodyWeightEntry[];
  activeDraft: ActiveWorkoutDraft | null;
  deloadAlert: DeloadAlert;
  isDemoDataLoaded: boolean;
  onStartWorkout: (dayId: WorkoutDayId) => void;
  onResumeWorkout: () => void;
  onLogStandaloneCardio: (log: CardioLog) => void;
  onQuickLogWeight: (weightKg: number, fasting: boolean) => void;
  onOpenExerciseDetail: (dayId: WorkoutDayId, ex: ExerciseTemplate) => void;
  onOpenPlateCalc: () => void;
  onLoadDemoData: () => void;
  onClearDemoData: () => void;
}

export const TodayAndProgramView: React.FC<TodayAndProgramViewProps> = ({
  mode,
  program,
  sessions,
  bodyWeights,
  activeDraft,
  deloadAlert,
  isDemoDataLoaded,
  onStartWorkout,
  onResumeWorkout,
  onLogStandaloneCardio,
  onQuickLogWeight,
  onOpenExerciseDetail,
  onOpenPlateCalc,
  onLoadDemoData,
  onClearDemoData,
}) => {
  const jsDay = new Date().getDay(); // 0=Dom..6=Sáb
  const todayWorkout = program.find((d) => d.jsDayIndex === jsDay) ?? null;
  const todayRest = REST_DAYS.find((r) => r.jsDayIndex === jsDay) ?? null;

  const [selectedDayId, setSelectedDayId] = useState<WorkoutDayId>(
    todayWorkout?.id ?? 'upper-a',
  );
  const [quickWeight, setQuickWeight] = useState<string>(() => {
    const last = [...bodyWeights].sort((a, b) => b.date.localeCompare(a.date))[0];
    return last ? String(last.weightKg) : '';
  });
  const [restCardioMin, setRestCardioMin] = useState(35);
  const [restCardioDist, setRestCardioDist] = useState('3.2');
  const [restCardioSaved, setRestCardioSaved] = useState(false);

  const selectedDay = program.find((d) => d.id === selectedDayId) ?? program[0];
  const latestWeight = [...bodyWeights].sort((a, b) => b.date.localeCompare(a.date))[0];
  const totalWeeklySets = program.reduce(
    (sum, day) => sum + day.exercises.reduce((s, e) => s + e.targetSets, 0),
    0,
  );

  // =========================================================================
  // MODO "FICHA COMPLETA" (Upper/Lower 4 dias + Descansos)
  // =========================================================================
  if (mode === 'program') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span className="pill pill-volt">UPPER / LOWER · 4 DIAS SEGUIDOS</span>
              <h2 className="font-display" style={{ margin: '6px 0 2px', fontSize: 26 }}>
                Ficha Definitiva Terça a Sexta
              </h2>
              <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-secondary)' }}>
                10 a 14 séries válidas diretas por grupo muscular · Descanso Sáb, Dom e Seg.
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="font-mono" style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent-volt)' }}>
                {totalWeeklySets}
              </div>
              <div className="section-label">séries/sem</div>
            </div>
          </div>

          {/* Seletor rápido de dia da ficha */}
          <div className="grid-4" style={{ marginTop: 12 }}>
            {program.map((d) => {
              const active = d.id === selectedDay.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedDayId(d.id)}
                  style={{
                    padding: '9px 6px',
                    borderRadius: 12,
                    border: active
                      ? '1.5px solid var(--accent-volt)'
                      : '1px solid var(--border-subtle)',
                    background: active ? 'var(--accent-volt-dim)' : '#0B0E14',
                    textAlign: 'center',
                  }}
                >
                  <div
                    className="font-mono"
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: active ? 'var(--accent-volt)' : 'var(--text-secondary)',
                    }}
                  >
                    {d.shortDay}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, marginTop: 2 }}>
                    {d.title}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detalhes do dia selecionado */}
        <div className="card card-volt">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
            <div>
              <span className="pill pill-cyan">{selectedDay.dayName}</span>
              <h3 className="font-display" style={{ margin: '6px 0 2px', fontSize: 25 }}>
                {selectedDay.title} — {selectedDay.subtitle}
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
                {selectedDay.exercises.length} exercícios ·{' '}
                {selectedDay.exercises.reduce((a, e) => a + e.targetSets, 0)} séries válidas
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => onStartWorkout(selectedDay.id)}
            >
              <Play size={14} /> Treinar
            </button>
          </div>

          <div className="divider" />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {selectedDay.exercises.map((ex, idx) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => onOpenExerciseDetail(selectedDay.id, ex)}
                style={{
                  textAlign: 'left',
                  padding: '10px 11px',
                  borderRadius: 12,
                  background: ex.bisetGroup
                    ? 'rgba(255, 107, 44, 0.08)'
                    : 'rgba(10, 13, 18, 0.8)',
                  border: ex.bisetGroup
                    ? '1px solid rgba(255, 107, 44, 0.35)'
                    : '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span
                      className={`pill ${ex.bisetGroup ? 'pill-ember' : 'pill-volt'} font-mono`}
                      style={{ padding: '1px 7px' }}
                    >
                      {ex.orderLabel}
                    </span>
                    {ex.bisetGroup && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#FF8B57', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <Link2 size={10} /> BISET
                      </span>
                    )}
                    {idx === 0 && (
                      <span className="pill pill-amber" style={{ padding: '1px 6px', fontSize: 10 }}>
                        <Flame size={10} /> + Aquec. 50/70/85%
                      </span>
                    )}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginTop: 4 }}>{ex.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2 }}>
                    <span className="font-mono" style={{ color: 'var(--text-primary)' }}>
                      {ex.targetSets}×{ex.repMin}–{ex.repMax}
                      {ex.isIsometric ? 's' : ''}
                    </span>{' '}
                    · Descanso: {ex.restLabel}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {ex.techniqueCue}
                  </div>
                </div>
                <Info size={16} color="#66758D" style={{ flexShrink: 0 }} />
              </button>
            ))}
          </div>

          <div
            style={{
              marginTop: 12,
              padding: '10px 12px',
              borderRadius: 12,
              background: selectedDay.cardio.enabled
                ? 'var(--accent-ember-dim)'
                : 'rgba(255,255,255,0.03)',
              border: selectedDay.cardio.enabled
                ? '1px solid var(--border-ember)'
                : '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              fontSize: 12.5,
            }}
          >
            <HeartPulse size={16} color={selectedDay.cardio.enabled ? '#FF8B57' : '#66758D'} />
            <div>
              <strong>{selectedDay.cardio.label}</strong>
              <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                {selectedDay.cardio.modalitySuggestion}
              </div>
            </div>
          </div>
        </div>

        {/* Bloco dos 3 dias de descanso */}
        <div className="card">
          <div className="section-label" style={{ marginBottom: 8 }}>
            Dias de Descanso & Cardio Leve (Sáb · Dom · Seg)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {REST_DAYS.map((rd) => (
              <div
                key={rd.dayOfWeek}
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: '#0A0D12',
                  border: rd.optionalCardio
                    ? '1px solid rgba(34, 211, 238, 0.3)'
                    : '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="pill font-mono">{rd.shortDay}</span>
                  <strong style={{ fontSize: 13.5 }}>{rd.title}</strong>
                </div>
                <p style={{ margin: '5px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
                  {rd.description}
                </p>
                {rd.optionalCardio && (
                  <div style={{ marginTop: 6, fontSize: 12, color: 'var(--accent-cyan)', fontWeight: 600 }}>
                    Meta opcional: {rd.optionalCardio.label}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // MODO "TREINO DE HOJE" (Tela inicial principal de academia)
  // =========================================================================
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Banner de retomar treino em andamento */}
      {activeDraft && (
        <div className="card card-ember">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <div>
              <span className="pill pill-ember">SESSÃO PAUSADA / EM ANDAMENTO</span>
              <h3 className="font-display" style={{ margin: '6px 0 2px', fontSize: 22 }}>
                {activeDraft.workoutTitle}
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
                Seus dados estão salvos localmente. Retome de onde parou.
              </p>
            </div>
            <button type="button" className="btn btn-ember btn-sm" onClick={onResumeWorkout}>
              Retomar <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Alerta inteligente de Deload se detectado */}
      {deloadAlert.shouldDeload && (
        <div className="card card-amber">
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <AlertTriangle size={20} color="#FBBF24" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <span className="pill pill-amber">ALERTA INTELIGENTE DE DELOAD</span>
              <p style={{ margin: '6px 0', fontSize: 13, color: '#FEF3C7' }}>
                {deloadAlert.summary}
              </p>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11.5, color: '#FDE68A' }}>
                {deloadAlert.protocolTips.slice(0, 2).map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Card principal do dia da semana atual */}
      {todayWorkout ? (
        <div className="card card-volt">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="pill pill-volt">
              <Calendar size={11} /> HOJE · {todayWorkout.dayName.toUpperCase()}
            </span>
            <span className="pill pill-cyan">{todayWorkout.focusTag}</span>
          </div>
          <h1 className="font-display" style={{ margin: '10px 0 2px', fontSize: 34, lineHeight: 1 }}>
            {todayWorkout.title}
          </h1>
          <p style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--text-secondary)' }}>
            {todayWorkout.subtitle}
          </p>

          <div className="grid-3" style={{ marginBottom: 14 }}>
            <div style={{ background: '#0A0D12', borderRadius: 10, padding: '8px 10px', border: '1px solid var(--border-subtle)' }}>
              <div className="section-label">Exercícios</div>
              <div className="font-mono" style={{ fontSize: 18, fontWeight: 800 }}>
                {todayWorkout.exercises.length}
              </div>
            </div>
            <div style={{ background: '#0A0D12', borderRadius: 10, padding: '8px 10px', border: '1px solid var(--border-subtle)' }}>
              <div className="section-label">Séries válidas</div>
              <div className="font-mono" style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent-volt)' }}>
                {todayWorkout.exercises.reduce((a, e) => a + e.targetSets, 0)}
              </div>
            </div>
            <div style={{ background: '#0A0D12', borderRadius: 10, padding: '8px 10px', border: '1px solid var(--border-subtle)' }}>
              <div className="section-label">Cardio</div>
              <div className="font-mono" style={{ fontSize: 14, fontWeight: 800, marginTop: 3 }}>
                {todayWorkout.cardio.enabled ? `${todayWorkout.cardio.targetMinutesMin} min` : 'Sem'}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-block"
            style={{ minHeight: 54, fontSize: 16 }}
            onClick={() => onStartWorkout(todayWorkout.id)}
          >
            <Play size={18} fill="#090C06" />
            Iniciar {todayWorkout.title} Agora
          </button>
        </div>
      ) : (
        <div className="card card-cyan">
          <span className="pill pill-cyan">
            <Calendar size={11} /> HOJE · {todayRest?.dayName.toUpperCase() ?? 'DESCANSO'}
          </span>
          <h1 className="font-display" style={{ margin: '10px 0 4px', fontSize: 30, lineHeight: 1.05 }}>
            {todayRest?.title ?? 'Dia de Descanso de Musculação'}
          </h1>
          <p style={{ margin: '0 0 12px', fontSize: 13.5, color: 'var(--text-secondary)' }}>
            {todayRest?.description}
          </p>

          {/* Meta opcional de cardio leve de sábado ou descanso ativo */}
          <div
            style={{
              background: '#0A0D12',
              border: '1px solid rgba(34, 211, 238, 0.3)',
              borderRadius: 14,
              padding: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
              <HeartPulse size={16} color="#22D3EE" />
              <strong style={{ fontSize: 13.5 }}>
                {todayRest?.optionalCardio
                  ? todayRest.optionalCardio.label
                  : 'Registrar caminhada leve opcional (30–40 min)'}
              </strong>
            </div>
            <div className="grid-2" style={{ marginBottom: 10 }}>
              <div>
                <label className="section-label" htmlFor="rest-cardio-min">Duração (min)</label>
                <input
                  id="rest-cardio-min"
                  type="number"
                  className="input input-compact"
                  style={{ marginTop: 4 }}
                  value={restCardioMin}
                  onChange={(e) => setRestCardioMin(Math.max(1, Number(e.target.value) || 30))}
                />
              </div>
              <div>
                <label className="section-label" htmlFor="rest-cardio-dist">Distância (km)</label>
                <input
                  id="rest-cardio-dist"
                  type="number"
                  step="0.1"
                  className="input input-compact"
                  style={{ marginTop: 4 }}
                  value={restCardioDist}
                  onChange={(e) => setRestCardioDist(e.target.value)}
                />
              </div>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm btn-block"
              onClick={() => {
                onLogStandaloneCardio({
                  id: `rest-cardio-${Date.now()}`,
                  date: getTodayISO(),
                  modality: 'Caminhada leve / Cardio Zona 2',
                  minutes: restCardioMin,
                  distanceKm: restCardioDist ? Number(restCardioDist) : undefined,
                  completed: true,
                });
                setRestCardioSaved(true);
              }}
            >
              {restCardioSaved ? 'Cardio de hoje registrado ✓' : 'Registrar cardio leve no gráfico'}
            </button>
          </div>
        </div>
      )}

      {/* Acesso rápido a qualquer um dos 4 dias da ficha */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span className="section-label">Escolher treino da semana (Ter → Sex)</span>
          <button type="button" className="pill" onClick={onOpenPlateCalc}>
            <Disc size={11} /> Anilhas
          </button>
        </div>

        <div className="grid-2">
          {program.map((day) => {
            const lastSession = sessions.find((s) => s.workoutDayId === day.id);
            const isToday = day.jsDayIndex === jsDay;
            return (
              <button
                key={day.id}
                type="button"
                onClick={() => onStartWorkout(day.id)}
                style={{
                  textAlign: 'left',
                  padding: 12,
                  borderRadius: 14,
                  background: isToday
                    ? 'linear-gradient(150deg, rgba(200,255,46,0.12), #0D1117)'
                    : '#0B0F15',
                  border: isToday
                    ? '1.5px solid var(--border-volt)'
                    : '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 6,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className={`pill ${isToday ? 'pill-volt' : ''} font-mono`} style={{ padding: '2px 7px' }}>
                    {day.shortDay}
                  </span>
                  <Dumbbell size={14} color={isToday ? '#C8FF2E' : '#66758D'} />
                </div>
                <div>
                  <div className="font-display" style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.05 }}>
                    {day.title}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                    {day.subtitle}
                  </div>
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={10} />
                  {lastSession ? `Último: ${lastSession.date.split('-').reverse().slice(0, 2).join('/')}` : 'Ainda não realizado'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Registro rápido de peso corporal em jejum */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Scale size={16} color="#22D3EE" />
            <span style={{ fontWeight: 700, fontSize: 14 }}>Peso corporal em jejum</span>
          </div>
          {latestWeight && (
            <span className="pill pill-cyan font-mono">
              Último: {formatKg(latestWeight.weightKg)} kg
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder="Ex.: 84.5 kg"
            aria-label="Peso corporal em jejum em kg"
            className="input input-compact"
            value={quickWeight}
            onChange={(e) => setQuickWeight(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ flexShrink: 0 }}
            onClick={() => {
              const num = Number(quickWeight.replace(',', '.'));
              if (Number.isFinite(num) && num >= 25 && num <= 300) {
                onQuickLogWeight(num, true);
              }
            }}
          >
            Salvar peso
          </button>
        </div>
      </div>

      {/* Atalho opcional para testar gráficos com 4 semanas simuladas */}
      {sessions.length === 0 ? (
        <div className="card" style={{ borderStyle: 'dashed', borderColor: 'rgba(200,255,46,0.28)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13 }}>
                <Sparkles size={14} color="#C8FF2E" />
                Quer ver os gráficos e a progressão em ação?
              </div>
              <p style={{ margin: '3px 0 0', fontSize: 11.5, color: 'var(--text-secondary)' }}>
                Carregue 4 semanas simuladas de exemplo (removíveis em 1 toque quando começar seus treinos reais).
              </p>
            </div>
            <button type="button" className="btn btn-secondary btn-xs" onClick={onLoadDemoData}>
              Ver demo
            </button>
          </div>
        </div>
      ) : isDemoDataLoaded ? (
        <div className="card card-amber" style={{ padding: 11 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#FDE68A' }}>
              Modo demonstração ativo (4 semanas simuladas).
            </span>
            <button type="button" className="btn btn-danger btn-xs" onClick={onClearDemoData}>
              Zerar p/ meus dados
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
