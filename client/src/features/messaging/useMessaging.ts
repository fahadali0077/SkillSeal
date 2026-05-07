// ─────────────────────────────────────────────────────────────────────────────
// useMessaging.ts
// Zustand store for real-time state + React Query hooks for REST data.
// Socket.io events update the store in real time; React Query handles
// initial loads and optimistic mutations.
// ─────────────────────────────────────────────────────────────────────────────

import { create } from 'zustand';
import { useQuery, useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { messagingApi, type IMessageOut, type IThreadSummary } from './messagingApi';
import { getSocket, SOCKET_EVENTS, on, emit } from '../../lib/socketClient';

// ── Zustand store for real-time state ────────────────────────────────────────

interface TypingState {
  [threadId: string]: {
    isTyping:  boolean;
    senderId:  string;
    timeout?:  ReturnType<typeof setTimeout>;
  };
}

interface MessagingState {
  // Live message additions (from socket) per thread
  liveMessages:   Record<string, IMessageOut[]>;
  typingState:    TypingState;
  onlineUsers:    Set<string>;
  unreadTotal:    number;

  addLiveMessage: (threadId: string, msg: IMessageOut) => void;
  setTyping:      (threadId: string, senderId: string) => void;
  clearTyping:    (threadId: string) => void;
  setOnline:      (userId: string) => void;
  setOffline:     (userId: string) => void;
  setUnreadTotal: (n: number) => void;
  incrementUnread:() => void;
}

export const useMessagingStore = create<MessagingState>()((set) => ({
  liveMessages:  {},
  typingState:   {},
  onlineUsers:   new Set<string>(),
  unreadTotal:   0,

  addLiveMessage: (threadId, msg) =>
    set((s) => ({
      liveMessages: {
        ...s.liveMessages,
        [threadId]: [...(s.liveMessages[threadId] ?? []), msg],
      },
    })),

  setTyping: (threadId, senderId) =>
    set((s) => {
      const prev = s.typingState[threadId];
      if (prev?.timeout) clearTimeout(prev.timeout);
      // Auto-clear after 4 seconds (safety net)
      const timeout = setTimeout(() => {
        useMessagingStore.getState().clearTyping(threadId);
      }, 4000);
      return {
        typingState: {
          ...s.typingState,
          [threadId]: { isTyping: true, senderId, timeout },
        },
      };
    }),

  clearTyping: (threadId) =>
    set((s) => {
      const prev = s.typingState[threadId];
      if (prev?.timeout) clearTimeout(prev.timeout);
      const next = { ...s.typingState };
      delete next[threadId];
      return { typingState: next };
    }),

  setOnline:  (userId) => set((s) => ({ onlineUsers: new Set([...s.onlineUsers, userId]) })),
  setOffline: (userId) => set((s) => {
    const next = new Set(s.onlineUsers);
    next.delete(userId);
    return { onlineUsers: next };
  }),

  setUnreadTotal:  (n) => set({ unreadTotal: n }),
  incrementUnread: ()  => set((s) => ({ unreadTotal: s.unreadTotal + 1 })),
}));

// ── Socket event listener hook ────────────────────────────────────────────────
// Call once at app level (e.g. in a layout component).

export function useSocketEvents() {
  const store = useMessagingStore();
  const qc    = useQueryClient();

  useEffect(() => {
    const cleanup: (() => void)[] = [];

    cleanup.push(on<{ threadId: string; message: IMessageOut }>(
      SOCKET_EVENTS.NEW_MESSAGE,
      ({ threadId, message }) => {
        store.addLiveMessage(threadId, message);
        store.incrementUnread();
        // Invalidate thread list so last-message preview updates
        void qc.invalidateQueries({ queryKey: ['threads'] });
      },
    ));

    cleanup.push(on<{ threadId: string; senderId: string }>(
      SOCKET_EVENTS.TYPING,
      ({ threadId, senderId }) => store.setTyping(threadId, senderId),
    ));

    cleanup.push(on<{ threadId: string; senderId: string }>(
      SOCKET_EVENTS.STOP_TYPING,
      ({ threadId }) => store.clearTyping(threadId),
    ));

    cleanup.push(on<{ userId: string }>(
      SOCKET_EVENTS.USER_ONLINE,
      ({ userId }) => store.setOnline(userId),
    ));

    cleanup.push(on<{ userId: string }>(
      SOCKET_EVENTS.USER_OFFLINE,
      ({ userId }) => store.setOffline(userId),
    ));

    return () => cleanup.forEach((fn) => fn());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}

// ── React Query hooks ─────────────────────────────────────────────────────────

export const msgKeys = {
  threads:  ()            => ['threads'] as const,
  thread:   (id: string)  => ['thread', id] as const,
  requests: ()            => ['messageRequests'] as const,
};

export function useThreads() {
  return useQuery({
    queryKey: msgKeys.threads(),
    queryFn:  messagingApi.listThreads,
    staleTime: 30_000,
  });
}

export function useThread(threadId: string) {
  return useInfiniteQuery({
    queryKey: msgKeys.thread(threadId),
    queryFn: ({ pageParam }) => messagingApi.getThread(threadId, pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (last, pages) => last.hasMore ? pages.length + 1 : undefined,
    enabled: !!threadId,
  });
}

export function useSendMessage() {
  const qc    = useQueryClient();
  const store = useMessagingStore();
  return useMutation({
    mutationFn: ({ recipientId, content }: { recipientId: string; content: string }) =>
      messagingApi.send(recipientId, content),
    onSuccess: (msg) => {
      // Optimistically add to live messages
      store.addLiveMessage(msg.threadId, msg);
      void qc.invalidateQueries({ queryKey: msgKeys.threads() });
    },
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (threadId: string) => messagingApi.markRead(threadId),
    onSuccess: (_, threadId) => {
      void qc.invalidateQueries({ queryKey: msgKeys.threads() });
      void qc.invalidateQueries({ queryKey: msgKeys.thread(threadId) });
    },
  });
}

export function useDeleteMessage(threadId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => messagingApi.deleteMessage(messageId),
    onSuccess:  () => qc.invalidateQueries({ queryKey: msgKeys.thread(threadId) }),
  });
}

export function useMessageRequests() {
  return useQuery({
    queryKey: msgKeys.requests(),
    queryFn:  messagingApi.listRequests,
  });
}

export function useAcceptRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => messagingApi.acceptRequest(requestId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: msgKeys.requests() });
      void qc.invalidateQueries({ queryKey: msgKeys.threads() });
    },
  });
}

export function useIgnoreRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => messagingApi.ignoreRequest(requestId),
    onSuccess: () => qc.invalidateQueries({ queryKey: msgKeys.requests() }),
  });
}

// ── Typing emitter (debounced) ────────────────────────────────────────────────

let typingTimer: ReturnType<typeof setTimeout> | null = null;

export function emitTypingStart(recipientId: string, threadId: string) {
  emit(SOCKET_EVENTS.TYPING_START, { recipientId, threadId });

  if (typingTimer) clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    emit(SOCKET_EVENTS.TYPING_STOP, { recipientId, threadId });
    typingTimer = null;
  }, 1500);
}

export function emitTypingStop(recipientId: string, threadId: string) {
  if (typingTimer) { clearTimeout(typingTimer); typingTimer = null; }
  emit(SOCKET_EVENTS.TYPING_STOP, { recipientId, threadId });
}
