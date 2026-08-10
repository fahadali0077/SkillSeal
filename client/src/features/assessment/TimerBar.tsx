interface Props { timeLimitMs: number; timeRemainingMs: number; }

// Semantic, not decorative: pass green while there's room, warn amber as it
// tightens, fail oxblood-red at the end. All readings are mono and tabular.
const PASS = '#1D7A4C';
const WARN = '#A8710F';
const FAIL = '#A3221B';

export default function TimerBar({ timeLimitMs, timeRemainingMs }: Props) {
  const pct = timeLimitMs > 0 ? (timeRemainingMs / timeLimitMs) * 100 : 0;
  const color = pct > 50 ? PASS : pct > 20 ? WARN : FAIL;
  const totalSecs = Math.ceil(timeRemainingMs / 1000);
  const mins = Math.floor(totalSecs / 60), secs = totalSecs % 60;
  const label = mins > 0
    ? `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${String(secs).padStart(2, '0')}s`;

  return (
    <div className="flex items-center gap-3 w-full select-none">
      <div className="flex-1 h-0.5 bg-ink-700 overflow-hidden">
        <div
          className="h-full"
          style={{ width: `${pct}%`, background: color, transition: 'width 0.1s linear, background-color 0.5s ease' }}
        />
      </div>
      <span
        className="font-mono text-sm font-medium tabular-nums w-14 text-right"
        style={{ color, transition: 'color 0.5s ease' }}
      >
        {label}
      </span>
    </div>
  );
}
