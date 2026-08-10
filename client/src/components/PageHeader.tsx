// ─────────────────────────────────────────────────────────────────────────────
// PageHeader.tsx  –  consistent page header with breadcrumbs + actions
// ─────────────────────────────────────────────────────────────────────────────
import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import BackButton from './BackButton';

interface Crumb { label: string; to?: string }

interface Props {
  title:        string;
  subtitle?:    string;
  icon?:        ReactNode;
  crumbs?:      Crumb[];
  actions?:     ReactNode;
  showBack?:    boolean;
  backTo?:      string;
}

export default function PageHeader({ title, subtitle, icon, crumbs, actions, showBack, backTo }: Props) {
  return (
    <div className="mb-6 pb-4 border-b border-paper-line">
      {/* Breadcrumbs read as a filing path, in mono. */}
      {crumbs && crumbs.length > 0 && (
        <nav className="flex items-center gap-2 mb-3 font-mono text-[10px] tracking-[0.1em] uppercase text-ink-400">
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-2">
              {c.to
                ? <Link to={c.to} className="hover:text-ink-900 transition-colors">{c.label}</Link>
                : <span className="text-ink-500">{c.label}</span>}
              {i < crumbs.length - 1 && <span className="text-paper-rule">/</span>}
            </span>
          ))}
        </nav>
      )}

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          {showBack && <BackButton to={backTo} className="-ml-2 mt-1" />}
          {icon && (
            <div className="w-9 h-9 rounded border border-paper-line bg-paper-sunk flex items-center justify-center text-ink-700 shrink-0 mt-0.5">
              {icon}
            </div>
          )}
          <div>
            <h1 className="font-display text-[28px] leading-none text-ink-900">{title}</h1>
            {subtitle && <p className="text-sm text-ink-500 mt-2">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
