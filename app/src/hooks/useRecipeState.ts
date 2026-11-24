import { useCallback, useEffect, useState } from 'react';

function useStored<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void] {
  const [v, setV] = useState<T>(() => {
    try { const s = localStorage.getItem(key); return s ? (JSON.parse(s) as T) : initial; } catch { return initial; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* ignore */ } }, [key, v]);
  return [v, setV];
}

/** Chosen servings for a recipe, shared between the recipe page and cooking mode. */
export function useServings(id: string, base: number | null): [number, (n: number) => void] {
  const [s, setS] = useStored<number | null>(`servings-${id}`, null);
  return [s ?? base ?? 2, (n: number) => setS(Math.max(1, Math.min(99, n)))];
}

/** Ingredient checklist (by index) for a recipe. */
export function useChecklist(id: string): [Set<number>, (i: number) => void, () => void] {
  const [arr, setArr] = useStored<number[]>(`checked-${id}`, []);
  const toggle = useCallback((i: number) => setArr((a) => (a.includes(i) ? a.filter((x) => x !== i) : [...a, i])), [setArr]);
  const reset = useCallback(() => setArr([]), [setArr]);
  return [new Set(arr), toggle, reset];
}
