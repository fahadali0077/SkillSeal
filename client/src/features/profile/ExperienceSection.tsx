import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import type { IUserPublic, IExperience, EmploymentTypeValue } from '@SkillSeal/shared';
import { useAddExperience, useUpdateExperience, useDeleteExperience } from './useProfile';

const expSchema = z.object({
  title: z.string().min(1, 'Title required'),
  company: z.string().min(1, 'Company required'),
  employmentType: z.enum(['full-time', 'part-time', 'contract', 'freelance', 'internship', 'volunteer', 'other']),
  location: z.string().optional(),
  description: z.string().max(2000).optional(),
  startMonth: z.coerce.number().min(1).max(12),
  startYear: z.coerce.number().min(1950).max(new Date().getFullYear()),
  isCurrent: z.boolean().default(false),
  endMonth: z.coerce.number().min(1).max(12).optional(),
  endYear: z.coerce.number().min(1950).optional(),
});
type ExpForm = z.infer<typeof expSchema>;

function formatDate(d: { month: number; year: number } | undefined) {
  if (!d) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[(d.month ?? 1) - 1]} ${d.year}`;
}

interface FormProps { userId: string; entry?: IExperience; onDone: () => void; }

function ExpForm({ userId, entry, onDone }: FormProps) {
  const add = useAddExperience(userId);
  const update = useUpdateExperience(userId);
  const { register, handleSubmit, watch, formState: { errors } } = useForm<ExpForm>({
    resolver: zodResolver(expSchema),
    defaultValues: entry ? {
      title: entry.title, company: entry.company,
      employmentType: entry.employmentType,
      location: entry.location, description: entry.description,
      startMonth: entry.startDate?.month, startYear: entry.startDate?.year,
      isCurrent: entry.endDate?.isCurrent ?? false,
      endMonth: entry.endDate?.month, endYear: entry.endDate?.year,
    } : { employmentType: 'full-time', isCurrent: false },
  });
  const isCurrent = watch('isCurrent');

  const onSubmit = async (data: ExpForm) => {
    const payload: Omit<IExperience, '_id'> = {
      title: data.title, company: data.company,
      companyId: null,
      employmentType: data.employmentType as EmploymentTypeValue,
      location: data.location ?? '',
      description: data.description ?? '',
      skillsUsed: [],
      startDate: { month: data.startMonth, year: data.startYear },
      endDate: { month: data.endMonth ?? 0, year: data.endYear ?? 0, isCurrent: data.isCurrent },
    };
    if (entry) await update.mutateAsync({ expId: entry._id, patch: payload });
    else await add.mutateAsync(payload);
    onDone();
  };

  const isPending = add.isPending || update.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-3 mt-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <input placeholder="Title *" className={`input ${errors.title ? 'border-red-400' : ''}`} {...register('title')} />
          {errors.title && <p className="text-xs text-red-500 mt-0.5">{errors.title.message}</p>}
        </div>
        <div>
          <input placeholder="Company *" className={`input ${errors.company ? 'border-red-400' : ''}`} {...register('company')} />
          {errors.company && <p className="text-xs text-red-500 mt-0.5">{errors.company.message}</p>}
        </div>
      </div>
      <select className="input" {...register('employmentType')}>
        {(['full-time', 'part-time', 'contract', 'freelance', 'internship', 'volunteer', 'other'] as const).map(t => (
          <option key={t} value={t}>{t.replace('-', ' ')}</option>
        ))}
      </select>
      <input placeholder="Location" className="input" {...register('location')} />
      <div className="grid grid-cols-2 gap-3">
        <div className="flex gap-2">
          <input type="number" placeholder="Start month" className="input w-1/2" {...register('startMonth')} />
          <input type="number" placeholder="Year" className="input w-1/2" {...register('startYear')} />
        </div>
        <div className="flex gap-2 items-center">
          <label className="flex items-center gap-1 text-sm text-gray-600 whitespace-nowrap">
            <input type="checkbox" {...register('isCurrent')} /> Current
          </label>
          {!isCurrent && (
            <>
              <input type="number" placeholder="End month" className="input w-1/2" {...register('endMonth')} />
              <input type="number" placeholder="Year" className="input w-1/2" {...register('endYear')} />
            </>
          )}
        </div>
      </div>
      <textarea placeholder="Description" rows={3} className="input resize-none" {...register('description')} />
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onDone} className="btn-secondary text-sm py-1.5 px-3">Cancel</button>
        <button type="submit" disabled={isPending} className="btn-primary text-sm py-1.5 px-3 flex items-center gap-1">
          {isPending && <Loader2 size={12} className="animate-spin" />}
          {entry ? 'Update' : 'Add'}
        </button>
      </div>
    </form>
  );
}

export default function ExperienceSection({ profile, isOwner }: { profile: IUserPublic; isOwner: boolean }) {
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const deleteExp = useDeleteExperience(profile._id);

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Briefcase size={16} /> Experience</h2>
        {isOwner && !addOpen && (
          <button onClick={() => setAddOpen(true)} className="btn-secondary text-xs py-1 px-2 flex items-center gap-1">
            <Plus size={12} /> Add
          </button>
        )}
      </div>

      <AnimatePresence>
        {addOpen && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <ExpForm userId={profile._id} onDone={() => setAddOpen(false)} />
            <hr className="my-4" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-5">
        {profile.experience.length === 0 && <p className="text-sm text-gray-400 italic">No experience added.</p>}
        {profile.experience.map((exp) => (
          <motion.div key={exp._id} layout className="relative">
            {editId === exp._id ? (
              <ExpForm userId={profile._id} entry={exp} onDone={() => setEditId(null)} />
            ) : (
              <div className="flex gap-3">
                <div className="mt-1 w-9 h-9 rounded-md bg-gray-100 flex items-center justify-center shrink-0">
                  <Briefcase size={16} className="text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm">{exp.title}</p>
                  <p className="text-sm text-gray-600">{exp.company} · {exp.employmentType}</p>
                  <p className="text-xs text-gray-400">
                    {formatDate(exp.startDate)} – {exp.endDate?.isCurrent ? 'Present' : formatDate(exp.endDate)}
                    {exp.location && ` · ${exp.location}`}
                  </p>
                  {exp.description && <p className="text-sm text-gray-600 mt-1 line-clamp-3">{exp.description}</p>}
                </div>
                {isOwner && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => setEditId(exp._id)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => deleteExp.mutate(exp._id)} disabled={deleteExp.isPending} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </section>
  );
}
