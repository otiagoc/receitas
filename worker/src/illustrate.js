// Claude call #2: sketchbook SVG illustrations (hero + one per step).
import { claudeCall } from './claude.js';
import { sanitizeSvg } from './svg.js';
import { config, log, mapLimit } from './util.js';

const BATCH = Number(process.env.RECEITAS_SVG_BATCH || 4);
const CONCURRENCY = Number(process.env.RECEITAS_SVG_CONCURRENCY || 2);

const STYLE = `GUIA DE ESTILO (obrigatório em todos os desenhos):
- <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"> SEM atributos width/height.
- Estilo caderno de esboços desenhado à mão: primeiro elemento é <rect width="400" height="300" fill="#fbf6ec"/> (papel quente).
- Traço de tinta escura stroke="#3b2f2a", stroke-width 2 a 3, stroke-linecap="round" stroke-linejoin="round", linhas ligeiramente imperfeitas (curvas Q/C com pequenas irregularidades, não formas geométricas perfeitas).
- Preenchimentos suaves tipo aguarela com fill-opacity 0.35–0.7 em paleta quente de comida (tomate #d9534f, laranja #e8a33d, amarelo #f2c14e, verde ervas #7fa65a, castanho #a0673a, creme #f3e3c3, etc.), ligeiramente desalinhados do contorno como aguarela real.
- Opcional: <defs><filter id="wobble"><feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="2.5"/></filter></defs> aplicado a grupos de traço (use ids únicos por desenho, ex.: wobble-h, wobble-3).
- TODOS os traços de contorno (path/line/polyline/circle/ellipse com stroke) levam class="ink" (a app anima o desenho do traço). Os preenchimentos de aguarela sem stroke NÃO levam class="ink".
- Sem texto, ou no máximo uma etiqueta de 1–3 palavras em pt-PT.
- PROIBIDO: <script>, atributos on*, <image>, <foreignObject>, <style>, href externos, fontes externas.
- Cada SVG com menos de ~10 KB: usa poucos paths bem escolhidos em vez de muitos detalhes.`;

function recipeSummary(recipe) {
  const ing = recipe.ingredients.map((i) => `${i.quantity ?? ''} ${i.unit} ${i.name}${i.note ? ` (${i.note})` : ''}`.trim()).join('; ');
  return `Receita: ${recipe.title}\n${recipe.description || ''}\nIngredientes: ${ing}`;
}

function heroPrompt(recipe) {
  return `És um ilustrador de livros de receitas que desenha em SVG.
${recipeSummary(recipe)}

Desenha a ILUSTRAÇÃO PRINCIPAL: a imagem ideal do prato acabado, empratado de forma apetitosa (vista a 3/4 ou de cima), com alguns ingredientes-chave soltos à volta e um pouco de vapor se for quente. Composição centrada, ocupando bem a área.

${STYLE}

Responde APENAS com o SVG, neste formato exato:
=== HERO ===
<svg ...>...</svg>`;
}

function stepsPrompt(recipe, steps) {
  const list = steps.map((s) => `Passo ${s.n} — ${s.title}: ${s.text}${s.ingredients?.length ? ` [ingredientes: ${s.ingredients.join(', ')}]` : ''}${s.timer_sec ? ` [espera: ${Math.round(s.timer_sec / 60)} min]` : ''}`).join('\n');
  return `És um ilustrador de livros de receitas que desenha em SVG.
${recipeSummary(recipe)}

Desenha UMA ilustração para CADA um destes passos. Cada desenho tem de mostrar claramente A AÇÃO do passo: mãos, frigideira/tacho, faca e tábua, taça, ingredientes a entrar (setas de movimento), linhas de vapor, ondas de fervura, e um pequeno ícone de relógio quando há tempo de espera. Mantém utensílios e cores coerentes entre passos.
${list}

${STYLE}

Responde APENAS com os SVGs, neste formato exato (um bloco por passo, sem mais texto):
${steps.map((s) => `=== STEP ${s.n} ===\n<svg ...>...</svg>`).join('\n')}`;
}

/** Parse "=== KEY ===\n<svg>..." blocks into { KEY: svgText }. */
export function parseBlocks(text) {
  const out = {};
  const re = /===\s*(HERO|STEP\s+(\d+))\s*===\s*([\s\S]*?)(?====\s*(?:HERO|STEP\s+\d+)\s*===|$)/g;
  let m;
  while ((m = re.exec(text))) {
    const key = m[2] ? `STEP ${Number(m[2])}` : 'HERO';
    out[key] = m[3].trim();
  }
  return out;
}

async function drawJob(recipe, job, cwd) {
  const prompt = job.kind === 'hero' ? heroPrompt(recipe) : stepsPrompt(recipe, job.steps);
  const keys = job.kind === 'hero' ? ['HERO'] : job.steps.map((s) => `STEP ${s.n}`);
  const result = {};
  let pending = keys;
  for (let attempt = 0; attempt < 2 && pending.length; attempt++) {
    let p = prompt;
    if (attempt > 0) {
      // Retry only the drawings that failed validation.
      p = job.kind === 'hero' ? heroPrompt(recipe) : stepsPrompt(recipe, job.steps.filter((s) => pending.includes(`STEP ${s.n}`)));
      p += '\n\nIMPORTANTE: o SVG anterior era inválido ou demasiado grande. Garante XML bem formado (todas as tags fechadas, atributos entre aspas) e menos de 10 KB.';
    }
    let text = '';
    try {
      text = await claudeCall(p, { cwd, tools: '', timeoutMs: config.timeouts.illustrate, label: `svg ${job.label}${attempt ? ' (retry)' : ''}` });
    } catch (e) {
      log.warn(`svg ${job.label} falhou: ${e.message}`);
      continue;
    }
    const blocks = parseBlocks(text);
    for (const k of pending) {
      const svg = sanitizeSvg(blocks[k] || (keys.length === 1 ? text : ''));
      if (svg) result[k] = svg;
    }
    pending = pending.filter((k) => !result[k]);
    if (pending.length) log.warn(`svg ${job.label}: inválidos ${pending.join(', ')}`);
  }
  return result;
}

/** Mutates recipe.steps[].svg and returns { hero_svg, steps }. */
export async function illustrate(recipe, cwd) {
  const jobs = [{ kind: 'hero', label: 'hero' }];
  for (let i = 0; i < recipe.steps.length; i += BATCH) {
    const steps = recipe.steps.slice(i, i + BATCH);
    jobs.push({ kind: 'steps', steps, label: `passos ${steps[0].n}-${steps[steps.length - 1].n}` });
  }
  const results = await mapLimit(jobs, CONCURRENCY, (job) => drawJob(recipe, job, cwd));
  const all = Object.assign({}, ...results);
  const steps = recipe.steps.map((s) => ({ ...s, svg: all[`STEP ${s.n}`] || null }));
  const ok = steps.filter((s) => s.svg).length;
  log.info(`svg: hero=${all.HERO ? 'ok' : 'falhou'}, passos ${ok}/${steps.length}`);
  return { hero_svg: all.HERO || null, steps };
}
