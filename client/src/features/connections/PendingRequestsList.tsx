import { useAcceptRequest, useDeclineRequest, usePendingRequests } from './useConnections';
import { Link } from 'react-router-dom';
import { UserCheck, X, Loader2 } from 'lucide-react';

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
    <div className="space-y-3">
      {requests.map(r => (
        // r.connectionId  = the Connection doc _id  (used for accept/decline)
        // r.user          = the requester's public profile
        <div key={r.connectionId} className="card p-4 flex items-center gap-4">
          <Link to={`/profile/${r.user.customUrl || r.user._id}`}>
            {r.user.profilePhoto
              ? <img src={r.user.profilePhoto} alt={r.user.fullName} className="w-12 h-12 rounded-full object-cover" />
              : <div className="w-12 h-12 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold">
                  {r.user.fullName[0]}
                </div>
            }
          </Link>

          <div className="flex-1 min-w-0">
            <Link to={`/profile/${r.user.customUrl || r.user._id}`} className="font-semibold text-gray-900 hover:text-brand text-sm">
              {r.user.fullName}
            </Link>
            <p className="text-xs text-gray-500 truncate">{r.user.headline}</p>
            {r.note && <p className="text-xs text-gray-400 italic mt-0.5">"{r.note}"</p>}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => accept.mutate(r.connectionId)}
              disabled={accept.isPending}
              className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
            >
              <UserCheck size={13} /> Accept
            </button>
            <button
              onClick={() => decline.mutate(r.connectionId)}
              disabled={decline.isPending}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
