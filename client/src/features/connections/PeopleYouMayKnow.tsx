import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSuggestions, useSendRequest } from './useConnections';
import { connKeys } from './useConnections';
import { Link } from 'react-router-dom';
import { UserPlus, Loader2, Users } from 'lucide-react';

export default function PeopleYouMayKnow() {
  const { data: suggestions = [], isLoading } = useSuggestions();
  const send = useSendRequest();
  const qc   = useQueryClient();

  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const visibleSuggestions = suggestions.filter(s => !sentIds.has(s.userId));

  const handleConnect = (userId: string) => {
    send.mutate(
      { recipientId: userId },
      {
        onSuccess: () => {
          setSentIds(prev => new Set(prev).add(userId));
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
    <div className="card p-10 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Users size={28} className="text-gray-300" />
      </div>
      <p className="font-medium text-gray-600 mb-1">No suggestions yet</p>
      <p className="text-sm text-gray-400">As your network grows, we'll suggest people you may know.</p>
    </div>
  );

  return (
    <div>
      {/* FIX 3 — section header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900">People you may know</h2>
        <span className="text-xs text-gray-400">{visibleSuggestions.length} suggestions</span>
      </div>

      <div className="grid gap-3">
        {visibleSuggestions.map(s => (
          /* FIX 3 — hover state + border accent */
          <div key={s.userId} className="card p-4 flex items-start gap-3 hover:shadow-md hover:border-brand/20 transition-all group">
            <Link to={`/profile/${s.customUrl || s.userId}`} className="shrink-0">
              {s.profilePhoto
                ? <img src={s.profilePhoto} alt={`${s.firstName} ${s.lastName}`}
                       className="w-10 h-10 rounded-full object-cover" />
                : <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold">
                    {s.firstName[0]}
                  </div>
              }
            </Link>

            <div className="flex-1 min-w-0">
              <Link
                to={`/profile/${s.customUrl || s.userId}`}
                className="font-semibold text-gray-900 hover:text-brand text-sm"
              >
                {s.firstName} {s.lastName}
              </Link>
              <p className="text-xs text-gray-500 truncate">{s.headline}</p>
              {s.mutualCount > 0 && (
                <p className="text-xs text-gray-400">
                  {s.mutualCount} mutual connection{s.mutualCount > 1 ? 's' : ''}
                </p>
              )}
            </div>

            <button
              onClick={() => handleConnect(s.userId)}
              disabled={send.isPending}
              className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1 shrink-0"
            >
              <UserPlus size={13} /> Connect
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
