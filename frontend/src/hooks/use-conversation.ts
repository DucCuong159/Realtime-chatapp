import { API } from "@/lib/axios-client";
import { generateUUID } from "@/lib/utils";
import type { UserType } from "@/types/auth.type";
import type {
  ConversationType,
  CreateConversationType,
  CreateMessageType,
  MessageType,
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
  } | null;

  isConversationsLoading: boolean;
  isUsersLoading: boolean;
  isCreatingConversation: boolean;
  isSingleConversationLoading: boolean;
  isSendingMsg: boolean;

  fetchAllUsers: () => Promise<void>;
  fetchConversations: () => Promise<void>;
  createConversation: (
    payload: CreateConversationType,
  ) => Promise<ConversationType | null>;
  fetchSingleConversation: (conversationId: string) => Promise<void>;
  sendMessage: (payload: CreateMessageType) => Promise<void>;

  addNewConversation: (newConversation: ConversationType) => void;
  updateConversationLastMessage: (
    conversationId: string,
    lastMessage: MessageType,
  ) => void;
  addNewMessage: (conversationId: string, message: MessageType) => void;
}

let activeFetchingConversationId: string | null = null;

function replaceTempMessage(
  messages: MessageType[],
  tempMsgId: string,
  serverMessage: MessageType,
): MessageType[] {
  const isAlreadyAdded = messages.some((m) => m._id === serverMessage._id);
  return isAlreadyAdded
    ? messages.filter((m) => m._id !== tempMsgId)
    : messages.map((m) => (m._id === tempMsgId ? serverMessage : m));
}

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
  isSendingMsg: false,

  fetchAllUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const { data } = await API.get("/api/user/all");
      set({ users: data.users });
    } finally {
      set({ isUsersLoading: false });
    }
  },

  fetchConversations: async () => {
    set({ isConversationsLoading: true });
    try {
      const { data } = await API.get("/api/conversation/all");
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
      const response = await API.post("/api/conversation/create", payload);
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
      const { data } = await API.get(`/api/conversation/${conversationId}`);
      if (activeFetchingConversationId === conversationId) {
        set({
          singleConversation: {
            conversation: data.conversation,
            messages: data.messages,
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

  sendMessage: async (payload: CreateMessageType) => {
    const { conversationId, replyTo, content, image } = payload;
    const { user } = useAuth.getState();

    if (!conversationId || !user?._id || (!content?.trim() && !image)) return;

    set({ isSendingMsg: true });

    const tempMsgId = generateUUID();
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
      status: "sending...",
    };

    const priorConversations = get().conversations;

    // 1. Optimistically append message to active conversation & bump list
    set((state) => ({
      singleConversation:
        state.singleConversation?.conversation._id === conversationId
          ? {
              ...state.singleConversation,
              messages: [...state.singleConversation.messages, tempMessage],
            }
          : state.singleConversation,
    }));
    get().updateConversationLastMessage(conversationId, tempMessage);

    try {
      // 2. Call API
      const { data } = await API.post("/api/conversation/message/send", {
        conversationId,
        content,
        image,
        replyTo: replyTo?._id,
      });
      const userMessage: MessageType = data.userMessage;

      // 3. Replace temp message with server response
      set((state) => ({
        singleConversation: state.singleConversation
          ? {
              ...state.singleConversation,
              messages: replaceTempMessage(
                state.singleConversation.messages,
                tempMsgId,
                userMessage,
              ),
            }
          : null,
      }));
      get().updateConversationLastMessage(conversationId, userMessage);
    } catch {
      // 4. Revert optimistic message and restore list state on failure
      set((state) => ({
        singleConversation: state.singleConversation
          ? {
              ...state.singleConversation,
              messages: state.singleConversation.messages.filter(
                (m) => m._id !== tempMsgId,
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
    set((state) => {
      const single = state.singleConversation;
      if (!single || single.conversation._id !== conversationId) return state;
      if (single.messages.some((m) => m._id === message._id)) return state;

      return {
        singleConversation: {
          ...single,
          messages: [...single.messages, message],
        },
      };
    });
  },
}));
