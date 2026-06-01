// ─────────────────────────────────────────────────────────────────────────────
// ReactionPicker.tsx  –  animated floating reaction selector
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp } from 'lucide-react';
import type { ReactionType } from '@SkillSeal/shared';

const REACTIONS: { type: ReactionType; emoji: string; label: string }[] = [
  { type: 'like', emoji: '👍', label: 'Like' },
  { type: 'celebrate', emoji: '🎉', label: 'Celebrate' },
  { type: 'support', emoji: '🤝', label: 'Support' },
  { type: 'love', emoji: '❤️', label: 'Love' },
  { type: 'insightful', emoji: '💡', label: 'Insightful' },
  { type: 'curious', emoji: '🤔', label: 'Curious' },
  { type: 'funny', emoji: '😄', label: 'Funny' },
];

const REACTION_COLORS: Record<ReactionType, string> = {
  like: 'text-brand',
  celebrate: 'text-yellow-500',
  support: 'text-green-600',
  love: 'text-red-500',
  insightful: 'text-purple-600',
  curious: 'text-orange-500',
  funny: 'text-pink-500',
};

interface Props {
  userReaction: ReactionType | null;
  onReact: (r: ReactionType) => void;
  onUnreact: () => void;
}

export default function ReactionPicker({ userReaction, onReact, onUnreact }: Props) {
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const openPicker = () => { clearTimeout(timerRef.current); setOpen(true); };
  const closePicker = () => { timerRef.current = setTimeout(() => setOpen(false), 300); };

  const handleReact = (type: ReactionType) => {
    setOpen(false);
    if (userReaction === type) { onUnreact(); }
    else { onReact(type); }
  };

  const activeEmoji = REACTIONS.find((r) => r.type === userReaction)?.emoji;

  return (
    <div className="relative" onMouseEnter={openPicker} onMouseLeave={closePicker}>
      {/* Trigger button */}
      <button
        onClick={() => userReaction ? onUnreact() : onReact('like')}
        className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg
          hover:bg-gray-100 transition-colors
          ${userReaction ? REACTION_COLORS[userReaction] : 'text-gray-500 hover:text-gray-700'}`}
      >
        {activeEmoji
          ? <span className="text-base leading-none">{activeEmoji}</span>
          : <ThumbsUp size={15} />
        }
        <span>{userReaction
          ? REACTIONS.find((r) => r.type === userReaction)?.label
          : 'Like'}</span>
      </button>

      {/* Floating picker */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20, stiffness: 350 }}
            className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200
                       rounded-2xl shadow-xl px-3 py-2 flex gap-1 z-50"
            onMouseEnter={openPicker}
            onMouseLeave={closePicker}
          >
            {REACTIONS.map((r, i) => (
              <motion.button
                key={r.type}
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.03, type: 'spring', damping: 15, stiffness: 400 }}
                whileHover={{ scale: 1.35, y: -4 }}
                onClick={() => handleReact(r.type)}
                title={r.label}
                className={`text-2xl leading-none p-1 rounded-lg transition-colors
                  ${userReaction === r.type ? 'bg-blue-50 ring-2 ring-brand' : 'hover:bg-gray-50'}`}
              >
                {r.emoji}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export { REACTIONS, REACTION_COLORS };
