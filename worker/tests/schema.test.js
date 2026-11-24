import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRecipe, parseJsonReply } from '../src/schema.js';
import { parseBlocks } from '../src/illustrate.js';

test('normalizes recipe', () => {
  const r = normalizeRecipe(parseJsonReply('```json\n{"title":"X","category":"massas","difficulty":"facil","tags":["#Rápido","rápido"],"prep_min":"10","cook_min":20,"ingredients":[{"name":"Cebola","quantity":"1/2","unit":"colheres de sopa","aisle":"frutas e legumes"},{"name":"sal","unit":"qb"}],"steps":[{"title":"A","text":"faz","timer_sec":0},"mexe"]}\n```'));
  assert.equal(r.category, 'Massas');
  assert.equal(r.difficulty, 'Fácil');
  assert.deepEqual(r.tags, ['rápido']);
  assert.equal(r.total_min, 30);
  assert.deepEqual(r.ingredients[0], { name: 'cebola', quantity: 0.5, unit: 'c. sopa', note: null, group: null, aisle: 'Frutas e legumes', optional: false });
  assert.equal(r.ingredients[1].unit, 'q.b.');
  assert.equal(r.ingredients[1].aisle, 'Outros');
  assert.equal(r.steps[0].timer_sec, null);
  assert.equal(r.steps[1].n, 2);
});

test('not a recipe', () => {
  assert.throws(() => normalizeRecipe({ is_recipe: false }), (e) => e.notRecipe);
});

test('parseBlocks', () => {
  const b = parseBlocks('=== HERO ===\n<svg>a</svg>\n=== STEP 1 ===\n<svg>b</svg>\n===STEP 2===\n<svg>c</svg>');
  assert.equal(b.HERO, '<svg>a</svg>');
  assert.equal(b['STEP 2'], '<svg>c</svg>');
});
