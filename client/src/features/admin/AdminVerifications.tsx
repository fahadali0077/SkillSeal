import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { ShieldOff, AlertCircle, BadgeCheck, ExternalLink } from 'lucide-react';
import { useAdminVerifications, useRevokeVerification, type VerifListParams } from './adminApi';
import { VerifBadge, Pagination } from './adminUi';

const STATUS_FILTERS = [
  { v: '', label: 'All statuses' },
  { v: 'VERIFIED', label: 'Verified' },
  { v: 'FLAGGED', label: 'Flagged' },
  { v: 'REVOKED', label: 'Revoked' },
  { v: 'EXPIRED', label: 'Expired' },
  { v: 'WITHDRAWN', label: 'Withdrawn' },
];

export default function AdminVerifications() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [revokeTarget, setRevokeTarget] = useState<{ id: string; name: string; skill: string } | null>(null);
  const [reason, setReason] = useState('');

  const params: VerifListParams = { page, limit: 20, status: status || undefined };
  const { data, isLoading, isError, error } = useAdminVerifications(params);
  const revoke = useRevokeVerification();

  const doRevoke = () => {
    if (!revokeTarget) return;
    revoke.mutate({ id: revokeTarget.id, reason }, {
      onSuccess: () => { toast.success('Certificate revoked'); setRevokeTarget(null); setReason(''); },
      onError: (e) => toast.error((e as Error).message),
    });
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-4">
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="input sm:w-48">
          {STATUS_FILTERS.map((f) => <option key={f.v} value={f.v}>{f.label}</option>)}
        </select>
        <p className="hidden sm:block text-xs text-gray-400">Revoking invalidates a certificate and removes it from recruiter search.</p>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wide bg-gray-50/70 border-b border-gray-100">
                <th className="px-3 sm:px-4 py-3 font-semibold">Candidate</th>
                <th className="px-3 sm:px-4 py-3 font-semibold">Skill</th>
                <th className="px-3 sm:px-4 py-3 font-semibold">Score</th>
                <th className="px-3 sm:px-4 py-3 font-semibold hidden md:table-cell">AI risk</th>
                <th className="px-3 sm:px-4 py-3 font-semibold">Status</th>
                <th className="px-3 sm:px-4 py-3 font-semibold hidden lg:table-cell">Issued</th>
                <th className="px-3 sm:px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading && Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}><td colSpan={7} className="px-3 sm:px-4 py-3"><div className="h-8 skeleton rounded-lg" /></td></tr>
              ))}
              {isError && <tr><td colSpan={7} className="px-3 sm:px-4 py-10 text-center text-red-600">{(error as Error)?.message ?? 'Failed to load.'}</td></tr>}
              {data && data.items.length === 0 && (
                <tr><td colSpan={7} className="px-3 sm:px-4 py-12 text-center text-gray-400">
                  <BadgeCheck size={32} className="mx-auto mb-2 opacity-30" />No verifications match.
                </td></tr>
              )}
              {data?.items.map((v) => {
                const aiHigh = v.aiProbability >= 0.6;
                return (
                  <tr key={v._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 sm:px-4 py-3 max-w-0 sm:max-w-none">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-medium text-gray-900 truncate">{v.userName}</span>
                        {v.userId && <a href={`/profile/${v.userId}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-gray-300 hover:text-brand shrink-0"><ExternalLink size={13} /></a>}
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-gray-700 max-w-[160px] sm:max-w-none truncate sm:whitespace-normal">{v.skillName} <span className="text-gray-400 text-xs">· {v.tier}</span></td>
                    <td className="px-3 sm:px-4 py-3 font-semibold text-gray-900">{v.compositeScore}%</td>
                    <td className="px-3 sm:px-4 py-3 hidden md:table-cell">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${aiHigh ? 'text-red-600' : 'text-gray-400'}`}>
                        {aiHigh && <AlertCircle size={12} />}{Math.round(v.aiProbability * 100)}%
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-3"><VerifBadge status={v.status} /></td>
                    <td className="px-3 sm:px-4 py-3 text-gray-500 hidden lg:table-cell whitespace-nowrap">{new Date(v.issuedAt).toLocaleDateString()}</td>
                    <td className="px-3 sm:px-4 py-3 text-right">
                      {v.status !== 'REVOKED' && v.status !== 'EXPIRED' && v.status !== 'WITHDRAWN' ? (
                        <button onClick={() => setRevokeTarget({ id: v._id, name: v.userName, skill: v.skillName })}
                          className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors">
                          <ShieldOff size={13} /><span className="hidden sm:inline">Revoke</span>
                        </button>
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {data && <div className="border-t border-gray-100"><Pagination page={data.page} totalPages={data.totalPages} total={data.total} onChange={setPage} /></div>}
      </div>

      <AnimatePresence>
        {revokeTarget && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setRevokeTarget(null)} className="fixed inset-0 bg-black/40 z-50" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[92%] max-w-md bg-white rounded-2xl shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4"><ShieldOff size={22} className="text-red-600" /></div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Revoke certificate</h3>
              <p className="text-sm text-gray-600 mb-4 break-words">Revoking <span className="font-semibold">{revokeTarget.skill}</span> for {revokeTarget.name}. The reason is stored on the record for audit.</p>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for revocation…" rows={3} className="input mb-4 resize-none" />
              <div className="flex justify-end gap-2">
                <button onClick={() => setRevokeTarget(null)} className="btn-secondary text-sm">Cancel</button>
                <button onClick={doRevoke} disabled={revoke.isPending} className="btn-danger text-sm">{revoke.isPending ? 'Revoking…' : 'Revoke'}</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
