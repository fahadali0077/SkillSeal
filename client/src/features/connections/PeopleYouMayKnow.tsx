import { useSuggestions, useSendRequest } from './useConnections';
import { Link } from 'react-router-dom';
import { UserPlus, Loader2 } from 'lucide-react';

export default function PeopleYouMayKnow() {
  const { data: suggestions = [], isLoading } = useSuggestions();
  const send = useSendRequest();

  if (isLoading) return (
    <div className="flex justify-center py-8">
      <Loader2 size={20} className="animate-spin text-gray-300" />
    </div>
  );

  if (!suggestions.length) return (
    <div className="card p-8 text-center text-gray-400">
      <p>No suggestions right now.</p>
    </div>
  );

  return (
    <div className="grid gap-3">
      {suggestions.map(s => (
        <div key={s.userId} className="card p-4 flex items-center gap-3">
          <Link to={`/profile/${s.customUrl || s.userId}`}>
            {s.profilePhoto
              ? <img src={s.profilePhoto} alt={`${s.firstName} ${s.lastName}`} className="w-10 h-10 rounded-full object-cover" />
              : <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold">{s.firstName[0]}</div>
            }
          </Link>
          <div className="flex-1 min-w-0">
            <Link to={`/profile/${s.customUrl || s.userId}`} className="font-semibold text-gray-900 hover:text-brand text-sm">
              {s.firstName} {s.lastName}
            </Link>
            <p className="text-xs text-gray-500 truncate">{s.headline}</p>
            {s.mutualConnections > 0 && (
              <p className="text-xs text-gray-400">{s.mutualConnections} mutual connection{s.mutualConnections > 1 ? 's' : ''}</p>
            )}
          </div>
          <button
            onClick={() => send.mutate({ recipientId: s.userId })}
            disabled={send.isPending}
            className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
          >
            <UserPlus size={13} /> Connect
          </button>
        </div>
      ))}
    </div>
  );
}
