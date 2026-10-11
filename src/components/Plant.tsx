/** A plant that grows with `stage` (0–5). */
export function Plant({ stage, className = "h-40 w-40" }: { stage: number; className?: string }) {
  const s = Math.max(0, Math.min(5, stage));
  const leaves = [
    { y: 62, d: -1 },
    { y: 52, d: 1 },
    { y: 42, d: -1 },
    { y: 32, d: 1 },
  ].slice(0, Math.max(0, s - 1));
  const stemTop = 80 - Math.min(s, 4) * 12;
  return (
    <svg
      viewBox="0 0 100 110"
      className={className}
      role="img"
      aria-label={`Plant at growth stage ${s} of 5`}
    >
      <ellipse cx="50" cy="104" rx="30" ry="4" className="fill-muted" />
      <path d="M28 82h44l-5 22H33Z" className="fill-lavender" />
      <rect
        x="25"
        y="78"
        width="50"
        height="7"
        rx="3"
        className="fill-accent-foreground opacity-70"
      />
      <g className="animate-sway">
        {s === 0 ? (
          <circle cx="50" cy="76" r="3" className="fill-sage-deep" />
        ) : (
          <path
            d={`M50 79V${stemTop}`}
            className="stroke-sage-deep"
            strokeWidth="3"
            strokeLinecap="round"
          />
        )}
        {leaves.map((l, i) => (
          <path
            key={i}
            d={
              l.d < 0
                ? `M50 ${l.y}c-12 0-18-6-18-12 10 0 18 5 18 12Z`
                : `M50 ${l.y}c12 0 18-6 18-12-10 0-18 5-18 12Z`
            }
            className="fill-primary"
          />
        ))}
        {s >= 1 && s < 5 && (
          <path d={`M50 ${stemTop}c-4-4-4-8 0-10 4 2 4 6 0 10Z`} className="fill-primary" />
        )}
        {s === 5 && (
          <g>
            {[0, 72, 144, 216, 288].map((r) => (
              <ellipse
                key={r}
                cx="50"
                cy="22"
                rx="5"
                ry="9"
                transform={`rotate(${r} 50 30)`}
                className="fill-lavender"
              />
            ))}
            <circle cx="50" cy="30" r="5" className="fill-cream stroke-accent-foreground" />
          </g>
        )}
      </g>
    </svg>
  );
}
