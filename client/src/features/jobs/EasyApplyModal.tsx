// ─────────────────────────────────────────────────────────────────────────────
// EasyApplyModal.tsx
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, CheckCircle2, Loader2, ShieldCheck, Briefcase, GraduationCap } from 'lucide-react';
import type { IJob } from '@SkillSeal/shared';
import { useApplyToJob } from './useJobs';
import { useAuthStore } from '../auth/useAuth';

interface Props { job: IJob; onClose: () => void; onSuccess: () => void; }

export default function EasyApplyModal({ job, onClose, onSuccess }: Props) {
  const [coverNote, setCoverNote] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const apply = useApplyToJob();
  const user = useAuthStore((s) => s.user);

  const handleSubmit = async () => {
    await apply.mutateAsync({ jobId: job._id, coverNote });
    setSubmitted(true);
    setTimeout(onSuccess, 1800);
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl"
        >
          <CheckCircle2 size={52} className="text-green-500 mx-auto mb-3" />
          <h3 className="font-bold text-xl text-gray-900 mb-1">Application Sent!</h3>
          <p className="text-gray-500 text-sm">Your application for <strong>{job.title}</strong> at {job.company.name} has been submitted.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ y: 32, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 32, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div>
              <h2 className="font-bold text-gray-900">{job.title}</h2>
              <p className="text-sm text-gray-500">{job.company.name}</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* What you're sharing */}
            <div>
              <h3 className="font-semibold text-sm text-gray-700 mb-3">What will be shared with {job.company.name}</h3>

              {/* Profile info */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center font-bold text-brand">
                    {user?.firstName?.[0]}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-gray-900">{user?.firstName} {(user as { lastName?: string })?.lastName}</p>
                    <p className="text-xs text-gray-500">{(user as { headline?: string })?.headline}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-xs text-gray-600">
                  <ShieldCheck size={14} className="text-brand mt-0.5 shrink-0" />
                  <span>Your verified skills and certifications</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-gray-600">
                  <Briefcase size={14} className="text-gray-400 mt-0.5 shrink-0" />
                  <span>Your work experience</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-gray-600">
                  <GraduationCap size={14} className="text-gray-400 mt-0.5 shrink-0" />
                  <span>Your education</span>
                </div>
              </div>
            </div>

            {/* Required skills match */}
            {job.requiredSkills.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm text-gray-700 mb-2">Required skills</h3>
                <div className="flex flex-wrap gap-2">
                  {job.requiredSkills.map((skill) => (
                    <span key={skill.skillId}
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                      {skill.skillName}
                      <span className="text-gray-400">· {skill.tier}</span>
                      {!skill.required && <span className="text-gray-400 text-[10px]">(optional)</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Cover note */}
            <div>
              <label className="block font-semibold text-sm text-gray-700 mb-2">
                Cover note <span className="font-normal text-gray-400">(optional, max 500 chars)</span>
              </label>
              <textarea
                value={coverNote}
                onChange={(e) => setCoverNote(e.target.value.slice(0, 500))}
                placeholder="Why are you a great fit for this role?"
                rows={4}
                className="input resize-none text-sm"
              />
              <p className="text-xs text-gray-400 mt-1 text-right">{coverNote.length}/500</p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t flex gap-3 justify-end shrink-0">
            <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
            <button
              onClick={handleSubmit}
              disabled={apply.isPending}
              className="btn-primary text-sm flex items-center gap-2"
            >
              {apply.isPending ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
              {apply.isPending ? 'Submitting…' : 'Submit Application'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
