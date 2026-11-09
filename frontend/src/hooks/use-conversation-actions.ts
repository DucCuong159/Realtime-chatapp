import {
  conversationKeys,
  conversationMutationKeys,
} from "@/constants/query-keys";
import { useAuth } from "@/hooks/use-auth";
import { API } from "@/lib/axios-client";
import { toggleUserReaction } from "@/lib/reaction.utils";
import { generateUUID } from "@/lib/utils";
import type {
  ConversationType,
  CreateConversationType,
  CreateMessageType,
  MessageReactionType,
  MessageType,
  PaginationType,
} from "@/types/conversation.type";
import {
  useMutation,
  useQueryClient,
  type InfiniteData,
  type UseMutationResult,
} from "@tanstack/react-query";
import { toast } from "sonner";

export interface MessagesPage {
  conversation: ConversationType;
  messages: MessageType[];
  pagination: PaginationType;
}

export interface SendMessageContext {
  previousConversations?: ConversationType[];
  conversationId: string;
  tempId: string;
}

export interface ToggleReactionContext {
  conversationId: string;
  messageId: string;
  previousReactions?: MessageReactionType[];
}

export type UseSendMessageResult = UseMutationResult<
  { userMessage: MessageType },
  Error,
  CreateMessageType,
  SendMessageContext
>;

export type UseToggleReactionResult = UseMutationResult<
  unknown,
  Error,
  { conversationId: string; messageId: string; emoji: string },
  ToggleReactionContext
>;

export type UseCreateConversationResult = UseMutationResult<
  ConversationType,
  Error,
  CreateConversationType
>;

/**
 * Pure cache updater: appends an optimistic message to the last page of an infinite query.
 */
export function appendOptimisticMessageToPages(
  old: InfiniteData<MessagesPage> | undefined,
  optimisticMsg: MessageType,
): InfiniteData<MessagesPage> | undefined {
  if (!old || old.pages.length === 0) return old;
  const lastPageIndex = old.pages.length - 1;
  const lastPage = old.pages[lastPageIndex];
  const updatedPages = [...old.pages];
  updatedPages[lastPageIndex] = {
    ...lastPage,
    messages: [...lastPage.messages, optimisticMsg],
  };
  return { ...old, pages: updatedPages };
}

/**
 * Pure cache updater: replaces an optimistic message with the server message in-place.
 */
export function replaceOptimisticMessageInPages(
  old: InfiniteData<MessagesPage> | undefined,
  tempId: string,
  serverMsg: MessageType,
): InfiniteData<MessagesPage> | undefined {
  if (!old) return old;
  const alreadyExists = old.pages.some((page) =>
    page.messages.some((m) => m._id === serverMsg._id),
  );
  return {
    ...old,
    pages: old.pages.map((page) => ({
      ...page,
      messages: page.messages
        .map((m) => (m._id === tempId ? serverMsg : m))
        .filter((m) => !(alreadyExists && m._id === tempId)),
    })),
  };
}

/**
 * Pure cache updater: surgically removes an optimistic message by tempId.
 */
export function removeOptimisticMessageFromPages(
  old: InfiniteData<MessagesPage> | undefined,
  tempId: string,
): InfiniteData<MessagesPage> | undefined {
  if (!old) return old;
  return {
    ...old,
    pages: old.pages.map((page) => ({
      ...page,
      messages: page.messages.filter((m) => m._id !== tempId),
    })),
  };
}

/**
 * Mutation hook for sending a message with optimistic cache insertion and rollback on failure.
 */
export function useSendMessage(): UseSendMessageResult {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<
    { userMessage: MessageType },
    Error,
    CreateMessageType,
    SendMessageContext
  >({
    mutationKey: conversationMutationKeys.sendMessage,
    mutationFn: async (payload: CreateMessageType) => {
      const { data } = await API.post("/conversation/message/send", {
        conversationId: payload.conversationId,
        content: payload.content,
        image: payload.image,
        replyTo: payload.replyTo?._id,
        aiModelId: payload.aiModelId,
      });
      return data;
    },

    onMutate: async (payload) => {
      const convId = payload.conversationId;
      if (!convId) throw new Error("Conversation ID is required");

      await queryClient.cancelQueries({
        queryKey: conversationKeys.messages(convId),
      });
      await queryClient.cancelQueries({
        queryKey: conversationKeys.lists(),
      });

      const previousConversations = queryClient.getQueryData<
        ConversationType[]
      >(conversationKeys.lists());

      const tempId = generateUUID();
      const optimisticMsg: MessageType = {
        _id: tempId,
        conversationId: convId,
        content: payload.content ?? null,
        image: payload.image ?? null,
        sender: user,
        replyTo: payload.replyTo ?? null,
        status: "sending...",
        reactions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Optimistically append to messages cache
      queryClient.setQueryData<InfiniteData<MessagesPage>>(
        conversationKeys.messages(convId),
        (old) => appendOptimisticMessageToPages(old, optimisticMsg),
      );

      // Optimistically update conversation list lastMessage
      queryClient.setQueryData<ConversationType[]>(
        conversationKeys.lists(),
        (old = []) =>
          old.map((c) =>
            c._id === convId
              ? {
                  ...c,
                  lastMessage: optimisticMsg,
                  updatedAt: optimisticMsg.updatedAt,
                }
              : c,
          ),
      );

      return {
        previousConversations,
        conversationId: convId,
        tempId,
      };
    },

    onSuccess: (data, _payload, ctx) => {
      if (!ctx || !data?.userMessage) return;
      const { userMessage } = data;
      const convId = ctx.conversationId;
      const tempId = ctx.tempId;

      // Replace optimistic message in-place without refetching or discarding older pages
      queryClient.setQueryData<InfiniteData<MessagesPage>>(
        conversationKeys.messages(convId),
        (old) => replaceOptimisticMessageInPages(old, tempId, userMessage),
      );

      // Update conversation list lastMessage
      queryClient.setQueryData<ConversationType[]>(
        conversationKeys.lists(),
        (old = []) =>
          old.map((c) =>
            c._id === convId
              ? {
                  ...c,
                  lastMessage: userMessage,
                  updatedAt: userMessage.createdAt || new Date().toISOString(),
                }
              : c,
          ),
      );
    },

    onError: (_err, _payload, ctx) => {
      if (ctx) {
        // Surgically remove only the optimistic message with tempId,
        // preserving any new socket messages or reactions that arrived in the meantime.
        queryClient.setQueryData<InfiniteData<MessagesPage>>(
          conversationKeys.messages(ctx.conversationId),
          (current) => removeOptimisticMessageFromPages(current, ctx.tempId),
        );

        // For the conversations list, only revert lastMessage if it still references our tempId
        queryClient.setQueryData<ConversationType[]>(
          conversationKeys.lists(),
          (current = []) =>
            current.map((c) => {
              if (c._id !== ctx.conversationId) return c;
              if (c.lastMessage?._id === ctx.tempId) {
                const prevConv = ctx.previousConversations?.find(
                  (pc) => pc._id === ctx.conversationId,
                );
                return {
                  ...c,
                  lastMessage: prevConv?.lastMessage ?? null,
                  updatedAt: prevConv?.updatedAt ?? c.updatedAt,
                };
              }
              return c;
            }),
        );
      }
      toast.error("Failed to send message");
    },

    onSettled: (_data, _err, payload) => {
      if (payload.conversationId) {
        // Only invalidate conversation list to update ordering/unread status
        // NEVER invalidate messages infinite query: avoids resetting prepended older history
        void queryClient.invalidateQueries({
          queryKey: conversationKeys.lists(),
        });
      }
    },
  });
}

/**
 * Mutation hook for toggling a reaction on a message with optimistic update and rollback.
 */
export function useToggleReaction(): UseToggleReactionResult {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<
    unknown,
    Error,
    { conversationId: string; messageId: string; emoji: string },
    ToggleReactionContext
  >({
    mutationKey: conversationMutationKeys.toggleReaction,
    mutationFn: async ({ messageId, emoji }) => {
      const { data } = await API.post(
        `/conversation/message/${messageId}/reaction`,
        { emoji },
      );
      return data;
    },

    onMutate: async ({ conversationId, messageId, emoji }) => {
      await queryClient.cancelQueries({
        queryKey: conversationKeys.messages(conversationId),
      });

      const currentData = queryClient.getQueryData<InfiniteData<MessagesPage>>(
        conversationKeys.messages(conversationId),
      );

      // Capture previous reactions for this specific message before mutating
      let previousReactions: MessageReactionType[] | undefined;
      if (currentData) {
        for (const page of currentData.pages) {
          const target = page.messages.find((m) => m._id === messageId);
          if (target) {
            previousReactions = [...(target.reactions || [])];
            break;
          }
        }
      }

      if (user?._id) {
        queryClient.setQueryData<InfiniteData<MessagesPage>>(
          conversationKeys.messages(conversationId),
          (old) => {
            if (!old) return old;
            return {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                messages: page.messages.map((m) =>
                  m._id === messageId
                    ? {
                        ...m,
                        reactions: toggleUserReaction(
                          m.reactions,
                          user._id,
                          emoji,
                          { name: user.name, avatar: user.avatar },
                        ),
                      }
                    : m,
                ),
              })),
            };
          },
        );
      }

      return { conversationId, messageId, previousReactions };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.previousReactions !== undefined && ctx.messageId) {
        // Surgically revert only the specific message's reactions,
        // preserving all other messages and any incoming socket updates
        queryClient.setQueryData<InfiniteData<MessagesPage>>(
          conversationKeys.messages(ctx.conversationId),
          (current) => {
            if (!current) return current;
            return {
              ...current,
              pages: current.pages.map((page) => ({
                ...page,
                messages: page.messages.map((m) =>
                  m._id === ctx.messageId
                    ? { ...m, reactions: ctx.previousReactions! }
                    : m,
                ),
              })),
            };
          },
        );
      }
      toast.error("Failed to update reaction");
    },
  });
}

/**
 * Mutation hook for creating a new 1-on-1 or group conversation.
 */
export function useCreateConversation(): UseCreateConversationResult {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: conversationMutationKeys.createConversation,
    mutationFn: async (
      payload: CreateConversationType,
    ): Promise<ConversationType> => {
      const { data } = await API.post("/conversation/create", payload);
      return data.conversation;
    },

    onSuccess: (newConv) => {
      queryClient.setQueryData<ConversationType[]>(
        conversationKeys.lists(),
        (old = []) => [newConv, ...old.filter((c) => c._id !== newConv._id)],
      );
      toast.success("Conversation created successfully");
    },
  });
}
