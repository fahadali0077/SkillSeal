// ─────────────────────────────────────────────────────────────────────────────
// useFeed.ts  –  React Query hooks for feed, posts, and hashtags
// ─────────────────────────────────────────────────────────────────────────────
import {
  useInfiniteQuery, useMutation, useQueryClient, useQuery,
} from '@tanstack/react-query';
import type { IPostCard, ReactionType } from '@SkillSeal/shared';
import { feedApi, type CreatePostInput } from './feedApi';

// ── Feed (infinite scroll) ────────────────────────────────────────────────────

export function useInfiniteFeed() {
  return useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: ({ pageParam }) => feedApi.getFeed(pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (last) => last.nextPage ?? undefined,
    staleTime: 5 * 60 * 1000, // matches server cache TTL
  });
}

// ── Create post ───────────────────────────────────────────────────────────────

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePostInput) => feedApi.createPost(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feed'] }),
  });
}

// ── Single post ───────────────────────────────────────────────────────────────

export function usePost(id: string) {
  return useQuery({
    queryKey: ['post', id],
    queryFn: () => feedApi.getPost(id),
    enabled: !!id,
  });
}

// ── Delete post ───────────────────────────────────────────────────────────────

export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => feedApi.deletePost(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feed'] }),
  });
}

// ── Reactions (optimistic) ────────────────────────────────────────────────────

export function useReact(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reaction: ReactionType) => feedApi.react(postId, reaction),
    onMutate: async (reaction) => {
      await qc.cancelQueries({ queryKey: ['feed'] });
      // Optimistically update the card in the infinite list
      qc.setQueriesData<{ pages: { posts: IPostCard[] }[] }>(
        { queryKey: ['feed'] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              posts: page.posts.map((p) =>
                p._id === postId
                  ? { ...p, reactionSummary: { ...p.reactionSummary, userReaction: reaction, total: (p.reactionSummary?.total ?? 0) + 1 } }
                  : p,
              ),
            })),
          };
        },
      );
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['feed'] }),
  });
}

export function useUnreact(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => feedApi.unreact(postId),
    onSettled: () => qc.invalidateQueries({ queryKey: ['feed'] }),
  });
}

// ── Comments ──────────────────────────────────────────────────────────────────

export function useComments(postId: string) {
  return useQuery({
    queryKey: ['comments', postId],
    queryFn: () => feedApi.getComments(postId),
    enabled: !!postId,
  });
}

export function useAddComment(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ content, parentCommentId }: { content: string; parentCommentId?: string }) =>
      feedApi.addComment(postId, content, parentCommentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comments', postId] });
      qc.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

// ── Poll vote ─────────────────────────────────────────────────────────────────

export function useVotePoll(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (optionId: string) => feedApi.vote(postId, optionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feed'] }),
  });
}

// ── Repost ────────────────────────────────────────────────────────────────────

export function useRepost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, commentary }: { postId: string; commentary?: string }) =>
      feedApi.repost(postId, commentary),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feed'] }),
  });
}

// ── Hashtags ──────────────────────────────────────────────────────────────────

export function useHashtagFeed(tag: string) {
  return useInfiniteQuery({
    queryKey: ['hashtag', tag],
    queryFn: ({ pageParam }) => feedApi.getHashtagPosts(tag, pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (last, pages) =>
      last.posts.length === 20 ? pages.length + 1 : undefined,
    enabled: !!tag,
  });
}

export function useTrendingHashtags() {
  return useQuery({
    queryKey: ['trending'],
    queryFn: feedApi.getTrending,
    staleTime: 5 * 60 * 1000,
  });
}
