import { useEffect, useMemo, useRef } from 'react';
import { sanitizeSvg } from '../lib/sanitize';

interface Props {
  svg: string | null | undefined;
  className?: string;
  /** Animate the drawing in when it enters the viewport. */
  animate?: boolean;
  /** Change to replay the animation (e.g. cooking mode step). */
  replayKey?: string | number;
  label?: string;
}

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Full-canvas rects act as paper; keep them visible from the start. */
function isBackground(el: Element, root: SVGSVGElement): boolean {
  if (el.tagName !== 'rect') return false;
  const vb = root.viewBox.baseVal;
  const w = parseFloat(el.getAttribute('width') || '0');
  const h = parseFloat(el.getAttribute('height') || '0');
  return (el.getAttribute('width') === '100%') || (!!vb && vb.width > 0 && w >= vb.width * 0.9 && h >= vb.height * 0.9);
}

export default function Drawing({ svg, className = '', animate = true, replayKey, label }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const html = useMemo(() => sanitizeSvg(svg), [svg]);

  useEffect(() => {
    const host = ref.current;
    const root = host?.querySelector('svg');
    if (!host || !root) return;
    root.removeAttribute('width');
    root.removeAttribute('height');
    root.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    root.setAttribute('role', 'img');
    if (label) root.setAttribute('aria-label', label);
    if (!animate || reduced()) return;

    const shapes = Array.from(root.querySelectorAll<SVGGeometryElement>('path,line,polyline,polygon,circle,ellipse,rect'));
    let ink = shapes.filter((s) => s.classList.contains('ink'));
    if (!ink.length) ink = shapes.filter((s) => (s.getAttribute('fill') === 'none' || s.tagName === 'line') && s.getAttribute('stroke'));
    const inkSet = new Set(ink);
    const others = Array.from(root.querySelectorAll<SVGElement>('path,line,polyline,polygon,circle,ellipse,rect,text,g > *'))
      .filter((s) => !inkSet.has(s as SVGGeometryElement) && !(s as Element).closest('defs') && !isBackground(s, root));

    const lens = ink.map((el) => { try { return el.getTotalLength(); } catch { return 0; } });
    ink.forEach((el, i) => {
      const len = Math.ceil(lens[i]) + 2;
      el.style.transition = 'none';
      el.style.strokeDasharray = `${len}`;
      el.style.strokeDashoffset = `${len}`;
    });
    others.forEach((el) => { el.style.transition = 'none'; el.style.opacity = '0'; });

    let started = false;
    const run = () => {
      if (started) return;
      started = true;
      const totalBudget = 2200; // ms for the whole drawing
      const sum = lens.reduce((a, b) => a + b, 0) || 1;
      let t = 0;
      ink.forEach((el, i) => {
        const d = Math.max(120, (lens[i] / sum) * totalBudget);
        el.getBoundingClientRect();
        el.style.transition = `stroke-dashoffset ${d}ms cubic-bezier(.45,.05,.55,.95) ${t}ms`;
        el.style.strokeDashoffset = '0';
        t += d * 0.6;
      });
      others.forEach((el, i) => {
        el.style.transition = `opacity 600ms ease ${t * 0.7 + i * 25}ms`;
        el.style.opacity = '';
      });
    };

    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { requestAnimationFrame(() => requestAnimationFrame(run)); io.disconnect(); }
    }, { threshold: 0.35 });
    io.observe(host);
    return () => io.disconnect();
  }, [html, animate, replayKey, label]);

  if (!html) return null;
  return <div ref={ref} key={replayKey} className={`drawing ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
