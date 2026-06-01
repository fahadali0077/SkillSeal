import { useState } from 'react';
import toast from 'react-hot-toast';
import { Briefcase, FileText, Trash2, XCircle, CheckCircle2 } from 'lucide-react';
import {
  useAdminJobs, useSetJobStatus, useAdminPosts, useDeletePost,
  type JobListParams, type PostListParams,
} from './adminApi';
import { Pagination } from './adminUi';
import ConfirmDialog from '../../components/ConfirmDialog';

function JobsPanel() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const params: JobListParams = { page, limit: 20, status: status || undefined };
  const { data, isLoading } = useAdminJobs(params);
  const setJobStatus = useSetJobStatus();

  const update = (id: string, next: string) => setJobStatus.mutate({ id, status: next }, {
    onSuccess: () => toast.success(`Job ${next}`),
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="input sm:w-44">
          <option value="">All jobs</option><option value="active">Active</option><option value="closed">Closed</option><option value="draft">Draft</option>
        </select>
      </div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-gray-500 uppercase tracking-wide bg-gray-50/70 border-b border-gray-100">
              <th className="px-3 sm:px-4 py-3 font-semibold">Title</th>
              <th className="px-3 sm:px-4 py-3 font-semibold hidden md:table-cell">Company</th>
              <th className="px-3 sm:px-4 py-3 font-semibold hidden lg:table-cell">Recruiter</th>
              <th className="px-3 sm:px-4 py-3 font-semibold">Status</th>
              <th className="px-3 sm:px-4 py-3 font-semibold text-right">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading && Array.from({ length: 6 }).map((_, i) => <tr key={i}><td colSpan={5} className="px-3 sm:px-4 py-3"><div className="h-8 skeleton rounded-lg" /></td></tr>)}
              {data && data.items.length === 0 && <tr><td colSpan={5} className="px-3 sm:px-4 py-12 text-center text-gray-400"><Briefcase size={32} className="mx-auto mb-2 opacity-30" />No jobs found.</td></tr>}
              {data?.items.map((j) => (
                <tr key={j._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 sm:px-4 py-3 max-w-0 sm:max-w-none">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{j.title}</p>
                      <p className="text-xs text-gray-400 truncate">{j.employmentType} · {j.workType}{j.location ? ` · ${j.location}` : ''}</p>
                    </div>
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-gray-600 hidden md:table-cell truncate max-w-[200px]">{j.companyName}</td>
                  <td className="px-3 sm:px-4 py-3 text-gray-600 hidden lg:table-cell truncate max-w-[180px]">{j.recruiterName}</td>
                  <td className="px-3 sm:px-4 py-3"><span className={j.status === 'active' ? 'badge-success' : j.status === 'closed' ? 'badge-neutral' : 'badge-warning'}>{j.status}</span></td>
                  <td className="px-3 sm:px-4 py-3 text-right">
                    {j.status === 'active' ? (
                      <button onClick={() => update(j._id, 'closed')} className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 hover:bg-amber-50 px-2.5 py-1.5 rounded-lg"><XCircle size={13} /><span className="hidden sm:inline">Close</span></button>
                    ) : (
                      <button onClick={() => update(j._id, 'active')} className="inline-flex items-center gap-1 text-xs font-medium text-green-600 hover:bg-green-50 px-2.5 py-1.5 rounded-lg"><CheckCircle2 size={13} /><span className="hidden sm:inline">Reopen</span></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && <div className="border-t border-gray-100"><Pagination page={data.page} totalPages={data.totalPages} total={data.total} onChange={setPage} /></div>}
      </div>
    </div>
  );
}

function PostsPanel() {
  const [page, setPage] = useState(1);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [target, setTarget] = useState<string | null>(null);
  const params: PostListParams = { page, limit: 20, includeDeleted };
  const { data, isLoading } = useAdminPosts(params);
  const del = useDeletePost();

  const doDelete = () => {
    if (!target) return;
    del.mutate(target, {
      onSuccess: () => { toast.success('Post removed'); setTarget(null); },
      onError: (e) => toast.error((e as Error).message),
    });
  };

  return (
    <div>
      <label className="flex items-center gap-2 mb-4 text-sm text-gray-600 cursor-pointer">
        <input type="checkbox" checked={includeDeleted} onChange={(e) => { setIncludeDeleted(e.target.checked); setPage(1); }} className="rounded border-gray-300 text-brand focus:ring-brand/30" />
        Show already-removed posts
      </label>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-gray-500 uppercase tracking-wide bg-gray-50/70 border-b border-gray-100">
              <th className="px-3 sm:px-4 py-3 font-semibold">Author</th>
              <th className="px-3 sm:px-4 py-3 font-semibold">Content</th>
              <th className="px-3 sm:px-4 py-3 font-semibold hidden md:table-cell">Engagement</th>
              <th className="px-3 sm:px-4 py-3 font-semibold text-right">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading && Array.from({ length: 6 }).map((_, i) => <tr key={i}><td colSpan={4} className="px-3 sm:px-4 py-3"><div className="h-8 skeleton rounded-lg" /></td></tr>)}
              {data && data.items.length === 0 && <tr><td colSpan={4} className="px-3 sm:px-4 py-12 text-center text-gray-400"><FileText size={32} className="mx-auto mb-2 opacity-30" />No posts found.</td></tr>}
              {data?.items.map((p) => (
                <tr key={p._id} className={`hover:bg-gray-50 transition-colors ${p.isDeleted ? 'opacity-50' : ''}`}>
                  <td className="px-3 sm:px-4 py-3 font-medium text-gray-900 whitespace-nowrap max-w-[120px] sm:max-w-none truncate">{p.authorName}</td>
                  <td className="px-3 sm:px-4 py-3 text-gray-600 max-w-[160px] sm:max-w-xs"><p className="truncate">{p.content || <span className="italic text-gray-400">({p.type})</span>}</p></td>
                  <td className="px-3 sm:px-4 py-3 text-gray-500 hidden md:table-cell whitespace-nowrap">{p.likeCount} likes · {p.commentCount} comments</td>
                  <td className="px-3 sm:px-4 py-3 text-right">
                    {p.isDeleted ? <span className="badge-neutral">Removed</span> : (
                      <button onClick={() => setTarget(p._id)} className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg"><Trash2 size={13} /><span className="hidden sm:inline">Remove</span></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && <div className="border-t border-gray-100"><Pagination page={data.page} totalPages={data.totalPages} total={data.total} onChange={setPage} /></div>}
      </div>
      <ConfirmDialog open={!!target} variant="danger" title="Remove this post?" message="The post is soft-deleted and hidden from all feeds. This action is logged."
        confirmLabel="Remove post" loading={del.isPending} onConfirm={doDelete} onCancel={() => setTarget(null)} />
    </div>
  );
}

export default function AdminModeration() {
  const [tab, setTab] = useState<'jobs' | 'posts'>('jobs');
  return (
    <div>
      <div className="inline-flex bg-gray-100 rounded-xl p-1 mb-4">
        <button onClick={() => setTab('jobs')} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === 'jobs' ? 'bg-white text-brand shadow-sm' : 'text-gray-500'}`}><Briefcase size={15} />Jobs</button>
        <button onClick={() => setTab('posts')} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === 'posts' ? 'bg-white text-brand shadow-sm' : 'text-gray-500'}`}><FileText size={15} />Posts</button>
      </div>
      {tab === 'jobs' ? <JobsPanel /> : <PostsPanel />}
    </div>
  );
}
