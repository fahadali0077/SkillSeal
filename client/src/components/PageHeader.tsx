// ─────────────────────────────────────────────────────────────────────────────
// PageHeader.tsx  –  consistent page header with breadcrumbs + actions
// ─────────────────────────────────────────────────────────────────────────────
import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
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
    <div className="mb-6">
      {/* Breadcrumbs */}
      {crumbs && crumbs.length > 0 && (
        <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {c.to
                ? <Link to={c.to} className="hover:text-brand transition-colors">{c.label}</Link>
                : <span className="text-gray-500">{c.label}</span>}
              {i < crumbs.length - 1 && <ChevronRight size={11} className="text-gray-300" />}
            </span>
          ))}
        </nav>
      )}

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          {showBack && <BackButton to={backTo} className="-ml-2 mt-0.5" />}
          {icon && (
            <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center text-brand shrink-0">
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">{title}</h1>
            {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
