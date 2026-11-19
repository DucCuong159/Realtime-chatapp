import {
  appendNewMessageToCache,
  handleAIStreamUpdate,
  reconcileConversationMessages,
  updateReactionsInCache,
} from "@/lib/conversation-cache";
import { useSocket } from "@/hooks/use-socket";
import type {
  AIStreamPayload,
  MessageReactionUpdatePayload,
  MessagesPage,
  MessageType,
} from "@/types/conversation.type";
import type { QueryClient } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

export type { MessagesPage };
export {
  appendNewMessageToCache,
  updateReactionsInCache,
  handleAIStreamUpdate,
  reconcileConversationMessages,
};

export interface SocketEventSubscriber {
  on<T = unknown>(event: string, listener: (arg: T) => void): unknown;
  off<T = unknown>(event: string, listener: (arg: T) => void): unknown;
}

/**
 * Subscribes to conversation realtime events on the given socket and binds them to the queryClient cache.
 * Returns a teardown function that deregisters all attached listeners.
 */
export function setupConversationSocketListeners(
  queryClient: QueryClient,
  socket: SocketEventSubscriber,
  conversationId: string,
): () => void {
  const handleNewMessage = (msg: MessageType) => {
    if (msg.conversationId === conversationId) {
      appendNewMessageToCache(queryClient, conversationId, msg);
    }
  };

  const handleReactionUpdate = (payload: MessageReactionUpdatePayload) => {
    if (payload.conversationId === conversationId) {
      updateReactionsInCache(queryClient, conversationId, payload);
    }
  };

  const handleAI = (payload: AIStreamPayload) => {
    if (payload.conversationId === conversationId) {
      handleAIStreamUpdate(queryClient, conversationId, payload);
    }
  };

  const handleConnect = () => {
    void reconcileConversationMessages(queryClient, conversationId);
  };

  socket.on("message:new", handleNewMessage);
  socket.on("message:reaction:update", handleReactionUpdate);
  socket.on("conversation:ai", handleAI);
  socket.on("connect", handleConnect);

  return () => {
    socket.off("message:new", handleNewMessage);
    socket.off("message:reaction:update", handleReactionUpdate);
    socket.off("conversation:ai", handleAI);
    socket.off("connect", handleConnect);
  };
}

/**
 * Dedicated socket synchronization hook for a conversation.
 * Subscribes to new messages, reaction updates, and streaming AI responses,
 * mutating the TanStack Query cache in place.
 *
 * Mount this hook ONCE per active conversation page (in SingleConversation),
 * keeping cache observers (useConversationMessages) pure and side-effect free.
 */
export function useConversationSocket(conversationId?: string | null): void {
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket || !conversationId) return;
    return setupConversationSocketListeners(queryClient, socket, conversationId);
  }, [socket, conversationId, queryClient]);
}
