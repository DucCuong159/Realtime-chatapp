import { conversationKeys } from "@/constants/query-keys";
import { useSocket } from "@/hooks/use-socket";
import { API } from "@/lib/axios-client";
import type { ConversationType, MessageType } from "@/types/conversation.type";
import type { QueryClient } from "@tanstack/react-query";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

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
 * Pure cache updater for updating a conversation's lastMessage and bumping it to top.
 */
export function updateConversationInList(
  old: ConversationType[] = [],
  payload: ConversationUpdatePayload,
): ConversationType[] {
  const targetId =
    "conversationId" in payload ? payload.conversationId : payload._id;
  const target = old.find((c) => c._id === targetId);
  if (!target) return old;

  const lastMessage =
    "lastMessage" in payload ? payload.lastMessage : target.lastMessage;
  const updatedTarget: ConversationType = {
    ...target,
    lastMessage,
    updatedAt: lastMessage?.createdAt || new Date().toISOString(),
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
  }, [socket, queryClient]);

  return {
    conversations: query.data ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
