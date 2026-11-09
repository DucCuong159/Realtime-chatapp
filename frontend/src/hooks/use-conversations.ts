import { conversationKeys } from "@/constants/query-keys";
import { useSocket } from "@/hooks/use-socket";
import { API } from "@/lib/axios-client";
import type { ConversationType, MessageType } from "@/types/conversation.type";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

interface ConversationUpdatePayload {
  conversationId: string;
  lastMessage: MessageType;
}

/**
 * Idiomatic TanStack Query v5 hook for user conversations.
 * Handles fetching, caching, and realtime socket events.
 */
export function useConversations() {
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  const query = useQuery({
    queryKey: conversationKeys.lists(),
    queryFn: async (): Promise<ConversationType[]> => {
      const { data } = await API.get("/conversation/all");
      return data.conversations || [];
    },
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (!socket) return;

    const handleNew = (conversation: ConversationType) => {
      queryClient.setQueryData<ConversationType[]>(
        conversationKeys.lists(),
        (old = []) =>
          old.some((c) => c._id === conversation._id)
            ? old
            : [conversation, ...old],
      );
    };

    const handleUpdated = (
      payload: ConversationUpdatePayload | ConversationType,
    ) => {
      queryClient.setQueryData<ConversationType[]>(
        conversationKeys.lists(),
        (old = []) => {
          const targetId =
            "conversationId" in payload
              ? payload.conversationId
              : payload._id;
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
        },
      );
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
