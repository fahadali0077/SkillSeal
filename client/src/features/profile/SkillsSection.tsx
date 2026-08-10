import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { X, Plus } from 'lucide-react';
import type { IUserPublic, SkillStatus } from '@SkillSeal/shared';
import { useRemoveSkill } from './useProfile';

interface Props {
  profile: IUserPublic;
  isOwner: boolean;
}

// Unsealed claims keep a dashed border for as long as they stay unverified.
// The gap between this block and the credential ledger above it is the whole
// argument the product makes.
const STATUS_LABEL: Partial<Record<SkillStatus, string>> = {
  unverified: 'Unsealed',
  pending: 'In session',
  expired: 'Lapsed',
};

export default function SkillsSection({ profile, isOwner }: Props) {
  const removeSkill = useRemoveSkill(profile._id);

  // Flagged skills are hidden from every view; sealed ones are printed in the
  // credential ledger, not here.
  const unsealed = profile.skills.filter(
    s => s.status !== 'flagged' && !(s.status === 'verified' && s.verificationId),
  );

  return (
    <section className="card p-5">
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <h2 className="font-display text-[22px] leading-none text-ink-900">Self-reported</h2>
          <p className="label mt-2">Unsealed · not verified by assessment</p>
        </div>
        {isOwner && (
          <button className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-700 hover:text-ink-900">
            <Plus size={14} /> Add skill
          </button>
        )}
      </div>

      {unsealed.length === 0 ? (
        <p className="text-sm text-ink-400">
          {isOwner
            ? 'Nothing unsealed. Every skill on this profile has been verified.'
            : 'No self-reported skills.'}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <AnimatePresence>
            {unsealed.map(skill => {
              const label = STATUS_LABEL[skill.status];
              return (
                <motion.span
                  key={skill.skillId}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.16, ease: [0.2, 0, 0, 1] }}
                  className="chip-unsealed"
                >
                  <span className="text-ink-700">{skill.skillName || 'Skill'}</span>

                  {label && label !== 'Unsealed' && (
                    <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-400">
                      {label}
                    </span>
                  )}

                  {isOwner && (
                    <button
                      onClick={() => removeSkill.mutate(skill.skillId)}
                      disabled={removeSkill.isPending}
                      className="ml-0.5 text-ink-400 hover:text-fail transition-colors"
                      aria-label={`Remove ${skill.skillName}`}
                    >
                      <X size={12} />
                    </button>
                  )}
                </motion.span>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {isOwner && unsealed.length > 0 && (
        <div className="mt-5 pt-4 border-t border-paper-line">
          <Link to="/assessment" className="text-sm font-semibold text-ink-700 hover:text-ink-900">
            Seal one of these →
          </Link>
        </div>
      )}
    </section>
  );
}
