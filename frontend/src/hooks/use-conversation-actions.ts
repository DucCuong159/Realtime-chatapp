import { conversationKeys } from "@/constants/query-keys";
import { useAuth } from "@/hooks/use-auth";
import { API } from "@/lib/axios-client";
import { toggleUserReaction } from "@/lib/reaction.utils";
import { generateUUID } from "@/lib/utils";
import type {
  ConversationType,
  CreateConversationType,
  CreateMessageType,
  MessageType,
  PaginationType,
} from "@/types/conversation.type";
import {
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { toast } from "sonner";

interface MessagesPage {
  conversation: ConversationType;
  messages: MessageType[];
  pagination: PaginationType;
}

interface SendMessageContext {
  previousMessages?: InfiniteData<MessagesPage>;
  previousConversations?: ConversationType[];
  conversationId: string;
}

interface ToggleReactionContext {
  previousMessages?: InfiniteData<MessagesPage>;
  conversationId: string;
}

/**
 * Mutation hook for sending a message with optimistic cache insertion and rollback on failure.
 */
export function useSendMessage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<
    { userMessage: MessageType },
    Error,
    CreateMessageType,
    SendMessageContext
  >({
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

      const previousMessages = queryClient.getQueryData<
        InfiniteData<MessagesPage>
      >(conversationKeys.messages(convId));

      const previousConversations = queryClient.getQueryData<
        ConversationType[]
      >(conversationKeys.lists());

      const optimisticMsg: MessageType = {
        _id: generateUUID(),
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
        (old) => {
          if (!old || old.pages.length === 0) return old;
          const lastPageIndex = old.pages.length - 1;
          const lastPage = old.pages[lastPageIndex];
          const updatedPages = [...old.pages];
          updatedPages[lastPageIndex] = {
            ...lastPage,
            messages: [...lastPage.messages, optimisticMsg],
          };
          return { ...old, pages: updatedPages };
        },
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
        previousMessages,
        previousConversations,
        conversationId: convId,
      };
    },

    onError: (_err, _payload, ctx) => {
      if (ctx) {
        if (ctx.previousMessages) {
          queryClient.setQueryData(
            conversationKeys.messages(ctx.conversationId),
            ctx.previousMessages,
          );
        }
        if (ctx.previousConversations) {
          queryClient.setQueryData(
            conversationKeys.lists(),
            ctx.previousConversations,
          );
        }
      }
      toast.error("Failed to send message");
    },

    onSettled: (_data, _err, payload) => {
      if (payload.conversationId) {
        void queryClient.invalidateQueries({
          queryKey: conversationKeys.messages(payload.conversationId),
        });
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
export function useToggleReaction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<
    unknown,
    Error,
    { conversationId: string; messageId: string; emoji: string },
    ToggleReactionContext
  >({
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

      const previousMessages = queryClient.getQueryData<
        InfiniteData<MessagesPage>
      >(conversationKeys.messages(conversationId));

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

      return { previousMessages, conversationId };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.previousMessages) {
        queryClient.setQueryData(
          conversationKeys.messages(ctx.conversationId),
          ctx.previousMessages,
        );
      }
      toast.error("Failed to update reaction");
    },
  });
}

/**
 * Mutation hook for creating a new 1-on-1 or group conversation.
 */
export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
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
