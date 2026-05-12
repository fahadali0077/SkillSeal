import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSuggestions, useSendRequest } from './useConnections';
import { connKeys } from './useConnections';
import { Link } from 'react-router-dom';
import { UserPlus, Clock, Loader2 } from 'lucide-react';

export default function PeopleYouMayKnow() {
  const { data: suggestions = [], isLoading } = useSuggestions();
  const send = useSendRequest();
  const qc   = useQueryClient();

  // Track sent requests locally so the card disappears immediately
  // and the suggestion query is busted right away.
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  // Bug 6 fix: filter out already-sent users so cards vanish on click
  const visibleSuggestions = suggestions.filter(s => !sentIds.has(s.userId));

  const handleConnect = (userId: string) => {
    send.mutate(
      { recipientId: userId },
      {
        onSuccess: () => {
          setSentIds(prev => new Set(prev).add(userId));
          // Immediately invalidate suggestions so the next render has fresh data
          qc.invalidateQueries({ queryKey: connKeys.suggestions() });
        },
      },
    );
  };

  if (isLoading) return (
    <div className="flex justify-center py-8">
      <Loader2 size={20} className="animate-spin text-gray-300" />
    </div>
  );

  if (!visibleSuggestions.length) return (
    <div className="card p-8 text-center text-gray-400">
      <p>No suggestions right now.</p>
    </div>
  );

  return (
    <div className="grid gap-3">
      {visibleSuggestions.map(s => (
        <div key={s.userId} className="card p-4 flex items-center gap-3">
          <Link to={`/profile/${s.customUrl || s.userId}`}>
            {s.profilePhoto
              ? <img src={s.profilePhoto} alt={`${s.firstName} ${s.lastName}`}
                     className="w-10 h-10 rounded-full object-cover" />
              : <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold">
                  {s.firstName[0]}
                </div>
            }
          </Link>

          <div className="flex-1 min-w-0">
            <Link to={`/profile/${s.customUrl || s.userId}`}
                  className="font-semibold text-gray-900 hover:text-brand text-sm">
              {s.firstName} {s.lastName}
            </Link>
            <p className="text-xs text-gray-500 truncate">{s.headline}</p>
            {/* Bug 4 fix: use s.mutualCount (server field name) */}
            {s.mutualCount > 0 && (
              <p className="text-xs text-gray-400">
                {s.mutualCount} mutual connection{s.mutualCount > 1 ? 's' : ''}
              </p>
            )}
          </div>

          <button
            onClick={() => handleConnect(s.userId)}
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
