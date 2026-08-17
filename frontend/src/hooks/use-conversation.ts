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

  fetchAllUsers: () => void;
  fetchConversations: () => void;
  createConversation: (
    payload: CreateConversationType,
  ) => Promise<ConversationType | null>;
  fetchSingleConversation: (conversationId: string) => void;
  sendMessage: (payload: CreateMessageType) => void;

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
  users: [],
  singleConversation: null,

  isConversationsLoading: false,
  isUsersLoading: false,
  isCreatingConversation: false,
  isSingleConversationLoading: false,
  isSendingMsg: false,

  currentAIStreamId: null,

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
      set((state) => {
        const fetchedConversations: ConversationType[] =
          data.conversations || [];
        const newSocketConversations = state.conversations.filter(
          (c) => !fetchedConversations.some((f) => f._id === c._id),
        );
        return {
          conversations: [...newSocketConversations, ...fetchedConversations],
        };
      });
    } finally {
      set({ isConversationsLoading: false });
    }
  },

  createConversation: async (payload: CreateConversationType) => {
    set({ isCreatingConversation: true });
    try {
      const response = await API.post("/api/conversation/create", {
        ...payload,
      });
      get().addNewConversation(response.data.conversation);
      toast.success("Conversation created successfully");
      return response.data.conversation;
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

    if (!conversationId || !user?._id) return;

    set({ isSendingMsg: true });

    const tempUserId = generateUUID();

    const tempMessage = {
      _id: tempUserId,
      conversationId,
      content: content || "",
      image: image || null,
      sender: user,
      replyTo: replyTo || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "sending...",
    };

    // if (isAI) {
    //  // AI Feature Source code link =>
    // }

    set((state) => {
      if (state.singleConversation?.conversation._id !== conversationId)
        return state;
      return {
        singleConversation: {
          conversation: state.singleConversation.conversation,
          messages: [...state.singleConversation.messages, tempMessage],
        },
      };
    });

    try {
      const { data } = await API.post("/api/conversation/message/send", {
        conversationId,
        content,
        image,
        replyToId: replyTo?._id,
      });
      const { userMessage } = data;
      //replace the temp user message
      set((state) => {
        if (!state.singleConversation) return state;
        return {
          singleConversation: {
            ...state.singleConversation,
            messages: state.singleConversation.messages.map((msg) =>
              msg._id === tempUserId ? userMessage : msg,
            ),
          },
        };
      });
    } catch {
      // remove the temp user message on failure so it does not remain stuck
      set((state) => {
        if (!state.singleConversation) return state;
        return {
          singleConversation: {
            ...state.singleConversation,
            messages: state.singleConversation.messages.filter(
              (msg) => msg._id !== tempUserId,
            ),
          },
        };
      });
    } finally {
      set({ isSendingMsg: false });
    }
  },

  addNewConversation: (newConversation: ConversationType) => {
    set((state) => {
      const existingIndex = state.conversations.findIndex(
        (c) => c._id === newConversation._id,
      );
      if (existingIndex !== -1) {
        return {
          conversations: [
            newConversation,
            ...state.conversations.filter((c) => c._id !== newConversation._id),
          ],
        };
      } else {
        return {
          conversations: [newConversation, ...state.conversations],
        };
      }
    });
  },

  updateConversationLastMessage: (
    conversationId: string,
    lastMessage: MessageType,
  ) => {
    set((state) => {
      const updatedConversations = state.conversations.map((c) =>
        c._id === conversationId ? { ...c, lastMessage } : c,
      );
      return { conversations: updatedConversations };
    });
  },

  addNewMessage: (conversationId, message) => {
    const conversation = get().singleConversation;
    if (conversation?.conversation._id === conversationId) {
      set({
        singleConversation: {
          conversation: conversation.conversation,
          messages: [...conversation.messages, message],
        },
      });
    }
  },
}));
