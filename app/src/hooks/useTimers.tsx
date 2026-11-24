import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { alertDone, requestNotify, unlockAudio } from '../lib/alert';

export interface Timer {
  id: string;
  label: string;
  recipeId: string;
  recipeTitle: string;
  total: number; // seconds
  endsAt: number | null; // ms epoch when running
  remaining: number; // seconds, used when paused
  done: boolean;
}

interface TimersCtx {
  timers: Timer[];
  now: number;
  start: (t: Omit<Timer, 'id' | 'endsAt' | 'remaining' | 'done'>) => void;
  toggle: (id: string) => void;
  add: (id: string, sec: number) => void;
  dismiss: (id: string) => void;
  remainingOf: (t: Timer) => number;
}

const Ctx = createContext<TimersCtx | null>(null);
const KEY = 'receitas-timers';

function load(): Timer[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') as Timer[]; } catch { return []; }
}

export function TimersProvider({ children }: { children: ReactNode }) {
  const [timers, setTimers] = useState<Timer[]>(load);
  const [now, setNow] = useState(Date.now());
  const fired = useRef(new Set<string>());

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(timers)); } catch { /* ignore */ }
  }, [timers]);

  const running = timers.some((t) => t.endsAt && !t.done);
  useEffect(() => {
    if (!running) return;
    const iv = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(iv);
  }, [running]);

  // detect completion
  useEffect(() => {
    const finished = timers.filter((t) => t.endsAt && !t.done && t.endsAt <= now);
    if (!finished.length) return;
    for (const t of finished) {
      if (!fired.current.has(t.id)) {
        fired.current.add(t.id);
        alertDone(`⏰ ${t.label}`, `${t.recipeTitle} — o tempo acabou!`);
      }
    }
    setTimers((ts) => ts.map((t) => (finished.some((f) => f.id === t.id) ? { ...t, done: true, remaining: 0 } : t)));
  }, [now, timers]);

  const remainingOf = useCallback((t: Timer) => (t.done ? 0 : t.endsAt ? (t.endsAt - now) / 1000 : t.remaining), [now]);

  const start: TimersCtx['start'] = useCallback((t) => {
    unlockAudio();
    void requestNotify();
    const id = Math.random().toString(36).slice(2);
    setNow(Date.now());
    setTimers((ts) => [...ts, { ...t, id, endsAt: Date.now() + t.total * 1000, remaining: t.total, done: false }]);
  }, []);

  const toggle = useCallback((id: string) => {
    unlockAudio();
    setTimers((ts) => ts.map((t) => {
      if (t.id !== id || t.done) return t;
      if (t.endsAt) return { ...t, endsAt: null, remaining: Math.max(0, (t.endsAt - Date.now()) / 1000) };
      return { ...t, endsAt: Date.now() + t.remaining * 1000 };
    }));
  }, []);

  const add = useCallback((id: string, sec: number) => {
    fired.current.delete(id);
    setTimers((ts) => ts.map((t) => {
      if (t.id !== id) return t;
      if (t.done) return { ...t, done: false, total: t.total + sec, endsAt: Date.now() + sec * 1000, remaining: sec };
      return t.endsAt ? { ...t, total: t.total + sec, endsAt: t.endsAt + sec * 1000 } : { ...t, total: t.total + sec, remaining: t.remaining + sec };
    }));
  }, []);

  const dismiss = useCallback((id: string) => setTimers((ts) => ts.filter((t) => t.id !== id)), []);

  const value = useMemo(() => ({ timers, now, start, toggle, add, dismiss, remainingOf }), [timers, now, start, toggle, add, dismiss, remainingOf]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTimers(): TimersCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('TimersProvider em falta');
  return c;
}
