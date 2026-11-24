import DOMPurify from 'dompurify';

const cache = new Map<string, string>();

/** Sanitizes worker-produced SVG markup (SVG profile only, no scripts/handlers/foreignObject). */
export function sanitizeSvg(svg: string | null | undefined): string {
  if (!svg) return '';
  const hit = cache.get(svg);
  if (hit !== undefined) return hit;
  const clean = DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ['foreignObject', 'script', 'style', 'a', 'image', 'use'],
    FORBID_ATTR: ['href', 'xlink:href'],
  });
  cache.set(svg, clean);
  return clean;
}
