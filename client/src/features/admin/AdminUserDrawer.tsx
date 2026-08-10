import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  X, Mail, MapPin, ShieldCheck, UserCog, Ban, RotateCcw, Trash2, ExternalLink, BadgeCheck,
} from 'lucide-react';
import { useAdminUser, useUserMutations } from './adminApi';
import { RoleBadge, StatusBadge, VerifBadge, timeAgo } from './adminUi';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useAuthStore } from '../auth/useAuth';

const ROLES = ['candidate', 'recruiter', 'company_admin', 'platform_admin'];

export default function AdminUserDrawer({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { data: user, isLoading } = useAdminUser(userId);
  const { setRole, suspend, reactivate, remove } = useUserMutations();
  const selfId = useAuthStore((s) => s.user?._id);
  const isSelf = selfId === userId;

  const [confirm, setConfirm] = useState<null | 'suspend' | 'delete'>(null);
  const [reason, setReason] = useState('');

  const handleRole = (role: string) => {
    if (!user || role === user.role) return;
    setRole.mutate({ id: userId, role }, {
      onSuccess: () => toast.success(`Role updated to ${role.replace('_', ' ')}`),
      onError: (e) => toast.error((e as Error).message),
    });
  };

  const doSuspend = () => suspend.mutate({ id: userId, reason }, {
    onSuccess: () => { toast.success('User suspended'); setConfirm(null); setReason(''); },
    onError: (e) => toast.error((e as Error).message),
  });
  const doReactivate = () => reactivate.mutate(userId, {
    onSuccess: () => toast.success('User reactivated'),
    onError: (e) => toast.error((e as Error).message),
  });
  const doDelete = () => remove.mutate({ id: userId, immediate: false }, {
    onSuccess: (r) => { toast.success(r.scheduledDeletionAt ? 'Scheduled for deletion in 30 days' : 'User deleted'); setConfirm(null); onClose(); },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 bg-black/40 z-40" />
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white shadow-2xl overflow-y-auto"
      >
        <div className="sticky top-0 bg-white/90 border-b border-gray-100 px-4 sm:px-5 py-3.5 flex items-center justify-between z-10">
          <h2 className="font-bold text-gray-900">User details</h2>
          <button onClick={onClose} className="btn-ghost p-2"><X size={18} /></button>
        </div>

        {isLoading || !user ? (
          <div className="p-4 sm:p-5 space-y-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-12 skeleton rounded-xl" />)}</div>
        ) : (
          <div className="p-4 sm:p-5 space-y-5">
            {/* Identity */}
            <div className="flex items-center gap-3">
              {user.profilePhoto
                ? <img src={user.profilePhoto} alt="" className="w-14 h-14 rounded-full object-cover shrink-0" />
                : <div className="w-14 h-14 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold text-lg shrink-0">{user.firstName[0]}{user.lastName[0]}</div>}
              <div className="min-w-0 flex-1">
                <p className="font-bold text-gray-900 truncate">{user.firstName} {user.lastName}</p>
                <p className="text-sm text-gray-500 truncate flex items-center gap-1"><Mail size={13} className="shrink-0" /><span className="truncate">{user.email}</span></p>
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  <RoleBadge role={user.role} />
                  <StatusBadge status={user.status} />
                  {user.emailVerified && <span className="badge-info"><BadgeCheck size={11} />Verified</span>}
                </div>
              </div>
            </div>

            {user.headline && <p className="text-sm text-gray-600 break-words">{user.headline}</p>}
            {(user.location.city || user.location.country) && (
              <p className="text-sm text-gray-500 flex items-start gap-1"><MapPin size={13} className="shrink-0 mt-0.5" /><span>{[user.location.city, user.location.country].filter(Boolean).join(', ')}</span></p>
            )}

            {/* Meta grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="card p-3"><p className="text-xs text-gray-400">Connections</p><p className="font-semibold text-gray-900">{user.connectionCount}</p></div>
              <div className="card p-3"><p className="text-xs text-gray-400">Followers</p><p className="font-semibold text-gray-900">{user.followerCount}</p></div>
              <div className="card p-3"><p className="text-xs text-gray-400">Joined</p><p className="font-semibold text-gray-900">{new Date(user.createdAt).toLocaleDateString()}</p></div>
              <div className="card p-3"><p className="text-xs text-gray-400">Last login</p><p className="font-semibold text-gray-900">{timeAgo(user.lastLoginAt)}</p></div>
            </div>

            {user.status === 'suspended' && user.suspendedReason && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-sm text-red-700">
                <span className="font-semibold">Suspension reason:</span> {user.suspendedReason}
              </div>
            )}
            {user.scheduledDeletionAt && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm text-amber-700">
                Scheduled for permanent deletion on {new Date(user.scheduledDeletionAt).toLocaleDateString()}.
              </div>
            )}

            {/* Role control */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5"><UserCog size={13} />Role</p>
              {isSelf ? (
                <p className="text-sm text-gray-400 italic">You can't change your own role.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {ROLES.map((r) => (
                    <button key={r} onClick={() => handleRole(r)} disabled={setRole.isPending}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 ${
                        user.role === r ? 'bg-brand text-white border-brand' : 'bg-white text-gray-600 border-gray-200 hover:border-brand hover:text-brand'}`}>
                      {r.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Verifications */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5"><ShieldCheck size={13} />Verifications ({user.verifications.length})</p>
              {user.verifications.length === 0 ? (
                <p className="text-sm text-gray-400">No verifications yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {user.verifications.map((v) => (
                    <div key={v._id} className="flex items-center justify-between gap-2 text-sm py-1.5 px-2 rounded-lg hover:bg-gray-50">
                      <span className="text-gray-700 truncate min-w-0">{v.skillName} <span className="text-gray-400">· {v.tier}</span></span>
                      <span className="flex items-center gap-2 shrink-0"><span className="text-gray-500 text-xs">{v.compositeScore}%</span><VerifBadge status={v.status} /></span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
              {user.customUrl || user._id ? (
                <a href={`/profile/${user.customUrl || user._id}`} target="_blank" rel="noreferrer" className="btn-secondary text-sm w-full"><ExternalLink size={15} />View public profile</a>
              ) : null}
              {!isSelf && (user.status === 'active' ? (
                <button onClick={() => setConfirm('suspend')} className="btn-danger text-sm w-full"><Ban size={15} />Suspend account</button>
              ) : (
                <button onClick={doReactivate} disabled={reactivate.isPending} className="btn-secondary text-sm w-full"><RotateCcw size={15} />Reactivate account</button>
              ))}
              {!isSelf && (
                <button onClick={() => setConfirm('delete')} className="btn-ghost text-sm w-full text-red-600 hover:bg-red-50"><Trash2 size={15} />Delete account</button>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* Suspend confirm — collects a reason */}
      <AnimatePresence>
        {confirm === 'suspend' && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirm(null)} className="fixed inset-0 bg-black/40 z-[60]" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] w-[92%] max-w-md bg-white rounded-2xl shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold text-gray-900 mb-1">Suspend account</h3>
              <p className="text-sm text-gray-600 mb-4">The user will be logged out immediately and blocked from signing in. They'll see the reason below on their next login attempt.</p>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (shown to the user)…" rows={3} className="input mb-4 resize-none" />
              <div className="flex justify-end gap-2">
                <button onClick={() => setConfirm(null)} className="btn-secondary text-sm">Cancel</button>
                <button onClick={doSuspend} disabled={suspend.isPending} className="btn-danger text-sm">{suspend.isPending ? 'Suspending…' : 'Suspend'}</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={confirm === 'delete'} variant="danger" title="Delete account?"
        message="The account is suspended now and permanently removed after a 30-day grace period (handled by the existing deletion job). This cannot be easily undone."
        confirmLabel="Schedule deletion" loading={remove.isPending}
        onConfirm={doDelete} onCancel={() => setConfirm(null)}
      />
    </>
  );
}
