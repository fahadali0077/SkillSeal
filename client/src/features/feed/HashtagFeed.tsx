import { useSEO } from '../../lib/useSEO';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Hash, ArrowLeft, Loader2 } from 'lucide-react';
import { useHashtagFeed } from './useFeed';
import PostCard from './PostCard';

export default function HashtagFeed() {
  const { tag = '' } = useParams<{ tag: string }>();
  useSEO({ title: tag ? `#${tag}` : 'Hashtag Feed', canonical: `/hashtag/${tag}` });
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useHashtagFeed(tag);

  const allPosts = data?.pages.flatMap((p) => p.posts) ?? [];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/feed" className="p-2 rounded-xl hover:bg-gray-100 text-gray-400">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-1">
            <Hash size={18} className="text-brand" />{tag}
          </h1>
          <p className="text-sm text-gray-500">
            {data?.pages[0]?.total ?? '…'} posts
          </p>
        </div>
      </div>

      {/* Posts */}
      {isLoading ? (
        <div className="flex justify-center py-16 text-gray-300">
          <Loader2 size={32} className="animate-spin" />
        </div>
      ) : allPosts.length === 0 ? (
        <div className="card p-10 text-center text-gray-400">
          <Hash size={40} className="mx-auto mb-3 opacity-30" />
          <p>No posts with <strong>#{tag}</strong> yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {allPosts.map((post, i) => (
            <motion.div
              key={post._id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.05, 0.3) }}
            >
              <PostCard post={post} animate={false} />
            </motion.div>
          ))}

          {hasNextPage && (
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="btn-secondary w-full flex items-center justify-center gap-2 mt-2"
            >
              {isFetchingNextPage && <Loader2 size={15} className="animate-spin" />}
              Load more
            </button>
          )}
        </div>
      )}
    </div>
  );
}
