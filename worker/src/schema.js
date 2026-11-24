// Recipe data contract: enums + robust normalization of Claude's JSON.

export const CATEGORIES = ['Pequeno-almoço', 'Entradas', 'Sopas', 'Pratos principais', 'Massas', 'Saladas',
  'Sobremesas', 'Bolos e doces', 'Pão', 'Bebidas', 'Snacks', 'Molhos'];
export const DIFFICULTIES = ['Fácil', 'Média', 'Difícil'];
export const AISLES = ['Frutas e legumes', 'Talho e peixaria', 'Laticínios e ovos', 'Padaria', 'Mercearia',
  'Especiarias e temperos', 'Congelados', 'Bebidas', 'Outros'];
export const UNITS = ['un', 'g', 'kg', 'ml', 'l', 'c. sopa', 'c. chá', 'chávena', 'dente', 'q.b.', 'pitada',
  'fatia', 'lata', 'embalagem', 'molho', 'ramo', 'folha', 'cl', 'dl'];

const strip = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

function matchEnum(value, list, fallback) {
  if (value == null) return fallback;
  const v = strip(value);
  return list.find((x) => strip(x) === v)
    || list.find((x) => v && (strip(x).startsWith(v) || v.startsWith(strip(x))))
    || fallback;
}

const UNIT_ALIASES = {
  'colher de sopa': 'c. sopa', 'colheres de sopa': 'c. sopa', 'c.sopa': 'c. sopa', 'cs': 'c. sopa', 'tbsp': 'c. sopa', 'colher sopa': 'c. sopa',
  'colher de cha': 'c. chá', 'colheres de cha': 'c. chá', 'c.cha': 'c. chá', 'c. cha': 'c. chá', 'tsp': 'c. chá', 'colher cha': 'c. chá',
  'chavena': 'chávena', 'chavenas': 'chávena', 'cup': 'chávena', 'cups': 'chávena', 'xicara': 'chávena',
  'dentes': 'dente', 'unidade': 'un', 'unidades': 'un', 'und': 'un', 'qb': 'q.b.', 'q.b': 'q.b.', 'a gosto': 'q.b.',
  'gramas': 'g', 'gr': 'g', 'grama': 'g', 'quilo': 'kg', 'mililitros': 'ml', 'litro': 'l', 'litros': 'l',
  'pitadas': 'pitada', 'fatias': 'fatia', 'latas': 'lata', 'folhas': 'folha', 'ramos': 'ramo', 'molhos': 'molho',
};

function normUnit(u, quantity) {
  if (u == null || u === '') return quantity == null ? 'q.b.' : 'un';
  const s = strip(u).replace(/\.$/, '');
  if (UNIT_ALIASES[s]) return UNIT_ALIASES[s];
  const hit = UNITS.find((x) => strip(x) === s);
  return hit || String(u).trim().toLowerCase().slice(0, 20);
}

function toNum(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v).replace(',', '.').trim();
  const frac = s.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (frac) return Math.round((Number(frac[1]) / Number(frac[2])) * 100) / 100;
  const mixed = s.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixed) return Number(mixed[1]) + Math.round((Number(mixed[2]) / Number(mixed[3])) * 100) / 100;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

const toInt = (v) => { const n = toNum(v); return n == null ? null : Math.max(0, Math.round(n)); };
const str = (v, max = 2000) => (v == null || v === '' ? null : String(v).trim().slice(0, max) || null);

/** Parse the first JSON object found in a model reply (handles ``` fences and prose). */
export function parseJsonReply(text) {
  if (typeof text !== 'string') throw new Error('resposta vazia');
  let t = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
  try { return JSON.parse(t); } catch { /* fall through */ }
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('sem JSON na resposta');
  return JSON.parse(t.slice(start, end + 1));
}

export function normalizeIngredient(i) {
  if (typeof i === 'string') i = { name: i };
  const quantity = toNum(i.quantity);
  return {
    name: (str(i.name, 120) || 'ingrediente').toLowerCase(),
    quantity,
    unit: normUnit(i.unit, quantity),
    note: str(i.note, 200),
    group: str(i.group, 60),
    aisle: matchEnum(i.aisle, AISLES, 'Outros'),
    optional: Boolean(i.optional),
  };
}

export function normalizeStep(s, idx) {
  if (typeof s === 'string') s = { text: s };
  const duration = toInt(s.duration_min);
  let timer = toInt(s.timer_sec);
  if (timer === 0) timer = null;
  return {
    n: idx + 1,
    title: str(s.title, 80) || `Passo ${idx + 1}`,
    text: str(s.text, 2000) || '',
    duration_min: duration || null,
    timer_sec: timer,
    ingredients: Array.isArray(s.ingredients) ? s.ingredients.map((x) => String(x).toLowerCase().trim()).filter(Boolean) : [],
    svg: null,
  };
}

/** Normalize the extraction reply into DB columns. Throws a tagged error for "not a recipe". */
export function normalizeRecipe(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('JSON inválido');
  if (raw.is_recipe === false) {
    const e = new Error('not_a_recipe');
    e.notRecipe = true;
    throw e;
  }
  const ingredients = (Array.isArray(raw.ingredients) ? raw.ingredients : []).map(normalizeIngredient);
  const steps = (Array.isArray(raw.steps) ? raw.steps : []).map(normalizeStep).filter((s) => s.text);
  if (!ingredients.length || !steps.length) {
    const e = new Error('sem ingredientes/passos');
    e.notRecipe = true;
    throw e;
  }
  const prep = toInt(raw.prep_min);
  const cook = toInt(raw.cook_min);
  let total = toInt(raw.total_min);
  if (!total && (prep || cook)) total = (prep || 0) + (cook || 0);
  const tags = [...new Set((Array.isArray(raw.tags) ? raw.tags : [])
    .map((t) => String(t).toLowerCase().replace(/^#/, '').trim()).filter((t) => t && t.length <= 30))].slice(0, 10);
  return {
    title: str(raw.title, 120) || 'Receita sem título',
    description: str(raw.description, 600),
    cuisine: str(raw.cuisine, 60),
    category: matchEnum(raw.category, CATEGORIES, 'Pratos principais'),
    tags,
    servings: toInt(raw.servings) || null,
    prep_min: prep || null,
    cook_min: cook || null,
    total_min: total || null,
    difficulty: matchEnum(raw.difficulty, DIFFICULTIES, 'Média'),
    ingredients,
    steps,
    tips: (Array.isArray(raw.tips) ? raw.tips : []).map((t) => str(t, 400)).filter(Boolean).slice(0, 10),
  };
}
