import React from 'react';
import { Award, CheckCircle2, Clock, Dumbbell, HeartPulse, Trophy } from 'lucide-react';
import type { WorkoutSession } from '../types/workout';
import { formatDuration } from '../engines/calculations';

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
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Resumo do treino concluído">
      <div className="modal-sheet" style={{ borderColor: 'var(--border-volt)' }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div
            style={{
              width: 60,
              height: 60,
              margin: '0 auto 10px',
              borderRadius: 18,
              background: 'var(--accent-volt-dim)',
              border: '1.5px solid var(--accent-volt)',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--accent-volt)',
              boxShadow: '0 0 30px rgba(200, 255, 46, 0.25)',
            }}
          >
            {session.prCount > 0 ? <Trophy size={30} /> : <CheckCircle2 size={30} />}
          </div>
          <span className="pill pill-volt">TREINO REGISTRADO COM SUCESSO</span>
          <h2 className="font-display" style={{ margin: '8px 0 4px', fontSize: 28 }}>
            {session.workoutTitle}
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
            Dados salvos automaticamente no dispositivo.
          </p>
        </div>

        <div className="grid-2" style={{ marginBottom: 14 }}>
          <div className="card" style={{ padding: 12 }}>
            <div className="section-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Clock size={12} color="#22D3EE" /> Duração
            </div>
            <div className="font-mono" style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>
              {formatDuration(session.durationSeconds)}
            </div>
          </div>

          <div className="card" style={{ padding: 12 }}>
            <div className="section-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Dumbbell size={12} color="#C8FF2E" /> Tonelagem
            </div>
            <div className="font-mono" style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: 'var(--accent-volt)' }}>
              {session.totalTonnageKg.toLocaleString('pt-BR')} kg
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
              ≈ {carsEquivalent} carros populares
            </div>
          </div>

          <div className="card" style={{ padding: 12 }}>
            <div className="section-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Award size={12} color="#10B981" /> Séries válidas
            </div>
            <div className="font-mono" style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>
              {session.validSetsCount}
            </div>
          </div>

          <div className="card" style={{ padding: 12 }}>
            <div className="section-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Trophy size={12} color="#F59E0B" /> Recordes (PR)
            </div>
            <div className="font-mono" style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: '#FBBF24' }}>
              {session.prCount}
            </div>
          </div>
        </div>

        {session.cardio?.completed && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'var(--accent-ember-dim)',
              border: '1px solid var(--border-ember)',
              borderRadius: 12,
              padding: '10px 12px',
              marginBottom: 14,
              fontSize: 13,
            }}
          >
            <HeartPulse size={18} color="#FF8B57" />
            <span>
              <strong>Cardio concluído:</strong> {session.cardio.minutes} min · {session.cardio.modality}
              {session.cardio.distanceKm ? ` (${session.cardio.distanceKm} km)` : ''}
            </span>
          </div>
        )}

        <button type="button" className="btn btn-primary btn-block" onClick={onClose}>
          Ver evolução & histórico
        </button>
      </div>
    </div>
  );
};
