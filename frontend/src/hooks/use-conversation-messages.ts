import { conversationKeys } from "@/constants/query-keys";
import { useSocket } from "@/hooks/use-socket";
import { API } from "@/lib/axios-client";
import type {
  AIStreamPayload,
  ConversationType,
  MessageReactionUpdatePayload,
  MessageType,
  PaginationType,
} from "@/types/conversation.type";
import {
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";

interface MessagesPage {
  conversation: ConversationType;
  messages: MessageType[];
  pagination: PaginationType;
}

export function appendNewMessageToCache(
  queryClient: ReturnType<typeof useQueryClient>,
  conversationId: string,
  msg: MessageType,
) {
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

function updateReactionsInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  conversationId: string,
  payload: MessageReactionUpdatePayload,
) {
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

function handleAIStreamUpdate(
  queryClient: ReturnType<typeof useQueryClient>,
  conversationId: string,
  payload: AIStreamPayload,
) {
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
 * Idiomatic TanStack Query v5 hook for conversation messages.
 * Handles cursor-based bidirectional infinite pagination and real-time Socket.IO sync.
 */
export function useConversationMessages(conversationId?: string | null) {
  const queryClient = useQueryClient();
  const { socket } = useSocket();

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
