import { conversationKeys } from "@/constants/query-keys";
import {
  createMockConversation,
  createMockMessage,
  createMockPagination,
  createMockReaction,
  createMockUser,
} from "@/test/test-fixtures";
import type {
  AIStreamPayload,
  ConversationType,
  MessageReactionUpdatePayload,
  MessageType,
} from "@/types/conversation.type";
import { QueryClient, type InfiniteData } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  handleAIStreamUpdate,
  setupConversationSocketListeners,
  updateReactionsInCache,
  useConversationSocket,
} from "./use-conversation-socket";

vi.mock("@/lib/axios-client", () => ({
  API: {
    get: vi.fn().mockResolvedValue({
      data: {
        conversation: null,
        messages: [],
        pagination: { hasMore: false, nextCursor: null },
      },
    }),
  },
}));

vi.mock("./use-socket", () => {
  const mockStore = vi.fn(() => ({
    socket: {
      on: vi.fn(),
      off: vi.fn(),
    },
  }));
  return {
    useSocket: Object.assign(mockStore, {
      getState: vi.fn(() => ({ socket: null })),
    }),
  };
});

describe("useConversationSocket spec", () => {
  let queryClient: QueryClient;
  const convId = "c1";

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  it("exports useConversationSocket hook function", () => {
    expect(typeof useConversationSocket).toBe("function");
  });

  it("updates reactions in cache when updateReactionsInCache is called", () => {
    const initialCache: InfiniteData<{
      conversation: ConversationType;
      messages: MessageType[];
      pagination: { hasMore: boolean; nextCursor: string | null };
    }> = {
      pages: [
        {
          conversation: createMockConversation({ _id: convId }),
          messages: [
            createMockMessage({
              _id: "m1",
              conversationId: convId,
              content: "Hello",
              reactions: [],
            }),
          ],
          pagination: createMockPagination(),
        },
      ],
      pageParams: [undefined],
    };

    queryClient.setQueryData(conversationKeys.messages(convId), initialCache);

    const reactionPayload: MessageReactionUpdatePayload = {
      conversationId: convId,
      messageId: "m1",
      reactions: [createMockReaction({ emoji: "❤️" })],
    };

    updateReactionsInCache(queryClient, convId, reactionPayload);

    const updated = queryClient.getQueryData<typeof initialCache>(
      conversationKeys.messages(convId),
    );
    expect(updated?.pages[0].messages[0].reactions).toEqual(
      reactionPayload.reactions,
    );
  });

  it("handles AI streaming chunks and final message properly", () => {
    const initialCache: InfiniteData<{
      conversation: ConversationType;
      messages: MessageType[];
      pagination: { hasMore: boolean; nextCursor: string | null };
    }> = {
      pages: [
        {
          conversation: createMockConversation({ _id: convId }),
          messages: [],
          pagination: createMockPagination(),
        },
      ],
      pageParams: [undefined],
    };

    queryClient.setQueryData(conversationKeys.messages(convId), initialCache);

    // 1. First streaming chunk arrives
    const chunk1: AIStreamPayload = {
      conversationId: convId,
      chunk: "Hello",
      done: false,
      message: null,
      sender: createMockUser({ _id: "ai-1", name: "AI Assistant" }),
    };
    handleAIStreamUpdate(queryClient, convId, chunk1);

    let current = queryClient.getQueryData<typeof initialCache>(
      conversationKeys.messages(convId),
    );
    expect(current?.pages[0].messages).toHaveLength(1);
    expect(current?.pages[0].messages[0].content).toBe("Hello");
    expect(current?.pages[0].messages[0].streaming).toBe(true);

    // 2. Second chunk arrives
    const chunk2: AIStreamPayload = {
      conversationId: convId,
      chunk: " world!",
      done: false,
      message: null,
    };
    handleAIStreamUpdate(queryClient, convId, chunk2);

    current = queryClient.getQueryData<typeof initialCache>(
      conversationKeys.messages(convId),
    );
    expect(current?.pages[0].messages).toHaveLength(1);
    expect(current?.pages[0].messages[0].content).toBe("Hello world!");

    // 3. Final message arrives with done: true
    const donePayload: AIStreamPayload = {
      conversationId: convId,
      chunk: null,
      done: true,
      message: createMockMessage({
        _id: "m_ai_final",
        conversationId: convId,
        content: "Hello world!",
        streaming: false,
      }),
    };
    handleAIStreamUpdate(queryClient, convId, donePayload);

    current = queryClient.getQueryData<typeof initialCache>(
      conversationKeys.messages(convId),
    );
    expect(current?.pages[0].messages).toHaveLength(1);
    expect(current?.pages[0].messages[0]._id).toBe("m_ai_final");
    expect(current?.pages[0].messages[0].content).toBe("Hello world!");
    expect(current?.pages[0].messages[0].streaming).toBeFalsy();
  });

  it("registers listeners, ignores other conversations, and unregisters on teardown", async () => {
    const listeners: Record<string, (...args: unknown[]) => void> = {};
    const unlisteners: Record<string, (...args: unknown[]) => void> = {};

    const mockSocket = {
      on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        listeners[event] = handler;
      }),
      off: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        unlisteners[event] = handler;
      }),
    };

    const cleanup = setupConversationSocketListeners(queryClient, mockSocket, "c1");

    // 1. Verify listeners are registered
    expect(mockSocket.on).toHaveBeenCalledWith("message:new", expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith("message:reaction:update", expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith("conversation:ai", expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith("connect", expect.any(Function));

    // 2. Ignore payload for another conversation
    const setQueryDataSpy = vi.spyOn(queryClient, "setQueryData");
    listeners["message:new"](createMockMessage({ conversationId: "c_other" }));
    expect(setQueryDataSpy).not.toHaveBeenCalled();

    // 3. Connect event triggers message reconciliation for the active conversation
    const setSpy = vi.spyOn(queryClient, "setQueryData");
    listeners["connect"]();
    await vi.waitFor(() => {
      expect(setSpy).toHaveBeenCalledWith(
        conversationKeys.messages("c1"),
        expect.any(Function),
      );
    });

    // 4. Teardown unregisters all 4 listeners with the same handlers
    cleanup();
    expect(mockSocket.off).toHaveBeenCalledWith("message:new", listeners["message:new"]);
    expect(mockSocket.off).toHaveBeenCalledWith("message:reaction:update", listeners["message:reaction:update"]);
    expect(mockSocket.off).toHaveBeenCalledWith("conversation:ai", listeners["conversation:ai"]);
    expect(mockSocket.off).toHaveBeenCalledWith("connect", listeners["connect"]);
  });
});
