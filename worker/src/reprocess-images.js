#!/usr/bin/env node
// Regenerate only the SVG illustrations of an existing recipe.
//   npm run reprocess-images <recipe_id>
import fs from 'node:fs';
import path from 'node:path';
import { config, log } from './util.js';
import { login, getRecipe, updateRecipe } from './db.js';
import { illustrate } from './illustrate.js';
import { normalizeIngredient, normalizeStep } from './schema.js';

const id = process.argv[2];
if (!id) {
  console.error('uso: npm run reprocess-images <recipe_id>');
  process.exit(2);
}

try {
  await login();
  const row = await getRecipe(id);
  if (!Array.isArray(row.steps) || !row.steps.length) throw new Error('a receita não tem passos');
  const recipe = {
    title: row.title,
    description: row.description,
    ingredients: (row.ingredients || []).map(normalizeIngredient),
    steps: row.steps.map((s, i) => ({ ...normalizeStep(s, i), title: s.title, text: s.text })),
  };
  const dir = path.join(config.tmpDir, `reimg-${id}`);
  fs.mkdirSync(dir, { recursive: true });
  const t0 = Date.now();
  const art = await illustrate(recipe, dir);
  // Keep the original step data, swap only svg (keep the old one if the new failed).
  const steps = row.steps.map((s, i) => ({ ...s, svg: art.steps[i]?.svg || s.svg || null }));
  await updateRecipe(id, { steps, hero_svg: art.hero_svg || row.hero_svg });
  fs.rmSync(dir, { recursive: true, force: true });
  log.info(`ilustrações regeneradas em ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  process.exit(0);
} catch (e) {
  log.error(e.message);
  process.exit(1);
}
