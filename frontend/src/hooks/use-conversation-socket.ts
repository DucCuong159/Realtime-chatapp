import { conversationKeys } from "@/constants/query-keys";
import { useSocket } from "@/hooks/use-socket";
import type {
  AIStreamPayload,
  ConversationType,
  MessageReactionUpdatePayload,
  MessageType,
  PaginationType,
} from "@/types/conversation.type";
import { useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";

export interface MessagesPage {
  conversation: ConversationType;
  messages: MessageType[];
  pagination: PaginationType;
}

export function appendNewMessageToCache(
  queryClient: ReturnType<typeof useQueryClient>,
  conversationId: string,
  msg: MessageType,
): void {
  queryClient.setQueryData<InfiniteData<MessagesPage>>(
    conversationKeys.messages(conversationId),
    (old) => {
      if (!old || old.pages.length === 0) return old;

      // 1. If message already exists by _id, ignore to avoid duplicates
      const exists = old.pages.some((page) =>
        page.messages.some((m) => m._id === msg._id),
      );
      if (exists) return old;

      const lastPageIndex = old.pages.length - 1;
      const lastPage = old.pages[lastPageIndex];

      // 2. Check if this replaces an optimistic message from the sender
      const optimisticIdx = lastPage.messages.findIndex(
        (m) =>
          m.status === "sending..." &&
          m.sender?._id === msg.sender?._id &&
          m.content === msg.content,
      );

      const updatedPages = [...old.pages];
      if (optimisticIdx >= 0) {
        const updatedMessages = [...lastPage.messages];
        updatedMessages[optimisticIdx] = msg;
        updatedPages[lastPageIndex] = {
          ...lastPage,
          messages: updatedMessages,
        };
      } else {
        updatedPages[lastPageIndex] = {
          ...lastPage,
          messages: [...lastPage.messages, msg],
        };
      }

      return { ...old, pages: updatedPages };
    },
  );
}

export function updateReactionsInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  conversationId: string,
  payload: MessageReactionUpdatePayload,
): void {
  queryClient.setQueryData<InfiniteData<MessagesPage>>(
    conversationKeys.messages(conversationId),
    (old) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          messages: page.messages.map((m) =>
            m._id === payload.messageId
              ? { ...m, reactions: payload.reactions }
              : m,
          ),
        })),
      };
    },
  );
}

export function handleAIStreamUpdate(
  queryClient: ReturnType<typeof useQueryClient>,
  conversationId: string,
  payload: AIStreamPayload,
): void {
  const { chunk, done, message, sender, error } = payload;

  queryClient.setQueryData<InfiniteData<MessagesPage>>(
    conversationKeys.messages(conversationId),
    (old) => {
      if (!old || old.pages.length === 0) return old;
      const lastPageIndex = old.pages.length - 1;
      const lastPage = old.pages[lastPageIndex];
      const streamingIdx = lastPage.messages.findIndex((m) => m.streaming);

      const updatedMessages = [...lastPage.messages];

      if (chunk && !done) {
        if (streamingIdx >= 0) {
          const current = updatedMessages[streamingIdx];
          updatedMessages[streamingIdx] = {
            ...current,
            content: (current.content || "") + chunk,
          };
        } else {
          const newStreamingMsg: MessageType = {
            _id: `temp-ai-${Date.now()}`,
            conversationId,
            content: chunk,
            image: null,
            sender: sender || null,
            replyTo: null,
            streaming: true,
            status: "streaming",
            reactions: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          updatedMessages.push(newStreamingMsg);
        }
      } else if (done) {
        if (streamingIdx >= 0) {
          updatedMessages.splice(streamingIdx, 1);
        }
        if (message) {
          if (!updatedMessages.some((m) => m._id === message._id)) {
            updatedMessages.push(message);
          }
        } else if (error) {
          toast.error(error);
        }
      }

      const pages = [...old.pages];
      pages[lastPageIndex] = { ...lastPage, messages: updatedMessages };
      return { ...old, pages };
    },
  );
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

    socket.on("message:new", handleNewMessage);
    socket.on("message:reaction:update", handleReactionUpdate);
    socket.on("conversation:ai", handleAI);

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("message:reaction:update", handleReactionUpdate);
      socket.off("conversation:ai", handleAI);
    };
  }, [socket, conversationId, queryClient]);
}
