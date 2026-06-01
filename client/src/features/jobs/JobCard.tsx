// ─────────────────────────────────────────────────────────────────────────────
// JobCard.tsx  –  job preview card
// ─────────────────────────────────────────────────────────────────────────────
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Briefcase, Clock, DollarSign, ShieldCheck, Zap, ExternalLink, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { IJobCard } from '@SkillSeal/shared';

const WORK_COLORS: Record<string, string> = {
  remote: 'bg-green-50 text-green-700 border-green-200',
  hybrid: 'bg-blue-50 text-brand border-blue-200',
  'on-site': 'bg-gray-100 text-gray-600 border-gray-200',
};

interface Props { job: IJobCard; viewerSkillIds?: Set<string>; viewerVerifiedIds?: Set<string>; }

export default function JobCard({ job, viewerSkillIds = new Set(), viewerVerifiedIds = new Set() }: Props) {
  const score = job.matchScore ?? 0;
  const scoreColor = score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-brand' : 'bg-gray-300';
  const scoreText  = score >= 70 ? 'text-green-600' : score >= 40 ? 'text-brand' : 'text-gray-400';
  const scoreLabel = score >= 70 ? 'Excellent match' : score >= 40 ? 'Good match' : 'Possible match';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-5 transition-all duration-200 hover:border-brand/30 hover:-translate-y-0.5"
      style={{ transitionProperty: 'box-shadow, transform, border-color' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          {job.company.logo
            ? <img src={job.company.logo} alt={job.company.name} className="w-11 h-11 rounded-xl object-contain border border-gray-100 bg-white shrink-0" />
            : <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand/15 to-brand/5 flex items-center justify-center text-brand font-bold shrink-0">
                {job.company.name[0]}
              </div>
          }
          <div className="min-w-0">
            <Link to={`/jobs/${job._id}`} className="font-semibold text-gray-900 hover:text-brand transition-colors text-sm sm:text-base block truncate">
              {job.title}
            </Link>
            <p className="text-xs text-gray-500 truncate">{job.company.name}</p>
          </div>
        </div>
        {job.hasApplied && (
          <span className="badge-success shrink-0">
            <CheckCircle2 size={10} /> Applied
          </span>
        )}
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-gray-500 mb-3">
        {job.location && (
          <span className="flex items-center gap-1"><MapPin size={11} />{job.location}</span>
        )}
        <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[11px] font-medium ${WORK_COLORS[job.workType] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
          <Briefcase size={10} />{job.workType}
        </span>
        <span className="flex items-center gap-1 capitalize"><Clock size={11} />{job.employmentType.replace('-', ' ')}</span>
        {(job.salary.min > 0 || job.salary.max > 0) && (
          <span className="flex items-center gap-1 font-medium text-gray-700">
            <DollarSign size={11} />
            {job.salary.min > 0 && `${(job.salary.min / 1000).toFixed(0)}k`}
            {job.salary.max > 0 && `–${(job.salary.max / 1000).toFixed(0)}k`}
            {' '}{job.salary.currency}
          </span>
        )}
        <span className="flex items-center gap-1 text-gray-400 ml-auto">
          {formatDistanceToNow(new Date(job.postedAt), { addSuffix: true })}
        </span>
      </div>

      {/* Match score bar */}
      {job.matchScore !== null && job.matchScore !== undefined && (
        <div className="mb-3 bg-gray-50/60 rounded-lg p-2.5 border border-gray-100">
          <div className="flex justify-between items-center text-xs mb-1.5">
            <span className="text-gray-500 font-medium">{scoreLabel}</span>
            <span className={`font-bold tabular-nums ${scoreText}`}>
              {job.matchScore}%
            </span>
          </div>
          <div className="h-1.5 bg-white rounded-full overflow-hidden shadow-inner">
            <motion.div
              className={`h-full rounded-full ${scoreColor}`}
              initial={{ width: 0 }}
              animate={{ width: `${job.matchScore}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}

      {/* Required skills */}
      {job.requiredSkills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {job.requiredSkills.slice(0, 5).map((skill) => {
            const isVerified = viewerVerifiedIds.has(skill.skillName);
            const hasSkill = viewerSkillIds.has(skill.skillName);
            return (
              <span
                key={skill.skillName}
                className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border
                  ${isVerified ? 'bg-blue-50 text-brand border-blue-200' :
                    hasSkill ? 'bg-green-50 text-green-700 border-green-200' :
                      skill.required ? 'bg-gray-50 text-gray-600 border-gray-200' : 'bg-gray-50 text-gray-400 border-gray-100'}`}
              >
                {isVerified && <ShieldCheck size={9} />}
                {skill.skillName}
                <span className="opacity-60">· {skill.tier}</span>
                {!skill.required && <span className="opacity-50 text-[9px]">opt</span>}
              </span>
            );
          })}
          {job.requiredSkills.length > 5 && (
            <span className="text-[11px] text-gray-400 self-center">+{job.requiredSkills.length - 5} more</span>
          )}
        </div>
      )}

      {/* Footer CTA */}
      <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
        {job.easyApply ? (
          <Link
            to={`/jobs/${job._id}`}
            className="inline-flex items-center gap-1.5 bg-brand text-white font-semibold text-xs px-3 py-2 rounded-lg hover:bg-brand-dark active:scale-[0.98] transition-all"
            style={{ boxShadow: '0 1px 2px rgba(37,99,235,0.2)' }}
          >
            <Zap size={12} /> Easy Apply
          </Link>
        ) : (
          <a
            href={`/jobs/${job._id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 border border-gray-200 bg-white text-gray-700 font-medium text-xs px-3 py-2 rounded-lg hover:bg-gray-50 hover:border-gray-300 active:scale-[0.98] transition-all"
          >
            <ExternalLink size={12} /> View job
          </a>
        )}
        <Link to={`/jobs/${job._id}`} className="text-xs text-gray-500 hover:text-brand ml-auto font-medium transition-colors">
          View details →
        </Link>
      </div>
    </motion.div>
  );
}
