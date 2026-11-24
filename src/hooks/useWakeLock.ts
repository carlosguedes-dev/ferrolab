import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Hook de tela sempre ativa (Screen Wake Lock API) para uso contínuo na academia.
 * Reativa automaticamente ao retornar para a aba (`visibilitychange`).
 */
export function useWakeLock(desiredActive: boolean) {
  const [isSupported, setIsSupported] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    const supported =
      typeof navigator !== 'undefined' &&
      'wakeLock' in navigator &&
      typeof navigator.wakeLock?.request === 'function';
    setIsSupported(supported);
  }, []);

  const acquire = useCallback(async () => {
    if (
      typeof navigator === 'undefined' ||
      !('wakeLock' in navigator) ||
      typeof navigator.wakeLock?.request !== 'function'
    ) {
      setIsActive(false);
      return;
    }
    try {
      if (sentinelRef.current && !sentinelRef.current.released) {
        setIsActive(true);
        return;
      }
      const sentinel = await navigator.wakeLock.request('screen');
      sentinelRef.current = sentinel;
      setIsActive(true);
      setError(null);
      sentinel.addEventListener('release', () => {
        setIsActive(false);
      });
    } catch (err) {
      setIsActive(false);
      setError(err instanceof Error ? err.message : 'Wake Lock indisponível');
    }
  }, []);

  const release = useCallback(async () => {
    try {
      if (sentinelRef.current && !sentinelRef.current.released) {
        await sentinelRef.current.release();
      }
    } catch {
      // ignore
    } finally {
      sentinelRef.current = null;
      setIsActive(false);
    }
  }, []);

  useEffect(() => {
    if (desiredActive) {
      acquire();
    } else {
      release();
    }
    return () => {
      release();
    };
  }, [desiredActive, acquire, release]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && desiredActive) {
        acquire();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [desiredActive, acquire]);

  return { isSupported, isActive, error, acquire, release };
}
