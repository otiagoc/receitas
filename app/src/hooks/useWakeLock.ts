import { useEffect } from 'react';

type Sentinel = { release: () => Promise<void> };

/** Keeps the screen on while mounted (Screen Wake Lock API), re-acquiring after tab switches. */
export function useWakeLock(enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    const wl = (navigator as unknown as { wakeLock?: { request: (t: 'screen') => Promise<Sentinel> } }).wakeLock;
    if (!wl) return;
    let sentinel: Sentinel | null = null;
    let alive = true;
    const acquire = async () => {
      try { const s = await wl.request('screen'); if (alive) sentinel = s; else void s.release(); } catch { /* denied */ }
    };
    const onVis = () => { if (document.visibilityState === 'visible') void acquire(); };
    void acquire();
    document.addEventListener('visibilitychange', onVis);
    return () => { alive = false; document.removeEventListener('visibilitychange', onVis); void sentinel?.release().catch(() => {}); };
  }, [enabled]);
}
