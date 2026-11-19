import { conversationKeys } from "@/constants/query-keys";
import {
  appendNewMessageToCache,
  fetchConversationMessages,
  reconcileConversationMessages,
  reconcileMessagesInPages,
} from "@/lib/conversation-cache";
import type {
  ConversationType,
  MessagesPage,
  MessageType,
} from "@/types/conversation.type";
import type { InfiniteData } from "@tanstack/react-query";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useConversationSocket } from "./use-conversation-socket";

export type { MessagesPage };
export {
  appendNewMessageToCache,
  fetchConversationMessages,
  reconcileConversationMessages,
  reconcileMessagesInPages,
};

export interface UseConversationMessagesOptions {
  /**
   * If true, also registers the Socket.IO listener for incoming messages, reactions, and AI chunks.
   * Defaults to false so multiple hook consumers remain pure observers without duplicate subscriptions.
   */
  subscribe?: boolean;
}

export interface UseConversationMessagesResult {
  conversation: ConversationType | undefined;
  messages: MessageType[];
  isLoading: boolean;
  hasMore: boolean;
  fetchMoreMessages: () => Promise<unknown>;
  isFetchingMore: boolean;
  refetch: () => Promise<unknown>;
}

/**
 * TanStack Query v5 hook for conversation messages.
 * Handles cursor-based bidirectional infinite pagination.
 *
 * Real-time Socket.IO synchronization is opt-in via `options.subscribe` or
 * directly via `useConversationSocket`, guaranteeing only one designated subscriber
 * per conversation to prevent duplicate listeners or double AI chunk appending.
 */
export function useConversationMessages(
  conversationId?: string | null,
  options?: UseConversationMessagesOptions,
): UseConversationMessagesResult {
  const queryClient = useQueryClient();

  // Only connect socket listeners if explicitly designated as the subscriber
  useConversationSocket(options?.subscribe ? conversationId : null);

  const query = useInfiniteQuery<
    MessagesPage,
    Error,
    InfiniteData<MessagesPage>,
    readonly ["conversations", "messages", string],
    string | undefined
  >({
    queryKey: conversationKeys.messages(conversationId || ""),
    queryFn: ({ pageParam }): Promise<MessagesPage> =>
      fetchConversationMessages(conversationId || "", pageParam),
    initialPageParam: undefined,
    getPreviousPageParam: (firstPage) =>
      firstPage?.pagination?.hasMore
        ? firstPage.pagination.nextCursor
        : undefined,
    getNextPageParam: () => undefined,
    enabled: Boolean(conversationId),
    staleTime: 60 * 1000,
    refetchOnReconnect: false,
  });

  // Reconcile newest messages when active conversation changes if cache already exists
  useEffect(() => {
    if (!conversationId) return;
    const existing = queryClient.getQueryData<InfiniteData<MessagesPage>>(
      conversationKeys.messages(conversationId),
    );
    if (existing && existing.pages.length > 0) {
      void reconcileConversationMessages(queryClient, conversationId);
    }
  }, [conversationId, queryClient]);

  const messages = useMemo(
    () => query.data?.pages.flatMap((page) => page.messages) ?? [],
    [query.data?.pages],
  );

  const conversation =
    query.data?.pages[query.data.pages.length - 1]?.conversation;

  return {
    conversation,
    messages,
    isLoading: query.isLoading,
    hasMore: Boolean(query.hasPreviousPage),
    fetchMoreMessages: query.fetchPreviousPage,
    isFetchingMore: query.isFetchingPreviousPage,
    refetch: query.refetch,
  };
}
