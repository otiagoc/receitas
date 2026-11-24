// Quantity scaling and human-friendly formatting (pt-PT).

const FRACTIONS: [number, string][] = [
  [0, ''], [1 / 8, '⅛'], [1 / 4, '¼'], [1 / 3, '⅓'], [1 / 2, '½'], [2 / 3, '⅔'], [3 / 4, '¾'], [1, ''],
];

/** Units that read naturally as fractions (spoons, cups, pieces). */
const FRACTION_UNITS = /^(|un|unid|unidade|unidades|c\.?|colher|colheres|chávena|chávenas|chavena|chavenas|copo|copos|dente|dentes|lata|latas|pitada|pitadas|fatia|fatias|folha|folhas|ramo|ramos|molho|molhos|pé|pés|cabeça|cabeças|embalagem|embalagens|pacote|pacotes|saqueta|saquetas|c\. sopa|c\. chá|c\. sobremesa|colher de sopa|colheres de sopa|colher de chá|colheres de chá|colher de sobremesa|kg|l|litro|litros)$/i;

export function scaleQuantity(q: number | null | undefined, factor: number): number | null {
  if (q === null || q === undefined || !isFinite(q)) return null;
  return q * factor;
}

function decimal(n: number, digits: number): string {
  return n.toLocaleString('pt-PT', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

/** Formats a number using unicode fractions where sensible (e.g. 1.5 -> "1 ½"). */
export function toFraction(n: number): string {
  const whole = Math.floor(n + 1e-9);
  const rest = n - whole;
  let best = FRACTIONS[0];
  for (const f of FRACTIONS) if (Math.abs(f[0] - rest) < Math.abs(best[0] - rest)) best = f;
  // if the nearest fraction is too far off, fall back to a decimal
  if (Math.abs(best[0] - rest) > 0.07) return decimal(n, 1);
  const w = best[0] === 1 ? whole + 1 : whole;
  if (!best[1]) return String(w);
  return w === 0 ? best[1] : `${w} ${best[1]}`;
}

/** Rounds metric amounts to sensible kitchen precision. */
export function roundMetric(n: number): number {
  if (n >= 1000) return Math.round(n / 50) * 50;
  if (n >= 200) return Math.round(n / 10) * 10;
  if (n >= 50) return Math.round(n / 5) * 5;
  if (n >= 10) return Math.round(n);
  if (n >= 1) return Math.round(n * 2) / 2;
  return Math.round(n * 10) / 10 || 0.1;
}

export function formatNumber(n: number, unit: string | null | undefined): string {
  const u = (unit ?? '').trim();
  if (FRACTION_UNITS.test(u)) return toFraction(n);
  return decimal(roundMetric(n), 1);
}

const PLURALS: Record<string, string> = {
  dente: 'dentes', lata: 'latas', 'chávena': 'chávenas', fatia: 'fatias', folha: 'folhas', ramo: 'ramos', pitada: 'pitadas',
  embalagem: 'embalagens', pacote: 'pacotes', copo: 'copos', molho: 'molhos', 'cabeça': 'cabeças', unidade: 'unidades',
  saqueta: 'saquetas', colher: 'colheres', 'raminho': 'raminhos', posta: 'postas', filete: 'filetes', lombo: 'lombos',
};

/** Pluralizes the first word of a unit when the amount is above one ("2 dente" -> "2 dentes"). */
export function pluralUnit(unit: string, n: number): string {
  if (n <= 1) return unit;
  const [first, ...rest] = unit.split(' ');
  const p = PLURALS[first.toLowerCase()];
  return p ? [p, ...rest].join(' ') : unit;
}

/** "200 g", "1 ½ c. sopa", "q.b." */
export function formatAmount(q: number | null | undefined, unit: string | null | undefined, factor = 1): string {
  const u = (unit ?? '').trim();
  const scaled = scaleQuantity(q, factor);
  if (scaled === null || scaled <= 0) {
    if (!u || /^q\.?\s?b\.?$/i.test(u)) return 'q.b.';
    return u;
  }
  const num = formatNumber(scaled, u);
  return u ? `${num} ${pluralUnit(u, scaled)}` : num;
}
