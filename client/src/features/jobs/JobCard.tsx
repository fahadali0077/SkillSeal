// ─────────────────────────────────────────────────────────────────────────────
// JobCard.tsx – a role, audited against the seals you actually hold.
// The old percentage bar guessed at fit; this states which requirements are
// met, which aren't, and what you'd have to sit to qualify.
// ─────────────────────────────────────────────────────────────────────────────
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { IJobCard } from '@SkillSeal/shared';
import SealMark from '../../components/SealMark';
import { enter } from '../../lib/motion';

interface Props { job: IJobCard; viewerSkillIds?: Set<string>; viewerVerifiedIds?: Set<string>; }

export default function JobCard({ job, viewerSkillIds = new Set(), viewerVerifiedIds = new Set() }: Props) {
  const required = job.requiredSkills.filter(s => s.required);
  const optional = job.requiredSkills.filter(s => !s.required);
  const held = required.filter(s => viewerVerifiedIds.has(s.skillName));
  const missing = required.filter(s => !viewerVerifiedIds.has(s.skillName));
  const allHeld = required.length > 0 && missing.length === 0;

  const salary = (job.salary.min > 0 || job.salary.max > 0)
    ? `${job.salary.min > 0 ? `${(job.salary.min / 1000).toFixed(0)}k` : ''}${job.salary.max > 0 ? `–${(job.salary.max / 1000).toFixed(0)}k` : ''} ${job.salary.currency}`
    : null;

  // Don't print the work type twice when the location already says it
  // ("Remote (EU) · Remote" was the old behaviour).
  const loc = job.location ?? '';
  const workType = loc.toLowerCase().includes(job.workType.toLowerCase()) ? null : job.workType;
  const cap = (v: string) => v.charAt(0).toUpperCase() + v.slice(1);

  const meta = [
    job.company.name,
    loc || null,
    workType && cap(workType),
    cap(job.employmentType.replace('-', ' ')),
    salary,
  ].filter(Boolean).join(' · ');

  return (
    <motion.div {...enter} layout className="card-hover p-5">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3.5">
        {job.company.logo
          ? <img src={job.company.logo} alt={job.company.name} className="w-11 h-11 rounded object-contain border border-paper-line bg-paper-card shrink-0" />
          : <div className="w-11 h-11 rounded bg-ink-800 text-paper flex items-center justify-center font-display text-lg shrink-0">
              {job.company.name[0]}
            </div>
        }

        <div className="min-w-0 flex-1">
          <Link to={`/jobs/${job._id}`} className="font-display text-[19px] leading-tight text-ink-900 hover:text-seal-700 block truncate">
            {job.title}
          </Link>
          <p className="text-xs text-ink-500 mt-1 truncate">{meta}</p>
        </div>

        {job.hasApplied && (
          <span className="badge-success shrink-0">
            <CheckCircle2 size={11} /> Applied
          </span>
        )}
      </div>

      {/* ── The audit ──────────────────────────────────────────────────── */}
      {required.length > 0 && (
        <div className="mt-4 border-t border-paper-line pt-3.5">
          <div className="flex items-baseline justify-between gap-3 mb-2.5">
            <p className={`font-mono text-[11px] font-medium tracking-[0.08em] uppercase tabular-nums ${allHeld ? 'text-pass' : 'text-ink-500'}`}>
              {held.length} of {required.length} seals held
            </p>
            <span className="font-mono text-[10px] tracking-[0.06em] text-ink-400">
              posted {formatDistanceToNow(new Date(job.postedAt))} ago
            </span>
          </div>

          <ul className="space-y-1.5">
            {required.map(skill => {
              const isSealed = viewerVerifiedIds.has(skill.skillName);
              const claimed = !isSealed && viewerSkillIds.has(skill.skillName);
              return (
                <li key={skill.skillName} className="flex items-center gap-2 text-sm">
                  {isSealed
                    ? <SealMark size={14} tone="seal" className="shrink-0" />
                    : <span className="w-3.5 h-3.5 rounded-full border border-dashed border-paper-rule shrink-0" />}
                  <span className={isSealed ? 'text-ink-900' : 'text-ink-500'}>{skill.skillName}</span>
                  <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-ink-400">{skill.tier}</span>
                  {!isSealed && (
                    <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-ink-400 ml-auto">
                      {claimed ? 'unsealed' : 'not held'}
                    </span>
                  )}
                </li>
              );
            })}

            {optional.slice(0, 2).map(skill => (
              <li key={skill.skillName} className="flex items-center gap-2 text-sm text-ink-400">
                <span className="w-3.5 h-3.5 shrink-0" />
                <span>{skill.skillName}</span>
                <span className="font-mono text-[10px] tracking-[0.08em] uppercase">optional</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Action ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 pt-4 mt-4 border-t border-paper-line">
        {allHeld && job.easyApply ? (
          <Link to={`/jobs/${job._id}`} className="btn-seal py-2 px-3.5">
            Apply with seals
          </Link>
        ) : missing.length > 0 ? (
          <Link to="/assessment" className="btn-quiet py-2 px-3.5">
            Verify {missing[0]!.skillName} to qualify
          </Link>
        ) : (
          <Link to={`/jobs/${job._id}`} className="btn-quiet py-2 px-3.5">
            Apply
          </Link>
        )}

        <Link to={`/jobs/${job._id}`} className="text-sm font-semibold text-ink-500 hover:text-ink-900 ml-auto">
          View details →
        </Link>
      </div>
    </motion.div>
  );
}
