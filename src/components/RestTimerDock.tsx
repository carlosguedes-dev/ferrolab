import React from 'react';
import { motion } from 'framer-motion';
import { FastForward, Pause, Play } from 'lucide-react';
import type { RestTimerState } from '../types/workout';
import { formatDuration } from '../engines/calculations';
import { SPRING_SNAPPY } from './MotionPrimitives';

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
  const ratio =
    timer.durationSeconds > 0
      ? Math.max(0, Math.min(1, timer.remainingSeconds / timer.durationSeconds))
      : 0;
  const isUrgent = timer.remainingSeconds <= 10 && !timer.paused;
  const radius = 17;
  const circ = 2 * Math.PI * radius;

  return (
    <motion.div
      className="fl-rest-float"
      role="status"
      aria-live="polite"
      aria-label="Cronômetro de descanso"
      initial={{ opacity: 0, y: 28, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 24, scale: 0.96 }}
      transition={SPRING_SNAPPY}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
          {/* Anel SVG de contagem regressiva */}
          <svg width="42" height="42" viewBox="0 0 42 42" style={{ flexShrink: 0 }}>
            <circle cx="21" cy="21" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3.5" />
            <circle
              cx="21"
              cy="21"
              r={radius}
              fill="none"
              stroke={isUrgent ? '#CCFF00' : '#FF622E'}
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - ratio)}
              transform="rotate(-90 21 21)"
              style={{ transition: 'stroke-dashoffset 0.25s linear' }}
            />
          </svg>
          <div style={{ minWidth: 0 }}>
            <div className="t-mono" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1, color: isUrgent ? 'var(--volt)' : 'var(--ink-primary)' }}>
              {formatDuration(timer.remainingSeconds)}
            </div>
            <div
              style={{
                fontSize: 11.5,
                color: 'var(--ink-secondary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                marginTop: 3,
              }}
            >
              {timer.exerciseName}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          <button type="button" className="fl-btn fl-btn-ghost fl-btn-xs t-mono" onClick={() => onAdjust(-15)}>
            -15
          </button>
          <button type="button" className="fl-btn fl-btn-ghost fl-btn-xs t-mono" onClick={() => onAdjust(15)}>
            +15
          </button>
          <button
            type="button"
            className="fl-icon-btn"
            style={{ width: 34, height: 34, borderRadius: 10 }}
            onClick={onTogglePause}
            aria-label={timer.paused ? 'Retomar descanso' : 'Pausar descanso'}
          >
            {timer.paused ? <Play size={14} /> : <Pause size={14} />}
          </button>
          <button
            type="button"
            className="fl-btn fl-btn-ember fl-btn-xs"
            onClick={onSkip}
            aria-label="Pular descanso"
          >
            <FastForward size={13} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
