import { useState } from 'react';
import { useConnections, useRemoveConnection } from './useConnections';
import { Link, useNavigate } from 'react-router-dom';
import { Search, UserMinus, MessageSquare, Users, XCircle } from 'lucide-react';

export default function ConnectionsList() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useConnections(search);
  const connections = data?.connections ?? [];
  const remove = useRemoveConnection();
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center">
            <Users size={15} className="text-brand" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 text-sm">Your connections</h2>
            <p className="text-xs text-gray-400 mt-0.5 tabular-nums">{data?.total ?? 0} {(data?.total ?? 0) === 1 ? 'person' : 'people'}</p>
          </div>
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search connections…"
            className="input pl-9 pr-9 text-sm w-full sm:w-64"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <XCircle size={13} />
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="card p-4 flex items-center gap-3">
              <div className="skeleton w-10 h-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-3 w-28 rounded" />
                <div className="skeleton h-2.5 w-40 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : !connections.length ? (
        <div className="card p-10 text-center">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gray-100 flex items-center justify-center">
            <Users size={24} className="text-gray-400" />
          </div>
          <p className="font-semibold text-gray-700 mb-1">
            {search ? 'No matches' : 'No connections yet'}
          </p>
          <p className="text-sm text-gray-400">
            {search ? `Nothing matches "${search}"` : 'Start connecting with people to grow your network.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {connections.map(c => (
            <div key={c._id} className="card-hover p-4 flex items-center gap-3 group">
              <Link to={`/profile/${c.customUrl || c._id}`} className="shrink-0">
                {c.profilePhoto
                  ? <img src={c.profilePhoto} alt={`${c.firstName} ${c.lastName}`} className="w-11 h-11 rounded-full object-cover ring-2 ring-gray-50 group-hover:ring-brand/20 transition-all" />
                  : <div className="w-11 h-11 rounded-full bg-paper-sunk flex items-center justify-center text-brand font-bold ring-2 ring-gray-50 group-hover:ring-brand/20 transition-all">
                      {c.firstName[0]}
                    </div>
                }
              </Link>

              <div className="flex-1 min-w-0">
                <Link
                  to={`/profile/${c.customUrl || c._id}`}
                  className="font-semibold text-gray-900 hover:text-brand text-sm block truncate transition-colors"
                >
                  {c.firstName} {c.lastName}
                </Link>
                <p className="text-xs text-gray-500 truncate">{c.headline}</p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => navigate(`/messages?userId=${c._id}`)}
                  title="Message"
                  className="flex items-center gap-1 text-[11px] font-medium text-gray-500 hover:text-brand hover:bg-brand/10 px-2 py-1.5 rounded-lg transition-colors"
                >
                  <MessageSquare size={13} />
                  <span className="hidden sm:inline">Message</span>
                </button>

                <button
                  onClick={() => remove.mutate(c._id)}
                  disabled={remove.isPending}
                  title="Remove connection"
                  className="flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-red-500 hover:bg-red-50 px-2 py-1.5 rounded-lg transition-colors"
                >
                  <UserMinus size={13} />
                  <span className="hidden sm:inline">Remove</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
