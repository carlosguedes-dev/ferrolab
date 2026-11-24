import React, { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { playIsometricMilestoneCue } from '../engines/audio';

interface IsometricTimerInlineProps {
  targetMinSec: number;
  targetMaxSec: number;
  currentSeconds: number;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  onChangeSeconds: (sec: number) => void;
  onFinishTarget: (sec: number) => void;
}

export const IsometricTimerInline: React.FC<IsometricTimerInlineProps> = ({
  targetMinSec,
  targetMaxSec,
  currentSeconds,
  soundEnabled,
  vibrationEnabled,
  onChangeSeconds,
  onFinishTarget,
}) => {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const hitMinRef = useRef(false);
  const hitMaxRef = useRef(false);

  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        onChangeSeconds(next);
        if (next === targetMinSec && !hitMinRef.current) {
          hitMinRef.current = true;
          playIsometricMilestoneCue(soundEnabled, vibrationEnabled, false);
        }
        if (next === targetMaxSec && !hitMaxRef.current) {
          hitMaxRef.current = true;
          playIsometricMilestoneCue(soundEnabled, vibrationEnabled, true);
          setRunning(false);
          onFinishTarget(next);
        }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [running, targetMinSec, targetMaxSec, soundEnabled, vibrationEnabled, onChangeSeconds, onFinishTarget]);

  const handleToggle = () => {
    if (!running && elapsed === 0) {
      hitMinRef.current = false;
      hitMaxRef.current = false;
    }
    setRunning((r) => !r);
  };

  const handleReset = () => {
    setRunning(false);
    setElapsed(0);
    hitMinRef.current = false;
    hitMaxRef.current = false;
  };

  const displaySec = running || elapsed > 0 ? elapsed : currentSeconds;
  const reachedMin = displaySec >= targetMinSec;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <button
        type="button"
        onClick={handleToggle}
        className={`fl-btn fl-btn-xs t-mono ${running ? 'fl-btn-ember' : 'fl-btn-surface'}`}
        style={{ minHeight: 40, minWidth: 74 }}
        aria-label={running ? 'Pausar cronômetro isométrico' : 'Iniciar cronômetro isométrico'}
      >
        {running ? <Pause size={13} /> : <Play size={13} />}
        <span style={{ color: !running && reachedMin ? 'var(--volt)' : undefined }}>
          {displaySec}s
        </span>
      </button>
      {elapsed > 0 && !running && (
        <button
          type="button"
          className="fl-icon-btn"
          style={{ width: 32, height: 32, borderRadius: 10 }}
          onClick={handleReset}
          aria-label="Zerar cronômetro isométrico"
        >
          <RotateCcw size={12} />
        </button>
      )}
    </div>
  );
};
