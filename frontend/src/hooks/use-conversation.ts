import { API } from "@/lib/axios-client";
import { generateUUID } from "@/lib/utils";
import type { UserType } from "@/types/auth.type";
import type {
  ConversationType,
  CreateConversationType,
  CreateMessageType,
  MessageType,
  PaginationType,
} from "@/types/conversation.type";
import { toast } from "sonner";
import { create } from "zustand";
import { useAuth } from "./use-auth";

interface ConversationState {
  conversations: ConversationType[];
  pendingSocketConversationIds: string[];
  users: UserType[];
  singleConversation: {
    conversation: ConversationType;
    messages: MessageType[];
    pagination?: PaginationType;
  } | null;

  isConversationsLoading: boolean;
  isUsersLoading: boolean;
  isCreatingConversation: boolean;
  isSingleConversationLoading: boolean;
  isFetchingMoreMessages: boolean;
  isSendingMsg: boolean;

  fetchAllUsers: () => Promise<void>;
  fetchConversations: () => Promise<void>;
  createConversation: (
    payload: CreateConversationType,
  ) => Promise<ConversationType | null>;
  fetchSingleConversation: (conversationId: string) => Promise<void>;
  fetchMoreMessages: (conversationId: string) => Promise<boolean>;
  sendMessage: (
    payload: CreateMessageType,
    isAIConversation?: boolean,
  ) => Promise<void>;

  addNewConversation: (newConversation: ConversationType) => void;
  updateConversationLastMessage: (
    conversationId: string,
    lastMessage: MessageType,
  ) => void;
  addNewMessage: (conversationId: string, message: MessageType) => void;

  addOrUpdateMessage: (
    conversationId: string,
    msg: MessageType,
    tempId?: string,
  ) => void;
  updateStreamingAIMessage: (
    conversationId: string,
    chunk: string,
    sender?: UserType,
  ) => void;
  clearStreamingAIMessage: (conversationId: string) => void;
}

let activeFetchingConversationId: string | null = null;

function rollbackFailedConversation(
  currentConversations: ConversationType[],
  priorConversations: ConversationType[],
  conversationId: string,
  failedMsgId: string,
): ConversationType[] {
  const current = currentConversations.find((c) => c._id === conversationId);
  if (current?.lastMessage?._id !== failedMsgId) {
    return currentConversations;
  }

  const prior = priorConversations.find((c) => c._id === conversationId);
  if (!prior) return currentConversations;

  const restored: ConversationType = {
    ...current,
    lastMessage: prior.lastMessage,
    updatedAt: prior.updatedAt,
  };

  const remaining = currentConversations.filter(
    (c) => c._id !== conversationId,
  );
  const priorIndex = priorConversations.findIndex(
    (c) => c._id === conversationId,
  );
  const insertIndex =
    priorIndex >= 0 ? Math.min(priorIndex, remaining.length) : 0;

  return [
    ...remaining.slice(0, insertIndex),
    restored,
    ...remaining.slice(insertIndex),
  ];
}

export const useConversation = create<ConversationState>()((set, get) => ({
  conversations: [],
  pendingSocketConversationIds: [],
  users: [],
  singleConversation: null,

  isConversationsLoading: false,
  isUsersLoading: false,
  isCreatingConversation: false,
  isSingleConversationLoading: false,
  isFetchingMoreMessages: false,
  isSendingMsg: false,

  fetchAllUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const { data } = await API.get("/user/all");
      set({ users: data.users });
    } finally {
      set({ isUsersLoading: false });
    }
  },

  fetchConversations: async () => {
    set({ isConversationsLoading: true });
    try {
      const { data } = await API.get("/conversation/all");
      const fetched: ConversationType[] = data.conversations || [];

      set((state) => {
        const fetchedIds = new Set(fetched.map((f) => f._id));
        const stillPendingIds = state.pendingSocketConversationIds.filter(
          (id) => !fetchedIds.has(id),
        );
        const pendingConversations = state.conversations.filter((c) =>
          stillPendingIds.includes(c._id),
        );

        return {
          conversations: [...pendingConversations, ...fetched],
          pendingSocketConversationIds: stillPendingIds,
        };
      });
    } finally {
      set({ isConversationsLoading: false });
    }
  },

  createConversation: async (payload: CreateConversationType) => {
    set({ isCreatingConversation: true });
    try {
      const response = await API.post("/conversation/create", payload);
      const newConversation: ConversationType = response.data.conversation;
      get().addNewConversation(newConversation);
      toast.success("Conversation created successfully");
      return newConversation;
    } finally {
      set({ isCreatingConversation: false });
    }
  },

  fetchSingleConversation: async (conversationId: string) => {
    activeFetchingConversationId = conversationId;
    set({ isSingleConversationLoading: true });
    try {
      const { data } = await API.get(`/conversation/${conversationId}`);
      if (activeFetchingConversationId === conversationId) {
        set({
          singleConversation: {
            conversation: data.conversation,
            messages: data.messages,
            pagination: data.pagination,
          },
        });
      }
    } catch {
      if (activeFetchingConversationId === conversationId) {
        set({ singleConversation: null });
      }
    } finally {
      if (activeFetchingConversationId === conversationId) {
        set({ isSingleConversationLoading: false });
      }
    }
  },

  fetchMoreMessages: async (conversationId: string) => {
    const state = get();
    if (state.isFetchingMoreMessages) return false;

    const single = state.singleConversation;
    if (!single || single.conversation._id !== conversationId) return false;

    const pagination = single.pagination;
    if (!pagination?.hasMore || !pagination?.nextCursor) return false;

    set({ isFetchingMoreMessages: true });
    try {
      const { data } = await API.get(`/conversation/${conversationId}`, {
        params: {
          cursor: pagination.nextCursor,
          limit: 30,
        },
      });

      const currentState = get();
      if (
        currentState.singleConversation &&
        currentState.singleConversation.conversation._id === conversationId
      ) {
        const olderMessages: MessageType[] = data.messages || [];
        const currentMessages = currentState.singleConversation.messages;

        // Deduplicate messages by _id
        const existingIds = new Set(currentMessages.map((m) => m._id));
        const uniqueOlder = olderMessages.filter(
          (m) => !existingIds.has(m._id),
        );

        set({
          singleConversation: {
            ...currentState.singleConversation,
            messages: [...uniqueOlder, ...currentMessages],
            pagination: data.pagination,
          },
        });
        return uniqueOlder.length > 0;
      }
      return false;
    } catch {
      return false;
    } finally {
      set({ isFetchingMoreMessages: false });
    }
  },

  sendMessage: async (
    payload: CreateMessageType,
    isAIConversation: boolean = false,
  ) => {
    const { conversationId, replyTo, content, image, aiModelId } = payload;
    const { user } = useAuth.getState();

    if (!conversationId || !user?._id || (!content?.trim() && !image)) return;

    set({ isSendingMsg: true });

    const conversation = get().singleConversation?.conversation;
    const aiSender = conversation?.participants.find((p) => p.isAI);

    const tempMsgId = generateUUID();
    const tempAIId = generateUUID();
    const now = new Date().toISOString();

    const tempMessage: MessageType = {
      _id: tempMsgId,
      conversationId,
      content: content || "",
      image: image || null,
      sender: user,
      replyTo: replyTo || null,
      createdAt: now,
      updatedAt: now,
      status: !isAIConversation ? "sending..." : "",
    };

    const priorConversations = get().conversations;

    // 1. Optimistically append message to active conversation & bump list
    get().addOrUpdateMessage(conversationId, tempMessage);

    if (isAIConversation && aiSender) {
      const tempAIMessage: MessageType = {
        _id: tempAIId,
        conversationId,
        content: "",
        image: null,
        sender: aiSender,
        replyTo: null,
        streaming: true,
        createdAt: now,
        updatedAt: now,
        status: "",
      };
      get().addOrUpdateMessage(conversationId, tempAIMessage);
    }
    get().updateConversationLastMessage(conversationId, tempMessage);

    try {
      // 2. Call API
      const { data } = await API.post("/conversation/message/send", {
        conversationId,
        content,
        image,
        replyTo: replyTo?._id,
        aiModelId,
      });
      const { userMessage } = data;
      // 3. Replace temp message with server response (inside conversation and update list)
      // AI response handled via socket
      get().addOrUpdateMessage(conversationId, userMessage, tempMsgId);
      get().updateConversationLastMessage(conversationId, userMessage);
    } catch {
      // 4. Revert optimistic message and restore list state on failure
      set((state) => ({
        singleConversation: state.singleConversation
          ? {
              ...state.singleConversation,
              messages: state.singleConversation.messages.filter(
                (m) => m._id !== tempMsgId && m._id !== tempAIId,
              ),
            }
          : null,
        conversations: rollbackFailedConversation(
          state.conversations,
          priorConversations,
          conversationId,
          tempMsgId,
        ),
      }));
    } finally {
      set({ isSendingMsg: false });
    }
  },

  addNewConversation: (newConversation: ConversationType) => {
    set((state) => ({
      conversations: [
        newConversation,
        ...state.conversations.filter((c) => c._id !== newConversation._id),
      ],
      pendingSocketConversationIds: state.pendingSocketConversationIds.includes(
        newConversation._id,
      )
        ? state.pendingSocketConversationIds
        : [...state.pendingSocketConversationIds, newConversation._id],
    }));
  },

  updateConversationLastMessage: (
    conversationId: string,
    lastMessage: MessageType,
  ) => {
    set((state) => {
      const target = state.conversations.find((c) => c._id === conversationId);
      if (!target) return state;

      const updatedTarget: ConversationType = {
        ...target,
        lastMessage,
        updatedAt: lastMessage.createdAt || new Date().toISOString(),
      };
      const remaining = state.conversations.filter(
        (c) => c._id !== conversationId,
      );

      // Always bump the updated conversation to the top (newest first)
      return { conversations: [updatedTarget, ...remaining] };
    });
  },

  addNewMessage: (conversationId: string, message: MessageType) => {
    get().addOrUpdateMessage(conversationId, message);

    const single = get().singleConversation;
    if (single && single.conversation._id === conversationId) {
      const isAIConversation = Boolean(
        single.conversation.isAiConversation ||
        single.conversation.participants?.some((p) => p.isAI),
      );
      const aiSender = single.conversation.participants?.find((p) => p.isAI);

      if (
        isAIConversation &&
        aiSender &&
        !message.sender?.isAI &&
        !message.streaming
      ) {
        const tempAIMessage: MessageType = {
          _id: generateUUID(),
          conversationId,
          content: "",
          image: null,
          sender: aiSender,
          replyTo: null,
          streaming: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: "",
        };
        get().addOrUpdateMessage(conversationId, tempAIMessage);
      }
    }
  },

  addOrUpdateMessage: (
    conversationId: string,
    msg: MessageType,
    tempId?: string,
  ) => {
    set((state) => {
      const single = state.singleConversation;
      if (!single || single.conversation._id !== conversationId) return state;

      const messages = single.messages;
      let msgIndex = -1;

      if (tempId) {
        msgIndex = messages.findIndex((m) => m._id === tempId);
      } else {
        msgIndex = messages.findIndex((m) => m._id === msg._id);
        if (msgIndex === -1 && msg.sender?.isAI && !msg.streaming) {
          // Find the active streaming AI placeholder in the conversation
          msgIndex = messages.findIndex(
            (m) =>
              Boolean(m.streaming) &&
              (m.sender?._id === msg.sender?._id || Boolean(m.sender?.isAI)),
          );
        }
      }

      let updatedMessages: MessageType[];
      if (msgIndex !== -1) {
        // If the real msg._id was already added by socket elsewhere, drop the temp message
        const alreadyExistsOtherIdx = messages.findIndex(
          (m, i) => i !== msgIndex && m._id === msg._id,
        );
        if (alreadyExistsOtherIdx !== -1) {
          updatedMessages = messages.filter((_, i) => i !== msgIndex);
        } else {
          updatedMessages = messages.map((m, i) =>
            i === msgIndex ? { ...msg, streaming: false } : m,
          );
        }
      } else {
        if (messages.some((m) => m._id === msg._id)) {
          return state;
        }
        updatedMessages = [...messages, msg];
      }

      return {
        singleConversation: {
          ...single,
          messages: updatedMessages,
        },
      };
    });
  },

  updateStreamingAIMessage: (
    conversationId: string,
    chunk: string,
    sender?: UserType,
  ) => {
    set((state) => {
      const single = state.singleConversation;
      if (!single || single.conversation._id !== conversationId) return state;

      const messages = single.messages;
      const streamIndex = messages.findIndex((m) => Boolean(m.streaming));

      if (streamIndex !== -1) {
        const updatedMessages = messages.map((m, i) =>
          i === streamIndex
            ? { ...m, content: (m.content || "") + chunk, streaming: true }
            : m,
        );
        return {
          singleConversation: {
            ...single,
            messages: updatedMessages,
          },
        };
      } else if (sender) {
        const newAIMsg: MessageType = {
          _id: generateUUID(),
          conversationId,
          content: chunk,
          image: null,
          sender,
          replyTo: null,
          streaming: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: "",
        };
        return {
          singleConversation: {
            ...single,
            messages: [...messages, newAIMsg],
          },
        };
      }
      return state;
    });
  },

  clearStreamingAIMessage: (conversationId: string) => {
    set((state) => {
      const single = state.singleConversation;
      if (!single || single.conversation._id !== conversationId) return state;

      const updatedMessages = single.messages
        .filter((m) => !(m.streaming && !m.content?.trim()))
        .map((m) => (m.streaming ? { ...m, streaming: false } : m));

      return {
        singleConversation: {
          ...single,
          messages: updatedMessages,
        },
      };
    });
  },
}));
