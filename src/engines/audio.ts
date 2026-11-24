/**
 * Motor de alertas sonoros procedurais via Web Audio API + Vibração tátil.
 * 100% gerado matematicamente em tempo real — zero arquivos de áudio de terceiros,
 * zero risco de direitos autorais e funcionamento garantido 100% offline.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) {
    audioCtx = new Ctx();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playTone(
  frequency: number,
  durationSec: number,
  startOffsetSec = 0,
  type: OscillatorType = 'triangle',
  gainPeak = 0.18,
) {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime + startOffsetSec;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(gainPeak, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + durationSec + 0.02);
  } catch {
    // Silencioso se o navegador bloquear áudio antes de interação
  }
}

export function playRestCompleteCue(soundEnabled: boolean, vibrationEnabled: boolean): void {
  if (soundEnabled) {
    playTone(880, 0.14, 0, 'triangle', 0.22);
    playTone(1174.66, 0.14, 0.16, 'triangle', 0.22);
    playTone(1318.5, 0.28, 0.32, 'sine', 0.24);
  }
  if (vibrationEnabled && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([160, 80, 160, 80, 260]);
    } catch {
      // ignore
    }
  }
}

export function playSetCheckedCue(soundEnabled: boolean, vibrationEnabled: boolean): void {
  if (soundEnabled) {
    playTone(660, 0.08, 0, 'sine', 0.12);
    playTone(880, 0.11, 0.06, 'sine', 0.14);
  }
  if (vibrationEnabled && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(45);
    } catch {
      // ignore
    }
  }
}

export function playPRFanfareCue(soundEnabled: boolean, vibrationEnabled: boolean): void {
  if (soundEnabled) {
    playTone(523.25, 0.12, 0, 'triangle', 0.2);
    playTone(659.25, 0.12, 0.1, 'triangle', 0.2);
    playTone(783.99, 0.14, 0.2, 'triangle', 0.22);
    playTone(1046.5, 0.35, 0.32, 'sine', 0.25);
  }
  if (vibrationEnabled && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([80, 40, 80, 40, 180]);
    } catch {
      // ignore
    }
  }
}

export function playIsometricMilestoneCue(
  soundEnabled: boolean,
  vibrationEnabled: boolean,
  isMaxTarget: boolean,
): void {
  if (soundEnabled) {
    if (isMaxTarget) {
      playTone(1046.5, 0.2, 0, 'sine', 0.22);
      playTone(1318.5, 0.3, 0.18, 'sine', 0.24);
    } else {
      playTone(784, 0.15, 0, 'sine', 0.18);
    }
  }
  if (vibrationEnabled && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(isMaxTarget ? [140, 60, 220] : [100]);
    } catch {
      // ignore
    }
  }
}
