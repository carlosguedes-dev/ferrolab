import React from 'react';
import { FastForward, Pause, Play, Timer } from 'lucide-react';
import type { RestTimerState } from '../types/workout';
import { formatDuration } from '../engines/calculations';

interface RestTimerDockProps {
  timer: RestTimerState;
  onAdjust: (deltaSeconds: number) => void;
  onTogglePause: () => void;
  onSkip: () => void;
}

export const RestTimerDock: React.FC<RestTimerDockProps> = ({
  timer,
  onAdjust,
  onTogglePause,
  onSkip,
}) => {
  const progress =
    timer.durationSeconds > 0
      ? Math.max(0, Math.min(100, (timer.remainingSeconds / timer.durationSeconds) * 100))
      : 0;
  const isUrgent = timer.remainingSeconds <= 10 && !timer.paused;

  return (
    <div className="rest-timer-dock" role="status" aria-live="polite" aria-label="Cronômetro de descanso">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: isUrgent ? 'var(--accent-volt-dim)' : 'var(--accent-ember-dim)',
              border: isUrgent ? '1px solid var(--accent-volt)' : '1px solid var(--border-ember)',
              display: 'grid',
              placeItems: 'center',
              color: isUrgent ? 'var(--accent-volt)' : '#FF8B57',
              flexShrink: 0,
            }}
          >
            <Timer size={20} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#FF9C6E', fontWeight: 700 }}>
              Descanso {timer.paused ? '(Pausado)' : 'em andamento'}
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--text-secondary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {timer.exerciseName}
            </div>
          </div>
        </div>

        <div
          className="font-mono"
          style={{
            fontSize: 30,
            fontWeight: 800,
            color: isUrgent ? 'var(--accent-volt)' : 'var(--text-primary)',
            lineHeight: 1,
          }}
        >
          {formatDuration(timer.remainingSeconds)}
        </div>
      </div>

      {/* Barra de progresso */}
      <div
        style={{
          height: 5,
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 99,
          overflow: 'hidden',
          margin: '9px 0',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progress}%`,
            background: isUrgent
              ? 'linear-gradient(90deg, #C8FF2E, #84CC16)'
              : 'linear-gradient(90deg, #FF6B2C, #F59E0B)',
            transition: 'width 0.3s linear',
          }}
        />
      </div>

      {/* Controles rápidos de 1 mão */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.2fr', gap: 6 }}>
        <button type="button" className="btn btn-secondary btn-xs font-mono" onClick={() => onAdjust(-15)}>
          -15 s
        </button>
        <button type="button" className="btn btn-secondary btn-xs font-mono" onClick={() => onAdjust(15)}>
          +15 s
        </button>
        <button type="button" className="btn btn-ghost btn-xs" onClick={onTogglePause}>
          {timer.paused ? <Play size={13} /> : <Pause size={13} />}
          {timer.paused ? 'Retomar' : 'Pausar'}
        </button>
        <button type="button" className="btn btn-ember btn-xs" onClick={onSkip}>
          <FastForward size={13} />
          Pular
        </button>
      </div>
    </div>
  );
};
