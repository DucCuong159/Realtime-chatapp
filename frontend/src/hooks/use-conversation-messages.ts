import { conversationKeys } from "@/constants/query-keys";
import { API } from "@/lib/axios-client";
import type {
  ConversationType,
  MessagesPage,
  MessageType,
} from "@/types/conversation.type";
import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useConversationSocket } from "./use-conversation-socket";

export type { MessagesPage };

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
 * Pure query fetcher for conversation messages with pagination cursor.
 */
export async function fetchConversationMessages(
  conversationId: string,
  cursor?: string,
  limit: number = 30,
): Promise<MessagesPage> {
  const { data } = await API.get(`/conversation/${conversationId}`, {
    params: { cursor, limit },
  });
  return {
    conversation: data.conversation,
    messages: data.messages || [],
    pagination: data.pagination,
  };
}

/**
 * Pure cache updater: reconciles fresh messages into the latest page of the infinite query cache.
 * Preserves all previously loaded older pages, deduplicates messages, and retains in-flight
 * optimistic and streaming AI messages.
 */
export function reconcileMessagesInPages(
  old: InfiniteData<MessagesPage> | undefined,
  freshPage: MessagesPage,
): InfiniteData<MessagesPage> {
  if (!old || old.pages.length === 0) {
    return {
      pages: [freshPage],
      pageParams: [undefined],
    };
  }

  const lastIdx = old.pages.length - 1;
  const lastPage = old.pages[lastIdx];

  // Retain pending optimistic and streaming messages
  const pendingMessages = lastPage.messages.filter(
    (m) => m.status === "sending..." || m.streaming,
  );

  // Map fresh messages by _id for fast lookup and reaction updates
  const freshMap = new Map(freshPage.messages.map((m) => [m._id, m]));

  // Update existing confirmed messages with fresh server data
  const existingUpdated = lastPage.messages
    .filter((m) => m.status !== "sending..." && !m.streaming)
    .map((m) => freshMap.get(m._id) || m);

  // Add any new messages from freshPage not present in lastPage
  const existingIds = new Set(lastPage.messages.map((m) => m._id));
  const newMessages = freshPage.messages.filter((m) => !existingIds.has(m._id));

  const mergedMessages = [
    ...existingUpdated,
    ...newMessages,
    ...pendingMessages,
  ];

  const updatedPages = [...old.pages];
  updatedPages[lastIdx] = {
    ...lastPage,
    conversation: freshPage.conversation || lastPage.conversation,
    messages: mergedMessages,
  };

  return { ...old, pages: updatedPages };
}

/**
 * Reconciles the latest messages for an active conversation from the server into the query cache.
 */
export async function reconcileConversationMessages(
  queryClient: QueryClient,
  conversationId: string,
): Promise<void> {
  try {
    const freshPage = await fetchConversationMessages(conversationId);
    queryClient.setQueryData<InfiniteData<MessagesPage>>(
      conversationKeys.messages(conversationId),
      (old) => reconcileMessagesInPages(old, freshPage),
    );
  } catch (err) {
    console.error("Failed to reconcile conversation messages:", err);
  }
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
