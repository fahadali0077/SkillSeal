import { useState } from 'react';
import { useConnections, useRemoveConnection } from './useConnections';
import { Link } from 'react-router-dom';
import { Search, UserMinus, Loader2 } from 'lucide-react';

export default function ConnectionsList() {
  const [search, setSearch] = useState('');

  // Backend returns { connections: UserMini[], total: number }
  // apiFetch unwraps the `data` envelope, so useConnections().data is that object.
  const { data, isLoading } = useConnections(search);
  const connections = data?.connections ?? [];

  const remove = useRemoveConnection();

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search connections…"
          className="input pl-9 text-sm w-full max-w-xs"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 size={20} className="animate-spin text-gray-300" />
        </div>
      ) : !connections.length ? (
        <div className="card p-10 text-center text-gray-400">
          <p>No connections yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {connections.map(c => (
            <div key={c._id} className="card p-4 flex items-center gap-3">
              <Link to={`/profile/${c.customUrl || c._id}`}>
                {c.profilePhoto
                  ? <img src={c.profilePhoto} alt={`${c.firstName} ${c.lastName}`} className="w-10 h-10 rounded-full object-cover" />
                  : <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold">
                      {c.firstName[0]}
                    </div>
                }
              </Link>
              <div className="flex-1 min-w-0">
                <Link to={`/profile/${c.customUrl || c._id}`} className="font-semibold text-gray-900 hover:text-brand text-sm">
                  {c.firstName} {c.lastName}
                </Link>
                <p className="text-xs text-gray-500 truncate">{c.headline}</p>
              </div>
              <button
                onClick={() => remove.mutate(c._id)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-500"
              >
                <UserMinus size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
