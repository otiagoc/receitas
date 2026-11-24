// Timer alerts: WebAudio chime, vibration and system notification.
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = ctx ?? new AC();
    return ctx;
  } catch { return null; }
}

/** Call from a user gesture (e.g. starting a timer) so iOS allows sound later. */
export function unlockAudio(): void {
  const a = audio();
  if (a && a.state === 'suspended') void a.resume();
}

export function chime(times = 3): void {
  const a = audio();
  if (!a) return;
  if (a.state === 'suspended') void a.resume();
  const notes = [880, 1174.66, 1567.98];
  for (let r = 0; r < times; r++) {
    notes.forEach((f, i) => {
      const t = a.currentTime + r * 0.9 + i * 0.16;
      const o = a.createOscillator();
      const g = a.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      o.connect(g).connect(a.destination);
      o.start(t);
      o.stop(t + 0.65);
    });
  }
}

export async function requestNotify(): Promise<void> {
  try {
    if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission();
  } catch { /* ignore */ }
}

export function alertDone(title: string, body: string): void {
  chime();
  try { navigator.vibrate?.([300, 120, 300, 120, 600]); } catch { /* ignore */ }
  try {
    if ('Notification' in window && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
      const opts = { body, icon: import.meta.env.BASE_URL + 'icon-192.png', tag: 'timer-' + title };
      navigator.serviceWorker?.getRegistration().then((reg) => {
        if (reg) void reg.showNotification(title, opts);
        else new Notification(title, opts);
      }).catch(() => new Notification(title, opts));
    }
  } catch { /* ignore */ }
}

export function formatClock(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}
