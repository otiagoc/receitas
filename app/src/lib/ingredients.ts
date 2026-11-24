// Ingredient name normalization and "what can I cook" matching.
import type { Recipe } from './types';

const STOP = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'a', 'o', 'as', 'os', 'com', 'para', 'q', 'b']);

export function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Portuguese-ish singularization on an accent-free lowercase word. */
export function singular(w: string): string {
  if (w.length <= 3) return w;
  if (/(oes|aes|aos)$/.test(w)) return w.slice(0, -3) + 'ao';
  if (/ais$/.test(w)) return w.slice(0, -3) + 'al';
  if (/eis$/.test(w)) return w.slice(0, -3) + 'el';
  if (/ois$/.test(w)) return w.slice(0, -3) + 'ol';
  if (/(r|z)es$/.test(w)) return w.slice(0, -2);
  if (/ns$/.test(w)) return w.slice(0, -2) + 'm';
  if (/s$/.test(w) && !/(ss|us|is)$/.test(w)) return w.slice(0, -1);
  return w;
}

export function tokens(name: string): string[] {
  return stripAccents(name.toLowerCase())
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t && !STOP.has(t))
    .map(singular);
}

export function normalizeName(name: string): string {
  return tokens(name).join(' ');
}

const PANTRY = [
  'sal', 'sal grosso', 'sal fino', 'flor sal', 'pimenta', 'pimenta preta', 'pimenta branca',
  'azeite', 'azeite virgem extra', 'agua', 'oleo', 'oleo vegetal', 'oleo girassol', 'gelo', 'sal pimenta',
].map(normalizeName);
const PANTRY_SET = new Set(PANTRY);

export function isPantry(name: string): boolean {
  const n = normalizeName(name);
  if (PANTRY_SET.has(n)) return true;
  if (/\bspray\b/.test(n) && /\b(oleo|azeite)\b/.test(n)) return true;
  const t = n.split(' ');
  // e.g. "pimenta preta moida", "agua quente", "sal marinho"
  return ['sal', 'pimenta', 'agua', 'azeite', 'oleo'].includes(t[0]) && t.length <= 3 && !/(doce|jalapeno|padron|caiena|piri)/.test(n);
}

/** True when what the user has ("frango") covers a recipe ingredient ("peito de frango"). */
export function matches(have: string, ingredient: string): boolean {
  const h = tokens(have);
  const i = tokens(ingredient);
  if (!h.length || !i.length) return false;
  const iset = new Set(i);
  if (h.every((t) => iset.has(t))) return true;
  const hset = new Set(h);
  return i.every((t) => hset.has(t));
}

export interface Ranked {
  recipe: Recipe;
  coverage: number;
  matched: string[];
  missing: string[];
}

export function rankByIngredients(recipes: Recipe[], have: string[]): Ranked[] {
  const haves = have.map((h) => h.trim()).filter(Boolean);
  if (!haves.length) return [];
  const out: Ranked[] = [];
  for (const r of recipes) {
    if (r.status !== 'done' || !r.ingredients?.length) continue;
    const considered = r.ingredients.filter((i) => !i.optional && !isPantry(i.name));
    if (!considered.length) continue;
    const matched: string[] = [];
    const missing: string[] = [];
    for (const ing of considered) {
      (haves.some((h) => matches(h, ing.name)) ? matched : missing).push(ing.name);
    }
    if (!matched.length) continue;
    out.push({ recipe: r, coverage: matched.length / considered.length, matched, missing });
  }
  return out.sort((a, b) => b.coverage - a.coverage || a.missing.length - b.missing.length);
}
