import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Share2, ArrowUpRight } from 'lucide-react';
import toast from 'react-hot-toast';
import type { IUserPublic, ISkillEntry } from '@SkillSeal/shared';
import SealMark from '../../components/SealMark';
import { enterAt } from '../../lib/motion';

// A credential is a record, not a badge: it carries an ID, an issue date, an
// expiry, a score and an integrity reading. Anything the API supplies is
// printed; anything it doesn't is simply left off the row.
type Credential = ISkillEntry & {
  tier?: string;
  score?: number;
  issuedAt?: string;
  expiresAt?: string;
  integrity?: 'clean' | 'flagged';
};

const EXPIRING_DAYS = 30;

function fmtDate(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function daysUntil(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return null;
  return Math.ceil((d - Date.now()) / 86_400_000);
}

/** SKL-2F91-A7C4-0Q — a credential you can read down a phone line. */
function credentialId(raw: string | null) {
  if (!raw) return null;
  const hex = raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (hex.length < 10) return `SKL-${hex}`;
  return `SKL-${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 10)}`;
}

export default function CertificationsSection({ profile }: { profile: IUserPublic }) {
  const sealed = (profile.skills as Credential[]).filter(
    s => s.status === 'verified' && s.verificationId,
  );

  if (sealed.length === 0) return null;

  const shareUrl = (skillName: string) =>
    `${window.location.origin}/verify/${profile._id}?skill=${encodeURIComponent(skillName)}`;

  const handleShare = async (skillName: string) => {
    try {
      await navigator.clipboard.writeText(shareUrl(skillName));
      toast.success('Verification link copied');
    } catch {
      toast.error('Could not copy the link');
    }
  };

  const expiringCount = sealed.filter(s => {
    const d = daysUntil(s.expiresAt);
    return d !== null && d <= EXPIRING_DAYS && d >= 0;
  }).length;

  return (
    <section className="card overflow-hidden">
      <header className="flex items-end justify-between gap-4 px-5 pt-5 pb-4 border-b border-paper-line">
        <div>
          <h2 className="font-display text-[22px] leading-none text-ink-900">Sealed credentials</h2>
          <p className="label mt-2">
            {sealed.length} active{expiringCount > 0 && ` · ${expiringCount} expiring`}
          </p>
        </div>
        <Link to="/assessment" className="text-sm font-semibold text-seal-600 hover:text-seal-700 whitespace-nowrap">
          Verify another →
        </Link>
      </header>

      <ul className="divide-y divide-paper-line">
        {sealed.map((skill, i) => {
          const id = credentialId(skill.verificationId);
          const issued = fmtDate(skill.issuedAt ?? skill.addedAt);
          const expires = fmtDate(skill.expiresAt);
          const left = daysUntil(skill.expiresAt);
          const expiringSoon = left !== null && left <= EXPIRING_DAYS && left >= 0;

          return (
            <motion.li key={skill.skillId} {...enterAt(i)} className="px-5 py-4">
              <div className="flex items-start gap-4">
                <SealMark size={28} tone={expiringSoon ? 'ink' : 'seal'} className="mt-0.5 shrink-0" />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                    <h3 className="font-display text-[19px] leading-none text-ink-900">{skill.skillName}</h3>
                    {skill.tier && (
                      <span className="text-sm font-semibold text-ink-500 capitalize">{skill.tier}</span>
                    )}
                    {expiringSoon && (
                      <span className="badge-warning">Expires in {left} days</span>
                    )}
                  </div>

                  <p className="credential-id mt-2 truncate">
                    {id}
                    {issued && <> · issued {issued}</>}
                    {expires && <> · valid to {expires}</>}
                  </p>
                </div>

                {/* Score is the measured part of the record, so it is mono. */}
                {typeof skill.score === 'number' && (
                  <div className="shrink-0 text-right pl-2">
                    <span className="font-mono text-2xl leading-none text-ink-900 tabular-nums">{skill.score}</span>
                    <span className="font-mono text-xs text-ink-400">/100</span>
                    {skill.integrity && (
                      <p className={`label mt-1.5 ${skill.integrity === 'clean' ? 'text-pass' : 'text-warn'}`}>
                        Integrity {skill.integrity}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 mt-3 pl-[44px]">
                <a
                  href={shareUrl(skill.skillName)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-ink-700 hover:text-ink-900"
                >
                  Verify <ArrowUpRight size={13} />
                </a>
                <button
                  onClick={() => handleShare(skill.skillName)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500 hover:text-ink-900"
                >
                  <Share2 size={13} /> Copy link
                </button>
                {expiringSoon && (
                  <Link to="/assessment" className="text-xs font-semibold text-ink-700 hover:text-ink-900 ml-auto">
                    Renew
                  </Link>
                )}
              </div>
            </motion.li>
          );
        })}
      </ul>

      <footer className="px-5 py-3.5 bg-paper-sunk border-t border-paper-line">
        <p className="text-xs text-ink-500">
          Anyone with the link can confirm these credentials without an account.
        </p>
      </footer>
    </section>
  );
}
