// ─────────────────────────────────────────────────────────────────────────────
// useFeed.ts  –  React Query hooks for feed, posts, and hashtags
// ─────────────────────────────────────────────────────────────────────────────
import {
  useInfiniteQuery, useMutation, useQueryClient, useQuery,
} from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type { IPostCard, ReactionType } from '@SkillSeal/shared';
import { feedApi, type CreatePostInput } from './feedApi';

// ── User posts (profile page) ─────────────────────────────────────────────────

export function useUserPosts(userId: string) {
  return useInfiniteQuery({
    queryKey: ['userPosts', userId],
    queryFn: ({ pageParam }) => feedApi.getUserPosts(userId, pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (last, pages) => last.hasMore ? pages.length + 1 : undefined,
    enabled: !!userId,
  });
}

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
      await qc.cancelQueries({ queryKey: ['userPosts'] });

      const patchPost = (p: IPostCard) => {
        if (p._id !== postId) return p;
        const alreadyReacted = !!p.reactionSummary?.userReaction;
        return {
          ...p,
          reactionSummary: {
            ...p.reactionSummary,
            userReaction: reaction,
            total: alreadyReacted
              ? (p.reactionSummary?.total ?? 0)
              : (p.reactionSummary?.total ?? 0) + 1,
          },
        };
      };

      const patch = (old: any) => {
        if (!old) return old;
        return { ...old, pages: old.pages.map((pg: any) => ({ ...pg, posts: pg.posts.map(patchPost) })) };
      };

      qc.setQueriesData<any>({ queryKey: ['feed'] }, patch);
      qc.setQueriesData<any>({ queryKey: ['userPosts'] }, patch);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['feed'] });
      void qc.invalidateQueries({ queryKey: ['userPosts'] });
    },
  });
}

export function useUnreact(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => feedApi.unreact(postId),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['feed'] });
      void qc.invalidateQueries({ queryKey: ['userPosts'] });
    },
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
    onMutate: async (optionId) => {
      await qc.cancelQueries({ queryKey: ['feed'] });
      await qc.cancelQueries({ queryKey: ['userPosts'] });

      const patchPosts = (posts: IPostCard[]) =>
        posts.map((p) => {
          if (p._id !== postId || !p.pollOptions) return p;
          const prevVoted = p.pollOptions.find((o) => o.hasVoted);
          return {
            ...p,
            pollOptions: p.pollOptions.map((o) => ({
              ...o,
              hasVoted: o._id === optionId,
              voteCount: o._id === optionId
                ? o.voteCount + 1
                : o._id === prevVoted?._id
                  ? Math.max(0, o.voteCount - 1)
                  : o.voteCount,
            })),
          };
        });

      const patch = (old: any) => {
        if (!old) return old;
        return { ...old, pages: old.pages.map((pg: any) => ({ ...pg, posts: patchPosts(pg.posts) })) };
      };

      qc.setQueriesData<any>({ queryKey: ['feed'] }, patch);
      qc.setQueriesData<any>({ queryKey: ['userPosts'] }, patch);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['feed'] });
      void qc.invalidateQueries({ queryKey: ['userPosts'] });
    },
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
