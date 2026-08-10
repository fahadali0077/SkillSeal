import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Loader2, Search } from 'lucide-react';
import { useSEO } from '../lib/useSEO';
import SealMark from '../components/SealMark';
import { enter } from '../lib/motion';

interface CertPublic {
  certificateId: string; name: string; skill: string; skillSlug: string; tier: string;
  status: 'VERIFIED' | 'FLAGGED' | 'EXPIRED' | 'REVOKED';
  issuedAt: string; expiresAt: string; isExpired: boolean;
}

async function fetchCert(id: string): Promise<CertPublic> {
  const res = await fetch(`/api/v1/verify/${encodeURIComponent(id)}`);
  const json = await res.json() as { success: boolean; data: CertPublic; message: string };
  if (!json.success) throw new Error(json.message);
  return json.data;
}

const STATUS_UI: Record<CertPublic['status'], { label: string; tone: string; band: string }> = {
  VERIFIED: { label: 'Sealed', tone: 'text-pass', band: 'bg-pass-tint border-pass-line' },
  FLAGGED:  { label: 'Under review', tone: 'text-warn', band: 'bg-warn-tint border-warn-line' },
  EXPIRED:  { label: 'Lapsed', tone: 'text-ink-500', band: 'bg-paper-sunk border-paper-rule' },
  REVOKED:  { label: 'Revoked', tone: 'text-fail', band: 'bg-fail-tint border-fail-line' },
};

const TIER_LABELS: Record<string, string> = {
  beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced', expert: 'Expert',
};

const fmt = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toISOString().slice(0, 10);
};

/** Shown at /verify with no ID — the registry's front door. */
function Lookup() {
  const [id, setId] = useState('');
  const navigate = useNavigate();

  return (
    <motion.div {...enter} className="max-w-md w-full">
      <p className="label">Certificate lookup</p>
      <h1 className="font-display text-[34px] leading-[1.05] text-ink-900 mt-4">
        Check a credential.
      </h1>
      <p className="text-[15px] leading-relaxed text-ink-500 mt-3">
        Enter the certificate ID printed on the credential. No account needed.
      </p>

      <form
        onSubmit={e => { e.preventDefault(); const v = id.trim(); if (v) navigate(`/verify/${encodeURIComponent(v)}`); }}
        className="mt-7"
      >
        <label htmlFor="cert-id" className="label">Certificate ID</label>
        <div className="relative mt-2">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            id="cert-id"
            value={id}
            onChange={e => setId(e.target.value)}
            placeholder="SKL-2F91-A7C4-0Q"
            className="input pl-9 font-mono tracking-[0.06em]"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <button type="submit" disabled={!id.trim()} className="btn-seal w-full mt-4">
          Verify certificate
        </button>
      </form>
    </motion.div>
  );
}

export default function PublicVerifyPage() {
  const { certificateId = '' } = useParams<{ certificateId: string }>();
  const { data: cert, isLoading, error } = useQuery({
    queryKey: ['public-cert', certificateId],
    queryFn: () => fetchCert(certificateId),
    enabled: !!certificateId,
    retry: 0,
    staleTime: Infinity,
  });

  useSEO({
    title: cert ? `${cert.name}'s ${cert.skill} certificate` : 'Verify a certificate',
    description: cert
      ? `Verified SkillSeal certificate: ${cert.name} holds a ${TIER_LABELS[cert.tier] ?? cert.tier}-tier ${cert.skill} credential.`
      : 'Look up a SkillSeal certificate and confirm it was issued by a monitored assessment.',
    canonical: certificateId ? `/verify/${certificateId}` : '/verify',
  });

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <header className="bg-paper-card border-b border-paper-rule px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-2.5">
          <SealMark size={24} tone="seal" />
          <span className="font-display font-medium text-lg leading-none tracking-[-0.015em] text-ink-900">
            SkillSeal
          </span>
          <span className="label ml-2">Certificate verification</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-5 py-14">
        {!certificateId && <Lookup />}

        {certificateId && isLoading && (
          <div className="flex flex-col items-center gap-3 text-ink-400">
            <Loader2 size={22} className="animate-spin" />
            <p className="font-mono text-[11px] tracking-[0.12em] uppercase">Checking the register</p>
          </div>
        )}

        {certificateId && error && (
          <motion.div {...enter} className="max-w-md w-full text-center">
            <h1 className="font-display text-[30px] leading-tight text-ink-900">No such certificate</h1>
            <p className="text-[15px] leading-relaxed text-ink-500 mt-3">
              Nothing in the register matches
              <span className="font-mono text-ink-700"> {certificateId}</span>. Check the ID, or ask the
              holder to re-share the link — a revoked credential is removed from public lookup.
            </p>
            <Link to="/verify" className="btn-quiet mt-7">Try another ID</Link>
          </motion.div>
        )}

        {cert && (() => {
          const ui = STATUS_UI[cert.status] ?? STATUS_UI.VERIFIED;
          return (
            <motion.div {...enter} className="max-w-md w-full">
              <div className="bg-paper-card border border-paper-rule rounded-2xl shadow-raised overflow-hidden">
                <div className={`flex items-center justify-between gap-4 px-6 py-3.5 border-b ${ui.band}`}>
                  <span className="label">Certificate of verification</span>
                  <span className={`font-mono text-[11px] font-medium tracking-[0.1em] uppercase ${ui.tone}`}>
                    {ui.label}
                  </span>
                </div>

                <div className="px-6 py-7">
                  <div className="flex items-start gap-5">
                    <SealMark size={52} tone={cert.status === 'VERIFIED' ? 'seal' : 'ink'} className="shrink-0" />
                    <div className="min-w-0 flex-1 space-y-4 break-words">
                      <div>
                        <p className="label">Issued to</p>
                        <p className="font-display text-[26px] leading-none text-ink-900 mt-1.5">{cert.name}</p>
                      </div>
                      <div>
                        <p className="label">For</p>
                        <p className="font-display text-[26px] leading-none text-ink-900 mt-1.5">
                          {cert.skill}
                          <span className="text-base text-ink-500 ml-2.5 font-sans font-semibold">
                            {TIER_LABELS[cert.tier] ?? cert.tier}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-7 pt-5 border-t border-paper-line">
                    <div>
                      <p className="label">Issued</p>
                      <p className="font-mono text-sm text-ink-900 mt-2 leading-none tabular-nums">{fmt(cert.issuedAt)}</p>
                    </div>
                    <div>
                      <p className="label">{cert.isExpired ? 'Expired' : 'Valid to'}</p>
                      <p className={`font-mono text-sm mt-2 leading-none tabular-nums ${cert.isExpired ? 'text-fail' : 'text-ink-900'}`}>
                        {fmt(cert.expiresAt)}
                      </p>
                    </div>
                  </div>

                  {cert.status === 'FLAGGED' && (
                    <p className="mt-5 text-sm leading-relaxed text-warn border-t border-paper-line pt-4">
                      This credential is under provisional review. Its session audit is being re-examined.
                    </p>
                  )}
                </div>

                <div className="px-6 py-3 bg-paper-sunk border-t border-paper-line">
                  <p className="font-mono text-[11px] tracking-[0.04em] text-ink-500 truncate">
                    {cert.certificateId}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 mt-5">
                <p className="text-xs text-ink-400">Issued by the SkillSeal assessment system.</p>
                <Link to="/verify" className="text-xs font-semibold text-ink-700 hover:text-ink-900 whitespace-nowrap">
                  Check another →
                </Link>
              </div>
            </motion.div>
          );
        })()}
      </main>
    </div>
  );
}
