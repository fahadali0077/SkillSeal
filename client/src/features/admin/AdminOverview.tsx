import { useAdminStats } from './adminApi';
import {
  Users, ShieldCheck, AlertTriangle, Briefcase, FileText, UserPlus,
  Activity, BadgeCheck, Layers,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';

const ROLE_LABELS: Record<string, string> = {
  candidate: 'Candidates', recruiter: 'Recruiters',
  company_admin: 'Company admins', platform_admin: 'Platform admins',
};
const ROLE_COLORS: Record<string, string> = {
  candidate: '#0a66c2', recruiter: '#6366f1', company_admin: '#f59e0b', platform_admin: '#ef4444',
};
const STATUS_COLORS: Record<string, string> = {
  VERIFIED: '#10b981', FLAGGED: '#f59e0b', EXPIRED: '#9ca3af', REVOKED: '#ef4444', WITHDRAWN: '#6b7280',
};

function StatCard({ icon, label, value, sub, tone = 'brand' }: {
  icon: React.ReactNode; label: string; value: number | string; sub?: string; tone?: 'brand' | 'green' | 'amber' | 'red' | 'indigo';
}) {
  const tones = {
    brand: 'bg-brand/10 text-brand', green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600', red: 'bg-red-50 text-red-600', indigo: 'bg-indigo-50 text-indigo-600',
  };
  return (
    <div className="card p-3.5 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wide truncate">{label}</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 sm:mt-1.5 truncate">{value}</p>
          {sub && <p className="text-[11px] sm:text-xs text-gray-400 mt-1 truncate">{sub}</p>}
        </div>
        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${tones[tone]}`}>{icon}</div>
      </div>
    </div>
  );
}

export default function AdminOverview() {
  const { data, isLoading, isError, error } = useAdminStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 8 }).map((_, i) => <div key={i} className="card p-3.5 sm:p-5 h-20 sm:h-24 skeleton" />)}
      </div>
    );
  }
  if (isError || !data) {
    return <div className="card p-8 text-center text-red-600">{(error as Error)?.message ?? 'Failed to load stats.'}</div>;
  }

  const roleData = Object.entries(data.users.byRole).map(([role, count]) => ({ name: ROLE_LABELS[role] ?? role, role, value: count }));
  const statusData = Object.entries(data.verifications.byStatus).map(([status, count]) => ({ name: status, status, value: count }));
  const completionRate = data.sessions.total ? Math.round((data.sessions.completed / data.sessions.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard icon={<Users size={20} />} label="Total users" value={data.users.total.toLocaleString()} sub={`${data.users.newLast7d} new this week`} />
        <StatCard icon={<UserPlus size={20} />} label="New (30 days)" value={data.users.newLast30d.toLocaleString()} sub={`${data.users.newLast7d} in last 7 days`} tone="green" />
        <StatCard icon={<AlertTriangle size={20} />} label="Suspended" value={data.users.suspended.toLocaleString()} sub="accounts blocked" tone={data.users.suspended ? 'red' : 'brand'} />
        <StatCard icon={<BadgeCheck size={20} />} label="Verifications" value={data.verifications.total.toLocaleString()} sub={`${data.verifications.byStatus['FLAGGED'] ?? 0} flagged`} tone="indigo" />
        <StatCard icon={<Activity size={20} />} label="Assessments" value={data.sessions.total.toLocaleString()} sub={`${completionRate}% completion rate`} />
        <StatCard icon={<ShieldCheck size={20} />} label="Active skills" value={`${data.catalog.activeSkills}/${data.catalog.skills}`} sub="in catalog" tone="green" />
        <StatCard icon={<Briefcase size={20} />} label="Jobs" value={data.catalog.jobs.toLocaleString()} sub={`${data.catalog.activeJobs} active`} tone="amber" />
        <StatCard icon={<FileText size={20} />} label="Posts" value={data.catalog.posts.toLocaleString()} sub="published" tone="indigo" />
      </div>

      {/* Signup trend */}
      <div className="card p-4 sm:p-5">
        <h3 className="font-semibold text-gray-800 text-sm mb-4 flex items-center gap-2"><Activity size={16} className="text-brand" />New signups · last 30 days</h3>
        <div className="h-48 sm:h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.signupTrend} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="signupFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0a66c2" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#0a66c2" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={(d: string) => d.slice(5)} interval={4} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={28} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e5e7eb' }} labelFormatter={(d) => `Date: ${d}`} />
              <Area type="monotone" dataKey="count" name="Signups" stroke="#0a66c2" strokeWidth={2} fill="url(#signupFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Breakdown charts */}
      <div className="grid md:grid-cols-2 gap-3 sm:gap-4">
        <div className="card p-4 sm:p-5">
          <h3 className="font-semibold text-gray-800 text-sm mb-4 flex items-center gap-2"><Users size={16} className="text-brand" />Users by role</h3>
          <div className="h-48 sm:h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={roleData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {roleData.map((d) => <Cell key={d.role} fill={ROLE_COLORS[d.role] ?? '#9ca3af'} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e5e7eb' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2 justify-center">
            {roleData.map((d) => (
              <span key={d.role} className="inline-flex items-center gap-1.5 text-xs text-gray-600">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: ROLE_COLORS[d.role] ?? '#9ca3af' }} />
                {d.name} · {d.value}
              </span>
            ))}
          </div>
        </div>

        <div className="card p-4 sm:p-5">
          <h3 className="font-semibold text-gray-800 text-sm mb-4 flex items-center gap-2"><Layers size={16} className="text-brand" />Verifications by status</h3>
          <div className="h-48 sm:h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={28} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e5e7eb' }} cursor={{ fill: '#f9fafb' }} />
                <Bar dataKey="value" name="Count" radius={[6, 6, 0, 0]}>
                  {statusData.map((d) => <Cell key={d.status} fill={STATUS_COLORS[d.status] ?? '#9ca3af'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
