// SVG sanitization + validation for Claude-drawn illustrations.
import { XMLParser, XMLBuilder, XMLValidator } from 'fast-xml-parser';

const ALLOWED = new Set([
  'svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'text', 'tspan',
  'defs', 'filter', 'feTurbulence', 'feDisplacementMap', 'feGaussianBlur', 'feColorMatrix', 'feOffset',
  'feBlend', 'feComposite', 'feMerge', 'feMergeNode', 'feFlood', 'feMorphology',
  'linearGradient', 'radialGradient', 'stop', 'clipPath', 'mask', 'pattern', 'use', 'symbol', 'marker',
  'title', 'desc',
]);
const STROKE_SHAPES = new Set(['path', 'line', 'polyline', 'polygon', 'circle', 'ellipse', 'rect']);
const MAX_BYTES = Number(process.env.RECEITAS_SVG_MAX_BYTES || 24_000);

const parserOpts = {
  preserveOrder: true,
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  allowBooleanAttributes: false,
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: false,
  processEntities: false,
  commentPropName: false,
};
const parser = new XMLParser(parserOpts);
const builder = new XMLBuilder({ ...parserOpts, format: false, suppressEmptyNode: true });

const BAD_VALUE = /javascript:|data:|vbscript:|expression\s*\(|@import/i;

function cleanAttrs(tag, attrs = {}, isRoot) {
  const out = {};
  for (const [k, v] of Object.entries(attrs)) {
    const name = k.slice(2); // strip '@_'
    const lname = name.toLowerCase();
    const val = String(v);
    if (lname.startsWith('on')) continue;
    if (lname === 'href' || lname === 'xlink:href') {
      if (val.startsWith('#')) out[k] = val;
      continue;
    }
    if (BAD_VALUE.test(val)) continue;
    // Only same-document references are allowed inside url(...)
    if (/url\(/i.test(val) && /url\(\s*['"]?(?!#)/i.test(val)) continue;
    if (isRoot && (lname === 'width' || lname === 'height')) continue;
    out[k] = val;
  }
  if (isRoot) {
    out['@_xmlns'] = 'http://www.w3.org/2000/svg';
    out['@_viewBox'] = '0 0 400 300';
  }
  // Ensure stroked shapes get class="ink" so the app can animate the draw-in.
  if (STROKE_SHAPES.has(tag) && out['@_stroke'] && out['@_stroke'] !== 'none' && !out['@_class']) {
    out['@_class'] = 'ink';
  }
  return out;
}

function cleanNodes(nodes, depth = 0) {
  const out = [];
  for (const node of nodes) {
    if ('#text' in node) {
      out.push({ '#text': node['#text'] });
      continue;
    }
    const tag = Object.keys(node).find((k) => k !== ':@');
    if (!tag || !ALLOWED.has(tag)) continue; // drops script, foreignObject, image, style, a, iframe...
    const children = cleanNodes(node[tag] || [], depth + 1);
    const n = { [tag]: children };
    const attrs = cleanAttrs(tag, node[':@'], depth === 0);
    if (Object.keys(attrs).length) n[':@'] = attrs;
    out.push(n);
  }
  return out;
}

/** Extract the first <svg>...</svg> from arbitrary text. */
export function extractSvg(text) {
  if (typeof text !== 'string') return null;
  const start = text.indexOf('<svg');
  const end = text.lastIndexOf('</svg>');
  if (start < 0 || end < start) return null;
  return text.slice(start, end + 6);
}

/**
 * Sanitize an SVG string. Returns the cleaned SVG, or null if it is not
 * well-formed / has no drawing / is too big.
 */
export function sanitizeSvg(raw) {
  const src = extractSvg(raw);
  if (!src) return null;
  if (XMLValidator.validate(src) !== true) return null;
  let tree;
  try { tree = parser.parse(src); } catch { return null; }
  const rootIdx = tree.findIndex((n) => 'svg' in n);
  if (rootIdx < 0) return null;
  const cleaned = cleanNodes([tree[rootIdx]]);
  let out = builder.build(cleaned).replace(/\s{2,}/g, ' ').replace(/>\s+</g, '><').trim();
  if (XMLValidator.validate(out) !== true) return null;
  if (!/<(path|circle|ellipse|line|polyline|polygon)\b/.test(out)) return null;
  if (Buffer.byteLength(out) > MAX_BYTES) return null;
  return out;
}
