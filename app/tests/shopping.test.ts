import { describe, it, expect } from 'vitest';
import { mergeForDisplay, planAdd, groupByAisle, listAsText } from '../src/lib/shopping';
import type { ShoppingItem } from '../src/lib/types';

let n = 0;
const row = (p: Partial<ShoppingItem>): ShoppingItem => ({ id: String(++n), name: 'x', quantity: null, unit: null, aisle: null, checked: false, recipe_id: null, ...p });

describe('shopping merge', () => {
  it('merges same name with compatible units across recipes', () => {
    const d = mergeForDisplay([
      row({ name: 'farinha', quantity: 500, unit: 'g', recipe_id: 'r1', aisle: 'Mercearia' }),
      row({ name: 'farinhas', quantity: 0.75, unit: 'kg', recipe_id: 'r2', aisle: 'Mercearia' }),
    ]);
    expect(d).toHaveLength(1);
    expect(d[0].quantity).toBe(1.25);
    expect(d[0].unit).toBe('kg');
    expect(d[0].recipeIds).toEqual(['r1', 'r2']);
  });
  it('keeps incompatible units apart', () => {
    const d = mergeForDisplay([
      row({ name: 'leite', quantity: 200, unit: 'ml' }),
      row({ name: 'leite', quantity: 1, unit: 'chávena' }),
    ]);
    expect(d).toHaveLength(2);
  });
  it('treats unit aliases as the same', () => {
    const d = mergeForDisplay([
      row({ name: 'azeite', quantity: 1, unit: 'colher de sopa' }),
      row({ name: 'azeite', quantity: 2, unit: 'c. sopa' }),
    ]);
    expect(d).toHaveLength(1);
    expect(d[0].quantity).toBe(3);
  });
  it('plans updates for the same recipe and inserts otherwise', () => {
    const existing = [row({ id: 'e1', name: 'ovo', quantity: 2, unit: null, recipe_id: 'r1' })];
    const p = planAdd(existing, [
      { name: 'ovos', quantity: 3, unit: 'unidades', aisle: null, recipe_id: 'r1' },
      { name: 'ovo', quantity: 1, unit: null, aisle: null, recipe_id: 'r2' },
      { name: 'ovo', quantity: 1, unit: null, aisle: null, recipe_id: 'r2' },
    ]);
    expect(p.updates).toEqual([{ id: 'e1', quantity: 5 }]);
    expect(p.inserts).toHaveLength(1);
    expect(p.inserts[0].quantity).toBe(2);
  });
  it('groups by aisle in supermarket order and exports text', () => {
    const d = mergeForDisplay([
      row({ name: 'leite', quantity: 1, unit: 'l', aisle: 'Laticínios e ovos' }),
      row({ name: 'alface', quantity: 1, aisle: 'Frutas e legumes' }),
      row({ name: 'sal', aisle: 'Especiarias e temperos', checked: true }),
    ]);
    expect(groupByAisle(d).map((g) => g.aisle)).toEqual(['Frutas e legumes', 'Laticínios e ovos', 'Especiarias e temperos']);
    const t = listAsText(d);
    expect(t).toContain('☐ leite — 1 l');
    expect(t).not.toContain('sal');
  });
});
