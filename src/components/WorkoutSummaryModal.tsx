import React from 'react';
import { CheckCircle2, HeartPulse, Trophy } from 'lucide-react';
import type { WorkoutSession } from '../types/workout';
import { formatDuration } from '../engines/calculations';
import { SheetModal } from './MotionPrimitives';

interface WorkoutSummaryModalProps {
  session: WorkoutSession;
  onClose: () => void;
}

export const WorkoutSummaryModal: React.FC<WorkoutSummaryModalProps> = ({
  session,
  onClose,
}) => {
  const carsEquivalent = (session.totalTonnageKg / 1100).toFixed(1).replace('.', ',');

  return (
    <SheetModal ariaLabel="Resumo do treino concluído" onClose={onClose}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div
          style={{
            width: 58,
            height: 58,
            margin: '0 auto 12px',
            borderRadius: 18,
            background: 'var(--volt-soft)',
            border: '1px solid var(--volt-border)',
            display: 'grid',
            placeItems: 'center',
            color: 'var(--volt)',
          }}
        >
          {session.prCount > 0 ? <Trophy size={28} /> : <CheckCircle2 size={28} />}
        </div>
        <div className="t-kicker" style={{ color: 'var(--volt)' }}>
          TREINO REGISTRADO COM SUCESSO
        </div>
        <h2 className="t-title" style={{ marginTop: 6, fontSize: 24 }}>
          {session.workoutTitle.split('—')[0]}
        </h2>
        <p className="t-subtitle" style={{ fontSize: 13 }}>
          Salvo automaticamente no seu dispositivo.
        </p>
      </div>

      <div className="fl-grid-2" style={{ marginBottom: 16 }}>
        <div className="fl-card fl-card-compact">
          <div className="t-kicker">Tonelagem</div>
          <div className="t-mono" style={{ fontSize: 22, fontWeight: 700, color: 'var(--volt)', marginTop: 4 }}>
            {session.totalTonnageKg.toLocaleString('pt-BR')} kg
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-tertiary)', marginTop: 2 }}>
            ≈ {carsEquivalent} carros
          </div>
        </div>
        <div className="fl-card fl-card-compact">
          <div className="t-kicker">Duração</div>
          <div className="t-mono" style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
            {formatDuration(session.durationSeconds)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-tertiary)', marginTop: 2 }}>
            {session.validSetsCount} séries válidas
          </div>
        </div>
      </div>

      {session.prCount > 0 && (
        <div className="fl-card fl-card-compact" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Trophy size={18} color="var(--amber)" />
          <span style={{ fontSize: 13.5 }}>
            <strong>{session.prCount} novo(s) Recorde(s) Pessoal(is)</strong> batido(s) hoje!
          </span>
        </div>
      )}

      {session.cardio?.completed && (
        <div className="fl-card fl-card-compact" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
          <HeartPulse size={17} color="#ff8c66" />
          <span style={{ fontSize: 13 }}>
            Cardio concluído: <strong>{session.cardio.minutes} min</strong>
          </span>
        </div>
      )}

      <button type="button" className="fl-btn fl-btn-volt fl-btn-block" onClick={onClose}>
        Ver evolução & histórico
      </button>
    </SheetModal>
  );
};
