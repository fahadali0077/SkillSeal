import { useAcceptRequest, useDeclineRequest, usePendingRequests } from './useConnections';
import { Link } from 'react-router-dom';
import { UserCheck, Loader2 } from 'lucide-react';

export default function PendingRequestsList() {
  const { data: requests = [], isLoading } = usePendingRequests();
  const accept  = useAcceptRequest();
  const decline = useDeclineRequest();

  if (isLoading) return (
    <div className="flex justify-center py-8">
      <Loader2 size={20} className="animate-spin text-gray-300" />
    </div>
  );

  if (!requests.length) return (
    <div className="card p-10 text-center text-gray-400">
      <p>No pending invitations.</p>
    </div>
  );

  return (
    <div>
      {/* FIX 4 — section header with count badge */}
      <div className="flex items-center gap-2 mb-4">
        <h2 className="font-semibold text-gray-900">Pending invitations</h2>
        <span className="bg-brand text-white text-[10px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
          {requests.length}
        </span>
      </div>

      <div className="space-y-3">
        {requests.map(r => (
          <div key={r.connectionId} className="card p-4 flex items-center gap-4">
            <Link to={`/profile/${r.user.customUrl || r.user._id}`} className="shrink-0">
              {r.user.profilePhoto
                ? <img src={r.user.profilePhoto} alt={r.user.fullName} className="w-12 h-12 rounded-full object-cover" />
                : <div className="w-12 h-12 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold">
                    {r.user.fullName[0]}
                  </div>
              }
            </Link>

            <div className="flex-1 min-w-0">
              <Link
                to={`/profile/${r.user.customUrl || r.user._id}`}
                className="font-semibold text-gray-900 hover:text-brand text-sm"
              >
                {r.user.fullName}
              </Link>
              <p className="text-xs text-gray-500 truncate">{r.user.headline}</p>

              {/* FIX 4 — styled note quote */}
              {r.note && (
                <p className="text-xs text-gray-500 italic mt-1.5 bg-gray-50 rounded-lg px-3 py-2 border-l-2 border-gray-200">
                  "{r.note}"
                </p>
              )}
            </div>

            {/* FIX 4 — labelled Accept + Ignore buttons */}
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => accept.mutate(r.connectionId)}
                disabled={accept.isPending}
                className="flex items-center gap-1.5 bg-brand text-white text-xs font-semibold px-3 py-2 rounded-xl hover:bg-brand-dark transition-colors disabled:opacity-50"
              >
                <UserCheck size={13} /> Accept
              </button>
              <button
                onClick={() => decline.mutate(r.connectionId)}
                disabled={decline.isPending}
                className="flex items-center gap-1.5 text-xs font-medium text-gray-500 border border-gray-200 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
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
