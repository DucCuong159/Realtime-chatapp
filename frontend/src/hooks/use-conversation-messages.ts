import { conversationKeys } from "@/constants/query-keys";
import { API } from "@/lib/axios-client";
import type {
  ConversationType,
  MessageType,
  PaginationType,
} from "@/types/conversation.type";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useConversationSocket } from "./use-conversation-socket";

export interface MessagesPage {
  conversation: ConversationType;
  messages: MessageType[];
  pagination: PaginationType;
}

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

export { appendNewMessageToCache } from "./use-conversation-socket";

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
  // Only connect socket listeners if explicitly designated as the subscriber
  useConversationSocket(options?.subscribe ? conversationId : null);

  const query = useInfiniteQuery({
    queryKey: conversationKeys.messages(conversationId || ""),
    queryFn: async ({ pageParam }): Promise<MessagesPage> => {
      const { data } = await API.get(`/conversation/${conversationId}`, {
        params: { cursor: pageParam, limit: 30 },
      });
      return {
        conversation: data.conversation,
        messages: data.messages || [],
        pagination: data.pagination,
      };
    },
    initialPageParam: undefined as string | undefined,
    getPreviousPageParam: (firstPage) =>
      firstPage?.pagination?.hasMore
        ? firstPage.pagination.nextCursor
        : undefined,
    getNextPageParam: () => undefined,
    enabled: Boolean(conversationId),
    staleTime: 60 * 1000,
  });

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
