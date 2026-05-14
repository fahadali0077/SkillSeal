// ─────────────────────────────────────────────────────────────────────────────
// UserPostsSection.tsx  –  shows a user's posts on their profile page
// ─────────────────────────────────────────────────────────────────────────────
import { useRef, useCallback, useEffect } from 'react';
import { Loader2, FileText } from 'lucide-react';
import { useUserPosts } from '../feed/useFeed';
import PostCard from '../feed/PostCard';

interface Props {
  userId:  string;
  isOwner: boolean;
}

export default function UserPostsSection({ userId, isOwner }: Props) {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useUserPosts(userId);
  const loaderRef = useRef<HTMLDivElement>(null);

  const allPosts = data?.pages.flatMap((p) => p.posts) ?? [];
  const total    = data?.pages[0]?.total ?? 0;

  // Infinite scroll
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
        void fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage],
  );

  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(handleObserver, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleObserver]);

  return (
    <div className="card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText size={18} className="text-brand" />
          <h2 className="font-semibold text-gray-900">
            {isOwner ? 'My Posts' : 'Posts'}
          </h2>
        </div>
        {total > 0 && (
          <span className="text-xs text-gray-400">{total} post{total !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 size={22} className="animate-spin text-gray-300" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && allPosts.length === 0 && (
        <div className="py-8 text-center text-gray-400">
          <FileText size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">
            {isOwner ? "You haven't posted anything yet." : 'No posts yet.'}
          </p>
        </div>
      )}

      {/* Posts */}
      {allPosts.length > 0 && (
        <div className="space-y-4">
          {allPosts.map((post) => (
            <PostCard key={post._id} post={post} animate={false} />
          ))}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      <div ref={loaderRef} className="pt-2 flex justify-center">
        {isFetchingNextPage && (
          <Loader2 size={20} className="animate-spin text-gray-300" />
        )}
        {!hasNextPage && allPosts.length > 0 && (
          <p className="text-xs text-gray-300 py-2">All posts loaded</p>
        )}
      </div>
    </div>
  );
}
