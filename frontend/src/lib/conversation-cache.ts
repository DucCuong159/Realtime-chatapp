import { conversationKeys } from "@/constants/query-keys";
import { API } from "@/lib/axios-client";
import type {
  AIStreamPayload,
  MessageReactionUpdatePayload,
  MessagesPage,
  MessageType,
} from "@/types/conversation.type";
import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export type { MessagesPage };

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
 * Appends or replaces an optimistic message in the TanStack Query cache.
 */
export function appendNewMessageToCache(
  queryClient: QueryClient,
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

/**
 * Updates message reactions in the TanStack Query cache.
 */
export function updateReactionsInCache(
  queryClient: QueryClient,
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

/**
 * Handles incoming streaming AI response chunks and terminal completion.
 */
export function handleAIStreamUpdate(
  queryClient: QueryClient,
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
