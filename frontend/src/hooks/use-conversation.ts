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

    // 1. Optimistically append message to active conversation
    set((state) => {
      if (state.singleConversation?.conversation._id !== conversationId) {
        return state;
      }
      return {
        singleConversation: {
          ...state.singleConversation,
          messages: [...state.singleConversation.messages, tempMessage],
        },
      };
    });

    // 2. Optimistically bump conversation to top of list
    get().updateConversationLastMessage(conversationId, tempMessage);

    try {
      const { data } = await API.post("/api/conversation/message/send", {
        conversationId,
        content,
        image,
        replyTo: replyTo?._id,
      });
      const userMessage: MessageType = data.userMessage;

      // 3. Replace temp message with server response
      set((state) => {
        if (!state.singleConversation) return state;
        const { messages } = state.singleConversation;
        const isAlreadyAdded = messages.some((m) => m._id === userMessage._id);

        return {
          singleConversation: {
            ...state.singleConversation,
            messages: isAlreadyAdded
              ? messages.filter((m) => m._id !== tempMsgId)
              : messages.map((m) => (m._id === tempMsgId ? userMessage : m)),
          },
        };
      });

      get().updateConversationLastMessage(conversationId, userMessage);
    } catch {
      // Revert optimistic message and list state on failure
      set((state) => {
        const nextSingleConversation = state.singleConversation
          ? {
              ...state.singleConversation,
              messages: state.singleConversation.messages.filter(
                (m) => m._id !== tempMsgId,
              ),
            }
          : null;

        const currentConv = state.conversations.find(
          (c) => c._id === conversationId,
        );
        let nextConversations = state.conversations;

        // Restore prior lastMessage and list ordering only if current lastMessage is still the failed tempMessage
        if (currentConv?.lastMessage?._id === tempMsgId) {
          const priorConv = priorConversations.find(
            (c) => c._id === conversationId,
          );
          if (priorConv) {
            const restoredConv: ConversationType = {
              ...currentConv,
              lastMessage: priorConv.lastMessage,
              updatedAt: priorConv.updatedAt,
            };
            const remaining = state.conversations.filter(
              (c) => c._id !== conversationId,
            );
            const priorIndex = priorConversations.findIndex(
              (c) => c._id === conversationId,
            );
            const insertIndex =
              priorIndex >= 0 ? Math.min(priorIndex, remaining.length) : 0;
            nextConversations = [
              ...remaining.slice(0, insertIndex),
              restoredConv,
              ...remaining.slice(insertIndex),
            ];
          }
        }

        return {
          singleConversation: nextSingleConversation,
          conversations: nextConversations,
        };
      });
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
