import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Plus, Pencil, Power, X, ShieldCheck } from 'lucide-react';
import { useAdminSkills, useSkillMutations, type IAdminSkillRow } from './adminApi';

const CATEGORIES = ['frontend', 'backend', 'database', 'devops', 'ai', 'design', 'other'];
const TIERS = ['beginner', 'intermediate', 'advanced', 'expert'];

type Draft = { name: string; category: string; description: string; icon: string; availableTiers: string[] };
const EMPTY: Draft = { name: '', category: 'frontend', description: '', icon: '', availableTiers: ['beginner', 'intermediate', 'advanced'] };

export default function AdminSkills() {
  const { data: skills, isLoading } = useAdminSkills();
  const { create, update, toggle } = useSkillMutations();
  const [editing, setEditing] = useState<IAdminSkillRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);

  const openCreate = () => { setDraft(EMPTY); setCreating(true); setEditing(null); };
  const openEdit = (s: IAdminSkillRow) => {
    setDraft({ name: s.name, category: s.category, description: s.description, icon: s.icon, availableTiers: s.availableTiers });
    setEditing(s); setCreating(false);
  };
  const close = () => { setEditing(null); setCreating(false); };

  const toggleTier = (t: string) =>
    setDraft((d) => ({ ...d, availableTiers: d.availableTiers.includes(t) ? d.availableTiers.filter((x) => x !== t) : [...d.availableTiers, t] }));

  const save = () => {
    if (!draft.name.trim()) { toast.error('Name is required'); return; }
    if (!draft.availableTiers.length) { toast.error('Pick at least one tier'); return; }
    if (editing) {
      update.mutate({ id: editing._id, data: draft }, {
        onSuccess: () => { toast.success('Skill updated'); close(); },
        onError: (e) => toast.error((e as Error).message),
      });
    } else {
      create.mutate(draft, {
        onSuccess: () => { toast.success('Skill created'); close(); },
        onError: (e) => toast.error((e as Error).message),
      });
    }
  };

  const handleToggle = (s: IAdminSkillRow) => toggle.mutate(s._id, {
    onSuccess: (r) => toast.success(r.isActive ? `${r.name} activated` : `${r.name} deactivated`),
    onError: (e) => toast.error((e as Error).message),
  });

  const saving = create.isPending || update.isPending;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <p className="text-sm text-gray-500">Skills available for verification. Deactivating hides a skill from candidates but keeps its existing certificates.</p>
        <button onClick={openCreate} className="btn-primary text-sm w-full sm:w-auto shrink-0"><Plus size={16} />New skill</button>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="card p-4 h-28 skeleton" />)}</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {skills?.map((s) => (
            <div key={s._id} className={`card p-4 ${s.isActive ? '' : 'opacity-60'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-2xl leading-none shrink-0">{s.icon || '🏷️'}</span>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{s.name}</p>
                    <p className="text-xs text-gray-400 truncate">{s.category} · {s.slug}</p>
                  </div>
                </div>
                <span className={`shrink-0 ${s.isActive ? 'badge-success' : 'badge-neutral'}`}>{s.isActive ? 'Active' : 'Off'}</span>
              </div>
              {s.description && <p className="text-xs text-gray-500 mt-2 line-clamp-2">{s.description}</p>}
              <div className="flex flex-wrap gap-1 mt-2.5">
                {s.availableTiers.map((t) => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{t}</span>)}
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-400">{s.totalVerified} verified</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(s)} className="btn-ghost p-1.5" title="Edit"><Pencil size={14} /></button>
                  <button onClick={() => handleToggle(s)} className={`p-1.5 rounded-lg transition-colors ${s.isActive ? 'text-gray-400 hover:bg-gray-100' : 'text-green-600 hover:bg-green-50'}`} title={s.isActive ? 'Deactivate' : 'Activate'}><Power size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor modal */}
      <AnimatePresence>
        {(creating || editing) && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 8 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[92%] max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-gray-100 shrink-0">
                <h3 className="font-bold text-gray-900 flex items-center gap-2"><ShieldCheck size={18} className="text-brand" />{editing ? 'Edit skill' : 'New skill'}</h3>
                <button onClick={close} className="btn-ghost p-2"><X size={16} /></button>
              </div>
              <div className="p-4 sm:p-5 space-y-4 flex-1 min-h-0 overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Name</label>
                    <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Rust" className="input" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Icon (emoji)</label>
                    <input value={draft.icon} onChange={(e) => setDraft({ ...draft, icon: e.target.value })} placeholder="🦀" className="input" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Category</label>
                  <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} className="input">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Description</label>
                  <textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={2} className="input resize-none" placeholder="Short summary of what this skill covers" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">Available tiers</label>
                  <div className="flex flex-wrap gap-1.5">
                    {TIERS.map((t) => (
                      <button key={t} onClick={() => toggleTier(t)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize ${
                          draft.availableTiers.includes(t) ? 'bg-brand text-white border-brand' : 'bg-white text-gray-600 border-gray-200 hover:border-brand'}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                {editing && <p className="text-xs text-gray-400">Slug (<code>{editing.slug}</code>) can't be changed after creation to keep certificate links stable.</p>}
              </div>
              <div className="bg-gray-50 px-4 sm:px-5 py-3.5 flex justify-end gap-2 border-t border-gray-100 shrink-0">
                <button onClick={close} className="btn-secondary text-sm">Cancel</button>
                <button onClick={save} disabled={saving} className="btn-primary text-sm">{saving ? 'Saving…' : editing ? 'Save changes' : 'Create skill'}</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
