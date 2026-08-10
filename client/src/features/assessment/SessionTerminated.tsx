import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

/**
 * Stated as what was recorded, not as a scolding. The session is closed; the
 * attempt is on the record; here is what happens next.
 */
export default function SessionTerminated({ onReset }: { onReset: () => void }) {
  return (
    <div className="min-h-screen bg-ink-900 px-5 py-14 flex items-center">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.16, ease: [0.2, 0, 0, 1] }}
        className="w-full max-w-lg mx-auto"
      >
        <p className="font-mono text-[10px] font-medium tracking-[0.14em] uppercase text-fail">
          Session ended · strike 3 of 3
        </p>

        <h1 className="font-display text-[40px] leading-none tracking-[-0.02em] text-paper mt-4">
          Session terminated
        </h1>

        <p className="text-[15px] leading-relaxed text-ink-200 mt-5 pb-6 border-b border-ink-700">
          Three integrity violations were recorded, so the session was closed before it finished.
        </p>

        <dl className="divide-y divide-ink-700">
          <div className="flex items-baseline justify-between gap-4 py-3">
            <dt className="text-sm text-ink-300">Result</dt>
            <dd className="font-mono text-sm text-paper">Not certified</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 py-3">
            <dt className="text-sm text-ink-300">Attempt</dt>
            <dd className="font-mono text-sm text-paper">Written to your record</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 py-3">
            <dt className="text-sm text-ink-300">Visibility</dt>
            <dd className="font-mono text-sm text-paper">Recruiters reviewing this skill</dd>
          </div>
        </dl>

        <p className="text-sm leading-relaxed text-ink-300 mt-6">
          A cooldown is now active. You can sit this skill again once it ends.
        </p>

        <div className="flex flex-col gap-3 mt-9">
          <Link
            to="/profile"
            onClick={onReset}
            className="inline-flex items-center justify-center gap-2 bg-paper text-ink-900 font-semibold text-sm px-6 py-3.5 rounded hover:bg-ink-100 transition-colors"
          >
            Return to profile <ArrowUpRight size={16} />
          </Link>
          <button onClick={onReset} className="text-sm font-semibold text-ink-400 hover:text-paper py-1 transition-colors">
            Back to assessments
          </button>
        </div>
      </motion.div>
    </div>
  );
}
