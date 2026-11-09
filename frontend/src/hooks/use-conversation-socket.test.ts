import { conversationKeys } from "@/constants/query-keys";
import type { UserType } from "@/types/auth.type";
import type {
  AIStreamPayload,
  ConversationType,
  MessageReactionType,
  MessageReactionUpdatePayload,
  MessageType,
} from "@/types/conversation.type";
import { QueryClient, type InfiniteData } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  handleAIStreamUpdate,
  updateReactionsInCache,
  useConversationSocket,
} from "./use-conversation-socket";

vi.mock("./use-socket", () => ({
  useSocket: vi.fn(() => ({
    socket: {
      on: vi.fn(),
      off: vi.fn(),
    },
  })),
}));

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
          conversation: { _id: convId, participants: [] } as unknown as ConversationType,
          messages: [
            {
              _id: "m1",
              conversationId: convId,
              content: "Hello",
              reactions: [],
            } as unknown as MessageType,
          ],
          pagination: { hasMore: false, nextCursor: null },
        },
      ],
      pageParams: [undefined],
    };

    queryClient.setQueryData(conversationKeys.messages(convId), initialCache);

    const reactionPayload: MessageReactionUpdatePayload = {
      conversationId: convId,
      messageId: "m1",
      reactions: [
        {
          emoji: "❤️",
          user: { _id: "u1", name: "User 1", avatar: null },
        } as MessageReactionType,
      ],
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
          conversation: { _id: convId, participants: [] } as unknown as ConversationType,
          messages: [],
          pagination: { hasMore: false, nextCursor: null },
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
      sender: { _id: "ai-1", name: "AI Assistant" } as unknown as UserType,
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
      message: {
        _id: "m_ai_final",
        conversationId: convId,
        content: "Hello world!",
        streaming: false,
      } as unknown as MessageType,
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
});
