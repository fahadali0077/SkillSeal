// ─────────────────────────────────────────────────────────────────────────────
// CertificateAnnouncement.tsx  –  rich card for skill verification posts
// ─────────────────────────────────────────────────────────────────────────────
import { motion } from 'framer-motion';
import { ShieldCheck, Star, ExternalLink, Trophy } from 'lucide-react';
import type { IVerificationBadge } from '@SkillSeal/shared';

const TIER_CONFIG = {
  beginner: { label: 'Beginner', color: 'from-gray-400 to-gray-500', bg: 'bg-gray-50', text: 'text-gray-600' },
  intermediate: { label: 'Intermediate', color: 'from-blue-400 to-blue-600', bg: 'bg-blue-50', text: 'text-blue-700' },
  advanced: { label: 'Advanced', color: 'from-purple-400 to-purple-600', bg: 'bg-purple-50', text: 'text-purple-700' },
  expert: { label: 'Expert', color: 'from-amber-400 to-orange-500', bg: 'bg-amber-50', text: 'text-amber-700' },
};

interface Props {
  badge: IVerificationBadge;
  authorName: string;
}

export default function CertificateAnnouncement({ badge, authorName }: Props) {
  const tier = TIER_CONFIG[badge.tier] ?? TIER_CONFIG.beginner;
  const score = Math.round(badge.compositeScore);
  const stars = Math.min(5, Math.max(1, Math.round(score / 20)));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`mt-3 rounded-2xl border border-blue-100 overflow-hidden ${tier.bg}`}
    >
      {/* Header bar */}
      <div className={`bg-ink-900 px-5 py-3 flex items-center gap-3`}>
        <Trophy size={22} className="text-white shrink-0" />
        <div>
          <p className="text-white font-bold text-sm">{authorName} just got verified!</p>
          <p className="text-ink-300 text-xs">{badge.skillName} · {tier.label}</p>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center`}>
            <ShieldCheck size={28} className={tier.text} />
          </div>
          <div>
            <p className="font-bold text-gray-900">{badge.skillName}</p>
            <div className="flex items-center gap-1 mt-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={13}
                  className={i < stars ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}
                />
              ))}
              <span className="text-xs text-gray-500 ml-1">{score}/100</span>
            </div>
            <span className={`inline-block text-xs font-semibold mt-1 px-2 py-0.5 rounded-sm bg-white ${tier.text}`}>
              {tier.label}
            </span>
          </div>
        </div>

        {badge.certificateUrl && (
          <a
            href={badge.certificateUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-medium text-brand hover:text-brand-dark shrink-0"
          >
            <ExternalLink size={13} />
            Verify
          </a>
        )}
      </div>
    </motion.div>
  );
}
