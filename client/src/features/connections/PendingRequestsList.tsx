import { useAcceptRequest, useDeclineRequest, usePendingRequests } from './useConnections';
import { Link } from 'react-router-dom';
import { UserCheck, Clock, Mail } from 'lucide-react';

export default function PendingRequestsList() {
  const { data: requests = [], isLoading } = usePendingRequests();
  const accept  = useAcceptRequest();
  const decline = useDeclineRequest();

  if (isLoading) return (
    <div className="space-y-3">
      {[0, 1, 2].map(i => (
        <div key={i} className="card p-4 flex items-center gap-4">
          <div className="skeleton w-12 h-12 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3 w-32 rounded" />
            <div className="skeleton h-2.5 w-44 rounded" />
          </div>
          <div className="flex gap-2">
            <div className="skeleton w-20 h-8 rounded-xl" />
            <div className="skeleton w-16 h-8 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );

  if (!requests.length) return (
    <div className="card p-10 text-center">
      <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gray-100 flex items-center justify-center">
        <Mail size={24} className="text-gray-400" />
      </div>
      <p className="font-semibold text-gray-700 mb-1">No pending invitations</p>
      <p className="text-sm text-gray-400">When people invite you to connect, they'll show up here.</p>
    </div>
  );

  return (
    <div>
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
          <Clock size={15} className="text-amber-600" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900 text-sm">Pending invitations</h2>
          <p className="text-xs text-gray-400 tabular-nums">{requests.length} waiting for your response</p>
        </div>
      </div>

      <div className="space-y-3">
        {requests.map(r => (
          <div key={r.connectionId} className="card p-4 flex items-start sm:items-center gap-3 sm:gap-4 group hover:border-brand/30 transition-colors">
            <Link to={`/profile/${r.user.customUrl || r.user._id}`} className="shrink-0">
              {r.user.profilePhoto
                ? <img src={r.user.profilePhoto} alt={r.user.fullName} className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-50 group-hover:ring-brand/20 transition-all" />
                : <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand/15 to-brand/5 flex items-center justify-center text-brand font-bold ring-2 ring-gray-50 group-hover:ring-brand/20 transition-all">
                    {r.user.fullName[0]}
                  </div>
              }
            </Link>

            <div className="flex-1 min-w-0">
              <Link
                to={`/profile/${r.user.customUrl || r.user._id}`}
                className="font-semibold text-gray-900 hover:text-brand text-sm transition-colors"
              >
                {r.user.fullName}
              </Link>
              <p className="text-xs text-gray-500 truncate">{r.user.headline}</p>

              {r.note && (
                <p className="text-xs text-gray-600 italic mt-2 bg-gray-50 rounded-lg px-3 py-2 border-l-2 border-brand/40 leading-relaxed">
                  "{r.note}"
                </p>
              )}
            </div>

            <div className="flex gap-2 shrink-0 flex-col sm:flex-row">
              <button
                onClick={() => accept.mutate(r.connectionId)}
                disabled={accept.isPending}
                className="inline-flex items-center justify-center gap-1.5 bg-brand text-white text-xs font-semibold px-3 py-2 rounded-xl hover:bg-brand-dark active:scale-[0.98] transition-all disabled:opacity-50"
                style={{ boxShadow: '0 1px 2px rgba(37,99,235,0.2)' }}
              >
                <UserCheck size={13} /> Accept
              </button>
              <button
                onClick={() => decline.mutate(r.connectionId)}
                disabled={decline.isPending}
                className="inline-flex items-center justify-center gap-1.5 text-xs font-medium text-gray-600 border border-gray-200 bg-white px-3 py-2 rounded-xl hover:bg-gray-50 hover:border-gray-300 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                Ignore
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
