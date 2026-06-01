import { motion } from 'framer-motion';
import { ShieldCheck, Share2, ExternalLink, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';
import type { IUserPublic } from '@SkillSeal/shared';

const TIER_COLOR: Record<string, string> = {
  beginner: 'bg-gray-100 text-gray-700',
  intermediate: 'bg-blue-50 text-blue-700',
  advanced: 'bg-purple-50 text-purple-700',
  expert: 'bg-amber-50 text-amber-700',
};

export default function CertificationsSection({ profile }: { profile: IUserPublic }) {
  const verified = profile.skills.filter((s) => s.status === 'verified' && s.verificationId);

  if (verified.length === 0) return null;

  const shareUrl = (skillName: string) =>
    `${window.location.origin}/verify/${profile._id}?skill=${encodeURIComponent(skillName)}`;

  const handleShare = async (skillName: string) => {
    const url = shareUrl(skillName);
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Verification link copied!');
    } catch {
      toast.error('Could not copy link');
    }
  };

  return (
    <section className="card p-5">
      <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
        <Trophy size={16} className="text-amber-500" /> Verified Skills
      </h2>

      <div className="grid gap-3 sm:grid-cols-2">
        {verified.map((skill, i) => (
          <motion.div
            key={skill.skillId}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="border border-blue-100 rounded-xl p-4 bg-gradient-to-br from-blue-50 to-white"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-brand shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-gray-900">{skill.skillName}</p>
                  <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mt-0.5 ${TIER_COLOR['intermediate']}`}>
                    Verified
                  </span>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleShare(skill.skillName)}
                  className="p-1.5 rounded-lg hover:bg-blue-100 text-gray-400 hover:text-brand transition-colors"
                  aria-label="Share verification"
                >
                  <Share2 size={14} />
                </button>
                <a
                  href={shareUrl(skill.skillName)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg hover:bg-blue-100 text-gray-400 hover:text-brand transition-colors"
                  aria-label="Open verification"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
