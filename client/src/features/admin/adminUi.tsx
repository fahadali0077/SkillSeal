import { ChevronLeft, ChevronRight } from 'lucide-react';

const ROLE_BADGE: Record<string, string> = {
  candidate: 'badge-info',
  recruiter: 'badge bg-indigo-50 text-indigo-700 border-indigo-200',
  company_admin: 'badge-warning',
  platform_admin: 'badge-danger',
};
const ROLE_LABEL: Record<string, string> = {
  candidate: 'Candidate', recruiter: 'Recruiter', company_admin: 'Company admin', platform_admin: 'Admin',
};

export function RoleBadge({ role }: { role: string }) {
  return <span className={ROLE_BADGE[role] ?? 'badge-neutral'}>{ROLE_LABEL[role] ?? role}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  if (status === 'suspended') return <span className="badge-danger">Suspended</span>;
  return <span className="badge-success">Active</span>;
}

const VERIF_BADGE: Record<string, string> = {
  VERIFIED: 'badge-success', FLAGGED: 'badge-warning',
  EXPIRED: 'badge-neutral', REVOKED: 'badge-danger', WITHDRAWN: 'badge-neutral',
};
export function VerifBadge({ status }: { status: string }) {
  return <span className={VERIF_BADGE[status] ?? 'badge-neutral'}>{status}</span>;
}

export function Pagination({ page, totalPages, total, onChange }: {
  page: number; totalPages: number; total: number; onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return <p className="text-xs text-gray-400 px-1 py-3">{total} result{total === 1 ? '' : 's'}</p>;
  return (
    <div className="flex items-center justify-between px-1 py-3">
      <p className="text-xs text-gray-500">Page {page} of {totalPages} · {total} total</p>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(page - 1)} disabled={page <= 1} className="btn-ghost p-2 disabled:opacity-40"><ChevronLeft size={16} /></button>
        <button onClick={() => onChange(page + 1)} disabled={page >= totalPages} className="btn-ghost p-2 disabled:opacity-40"><ChevronRight size={16} /></button>
      </div>
    </div>
  );
}

export function timeAgo(iso: string | null): string {
  if (!iso) return 'never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
