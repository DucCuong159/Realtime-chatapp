import { conversationKeys } from "@/constants/query-keys";
import { API } from "@/lib/axios-client";
import type {
  ConversationType,
  MessageType,
  PaginationType,
} from "@/types/conversation.type";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";

export interface MessagesPage {
  conversation: ConversationType;
  messages: MessageType[];
  pagination: PaginationType;
}

export { appendNewMessageToCache } from "./use-conversation-socket";

/**
 * Pure TanStack Query v5 observer hook for conversation messages.
 * Handles cursor-based bidirectional infinite pagination.
 *
 * (Real-time Socket.IO synchronization is handled separately by `useConversationSocket`
 * to avoid duplicate listeners when multiple components observe the same conversation).
 */
export function useConversationMessages(conversationId?: string | null) {
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
