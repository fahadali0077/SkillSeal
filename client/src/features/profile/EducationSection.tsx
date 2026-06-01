import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import type { IUserPublic, IEducation } from '@SkillSeal/shared';
import { useAddEducation, useUpdateEducation, useDeleteEducation } from './useProfile';

const eduSchema = z.object({
  institution: z.string().min(1, 'Institution required'),
  degree: z.string().min(1, 'Degree required'),
  field: z.string().min(1, 'Field required'),
  startYear: z.coerce.number().min(1950).max(new Date().getFullYear()),
  endYear: z.coerce.number().min(1950).optional(),
  inProgress: z.boolean().default(false),
  grade: z.string().optional(),
  description: z.string().max(1000).optional(),
});
type EduForm = z.infer<typeof eduSchema>;

interface FormProps { userId: string; entry?: IEducation; onDone: () => void; }

function EduForm({ userId, entry, onDone }: FormProps) {
  const add = useAddEducation(userId);
  const update = useUpdateEducation(userId);
  const { register, handleSubmit, watch, formState: { errors } } = useForm<EduForm>({
    resolver: zodResolver(eduSchema),
    defaultValues: entry ? {
      institution: entry.institution, degree: entry.degree,
      field: entry.field, startYear: entry.startYear,
      endYear: entry.endYear ?? undefined, inProgress: entry.inProgress,
      grade: entry.grade, description: entry.description,
    } : { inProgress: false },
  });
  const inProgress = watch('inProgress');
  const isPending = add.isPending || update.isPending;

  const onSubmit = async (data: EduForm) => {
    const payload: Omit<IEducation, '_id'> = {
      institution: data.institution, degree: data.degree,
      field: data.field, startYear: data.startYear,
      endYear: data.inProgress ? null : (data.endYear ?? null),
      inProgress: data.inProgress,
      grade: data.grade ?? '', description: data.description ?? '',
    };
    if (entry) await update.mutateAsync({ eduId: entry._id, patch: payload });
    else await add.mutateAsync(payload);
    onDone();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-3 mt-3">
      <div>
        <input placeholder="Institution *" className={`input ${errors.institution ? 'border-red-400' : ''}`} {...register('institution')} />
        {errors.institution && <p className="text-xs text-red-500 mt-0.5">{errors.institution.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <input placeholder="Degree *" className={`input ${errors.degree ? 'border-red-400' : ''}`} {...register('degree')} />
        </div>
        <div>
          <input placeholder="Field of study *" className={`input ${errors.field ? 'border-red-400' : ''}`} {...register('field')} />
        </div>
      </div>
      <div className="flex gap-3 items-center">
        <input type="number" placeholder="Start year" className="input w-32" {...register('startYear')} />
        <label className="flex items-center gap-1 text-sm text-gray-600">
          <input type="checkbox" {...register('inProgress')} /> In progress
        </label>
        {!inProgress && <input type="number" placeholder="End year" className="input w-32" {...register('endYear')} />}
      </div>
      <input placeholder="Grade / GPA (optional)" className="input" {...register('grade')} />
      <textarea placeholder="Description (optional)" rows={2} className="input resize-none" {...register('description')} />
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

export default function EducationSection({ profile, isOwner }: { profile: IUserPublic; isOwner: boolean }) {
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const deleteEdu = useDeleteEducation(profile._id);

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2"><GraduationCap size={16} /> Education</h2>
        {isOwner && !addOpen && (
          <button onClick={() => setAddOpen(true)} className="btn-secondary text-xs py-1 px-2 flex items-center gap-1">
            <Plus size={12} /> Add
          </button>
        )}
      </div>

      <AnimatePresence>
        {addOpen && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <EduForm userId={profile._id} onDone={() => setAddOpen(false)} />
            <hr className="my-4" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-5">
        {profile.education.length === 0 && <p className="text-sm text-gray-400 italic">No education added.</p>}
        {profile.education.map((edu) => (
          <motion.div key={edu._id} layout className="flex gap-3">
            {editId === edu._id ? (
              <div className="flex-1"><EduForm userId={profile._id} entry={edu} onDone={() => setEditId(null)} /></div>
            ) : (
              <>
                <div className="mt-1 w-9 h-9 rounded-md bg-gray-100 flex items-center justify-center shrink-0">
                  <GraduationCap size={16} className="text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm">{edu.institution}</p>
                  <p className="text-sm text-gray-600">{edu.degree} · {edu.field}</p>
                  <p className="text-xs text-gray-400">
                    {edu.startYear} – {edu.inProgress ? 'Present' : (edu.endYear ?? '')}
                    {edu.grade && ` · ${edu.grade}`}
                  </p>
                </div>
                {isOwner && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => setEditId(edu._id)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"><Pencil size={14} /></button>
                    <button onClick={() => deleteEdu.mutate(edu._id)} disabled={deleteEdu.isPending} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                  </div>
                )}
              </>
            )}
          </motion.div>
        ))}
      </div>
    </section>
  );
}
