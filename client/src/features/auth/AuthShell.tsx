// ─────────────────────────────────────────────────────────────────────────────
// AuthShell.tsx
// Shared visual wrapper for Login / Register / ForgotPassword / ResetPassword.
// Left panel (desktop only) is an ink surface carrying the brand statement.
// Right panel renders the children (form, success screen, etc).
// ─────────────────────────────────────────────────────────────────────────────
import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import SealMark from '../../components/SealMark';
import { enterAt } from '../../lib/motion';

const TRUST_POINTS = [
  'Monitored sessions with a recorded integrity trail',
  'Adaptive difficulty across four tiers',
  'A public verification page for every certificate',
];

interface Props {
  children:        ReactNode;
  /** Optional override for the left-panel hero copy */
  marketingTitle?: ReactNode;
  marketingBody?:  ReactNode;
}

export default function AuthShell({ children, marketingTitle, marketingBody }: Props) {
  return (
    <div className="min-h-screen bg-paper grid lg:grid-cols-2">

      {/* ── LEFT: ink panel (desktop only) ────────────────────────────── */}
      <div className="hidden lg:flex bg-ink-900 text-paper p-10 xl:p-14 flex-col justify-between">
        <div>
          <Link to="/" className="inline-flex items-center gap-2.5">
            <SealMark size={28} tone="seal" />
            <span className="font-display font-medium text-xl leading-none tracking-[-0.015em] text-paper">
              SkillSeal
            </span>
          </Link>
        </div>

        <div className="min-w-0">
          <motion.p {...enterAt(0)} className="font-mono text-[10px] font-medium tracking-[0.14em] uppercase text-seal-300">
            Proctored skill credentials
          </motion.p>

          <motion.h2
            {...enterAt(1)}
            className="font-display text-[40px] xl:text-[46px] leading-[1.02] tracking-[-0.02em] text-paper mt-5 max-w-[16ch]"
          >
            {marketingTitle ?? 'A skill claim anyone can look up.'}
          </motion.h2>

          <motion.p {...enterAt(2)} className="mt-5 text-[15px] leading-relaxed text-ink-300 max-w-[46ch]">
            {marketingBody ?? 'Sit a monitored assessment. Pass, and SkillSeal issues a certificate with a score, an integrity record and a permanent public URL.'}
          </motion.p>

          <motion.ul {...enterAt(3)} className="mt-8 space-y-3">
            {TRUST_POINTS.map((t, i) => (
              <li key={t} className="flex gap-3.5 text-sm text-ink-200">
                <span className="font-mono text-[11px] text-ink-400 tabular-nums pt-0.5 shrink-0">
                  {String(i + 1).padStart(2, '0')}
                </span>
                {t}
              </li>
            ))}
          </motion.ul>
        </div>

        <p className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-400">
          Free to start
          <span className="mx-2.5 text-ink-400">·</span>
          No card required
        </p>
      </div>

      {/* ── RIGHT: form area ──────────────────────────────────────────── */}
      <div className="flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md">
          {/* Mobile-only logo */}
          <div className="lg:hidden mb-8">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <SealMark size={26} tone="seal" />
              <span className="font-display font-medium text-xl leading-none tracking-[-0.015em] text-ink-900">
                SkillSeal
              </span>
            </Link>
          </div>

          <motion.div {...enterAt(0)}>
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
