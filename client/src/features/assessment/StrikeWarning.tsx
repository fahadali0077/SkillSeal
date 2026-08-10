import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props { strikeCount: number; }

// Stated as a record of what happened, not as an alarm. Same information,
// written the way an audit trail writes it.
const MESSAGES: Record<number, { label: string; body: string; tone: string }> = {
  1: {
    label: 'Violation recorded · strike 1 of 3',
    body: 'You left the assessment tab. This is written to the session audit and visible to any recruiter reviewing this credential.',
    tone: 'border-warn',
  },
  2: {
    label: 'Violation recorded · strike 2 of 3',
    body: 'One further violation ends the session. The attempt stays on your record either way.',
    tone: 'border-warn',
  },
  3: {
    label: 'Session ended · strike 3 of 3',
    body: 'Three violations reached. The session is closed and the result has been written to your record.',
    tone: 'border-fail',
  },
};

export default function StrikeWarning({ strikeCount }: Props) {
  const [visible, setVisible] = useState(false);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (strikeCount > 0 && strikeCount !== shown) {
      setShown(strikeCount);
      setVisible(true);
      // Strike 3 banner stays visible until the terminated screen replaces it
      if (strikeCount < 3) {
        const t = setTimeout(() => setVisible(false), 4000);
        return () => clearTimeout(t);
      }
    }
  }, [strikeCount, shown]);

  const config = MESSAGES[strikeCount];
  if (!config) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={strikeCount}
          initial={{ y: -8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -8, opacity: 0 }}
          transition={{ duration: 0.16, ease: [0.2, 0, 0, 1] }}
          className={`fixed top-0 left-0 right-0 z-[9999] bg-ink-950 border-b-2 ${config.tone} px-5 sm:px-8 py-4`}
          role="alert"
          aria-live="assertive"
        >
          <p className="font-mono text-[10px] font-medium tracking-[0.12em] uppercase text-fail mb-1.5">
            {config.label}
          </p>
          <p className="text-sm leading-relaxed text-ink-200 max-w-[70ch]">
            {config.body}
          </p>

          {strikeCount < 3 && (
            <div className="absolute bottom-0 left-0 right-0 h-px bg-ink-700">
              <motion.div
                className="h-full bg-ink-400"
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 4, ease: 'linear' }}
              />
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
