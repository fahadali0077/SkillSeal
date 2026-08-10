// ─────────────────────────────────────────────────────────────────────────────
// PeopleSearchResults.tsx
// Renders the people-search results panel on the Network page. Each row shows
// avatar / name / headline / mutual count / "matched on" hint, plus an inline
// ConnectionButton so Connect / Pending / Withdraw / Accept work right there
// without navigating to the target profile.
// ─────────────────────────────────────────────────────────────────────────────
import { Link } from 'react-router-dom';
import { Loader2, Search as SearchIcon, Users, AtSign, Sparkles } from 'lucide-react';
import { usePeopleSearch } from './useConnections';
import ConnectionButton from './ConnectionButton';

interface Props {
  q: string;
}

export default function PeopleSearchResults({ q }: Props) {
  const trimmed = q.trim();
  const { data, isLoading, isFetching } = usePeopleSearch(trimmed);

  // Too short to search — friendly prompt
  if (trimmed.length < 2) {
    return (
      <div className="card p-10 text-center">
        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gray-100 flex items-center justify-center">
          <SearchIcon size={24} className="text-gray-400" />
        </div>
        <p className="font-semibold text-gray-700 mb-1">Find people on SkillSeal</p>
        <p className="text-sm text-gray-400">Type at least 2 characters to search by name, headline, or skill.</p>
      </div>
    );
  }

  // Initial loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card p-4 flex items-center gap-3">
            <div className="skeleton w-12 h-12 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-3 w-40 rounded" />
              <div className="skeleton h-2.5 w-56 rounded" />
            </div>
            <div className="skeleton h-9 w-24 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  const results = data?.results ?? [];
  const total = data?.total ?? 0;

  if (results.length === 0) {
    return (
      <div className="card p-10 text-center">
        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gray-100 flex items-center justify-center">
          <Users size={24} className="text-gray-400" />
        </div>
        <p className="font-semibold text-gray-700 mb-1">No results</p>
        <p className="text-sm text-gray-400">
          Nothing matches <span className="font-medium text-gray-600">"{trimmed}"</span>. Try a different name, headline, or skill.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header — count + spinner while refetching */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 tabular-nums">
          {total} {total === 1 ? 'result' : 'results'} for <span className="font-semibold text-gray-900">"{trimmed}"</span>
        </p>
        {isFetching && <Loader2 size={14} className="animate-spin text-gray-400" />}
      </div>

      {/* Result rows */}
      <div className="space-y-2.5">
        {results.map((r) => (
          <div key={r.userId} className="card p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
            {/* Avatar */}
            <Link to={`/profile/${r.customUrl || r.userId}`} className="shrink-0">
              {r.profilePhoto ? (
                <img
                  src={r.profilePhoto}
                  alt={r.fullName}
                  className="w-12 h-12 rounded-full object-cover bg-gray-100"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-paper-sunk flex items-center justify-center font-semibold text-brand text-sm">
                  {r.firstName.charAt(0)}{r.lastName.charAt(0)}
                </div>
              )}
            </Link>

            {/* Identity */}
            <div className="flex-1 min-w-0">
              <Link
                to={`/profile/${r.customUrl || r.userId}`}
                className="font-semibold text-gray-900 text-sm hover:text-brand truncate block"
              >
                {r.fullName}
              </Link>
              {r.headline && (
                <p className="text-xs text-gray-500 truncate">{r.headline}</p>
              )}
              <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-400">
                {r.mutualCount > 0 && (
                  <span className="flex items-center gap-1">
                    <Users size={11} />
                    {r.mutualCount} mutual
                  </span>
                )}
                <MatchBadge matchedOn={r.matchedOn} />
              </div>
            </div>

            {/* Action button — same component used on profile pages */}
            <div className="shrink-0">
              <ConnectionButton
                targetUserId={r.userId}
                connectionStatus={r.connectionStatus}
                connectionId={r.connectionId}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MatchBadge({ matchedOn }: { matchedOn: 'name' | 'headline' | 'skill' }) {
  const map = {
    name:     { icon: <Users size={11} />,    label: 'Name match' },
    headline: { icon: <AtSign size={11} />,   label: 'Headline match' },
    skill:    { icon: <Sparkles size={11} />, label: 'Skill match' },
  } as const;
  const m = map[matchedOn];
  return (
    <span className="flex items-center gap-1 text-gray-400">
      {m.icon}
      {m.label}
    </span>
  );
}
