// ─────────────────────────────────────────────────────────────────────────────
// JobDetailPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Briefcase, DollarSign, Calendar, ShieldCheck, Clock, Zap, ExternalLink, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useJobDetail } from './useJobs';
import EasyApplyModal from './EasyApplyModal';
import { useIsAuthenticated } from '../auth/useAuth';

const TIER_COLORS: Record<string, string> = {
  beginner:     'bg-gray-50 text-gray-600 border-gray-200',
  intermediate: 'bg-blue-50 text-blue-700 border-blue-200',
  advanced:     'bg-purple-50 text-purple-700 border-purple-200',
  expert:       'bg-amber-50 text-amber-700 border-amber-200',
};

export default function JobDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { data: job, isLoading } = useJobDetail(id);
  const [applyOpen, setApplyOpen] = useState(false);
  const isAuth = useIsAuthenticated();

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-gray-300" /></div>;
  }
  if (!job) {
    return <div className="max-w-3xl mx-auto px-4 py-10 text-center text-gray-400">Job not found.</div>;
  }

  return (
    <>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Link to="/jobs" className="flex items-center gap-2 text-sm text-gray-500 hover:text-brand mb-5">
          <ArrowLeft size={15} /> Back to jobs
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-5">
            {/* Title card */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
              <div className="flex items-start gap-4">
                {job.company.logo
                  ? <img src={job.company.logo} alt={job.company.name} className="w-16 h-16 rounded-xl object-contain border border-gray-100 shrink-0" />
                  : <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 font-bold text-xl shrink-0">{job.company.name[0]}</div>
                }
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
                  <p className="text-brand font-medium mt-0.5">{job.company.name}</p>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
                    {job.location && <span className="flex items-center gap-1"><MapPin size={13} />{job.location}</span>}
                    <span className="flex items-center gap-1 capitalize"><Briefcase size={13} />{job.workType}</span>
                    <span className="flex items-center gap-1 capitalize"><Clock size={13} />{job.employmentType.replace('-',' ')}</span>
                    {(job.salary.min > 0 || job.salary.max > 0) && (
                      <span className="flex items-center gap-1">
                        <DollarSign size={13} />
                        {job.salary.min > 0 && `$${(job.salary.min/1000).toFixed(0)}k`}
                        {job.salary.max > 0 && ` – $${(job.salary.max/1000).toFixed(0)}k`}
                        {' '}{job.salary.currency}
                      </span>
                    )}
                    {job.deadline && (
                      <span className="flex items-center gap-1 text-orange-500">
                        <Calendar size={13} />Deadline: {new Date(job.deadline).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Apply CTA */}
              <div className="flex gap-3 mt-5 pt-5 border-t">
                {job.hasApplied ? (
                  <span className="text-sm font-medium text-green-700 bg-green-50 border border-green-200 px-4 py-2 rounded-xl">✓ Applied</span>
                ) : job.easyApply ? (
                  <button onClick={() => isAuth ? setApplyOpen(true) : null} className="btn-primary flex items-center gap-2">
                    <Zap size={15} /> Easy Apply
                  </button>
                ) : (
                  <a href={job.externalUrl} target="_blank" rel="noopener noreferrer" className="btn-primary flex items-center gap-2">
                    <ExternalLink size={15} /> Apply on company site
                  </a>
                )}
                <span className="text-xs text-gray-400 self-center">
                  {formatDistanceToNow(new Date(job.postedAt), { addSuffix: true })}
                </span>
              </div>
            </motion.div>

            {/* Description */}
            <div className="card p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Job Description</h2>
              <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{job.description}</div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Match score */}
            {job.matchScore !== null && (
              <div className="card p-5">
                <h3 className="font-semibold text-sm text-gray-700 mb-3">Your match</h3>
                <div className="text-3xl font-bold text-brand mb-1">{job.matchScore}%</div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${(job.matchScore ?? 0) >= 70 ? 'bg-green-500' : (job.matchScore ?? 0) >= 40 ? 'bg-brand' : 'bg-gray-300'}`}
                    initial={{ width: 0 }} animate={{ width: `${job.matchScore}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
              </div>
            )}

            {/* Required skills */}
            <div className="card p-5">
              <h3 className="font-semibold text-sm text-gray-700 mb-3">Required Skills</h3>
              <div className="space-y-2">
                {job.requiredSkills.map((skill) => (
                  <div key={skill.skillId} className={`flex items-center justify-between p-2.5 rounded-xl border ${TIER_COLORS[skill.tier] ?? 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={14} className="shrink-0" />
                      <span className="text-sm font-medium">{skill.skillName}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs capitalize">{skill.tier}</span>
                      {!skill.required && <span className="text-xs opacity-50">(opt)</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {applyOpen && job && (
        <EasyApplyModal job={job} onClose={() => setApplyOpen(false)} onSuccess={() => setApplyOpen(false)} />
      )}
    </>
  );
}
