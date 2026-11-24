/** Animated pencil sketching a pot — used for pending recipes. */
export default function SketchLoader({ size = 120 }: { size?: number }) {
  return (
    <svg className="sketch-loader" width={size} height={size * 0.75} viewBox="0 0 160 120" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path className="sl sl1" d="M28 52h104" />
        <path className="sl sl2" d="M34 54c0 26 4 40 14 48 8 6 20 8 32 8s24-2 32-8c10-8 14-22 14-48" />
        <path className="sl sl3" d="M34 62c-10-2-16 2-16 8s6 9 16 7M126 62c10-2 16 2 16 8s-6 9-16 7" />
        <path className="sl sl4" d="M66 52c0-8 6-12 14-12s14 4 14 12" />
        <path className="sl steam s1" d="M60 30c-6-8 6-12 0-22" />
        <path className="sl steam s2" d="M80 28c-6-8 6-12 0-22" />
        <path className="sl steam s3" d="M100 30c-6-8 6-12 0-22" />
      </g>
      <g className="pencil">
        <path d="M0 0l-6 -4 30 -36 8 6 -30 36z" fill="var(--accent-2)" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M0 0l-6 -4 -1 8z" fill="currentColor" />
      </g>
    </svg>
  );
}
