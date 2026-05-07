// ─────────────────────────────────────────────────────────────────────────────
// JobCard.tsx  –  job preview card
// ─────────────────────────────────────────────────────────────────────────────
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Briefcase, Clock, DollarSign, ShieldCheck, Zap, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { IJobCard } from '@SkillSeal/shared';

const WORK_COLORS: Record<string, string> = {
  remote: 'bg-green-50 text-green-700',
  hybrid: 'bg-blue-50 text-brand',
  'on-site': 'bg-gray-100 text-gray-600',
};

interface Props { job: IJobCard; viewerSkillIds?: Set<string>; viewerVerifiedIds?: Set<string>; }

export default function JobCard({ job, viewerSkillIds = new Set(), viewerVerifiedIds = new Set() }: Props) {
  const scoreColor = (job.matchScore ?? 0) >= 70 ? 'bg-green-500' : (job.matchScore ?? 0) >= 40 ? 'bg-brand' : 'bg-gray-300';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-5 hover:shadow-md transition-shadow"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          {job.company.logo
            ? <img src={job.company.logo} alt={job.company.name} className="w-10 h-10 rounded-lg object-contain border border-gray-100" />
            : <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 font-bold text-sm">{job.company.name[0]}</div>
          }
          <div>
            <Link to={`/jobs/${job._id}`} className="font-semibold text-gray-900 hover:text-brand transition-colors text-sm">
              {job.title}
            </Link>
            <p className="text-xs text-gray-500">{job.company.name}</p>
          </div>
        </div>
        {job.hasApplied && (
          <span className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full shrink-0">Applied</span>
        )}
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-3">
        {job.location && (
          <span className="flex items-center gap-1"><MapPin size={11} />{job.location}</span>
        )}
        <span className="flex items-center gap-1">
          <Briefcase size={11} />
          <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${WORK_COLORS[job.workType] ?? 'bg-gray-100 text-gray-600'}`}>
            {job.workType}
          </span>
        </span>
        <span className="flex items-center gap-1 capitalize"><Clock size={11} />{job.employmentType.replace('-', ' ')}</span>
        {(job.salary.min > 0 || job.salary.max > 0) && (
          <span className="flex items-center gap-1">
            <DollarSign size={11} />
            {job.salary.min > 0 && `${(job.salary.min / 1000).toFixed(0)}k`}
            {job.salary.max > 0 && `–${(job.salary.max / 1000).toFixed(0)}k`}
            {' '}{job.salary.currency}
          </span>
        )}
        <span className="flex items-center gap-1 text-gray-400">
          {formatDistanceToNow(new Date(job.postedAt), { addSuffix: true })}
        </span>
      </div>

      {/* Match score bar */}
      {job.matchScore !== null && job.matchScore !== undefined && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Match score</span>
            <span className={`font-medium ${(job.matchScore ?? 0) >= 70 ? 'text-green-600' : (job.matchScore ?? 0) >= 40 ? 'text-brand' : 'text-gray-400'}`}>
              {job.matchScore}%
            </span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
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
            <span className="text-[11px] text-gray-400">+{job.requiredSkills.length - 5} more</span>
          )}
        </div>
      )}

      {/* Footer CTA */}
      <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
        {job.easyApply ? (
          <Link
            to={`/jobs/${job._id}`}
            className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
          >
            <Zap size={12} /> Easy Apply
          </Link>
        ) : (
          <a
            href={`/jobs/${job._id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
          >
            <ExternalLink size={12} /> View job
          </a>
        )}
        <Link to={`/jobs/${job._id}`} className="text-xs text-gray-400 hover:text-brand ml-auto">
          View details →
        </Link>
      </div>
    </motion.div>
  );
}
