import { useSEO } from '../../lib/useSEO';
// ─────────────────────────────────────────────────────────────────────────────
// JobDetailPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Briefcase, DollarSign, Calendar, ShieldCheck, Clock, Zap, ExternalLink, CheckCircle2, Target, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useJobDetail } from './useJobs';
import EasyApplyModal from './EasyApplyModal';
import { useIsAuthenticated } from '../auth/useAuth';

const TIER_COLORS: Record<string, string> = {
  beginner:     'bg-gray-50 text-gray-700 border-gray-200',
  intermediate: 'bg-blue-50 text-blue-700 border-blue-200',
  advanced:     'bg-purple-50 text-purple-700 border-purple-200',
  expert:       'bg-amber-50 text-amber-700 border-amber-200',
};

export default function JobDetailPage() {
  useSEO({ title: 'Job Details', canonical: '/jobs' });
  const { id = '' } = useParams<{ id: string }>();
  const { data: job, isLoading } = useJobDetail(id);
  const [applyOpen, setApplyOpen] = useState(false);
  const isAuth = useIsAuthenticated();

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="skeleton h-6 w-28 rounded mb-5" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <div className="card p-6">
              <div className="flex items-start gap-4">
                <div className="skeleton w-16 h-16 rounded-xl shrink-0" />
                <div className="flex-1 space-y-3">
                  <div className="skeleton h-5 w-2/3 rounded" />
                  <div className="skeleton h-3 w-32 rounded" />
                  <div className="flex gap-2">
                    <div className="skeleton h-3 w-20 rounded" />
                    <div className="skeleton h-3 w-24 rounded" />
                    <div className="skeleton h-3 w-16 rounded" />
                  </div>
                </div>
              </div>
            </div>
            <div className="card p-6 space-y-3">
              <div className="skeleton h-4 w-32 rounded" />
              <div className="skeleton h-3 w-full rounded" />
              <div className="skeleton h-3 w-11/12 rounded" />
              <div className="skeleton h-3 w-4/5 rounded" />
            </div>
          </div>
          <div className="space-y-5">
            <div className="card p-5 space-y-2">
              <div className="skeleton h-3 w-20 rounded" />
              <div className="skeleton h-7 w-16 rounded" />
              <div className="skeleton h-2 w-full rounded-full" />
            </div>
            <div className="card p-5 space-y-3">
              <div className="skeleton h-3 w-24 rounded" />
              <div className="skeleton h-9 w-full rounded-xl" />
              <div className="skeleton h-9 w-full rounded-xl" />
              <div className="skeleton h-9 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (!job) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gray-100 flex items-center justify-center">
          <Briefcase size={28} className="text-gray-400" />
        </div>
        <p className="font-bold text-gray-900 mb-1">Job not found</p>
        <p className="text-sm text-gray-500 mb-5">It may have been removed or expired.</p>
        <Link to="/jobs" className="btn-primary text-sm inline-flex">
          <ArrowLeft size={14} /> Back to jobs
        </Link>
      </div>
    );
  }

  const score = job.matchScore ?? 0;
  const scoreColor = score >= 70 ? 'text-green-600' : score >= 40 ? 'text-brand' : 'text-gray-400';
  const scoreBar = score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-brand' : 'bg-gray-300';
  const scoreLabel = score >= 70 ? 'Excellent match' : score >= 40 ? 'Good match' : 'Possible match';

  return (
    <>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Link to="/jobs" className="btn-ghost text-sm mb-4 -ml-2">
          <ArrowLeft size={14} /> Back to jobs
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-5">

            {/* Hero title card */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden">
              {/* Top color stripe */}
              <div className="h-1 bg-gradient-to-r from-brand via-brand-light to-indigo-500" />

              <div className="p-6">
                <div className="flex items-start gap-4">
                  {job.company.logo
                    ? <img src={job.company.logo} alt={job.company.name} className="w-16 h-16 rounded-xl object-contain border border-gray-100 bg-white shrink-0" />
                    : <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-brand/15 to-brand/5 flex items-center justify-center text-brand font-bold text-xl shrink-0">{job.company.name[0]}</div>
                  }
                  <div className="flex-1 min-w-0">
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{job.title}</h1>
                    <Link to={`/company/${job.company._id ?? ''}`} className="text-brand font-semibold mt-0.5 inline-block hover:text-brand-dark transition-colors">
                      {job.company.name}
                    </Link>

                    <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-3 text-sm text-gray-500">
                      {job.location && (
                        <span className="flex items-center gap-1.5"><MapPin size={13} className="text-gray-400" />{job.location}</span>
                      )}
                      <span className="flex items-center gap-1.5 capitalize"><Briefcase size={13} className="text-gray-400" />{job.workType}</span>
                      <span className="flex items-center gap-1.5 capitalize"><Clock size={13} className="text-gray-400" />{job.employmentType.replace('-',' ')}</span>
                      {(job.salary.min > 0 || job.salary.max > 0) && (
                        <span className="flex items-center gap-1.5 font-semibold text-gray-700">
                          <DollarSign size={13} className="text-green-500" />
                          {job.salary.min > 0 && `$${(job.salary.min/1000).toFixed(0)}k`}
                          {job.salary.max > 0 && ` – $${(job.salary.max/1000).toFixed(0)}k`}
                          <span className="font-normal text-gray-500"> {job.salary.currency}</span>
                        </span>
                      )}
                      {job.deadline && (
                        <span className="flex items-center gap-1.5 text-orange-600 font-medium">
                          <Calendar size={13} />Deadline: {new Date(job.deadline).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Apply CTA */}
                <div className="flex flex-wrap gap-3 mt-5 pt-5 border-t border-gray-100 items-center">
                  {job.hasApplied ? (
                    <span className="badge-success py-2 px-3">
                      <CheckCircle2 size={13} /> Applied
                    </span>
                  ) : job.easyApply ? (
                    <button onClick={() => isAuth ? setApplyOpen(true) : null} className="btn-primary">
                      <Zap size={15} /> Easy Apply
                    </button>
                  ) : (
                    <a href={job.externalUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">
                      <ExternalLink size={15} /> Apply on company site
                    </a>
                  )}
                  <span className="text-xs text-gray-400 flex items-center gap-1.5 ml-auto">
                    <Clock size={11} />
                    Posted {formatDistanceToNow(new Date(job.postedAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Description */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card p-6">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center">
                  <Briefcase size={15} className="text-brand" />
                </div>
                <h2 className="font-semibold text-gray-900">Job description</h2>
              </div>
              <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{job.description}</div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">

            {/* Match score */}
            {job.matchScore !== null && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-5">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                    <Target size={15} className="text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm">Your match</h3>
                </div>
                <div className="flex items-end gap-2 mb-2">
                  <div className={`text-4xl font-extrabold tabular-nums ${scoreColor}`}>{job.matchScore}</div>
                  <div className="text-lg text-gray-400 font-medium pb-1">%</div>
                </div>
                <p className="text-xs text-gray-500 font-medium mb-3">{scoreLabel}</p>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                  <motion.div
                    className={`h-full rounded-full ${scoreBar}`}
                    initial={{ width: 0 }} animate={{ width: `${job.matchScore}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
              </motion.div>
            )}

            {/* Required skills */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card p-5">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center">
                  <ShieldCheck size={15} className="text-brand" />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">Required skills</h3>
              </div>
              <div className="space-y-2">
                {job.requiredSkills.map((skill) => (
                  <div key={skill.skillId} className={`flex items-center justify-between p-2.5 rounded-xl border ${TIER_COLORS[skill.tier] ?? 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <ShieldCheck size={13} className="shrink-0" />
                      <span className="text-sm font-medium truncate">{skill.skillName}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[11px] font-semibold capitalize">{skill.tier}</span>
                      {!skill.required && <span className="text-[10px] opacity-60">opt</span>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Subtle hint */}
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-1.5 text-[11px] text-gray-500">
                <Sparkles size={11} className="text-amber-500" />
                Verify these skills to stand out
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {applyOpen && job && (
        <EasyApplyModal job={job} onClose={() => setApplyOpen(false)} onSuccess={() => setApplyOpen(false)} />
      )}
    </>
  );
}
