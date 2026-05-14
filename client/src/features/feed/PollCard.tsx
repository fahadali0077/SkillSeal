// ─────────────────────────────────────────────────────────────────────────────
// PollCard.tsx  –  interactive poll with real-time vote counts
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart2, Loader2 } from 'lucide-react';
import type { IPollOption } from '@SkillSeal/shared';

interface Props {
  postId:    string;
  options:   IPollOption[];
  expiresAt: string | null;
  onVote?:   (optionId: string) => Promise<void> | void;
  isVoting?: boolean;
}

export default function PollCard({ options, expiresAt, onVote, isVoting }: Props) {
  const [voted, setVoted]               = useState(options.find((o) => o.hasVoted)?._id ?? null);
  const [optimisticVote, setOptimistic] = useState<string | null>(null);

  const totalVotes  = options.reduce((sum, o) => sum + o.voteCount, 0);
  const expired     = expiresAt ? new Date(expiresAt) < new Date() : false;
  const activeVote  = voted ?? optimisticVote;
  const showBars    = !!activeVote || expired;

  const handleVote = async (optId: string) => {
    if (voted || expired || isVoting) return;
    setOptimistic(optId);
    try {
      await onVote?.(optId);
      setVoted(optId);
    } catch {
      setOptimistic(null); // revert on failure
    }
  };

  return (
    <div className="mt-3 space-y-2">
      {options.map((opt) => {
        const pct        = totalVotes > 0 ? Math.round((opt.voteCount / totalVotes) * 100) : 0;
        const isSelected = activeVote === opt._id;

        return (
          <button
            key={opt._id}
            onClick={() => void handleVote(opt._id)}
            disabled={!!voted || expired || isVoting}
            className={`relative w-full text-left rounded-xl border overflow-hidden
              transition-colors text-sm font-medium
              ${isSelected ? 'border-brand' : 'border-gray-200 hover:border-gray-300'}
              ${voted || expired ? 'cursor-default' : 'cursor-pointer'}`}
          >
            {showBars && (
              <motion.div
                className={`absolute inset-y-0 left-0 ${isSelected ? 'bg-blue-50' : 'bg-gray-50'}`}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            )}

            <div className="relative flex items-center justify-between px-4 py-2.5">
              <span className={isSelected ? 'text-brand' : 'text-gray-800'}>{opt.text}</span>
              <span className="flex items-center gap-1.5">
                {isVoting && isSelected && (
                  <Loader2 size={12} className="animate-spin text-brand" />
                )}
                {showBars && (
                  <span className={`text-xs ${isSelected ? 'text-brand font-semibold' : 'text-gray-400'}`}>
                    {pct}%
                  </span>
                )}
              </span>
            </div>
          </button>
        );
      })}

      <div className="flex items-center gap-2 text-xs text-gray-400 pt-1">
        <BarChart2 size={12} />
        <span>{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
        {expiresAt && !expired && (
          <span>· Ends {new Date(expiresAt).toLocaleDateString()}</span>
        )}
        {expired && <span>· Poll ended</span>}
      </div>
    </div>
  );
}
