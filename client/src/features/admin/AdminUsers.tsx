import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Search, Users as UsersIcon } from 'lucide-react';
import { useAdminUsers, type UserListParams } from './adminApi';
import { RoleBadge, StatusBadge, Pagination, timeAgo } from './adminUi';
import AdminUserDrawer from './AdminUserDrawer';

const ROLE_FILTERS = [
  { v: '', label: 'All roles' },
  { v: 'candidate', label: 'Candidates' },
  { v: 'recruiter', label: 'Recruiters' },
  { v: 'company_admin', label: 'Company admins' },
  { v: 'platform_admin', label: 'Admins' },
];
const STATUS_FILTERS = [
  { v: '', label: 'All' },
  { v: 'active', label: 'Active' },
  { v: 'suspended', label: 'Suspended' },
];

export default function AdminUsers() {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);

  // Debounce the search box so we don't fire a request per keystroke.
  const onSearch = (val: string) => {
    setSearch(val);
    window.clearTimeout((onSearch as unknown as { t?: number }).t);
    (onSearch as unknown as { t?: number }).t = window.setTimeout(() => { setDebounced(val); setPage(1); }, 350);
  };

  const params: UserListParams = { page, limit: 20, search: debounced || undefined, role: role || undefined, status: status || undefined };
  const { data, isLoading, isError, error } = useAdminUsers(params);

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Search by name or email…" className="input pl-9" />
        </div>
        <select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} className="input sm:w-44">
          {ROLE_FILTERS.map((f) => <option key={f.v} value={f.v}>{f.label}</option>)}
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="input sm:w-36">
          {STATUS_FILTERS.map((f) => <option key={f.v} value={f.v}>{f.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wide bg-gray-50/70 border-b border-gray-100">
                <th className="px-3 sm:px-4 py-3 font-semibold">User</th>
                <th className="px-3 sm:px-4 py-3 font-semibold">Role</th>
                <th className="px-3 sm:px-4 py-3 font-semibold">Status</th>
                <th className="px-3 sm:px-4 py-3 font-semibold hidden md:table-cell">Connections</th>
                <th className="px-3 sm:px-4 py-3 font-semibold hidden md:table-cell">Last login</th>
                <th className="px-3 sm:px-4 py-3 font-semibold hidden lg:table-cell">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading && Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}><td colSpan={6} className="px-3 sm:px-4 py-3"><div className="h-8 skeleton rounded-lg" /></td></tr>
              ))}
              {isError && <tr><td colSpan={6} className="px-3 sm:px-4 py-10 text-center text-red-600">{(error as Error)?.message ?? 'Failed to load users.'}</td></tr>}
              {data && data.items.length === 0 && (
                <tr><td colSpan={6} className="px-3 sm:px-4 py-12 text-center text-gray-400">
                  <UsersIcon size={32} className="mx-auto mb-2 opacity-30" />No users match these filters.
                </td></tr>
              )}
              {data?.items.map((u) => (
                <tr key={u._id} onClick={() => setSelected(u._id)} className="hover:bg-brand/5 cursor-pointer transition-colors">
                  <td className="px-3 sm:px-4 py-3 max-w-0 sm:max-w-none">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {u.profilePhoto
                        ? <img src={u.profilePhoto} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                        : <div className="w-9 h-9 rounded-full bg-brand/10 flex items-center justify-center text-brand font-semibold text-xs shrink-0">{u.firstName[0]}{u.lastName[0]}</div>}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 truncate">{u.firstName} {u.lastName}</p>
                        <p className="text-xs text-gray-400 truncate">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 sm:px-4 py-3 whitespace-nowrap"><RoleBadge role={u.role} /></td>
                  <td className="px-3 sm:px-4 py-3 whitespace-nowrap"><StatusBadge status={u.status} /></td>
                  <td className="px-3 sm:px-4 py-3 text-gray-600 hidden md:table-cell">{u.connectionCount}</td>
                  <td className="px-3 sm:px-4 py-3 text-gray-500 hidden md:table-cell whitespace-nowrap">{timeAgo(u.lastLoginAt)}</td>
                  <td className="px-3 sm:px-4 py-3 text-gray-500 hidden lg:table-cell whitespace-nowrap">{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && <div className="border-t border-gray-100"><Pagination page={data.page} totalPages={data.totalPages} total={data.total} onChange={setPage} /></div>}
      </div>

      <AnimatePresence>
        {selected && <AdminUserDrawer userId={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </div>
  );
}
