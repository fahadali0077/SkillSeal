// ─────────────────────────────────────────────────────────────────────────────
// PostJobModal.tsx  –  recruiter job creation modal
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Loader2, Briefcase } from 'lucide-react';
import { useCreateJob } from './useJobs';
import type { CreateJobInput } from './jobsApi';

const schema = z.object({
  companyId:      z.string().min(1, 'Company ID required'),
  title:          z.string().min(3).max(200),
  description:    z.string().min(50).max(20000),
  employmentType: z.enum(['full-time','part-time','contract','freelance','internship']),
  workType:       z.enum(['remote','hybrid','on-site']),
  location:       z.string().min(1),
  salaryMin:      z.coerce.number().min(0).optional(),
  salaryMax:      z.coerce.number().min(0).optional(),
  currency:       z.string().default('USD'),
  easyApply:      z.boolean().default(true),
  externalUrl:    z.string().url().optional().or(z.literal('')),
  deadline:       z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface SkillRow { skillId: string; tier: string; required: boolean; name: string; }

interface Props { onClose: () => void; }

const TIERS = ['beginner', 'intermediate', 'advanced', 'expert'];

export default function PostJobModal({ onClose }: Props) {
  const [skills, setSkills] = useState<SkillRow[]>([]);
  const createJob = useCreateJob();

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currency: 'USD', easyApply: true, employmentType: 'full-time', workType: 'remote' },
  });

  const addSkill = () => setSkills((s) => [...s, { skillId: '', tier: 'intermediate', required: true, name: '' }]);
  const removeSkill = (i: number) => setSkills((s) => s.filter((_, idx) => idx !== i));
  const updateSkill = (i: number, field: keyof SkillRow, value: string | boolean) =>
    setSkills((s) => s.map((sk, idx) => idx === i ? { ...sk, [field]: value } : sk));

  const onSubmit = async (data: FormValues) => {
    // Explicit mapping (not spread) so TypeScript can verify every required field
    const input: CreateJobInput = {
      companyId:      data.companyId,
      title:          data.title,
      description:    data.description,
      employmentType: data.employmentType,
      workType:       data.workType,
      location:       data.location,
      currency:       data.currency,
      easyApply:      data.easyApply,
      salaryMin:      data.salaryMin ?? 0,
      salaryMax:      data.salaryMax ?? 0,
      externalUrl:    data.externalUrl || undefined,
      deadline:       data.deadline   || undefined,
      // Strip `name` helper field — API only wants skillId/tier/required
      requiredSkills: skills
        .filter((s) => s.skillId)
        .map(({ skillId, tier, required }) => ({ skillId, tier, required })),
    };
    await createJob.mutateAsync(input);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ y: 32, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 32, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
            <h2 className="font-bold text-gray-900 flex items-center gap-2"><Briefcase size={18} className="text-brand" /> Post a Job</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
          </div>

          <form onSubmit={handleSubmit(onSubmit as any)} className="px-6 py-5 space-y-5 flex-1 min-h-0 overflow-y-auto">
            {/* Company + Title */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company ID *</label>
                <input className={`input ${errors.companyId ? 'border-red-400' : ''}`} placeholder="MongoDB ObjectId" {...register('companyId')} />
                {errors.companyId && <p className="text-xs text-red-500 mt-0.5">{errors.companyId.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Title *</label>
                <input className={`input ${errors.title ? 'border-red-400' : ''}`} placeholder="Senior React Engineer" {...register('title')} />
                {errors.title && <p className="text-xs text-red-500 mt-0.5">{errors.title.message}</p>}
              </div>
            </div>

            {/* Type / Work */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employment type</label>
                <select className="input" {...register('employmentType')}>
                  {['full-time','part-time','contract','freelance','internship'].map((t) => <option key={t} value={t} className="capitalize">{t.replace('-',' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Work type</label>
                <select className="input" {...register('workType')}>
                  {['remote','hybrid','on-site'].map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input className="input" placeholder="London, UK" {...register('location')} />
              </div>
            </div>

            {/* Salary */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min salary</label>
                <input type="number" className="input" placeholder="50000" {...register('salaryMin')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max salary</label>
                <input type="number" className="input" placeholder="90000" {...register('salaryMax')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <select className="input" {...register('currency')}>
                  {['USD','GBP','EUR','CAD','AUD'].map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
              <textarea rows={6} className={`input resize-none ${errors.description ? 'border-red-400' : ''}`}
                placeholder="Describe the role, responsibilities, and what you're looking for…" {...register('description')} />
              {errors.description && <p className="text-xs text-red-500 mt-0.5">{errors.description.message}</p>}
            </div>

            {/* Required skills */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Required Skills</label>
                <button type="button" onClick={addSkill} className="text-xs text-brand flex items-center gap-1 hover:text-brand-dark">
                  <Plus size={12} /> Add skill
                </button>
              </div>
              <div className="space-y-2">
                {skills.map((sk, i) => (
                  <div key={i} className="grid grid-cols-4 gap-2 items-center">
                    <input className="input col-span-1 text-sm" placeholder="Skill ID" value={sk.skillId}
                      onChange={(e) => updateSkill(i, 'skillId', e.target.value)} />
                    <select className="input text-sm" value={sk.tier} onChange={(e) => updateSkill(i, 'tier', e.target.value)}>
                      {TIERS.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
                    </select>
                    <label className="flex items-center gap-1 text-sm text-gray-600 col-span-1">
                      <input type="checkbox" checked={sk.required} onChange={(e) => updateSkill(i, 'required', e.target.checked)} />
                      Required
                    </label>
                    <button type="button" onClick={() => removeSkill(i)} className="text-gray-400 hover:text-red-500 justify-self-end">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Options */}
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" {...register('easyApply')} className="accent-brand" />
                Enable Easy Apply
              </label>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deadline (optional)</label>
                <input type="date" className="input text-sm" {...register('deadline')} />
              </div>
            </div>
          </form>

          <div className="px-6 py-4 border-t flex justify-end gap-3">
            <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
            <button onClick={handleSubmit(onSubmit as any)} disabled={createJob.isPending}
              className="btn-primary text-sm flex items-center gap-2">
              {createJob.isPending && <Loader2 size={14} className="animate-spin" />}
              {createJob.isPending ? 'Posting…' : 'Post Job'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
