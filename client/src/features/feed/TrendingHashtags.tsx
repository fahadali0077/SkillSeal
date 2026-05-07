import { Link } from 'react-router-dom';
import { TrendingUp, Hash, Loader2 } from 'lucide-react';
import { useTrendingHashtags } from './useFeed';

export default function TrendingHashtags() {
  const { data: trending = [], isLoading } = useTrendingHashtags();

  return (
    <div className="card p-4">
      <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2 mb-3">
        <TrendingUp size={15} className="text-gray-400" /> Trending in your network
      </h3>

      {isLoading ? (
        <div className="flex justify-center py-4 text-gray-300">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : trending.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-2">No trending hashtags yet</p>
      ) : (
        <ul className="space-y-2.5">
          {trending.map((item, i) => (
            <li key={item.tag}>
              <Link
                to={`/hashtag/${item.tag}`}
                className="flex items-center justify-between group"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-300 w-4 text-right font-medium">{i + 1}</span>
                  <span className="flex items-center gap-0.5 text-sm font-medium text-gray-800 group-hover:text-brand transition-colors">
                    <Hash size={12} className="text-brand" />{item.tag}
                  </span>
                </div>
                <span className="text-xs text-gray-400">{item.count} post{item.count !== 1 ? 's' : ''}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
