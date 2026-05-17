// ─────────────────────────────────────────────────────────────────────────────
// PostDetailPage.tsx
// HIGH-22 / BROKEN-07: full-content post view linked from the "Read more →"
// affordance on PostCard. Shows the untruncated content plus the comment
// thread. Reuses useFeed hooks so reactions/comments stay consistent with
// the feed cache.
// ─────────────────────────────────────────────────────────────────────────────

import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Hash, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { feedApi } from '../features/feed/feedApi';
import CommentSection from '../features/feed/CommentSection';

function Avatar({ src, name }: { src: string; name: string }) {
  return src
    ? <img src={src} alt={name} className="w-12 h-12 rounded-full object-cover" />
    : <div className="w-12 h-12 rounded-full bg-brand/10 flex items-center justify-center font-bold text-brand">{name[0]}</div>;
}

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: post, isLoading, error } = useQuery({
    queryKey: ['post', id],
    queryFn:  () => feedApi.getPost(id!),
    enabled:  !!id,
  });

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto py-16 flex justify-center">
        <Loader2 className="animate-spin text-brand" size={28} />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <p className="text-gray-500">Post not found.</p>
        <Link to="/feed" className="text-brand hover:underline text-sm mt-3 inline-block">
          ← Back to feed
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-4">
      <Link to="/feed" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand">
        <ArrowLeft size={14} /> Back to feed
      </Link>

      <article className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-4">
        {/* Author row */}
        <header className="flex items-center gap-3 mb-3">
          <Avatar src={post.author.profilePhoto ?? ''} name={post.author.fullName} />
          <div className="min-w-0">
            <Link
              to={`/u/${post.author.customUrl || post.author._id}`}
              className="font-semibold text-gray-900 hover:underline truncate block"
            >
              {post.author.fullName}
            </Link>
            <p className="text-xs text-gray-400 truncate">{post.author.headline}</p>
            <p className="text-xs text-gray-300 mt-0.5">
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
            </p>
          </div>
        </header>

        {/* Full content — no truncation */}
        <p className="text-base text-gray-800 whitespace-pre-wrap leading-relaxed">{post.content}</p>

        {/* Tags */}
        {post.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {post.tags.map((tag) => (
              <Link key={tag} to={`/hashtag/${tag}`}
                className="inline-flex items-center gap-0.5 text-xs text-brand hover:underline font-medium">
                <Hash size={11} />{tag}
              </Link>
            ))}
          </div>
        )}

        {/* Images */}
        {post.imageUrls?.length > 0 && (
          <div className={`grid gap-1 mt-4 rounded-xl overflow-hidden ${post.imageUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {post.imageUrls.map((url, i) => (
              <img key={i} src={url} alt="" className="w-full object-cover" />
            ))}
          </div>
        )}

        {/* Link preview */}
        {post.linkPreview && (
          <a href={post.linkUrl} target="_blank" rel="noreferrer" className="block mt-4 border border-gray-200 rounded-xl overflow-hidden hover:bg-gray-50">
            {post.linkPreview.imageUrl && (
              <img src={post.linkPreview.imageUrl} alt="" className="w-full h-48 object-cover" />
            )}
            <div className="px-4 py-3">
              <p className="text-xs text-gray-400">{post.linkPreview.siteName}</p>
              <p className="font-semibold text-sm text-gray-900">{post.linkPreview.title}</p>
              {post.linkPreview.description && (
                <p className="text-xs text-gray-500 mt-1">{post.linkPreview.description}</p>
              )}
            </div>
          </a>
        )}

        {/* Nested original (repost) */}
        {post.isRepost && post.originalPost && (
          <div className="mt-4 border border-gray-200 rounded-xl p-4 bg-gray-50">
            <div className="flex items-center gap-2 mb-2">
              <Avatar src={post.originalPost.author.profilePhoto ?? ''} name={post.originalPost.author.fullName} />
              <div className="min-w-0">
                <p className="font-semibold text-sm">{post.originalPost.author.fullName}</p>
                <p className="text-xs text-gray-400">{post.originalPost.author.headline}</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{post.originalPost.content}</p>
          </div>
        )}

        {/* Comments */}
        <div className="mt-6">
          <CommentSection postId={post._id} total={post.commentCount} />
        </div>
      </article>
    </div>
  );
}
