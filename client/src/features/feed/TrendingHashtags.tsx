import { Link } from 'react-router-dom';
import { TrendingUp, Hash } from 'lucide-react';
import { useTrendingHashtags } from './useFeed';

export default function TrendingHashtags() {
  const { data: trending = [], isLoading } = useTrendingHashtags();

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-100 to-amber-50 flex items-center justify-center">
          <TrendingUp size={15} className="text-amber-600" />
        </div>
        <h3 className="font-semibold text-gray-900 text-sm">Trending in your network</h3>
      </div>

      {isLoading ? (
        <div className="space-y-2.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="skeleton w-4 h-3 rounded" />
              <div className="skeleton h-3 flex-1 rounded" />
              <div className="skeleton h-2.5 w-10 rounded" />
            </div>
          ))}
        </div>
      ) : trending.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">No trending hashtags yet</p>
      ) : (
        <ul className="space-y-1">
          {trending.map((item, i) => (
            <li key={item.tag}>
              <Link
                to={`/hashtag/${item.tag}`}
                className="flex items-center justify-between group p-2 -mx-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`text-xs w-4 text-center font-bold tabular-nums shrink-0 ${i < 3 ? 'text-amber-600' : 'text-gray-300'}`}>
                    {i + 1}
                  </span>
                  <span className="flex items-center gap-0.5 text-sm font-medium text-gray-800 group-hover:text-brand transition-colors truncate">
                    <Hash size={12} className="text-brand shrink-0" />
                    <span className="truncate">{item.tag}</span>
                  </span>
                </div>
                <span className="text-xs text-gray-400 shrink-0 ml-2 tabular-nums">{item.count} post{item.count !== 1 ? 's' : ''}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
