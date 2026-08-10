import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ShieldCheck, ShieldX, AlertTriangle, Clock, Calendar, ExternalLink, RefreshCw } from 'lucide-react';
import { useSEO } from '../lib/useSEO';
interface CertPublic { certificateId: string; name: string; skill: string; skillSlug: string; tier: string; status: 'VERIFIED' | 'FLAGGED' | 'EXPIRED' | 'REVOKED'; issuedAt: string; expiresAt: string; isExpired: boolean; }
async function fetchCert(id: string): Promise<CertPublic> { const res = await fetch(`/api/v1/verify/${encodeURIComponent(id)}`); const json = await res.json() as { success: boolean; data: CertPublic; message: string }; if (!json.success) throw new Error(json.message); return json.data; }
const STATUS_UI = { VERIFIED: { icon: <ShieldCheck size={48} className="text-green-500" />, label: 'Certificate Verified', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' }, FLAGGED: { icon: <AlertTriangle size={48} className="text-amber-500" />, label: 'Certificate Flagged', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' }, EXPIRED: { icon: <Clock size={48} className="text-gray-400" />, label: 'Certificate Expired', color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200' }, REVOKED: { icon: <ShieldX size={48} className="text-red-500" />, label: 'Certificate Revoked', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' } };
const TIER_LABELS: Record<string, string> = { beginner: 'Beginner', intermediate: 'Mid Level', advanced: 'Advanced', expert: 'Expert' };
export default function PublicVerifyPage() {
  const { certificateId = '' } = useParams<{ certificateId: string }>();
  const { data: cert, isLoading, error } = useQuery({ queryKey: ['public-cert', certificateId], queryFn: () => fetchCert(certificateId), enabled: !!certificateId, retry: 0, staleTime: Infinity });
  useSEO({
    title: cert ? `${cert.name}'s ${cert.skill} Certificate` : 'Verify Certificate',
    description: cert
      ? `Verified SkillSeal certificate: ${cert.name} has proven ${TIER_LABELS[cert.tier] ?? cert.tier}-level ${cert.skill} skills. Issued by SkillSeal.`
      : 'Verify a SkillSeal skill certificate. Confirm that a candidate has proven their skills through AI-powered contextual assessment.',
    canonical: `/verify/${certificateId}`,
  });
  return (<div className="min-h-screen bg-paper-sunk flex flex-col">
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-2"><div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center"><ShieldCheck size={18} className="text-white" /></div><span className="font-bold text-gray-900">SkillSeal · Certificate Verification</span></header>
    <main className="flex-1 flex items-center justify-center px-4 py-12">
      {isLoading && <div className="flex flex-col items-center gap-3 text-gray-400"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}><RefreshCw size={32} /></motion.div><p className="text-sm">Verifying certificate…</p></div>}
      {error && <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-sm w-full text-center"><div className="w-20 h-20 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-4"><ShieldX size={36} className="text-red-500" /></div><h1 className="text-xl font-bold text-gray-900 mb-2">Certificate Not Found</h1><p className="text-gray-500 text-sm">This certificate ID doesn't exist or may have been revoked.</p></motion.div>}
      {cert && (() => {
        const ui = STATUS_UI[cert.status] ?? STATUS_UI.VERIFIED; return (<motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', damping: 22 }} className="max-w-md w-full">
          <div className={`bg-white rounded-3xl border shadow-xl overflow-hidden ${ui.border}`}>
            <div className={`${ui.bg} px-6 py-8 text-center`}><motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', delay: 0.1 }} className="flex justify-center mb-3">{ui.icon}</motion.div><h1 className={`text-2xl font-bold ${ui.color}`}>{ui.label}</h1></div>
            <div className="px-6 py-6 space-y-4">
              <div><p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Certificate holder</p><p className="text-xl font-bold text-gray-900 mt-0.5">{cert.name}</p></div>
              <div className="bg-gray-50 rounded-2xl p-4 flex items-center gap-4"><div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center"><ShieldCheck size={24} className="text-brand" /></div><div><p className="font-bold text-gray-900">{cert.skill}</p><p className="text-sm text-gray-500 capitalize">{TIER_LABELS[cert.tier] ?? cert.tier} Level</p></div></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3"><div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1"><Calendar size={11} />Issued</div><p className="text-sm font-semibold text-gray-800">{new Date(cert.issuedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</p></div>
                <div className={`rounded-xl p-3 ${cert.isExpired ? 'bg-red-50' : 'bg-gray-50'}`}><div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1"><Clock size={11} />{cert.isExpired ? 'Expired' : 'Valid until'}</div><p className={`text-sm font-semibold ${cert.isExpired ? 'text-red-600' : 'text-gray-800'}`}>{new Date(cert.expiresAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</p></div>
              </div>
              {cert.status === 'FLAGGED' && <div className="bg-amber-50 border border-amber-200 rounded-xl p-3"><p className="text-xs text-amber-700 font-medium flex items-center gap-1.5"><AlertTriangle size={12} />This certificate is under provisional review.</p></div>}
              <div className="border-t border-gray-100 pt-4"><p className="text-xs text-gray-400 mb-1">Certificate ID</p><code className="text-sm font-mono text-gray-700 tracking-widest">{cert.certificateId}</code></div>
            </div>
          </div>
          <div className="text-center mt-5"><p className="text-xs text-gray-400">Verified by the SkillSeal skill assessment system.</p><a href="/" className="inline-flex items-center gap-1 text-xs text-brand hover:text-brand-dark mt-1"><ExternalLink size={11} />Learn about SkillSeal verification</a></div>
        </motion.div>);
      })()}
    </main>
  </div>);
}
