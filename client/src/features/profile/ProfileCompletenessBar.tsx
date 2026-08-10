import { motion } from 'framer-motion';
import { useCompleteness } from './useProfile';

export default function ProfileCompletenessBar({ userId }: { userId: string }) {
  const { data, isLoading } = useCompleteness(userId);
  if (isLoading || !data) return null;

  const { score, sections } = data;

  return (
    <div className="card p-4 mb-4">
      <div className="flex items-baseline justify-between mb-3">
        <span className="label">Profile strength</span>
        <span className="font-mono text-lg leading-none text-ink-900 tabular-nums">{score}%</span>
      </div>

      {/* A hairline measure, not a candy bar. */}
      <div className="w-full h-0.5 bg-paper-line mb-4 overflow-hidden">
        <motion.div
          className="h-full bg-ink-800"
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
        />
      </div>

      <ul className="space-y-2">
        {Object.entries(sections).map(([key, { earned, max, label }]) => (
          <li key={key} className="flex items-center justify-between gap-3 text-sm">
            <span className={earned ? 'text-ink-700' : 'text-ink-400'}>{label}</span>
            <span className={`font-mono text-[11px] tracking-[0.06em] uppercase tabular-nums ${earned ? 'text-pass' : 'text-ink-400'}`}>
              {earned ? 'done' : `+${max}`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
