// ─────────────────────────────────────────────────────────────────────────────
// SealMark.tsx – the mark: a wax disc with a milled inner rim and a struck
// serif S. Built from circles and a glyph so it stays legible at 16px.
// Below 20px the rim is dropped entirely — that variant is the favicon.
// ─────────────────────────────────────────────────────────────────────────────

type Tone = 'seal' | 'ink' | 'paper' | 'pass';

const TONES: Record<Tone, { disc: string; rim: string; glyph: string }> = {
  seal:  { disc: '#8A1F2F', rim: '#C98A93', glyph: '#FBF9F6' },
  ink:   { disc: '#12233A', rim: '#7C8DA1', glyph: '#FBF9F6' },
  paper: { disc: '#FBF9F6', rim: '#8A1F2F', glyph: '#8A1F2F' },
  pass:  { disc: '#1D7A4C', rim: '#9CCBB0', glyph: '#FBF9F6' },
};

interface Props {
  size?: number;
  tone?: Tone;
  className?: string;
  title?: string;
}

export default function SealMark({ size = 24, tone = 'seal', className = '', title }: Props) {
  const c = TONES[tone];
  const showRim = size >= 20;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      {title && <title>{title}</title>}

      {/* the disc */}
      <circle cx="16" cy="16" r="16" fill={c.disc} />

      {/* the impressed edge — dashed, thickened when the mark runs small */}
      {showRim && (
        <circle
          cx="16"
          cy="16"
          r="12.5"
          stroke={c.rim}
          strokeWidth={size < 28 ? 1.6 : 1.1}
          strokeDasharray="2.6 2.4"
          strokeLinecap="round"
          opacity="0.85"
        />
      )}

      {/* the struck S */}
      <text
        x="16"
        y="16"
        textAnchor="middle"
        dominantBaseline="central"
        fill={c.glyph}
        fontFamily="Newsreader, Georgia, serif"
        fontWeight="500"
        fontSize="17"
        style={{ letterSpacing: '-0.01em' }}
      >
        S
      </text>
    </svg>
  );
}

// ── Horizontal lockup ────────────────────────────────────────────────────────
// Wordmark is Newsreader Medium at optical size 24+, tracked −0.015em.
// Clear space is the disc's radius on all sides.

export function SealWordmark({
  size = 26,
  tone = 'seal',
  labelClass = 'text-ink-900',
  className = '',
}: {
  size?: number;
  tone?: Tone;
  labelClass?: string;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`} style={{ paddingInline: size / 2 === 0 ? 0 : 0 }}>
      <SealMark size={size} tone={tone} />
      <span
        className={`font-display font-medium leading-none tracking-[-0.015em] ${labelClass}`}
        style={{ fontSize: Math.round(size * 0.78) }}
      >
        SkillSeal
      </span>
    </span>
  );
}
