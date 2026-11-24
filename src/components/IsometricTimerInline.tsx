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

/**
 * Cronômetro embutido para exercícios isométricos (ex.: Prancha abdominal 45–60 s).
 * Emite alerta sonoro/vibração ao atingir o mínimo (45 s) e o teto (60 s),
 * preenchendo automaticamente o tempo na série.
 */
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
  const reachedMax = displaySec >= targetMaxSec;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <button
        type="button"
        onClick={handleToggle}
        className={`btn btn-xs ${running ? 'btn-ember' : 'btn-secondary'}`}
        style={{ minWidth: 74, fontFamily: 'var(--font-mono)' }}
        aria-label={running ? 'Pausar cronômetro isométrico' : 'Iniciar cronômetro isométrico'}
      >
        {running ? <Pause size={12} /> : <Play size={12} />}
        <span style={{ color: reachedMax ? '#080B04' : reachedMin ? '#C8FF2E' : undefined }}>
          {displaySec}s
        </span>
      </button>
      {elapsed > 0 && !running && (
        <button
          type="button"
          className="btn btn-ghost btn-xs"
          onClick={handleReset}
          aria-label="Zerar cronômetro isométrico"
          style={{ padding: '0 6px' }}
        >
          <RotateCcw size={12} />
        </button>
      )}
    </div>
  );
};
