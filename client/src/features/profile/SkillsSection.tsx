import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, Clock, AlertTriangle, HelpCircle, Plus } from 'lucide-react';
import type { IUserPublic, SkillStatus } from '@SkillSeal/shared';
import { useRemoveSkill } from './useProfile';

interface Props {
  profile: IUserPublic;
  isOwner: boolean;
}

interface BadgeConfig {
  label: string;
  className: string;
  icon: React.ReactNode;
  pulse?: boolean;
  hidden?: boolean;
}

const STATUS_CONFIG: Record<SkillStatus, BadgeConfig> = {
  unverified: {
    label: 'Unverified',
    className: 'bg-gray-100 text-gray-600 border-gray-200',
    icon: <HelpCircle size={10} />,
  },
  pending: {
    label: 'Pending',
    className: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    icon: <Clock size={10} />,
    pulse: true,
  },
  verified: {
    label: 'Verified',
    className: 'bg-blue-50 text-brand border-blue-200',
    icon: <ShieldCheck size={10} />,
  },
  expired: {
    label: 'Expired',
    className: 'bg-orange-50 text-orange-700 border-orange-200',
    icon: <AlertTriangle size={10} />,
  },
  flagged: {
    label: 'Flagged',
    className: '',
    icon: null,
    hidden: true,
  },
};

export default function SkillsSection({ profile, isOwner }: Props) {
  const removeSkill = useRemoveSkill(profile._id);

  // Flagged skills hidden from all views
  const visibleSkills = profile.skills.filter((s) => s.status !== 'flagged');

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900">Skills</h2>
        {isOwner && (
          <button className="btn-secondary text-xs flex items-center gap-1 py-1 px-2">
            <Plus size={12} /> Add skill
          </button>
        )}
      </div>

      {visibleSkills.length === 0 && (
        <p className="text-sm text-gray-400 italic">No skills added yet.</p>
      )}

      <div className="flex flex-wrap gap-2">
        <AnimatePresence>
          {visibleSkills.map((skill) => {
            const cfg = STATUS_CONFIG[skill.status];
            return (
              <motion.div
                key={skill.skillId}
                layout
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                className={`
                  relative flex items-center gap-1.5 text-xs font-medium
                  border rounded-full px-3 py-1 select-none
                  ${cfg.className}
                `}
              >
                {/* Pulse ring for pending */}
                {cfg.pulse && (
                  <span className="absolute inset-0 rounded-full animate-ping bg-yellow-200 opacity-40 pointer-events-none" />
                )}

                {cfg.icon}
                <span>{skill.skillName || 'Skill'}</span>

                {/* Status badge */}
                <span className="opacity-60 text-[10px]">· {cfg.label}</span>

                {/* Remove button (owner only, non-verified) */}
                {isOwner && (
                  <button
                    onClick={() => removeSkill.mutate(skill.skillId)}
                    disabled={removeSkill.isPending}
                    className="ml-1 hover:text-red-500 transition-colors"
                    aria-label={`Remove ${skill.skillName}`}
                  >
                    <X size={10} />
                  </button>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </section>
  );
}
