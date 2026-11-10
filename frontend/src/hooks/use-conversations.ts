import { conversationKeys } from "@/constants/query-keys";
import { useSocket } from "@/hooks/use-socket";
import { API } from "@/lib/axios-client";
import type { ConversationType, MessageType } from "@/types/conversation.type";
import type { QueryClient } from "@tanstack/react-query";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { SocketEventSubscriber } from "./use-conversation-socket";

export type ConversationUpdatePayload =
  | { conversationId: string; lastMessage: MessageType }
  | ConversationType;

export interface UseConversationsResult {
  conversations: ConversationType[];
  isLoading: boolean;
  refetch: () => Promise<unknown>;
}

/**
 * Pure query fetcher for conversations list.
 */
export async function fetchConversations(): Promise<ConversationType[]> {
  const { data } = await API.get("/conversation/all");
  return data.conversations || [];
}

/**
 * Pure cache updater for updating a conversation in the list and bumping it to top.
 * Handles both incremental { conversationId, lastMessage } updates and full ConversationType payloads.
 */
export function updateConversationInList(
  old: ConversationType[] = [],
  payload: ConversationUpdatePayload,
): ConversationType[] {
  const targetId =
    "conversationId" in payload ? payload.conversationId : payload._id;
  const target = old.find((c) => c._id === targetId);
  if (!target) return old;

  const isIncremental = "conversationId" in payload;
  const updatedTarget: ConversationType = isIncremental
    ? {
        ...target,
        lastMessage: payload.lastMessage,
        updatedAt: payload.lastMessage?.createdAt || new Date().toISOString(),
      }
    : {
        ...target,
        ...payload,
        updatedAt: payload.updatedAt || target.updatedAt,
      };

  const remaining = old.filter((c) => c._id !== targetId);
  return [updatedTarget, ...remaining];
}

/**
 * Pure cache updater for inserting a new conversation at top if not already present.
 */
export function handleConversationNew(
  queryClient: Pick<QueryClient, "setQueryData">,
  conversation: ConversationType,
): void {
  queryClient.setQueryData<ConversationType[]>(
    conversationKeys.lists(),
    (old = []) =>
      old.some((c) => c._id === conversation._id)
        ? old
        : [conversation, ...old],
  );
}

/**
 * Pure cache updater/syncer for conversation:updated socket events.
 * If the conversation already exists in cache, updates and bumps it to top.
 * If not yet in cache, triggers an invalidation to fetch the fresh list.
 */
export function handleConversationUpdated(
  queryClient: Pick<
    QueryClient,
    "getQueryData" | "setQueryData" | "invalidateQueries"
  >,
  payload: ConversationUpdatePayload,
): void {
  const targetId =
    "conversationId" in payload ? payload.conversationId : payload._id;
  const currentList =
    queryClient.getQueryData<ConversationType[]>(
      conversationKeys.lists(),
    ) || [];
  const exists = currentList.some((c) => c._id === targetId);

  if (!exists) {
    void queryClient.invalidateQueries({
      queryKey: conversationKeys.lists(),
    });
  } else {
    queryClient.setQueryData<ConversationType[]>(
      conversationKeys.lists(),
      (old = []) => updateConversationInList(old, payload),
    );
  }
}

/**
 * Attaches conversation socket listeners and returns a cleanup teardown function.
 */
export function setupConversationsSocketListeners(
  queryClient: Pick<
    QueryClient,
    "getQueryData" | "setQueryData" | "invalidateQueries"
  >,
  socket: SocketEventSubscriber,
): () => void {
  const handleNew = (conversation: ConversationType) => {
    handleConversationNew(queryClient, conversation);
  };

  const handleUpdated = (payload: ConversationUpdatePayload) => {
    handleConversationUpdated(queryClient, payload);
  };

  socket.on("conversation:new", handleNew);
  socket.on("conversation:updated", handleUpdated);

  return () => {
    socket.off("conversation:new", handleNew);
    socket.off("conversation:updated", handleUpdated);
  };
}

/**
 * Idiomatic TanStack Query v5 hook for user conversations.
 * Handles fetching, caching, and realtime socket events.
 */
export function useConversations(): UseConversationsResult {
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  const query = useQuery({
    queryKey: conversationKeys.lists(),
    queryFn: fetchConversations,
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (!socket) return;
    return setupConversationsSocketListeners(queryClient, socket);
  }, [socket, queryClient]);

  return {
    conversations: query.data ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
