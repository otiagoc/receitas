// Shopping list logic: unit canonicalization, merging, aisle grouping, sharing.
import { AISLES, type ShoppingItem } from './types';
import { normalizeName, stripAccents } from './ingredients';
import { formatAmount } from './quantity';

type Dim = 'mass' | 'volume' | 'other';
interface UnitInfo { dim: Dim; base: string; factor: number; label: string }

const UNIT_TABLE: [RegExp, UnitInfo][] = [
  [/^(g|gr|grs|grama|gramas)$/, { dim: 'mass', base: 'g', factor: 1, label: 'g' }],
  [/^(kg|kgs|quilo|quilos|quilograma|quilogramas)$/, { dim: 'mass', base: 'g', factor: 1000, label: 'kg' }],
  [/^(ml|mililitro|mililitros)$/, { dim: 'volume', base: 'ml', factor: 1, label: 'ml' }],
  [/^(cl|centilitro|centilitros)$/, { dim: 'volume', base: 'ml', factor: 10, label: 'cl' }],
  [/^(dl|decilitro|decilitros)$/, { dim: 'volume', base: 'ml', factor: 100, label: 'dl' }],
  [/^(l|lt|litro|litros)$/, { dim: 'volume', base: 'ml', factor: 1000, label: 'l' }],
];

const ALIASES: [RegExp, string][] = [
  [/^(c\.? ?s\.?|c\.? ?sopa|colher(es)? (de )?sopa|cs)$/, 'c. sopa'],
  [/^(c\.? ?c\.?|c\.? ?cha|colher(es)? (de )?cha|cc)$/, 'c. chá'],
  [/^(c\.? ?sobremesa|colher(es)? (de )?sobremesa)$/, 'c. sobremesa'],
  [/^(chavena|chavenas|xicara|xicaras|cup|cups)$/, 'chávena'],
  [/^(un|unid|unidade|unidades|u)$/, ''],
  [/^(dente|dentes)$/, 'dente'],
  [/^(lata|latas)$/, 'lata'],
  [/^(q\.? ?b\.?)$/, ''],
];

export function unitInfo(unit: string | null | undefined): UnitInfo {
  const u = stripAccents((unit ?? '').trim().toLowerCase());
  for (const [re, info] of UNIT_TABLE) if (re.test(u)) return info;
  for (const [re, label] of ALIASES) if (re.test(u)) return { dim: 'other', base: label, factor: 1, label };
  return { dim: 'other', base: u, factor: 1, label: (unit ?? '').trim() };
}

/** Key used to decide whether two rows can be merged (same name + compatible unit). */
export function mergeKey(name: string, unit: string | null | undefined): string {
  const info = unitInfo(unit);
  return `${normalizeName(name)}|${info.dim === 'other' ? 'o:' + info.base : info.dim}`;
}

/** Picks a friendly unit for a base quantity (g -> kg, ml -> l). */
export function displayUnit(baseQty: number, info: UnitInfo): { quantity: number; unit: string } {
  if (info.dim === 'mass') return baseQty >= 1000 ? { quantity: baseQty / 1000, unit: 'kg' } : { quantity: baseQty, unit: 'g' };
  if (info.dim === 'volume') return baseQty >= 1000 ? { quantity: baseQty / 1000, unit: 'l' } : { quantity: baseQty, unit: 'ml' };
  return { quantity: baseQty, unit: info.label };
}

export interface DisplayItem {
  key: string;
  name: string;
  quantity: number | null;
  unit: string;
  aisle: string;
  checked: boolean;
  ids: string[];
  recipeIds: string[];
  rows: ShoppingItem[];
}

export function mergeForDisplay(items: ShoppingItem[]): DisplayItem[] {
  const map = new Map<string, { rows: ShoppingItem[]; base: number | null; info: UnitInfo }>();
  for (const it of items) {
    const key = mergeKey(it.name, it.unit);
    const info = unitInfo(it.unit);
    const entry = map.get(key) ?? { rows: [], base: null, info };
    entry.rows.push(it);
    if (it.quantity !== null && it.quantity !== undefined) entry.base = (entry.base ?? 0) + it.quantity * info.factor;
    map.set(key, entry);
  }
  const out: DisplayItem[] = [];
  for (const [key, { rows, base, info }] of map) {
    const d = base === null ? { quantity: null, unit: info.label } : displayUnit(base, info);
    out.push({
      key,
      name: rows[0].name,
      quantity: d.quantity,
      unit: d.unit,
      aisle: rows.find((r) => r.aisle)?.aisle ?? 'Outros',
      checked: rows.every((r) => r.checked),
      ids: rows.map((r) => r.id),
      recipeIds: [...new Set(rows.map((r) => r.recipe_id).filter((x): x is string => !!x))],
      rows,
    });
  }
  return out;
}

export interface NewItem { name: string; quantity: number | null; unit: string | null; aisle: string | null; recipe_id: string | null }

/**
 * Given existing rows and items to add, returns rows to update (same recipe + same merge key, unchecked)
 * and rows to insert. Keeps one row per (recipe, ingredient) so the origin of each item is preserved.
 */
export function planAdd(existing: ShoppingItem[], incoming: NewItem[]): { updates: { id: string; quantity: number | null }[]; inserts: NewItem[] } {
  const updates: { id: string; quantity: number | null }[] = [];
  const inserts: NewItem[] = [];
  const pending = new Map<string, NewItem>();
  for (const inc of incoming) {
    const key = mergeKey(inc.name, inc.unit) + '|' + (inc.recipe_id ?? '');
    const p = pending.get(key);
    if (p) { p.quantity = addQty(p.quantity, p.unit, inc.quantity, inc.unit); continue; }
    const row = existing.find((e) => !e.checked && (e.recipe_id ?? '') === (inc.recipe_id ?? '') && mergeKey(e.name, e.unit) === mergeKey(inc.name, inc.unit));
    if (row) {
      const u = updates.find((x) => x.id === row.id);
      const cur = u ? u.quantity : row.quantity;
      const q = addQty(cur, row.unit, inc.quantity, inc.unit);
      if (u) u.quantity = q; else updates.push({ id: row.id, quantity: q });
      continue;
    }
    const copy = { ...inc };
    pending.set(key, copy);
    inserts.push(copy);
  }
  return { updates, inserts };
}

/** Adds b (in unit ub) to a (in unit ua), returning the result expressed in ua. */
export function addQty(a: number | null, ua: string | null, b: number | null, ub: string | null): number | null {
  if (b === null) return a;
  if (a === null) return b * unitInfo(ub).factor / unitInfo(ua).factor;
  return a + (b * unitInfo(ub).factor) / unitInfo(ua).factor;
}

export function aisleIndex(aisle: string | null | undefined): number {
  const i = (AISLES as readonly string[]).indexOf(aisle ?? '');
  return i === -1 ? AISLES.length : i;
}

export function groupByAisle(items: DisplayItem[]): { aisle: string; items: DisplayItem[] }[] {
  const groups = new Map<string, DisplayItem[]>();
  for (const it of items) {
    const a = (AISLES as readonly string[]).includes(it.aisle) ? it.aisle : 'Outros';
    groups.set(a, [...(groups.get(a) ?? []), it]);
  }
  return [...groups.entries()]
    .sort((x, y) => aisleIndex(x[0]) - aisleIndex(y[0]))
    .map(([aisle, list]) => ({ aisle, items: list.sort((a, b) => Number(a.checked) - Number(b.checked) || a.name.localeCompare(b.name, 'pt')) }));
}

export function itemLabel(it: { name: string; quantity: number | null; unit: string | null }): string {
  const amt = formatAmount(it.quantity, it.unit);
  return amt === 'q.b.' ? it.name : `${it.name} — ${amt}`;
}

export function listAsText(items: DisplayItem[]): string {
  const lines = ['🛒 Lista de compras', ''];
  for (const g of groupByAisle(items.filter((i) => !i.checked))) {
    lines.push(g.aisle.toUpperCase());
    for (const it of g.items) lines.push(`☐ ${itemLabel(it)}`);
    lines.push('');
  }
  return lines.join('\n').trim();
}
