import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, AlertOctagon, XCircle } from 'lucide-react';

interface Props { strikeCount: number; }

const MESSAGES: Record<number, { text: string; bg: string; icon: JSX.Element }> = {
  1: {
    text: 'Violation detected — tab switching is recorded. (1/3)',
    bg: 'bg-amber-500',
    icon: <AlertTriangle size={20} />,
  },
  2: {
    text: 'Final warning — one more violation will terminate your session. (2/3)',
    bg: 'bg-orange-600',
    icon: <AlertOctagon size={20} />,
  },
  3: {
    text: 'Session terminated — 3 violations reached. Your result has been recorded.',
    bg: 'bg-red-700',
    icon: <XCircle size={20} />,
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
        const t = setTimeout(() => setVisible(false), 5000);
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
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className={`fixed top-0 left-0 right-0 z-[9999] flex items-center gap-3 px-6 py-3 ${config.bg} text-white`}
          role="alert"
          aria-live="assertive"
        >
          {config.icon}
          <p className="font-semibold text-sm">{config.text}</p>
          {strikeCount < 3 && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20">
              <motion.div
                className="h-full bg-white/60"
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 5, ease: 'linear' }}
              />
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
