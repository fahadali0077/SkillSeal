import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSuggestions, useSendRequest, connKeys } from './useConnections';
import { Link } from 'react-router-dom';
import { UserPlus, Loader2, Users, X } from 'lucide-react';

export default function PeopleYouMayKnow() {
  const { data: suggestions = [], isLoading } = useSuggestions();
  const send = useSendRequest();
  const qc   = useQueryClient();

  const [sentIds,      setSentIds]      = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const visible = suggestions.filter(
    (s) => !sentIds.has(s.userId) && !dismissedIds.has(s.userId),
  );

  const handleConnect = (userId: string) => {
    send.mutate(
      { recipientId: userId },
      {
        onSuccess: () => {
          setSentIds((prev) => new Set(prev).add(userId));
          qc.invalidateQueries({ queryKey: connKeys.suggestions() });
        },
      },
    );
  };

  const handleDismiss = (userId: string) => {
    setDismissedIds((prev) => new Set(prev).add(userId));
  };

  if (isLoading) return (
    <div className="flex justify-center py-8">
      <Loader2 size={20} className="animate-spin text-gray-300" />
    </div>
  );

  if (!visible.length) return (
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
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900">People you may know</h2>
        <span className="text-xs text-gray-400">{visible.length} suggestions</span>
      </div>

      {/* Horizontally scrollable card row */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scroll-smooth">
        {visible.map((s) => {
          const initials = `${s.firstName[0] ?? ''}${s.lastName[0] ?? ''}`.toUpperCase();
          const profileUrl = `/profile/${s.customUrl || s.userId}`;

          return (
            <div
              key={s.userId}
              className="relative shrink-0 w-44 snap-start bg-white border border-gray-200 rounded-2xl overflow-hidden flex flex-col hover:shadow-md hover:border-brand/30 transition-all"
            >
              {/* Dismiss button */}
              <button
                onClick={() => handleDismiss(s.userId)}
                className="absolute top-2 right-2 z-10 w-6 h-6 bg-white/80 hover:bg-white rounded-full flex items-center justify-center text-gray-500 hover:text-gray-800 shadow-sm transition-colors"
                aria-label="Dismiss"
              >
                <X size={13} />
              </button>

              {/* Banner */}
              <div className="h-14 bg-gradient-to-br from-brand/70 to-brand/40 shrink-0" />

              {/* Avatar — overlaps banner */}
              <div className="flex justify-center -mt-8 px-4 shrink-0">
                <Link to={profileUrl}>
                  {s.profilePhoto
                    ? <img
                        src={s.profilePhoto}
                        alt={`${s.firstName} ${s.lastName}`}
                        className="w-16 h-16 rounded-full object-cover border-2 border-white shadow"
                      />
                    : <div className="w-16 h-16 rounded-full bg-brand/10 border-2 border-white shadow flex items-center justify-center font-bold text-brand text-lg">
                        {initials}
                      </div>
                  }
                </Link>
              </div>

              {/* Info */}
              <div className="px-3 pt-2 pb-1 text-center flex-1 flex flex-col">
                <Link
                  to={profileUrl}
                  className="font-semibold text-gray-900 hover:text-brand text-sm leading-tight line-clamp-1"
                >
                  {s.firstName} {s.lastName}
                </Link>

                {s.headline && (
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-tight">
                    {s.headline}
                  </p>
                )}

                {/* Mutual / reason row */}
                {s.mutualCount > 0 && (
                  <div className="flex items-center justify-center gap-1.5 mt-2">
                    <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                      <Users size={10} className="text-gray-500" />
                    </div>
                    <p className="text-[11px] text-gray-500 leading-tight line-clamp-2 text-left">
                      {s.mutualCount} mutual connection{s.mutualCount > 1 ? 's' : ''}
                    </p>
                  </div>
                )}

                <div className="flex-1" />
              </div>

              {/* Connect button */}
              <div className="px-3 pb-3 pt-2">
                <button
                  onClick={() => handleConnect(s.userId)}
                  disabled={send.isPending}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-full border-2 border-brand text-brand text-xs font-semibold hover:bg-brand hover:text-white transition-colors disabled:opacity-50"
                >
                  <UserPlus size={13} />
                  Connect
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
