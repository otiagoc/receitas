import { describe, it, expect } from 'vitest';
import { normalizeName, matches, isPantry, rankByIngredients } from '../src/lib/ingredients';
import type { Recipe } from '../src/lib/types';

const ing = (name: string, optional = false) => ({ name, quantity: 1, unit: null, note: null, group: null, aisle: null, optional });
const recipe = (id: string, names: string[]): Recipe => ({ id, status: 'done', ingredients: names.map((n) => ing(n)) } as unknown as Recipe);

describe('ingredients', () => {
  it('normalizes accents and plurals', () => {
    expect(normalizeName('Limões')).toBe('limao');
    expect(normalizeName('tomates')).toBe('tomate');
    expect(normalizeName('Pães')).toBe('pao');
    expect(normalizeName('nozes')).toBe('noz');
    expect(normalizeName('Peito de Frango')).toBe('peito frango');
    expect(normalizeName('cogumelos')).toBe('cogumelo');
  });
  it('matches partial names both ways', () => {
    expect(matches('frango', 'peito de frango')).toBe(true);
    expect(matches('ovos', 'ovo')).toBe(true);
    expect(matches('limão', 'limoes')).toBe(true);
    expect(matches('arroz', 'massa')).toBe(false);
  });
  it('detects pantry basics', () => {
    expect(isPantry('sal')).toBe(true);
    expect(isPantry('pimenta preta moída')).toBe(true);
    expect(isPantry('azeite')).toBe(true);
    expect(isPantry('spray de óleo para cozinhar')).toBe(true);
    expect(isPantry('água')).toBe(true);
    expect(isPantry('pimento')).toBe(false);
    expect(isPantry('pimenta jalapeño')).toBe(false);
  });
  it('ranks by coverage ignoring pantry', () => {
    const r = rankByIngredients(
      [recipe('a', ['ovo', 'sal', 'azeite', 'batata']), recipe('b', ['ovo', 'farinha', 'açúcar', 'leite']), recipe('c', ['arroz'])],
      ['ovos', 'batatas'],
    );
    expect(r.map((x) => x.recipe.id)).toEqual(['a', 'b']);
    expect(r[0].coverage).toBe(1);
    expect(r[1].missing).toEqual(['farinha', 'açúcar', 'leite']);
  });
});
