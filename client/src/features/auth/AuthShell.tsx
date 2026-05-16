// ─────────────────────────────────────────────────────────────────────────────
// AuthShell.tsx
// Shared visual wrapper for Login / Register / ForgotPassword / ResetPassword.
// Left panel (desktop only) shows branding + marketing copy.
// Right panel renders the children (form, success screen, etc).
// ─────────────────────────────────────────────────────────────────────────────
import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShieldCheck, BadgeCheck, Brain, Sparkles, CheckCircle2,
} from 'lucide-react';

const TRUST_POINTS = [
  { icon: <BadgeCheck size={14} />, text: 'AI-monitored, anti-cheat assessments' },
  { icon: <Brain size={14} />,      text: 'Adaptive difficulty across 3 tiers' },
  { icon: <ShieldCheck size={14} />, text: 'Publicly verifiable certificates' },
];

interface Props {
  children:        ReactNode;
  /** Optional override for the left-panel hero copy */
  marketingTitle?: string;
  marketingBody?:  string;
}

export default function AuthShell({ children, marketingTitle, marketingBody }: Props) {
  return (
    <div className="min-h-screen bg-gray-50 grid lg:grid-cols-2">

      {/* ── LEFT: brand & marketing panel (desktop only) ──────────────── */}
      <div className="hidden lg:flex relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 text-white p-10 xl:p-14 flex-col justify-between">

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
            backgroundSize: '52px 52px',
          }}
        />
        {/* Animated glow */}
        <motion.div
          animate={{ scale: [1, 1.12, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/3 -left-20 w-[420px] h-[420px] bg-brand/25 rounded-full blur-[120px] pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1.05, 1, 1.05], opacity: [0.25, 0.45, 0.25] }}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute bottom-10 right-0 w-80 h-80 bg-indigo-500/20 rounded-full blur-[110px] pointer-events-none"
        />

        {/* Logo */}
        <div className="relative">
          <Link to="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-10 h-10 bg-gradient-to-br from-brand to-brand-dark rounded-xl flex items-center justify-center shadow-lg shadow-brand/40 group-hover:scale-105 transition-transform">
              <ShieldCheck size={20} className="text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">SkillSeal</span>
          </Link>
        </div>

        {/* Hero copy */}
        <div className="relative">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-3 py-1 text-xs text-blue-200 mb-5 backdrop-blur-sm"
          >
            <Sparkles size={12} className="text-blue-300" />
            Verified Skills for Proven Hiring
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
            className="text-3xl xl:text-4xl font-extrabold leading-tight tracking-tight max-w-md"
          >
            {marketingTitle ?? (
              <>
                Prove your skills.<br />
                <span className="bg-gradient-to-r from-blue-300 via-indigo-300 to-purple-300 bg-clip-text text-transparent">
                  Earn your badge.
                </span>
              </>
            )}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.2 }}
            className="mt-3 text-blue-100/70 text-sm max-w-md leading-relaxed"
          >
            {marketingBody ?? "Take a proctored AI assessment, get a verified badge, and let recruiters find you based on what you can actually do."}
          </motion.p>

          {/* Trust points */}
          <motion.ul
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.3 }}
            className="mt-7 space-y-2.5"
          >
            {TRUST_POINTS.map((p) => (
              <li key={p.text} className="flex items-center gap-2.5 text-sm text-blue-100/85">
                <span className="w-7 h-7 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center text-blue-300 shrink-0">
                  {p.icon}
                </span>
                {p.text}
              </li>
            ))}
          </motion.ul>
        </div>

        {/* Bottom social proof */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="relative flex items-center gap-3 text-xs text-blue-200/70"
        >
          <CheckCircle2 size={13} className="text-blue-400" />
          Free to get started — no credit card required
        </motion.div>
      </div>

      {/* ── RIGHT: form area ──────────────────────────────────────────── */}
      <div className="flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md">
          {/* Mobile-only logo */}
          <div className="lg:hidden text-center mb-6">
            <Link to="/" className="inline-flex items-center gap-2 justify-center">
              <div className="w-9 h-9 bg-gradient-to-br from-brand to-brand-dark rounded-xl flex items-center justify-center shadow-sm">
                <ShieldCheck size={19} className="text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 tracking-tight">SkillSeal</span>
            </Link>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
