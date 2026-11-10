import { conversationKeys } from "@/constants/query-keys";
import { API } from "@/lib/axios-client";
import {
  createMockConversation,
  createMockMessage,
  createMockPagination,
  createMockUser,
} from "@/test/test-fixtures";
import type { ConversationType, MessageType } from "@/types/conversation.type";
import { QueryClient, type InfiniteData } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  appendNewMessageToCache,
  fetchConversationMessages,
  reconcileMessagesInPages,
  useConversationMessages,
} from "./use-conversation-messages";

vi.mock("@/lib/axios-client", () => ({
  API: {
    get: vi.fn(),
  },
}));

vi.mock("./use-socket", () => ({
  useSocket: vi.fn(() => ({
    socket: {
      on: vi.fn(),
      off: vi.fn(),
    },
  })),
}));

describe("useConversationMessages spec (TanStack Query v5)", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  it("exports useConversationMessages hook function", () => {
    expect(typeof useConversationMessages).toBe("function");
  });

  it("fetches paginated conversation messages via production fetchConversationMessages", async () => {
    const mockPage = {
      conversation: createMockConversation({ _id: "c1" }),
      messages: [createMockMessage({ _id: "m1", conversationId: "c1", content: "Hello" })],
      pagination: createMockPagination(),
    };

    vi.mocked(API.get).mockResolvedValueOnce({ data: mockPage });

    const data = await queryClient.fetchQuery({
      queryKey: conversationKeys.messages("c1"),
      queryFn: () => fetchConversationMessages("c1", "cursor_123", 30),
    });

    expect(data).toEqual(mockPage);
    expect(API.get).toHaveBeenCalledWith("/conversation/c1", {
      params: { cursor: "cursor_123", limit: 30 },
    });

    // Test fallback when messages is missing from API payload
    vi.mocked(API.get).mockResolvedValueOnce({
      data: {
        conversation: createMockConversation({ _id: "c1" }),
        pagination: createMockPagination(),
      },
    });

    const fallbackData = await fetchConversationMessages("c1");
    expect(fallbackData.messages).toEqual([]);
    expect(API.get).toHaveBeenCalledWith("/conversation/c1", {
      params: { cursor: undefined, limit: 30 },
    });
  });

  describe("appendNewMessageToCache", () => {
    const convId = "c1";

    it("replaces optimistic message with matching content and sender in-place", () => {
      const sender = createMockUser({ _id: "u1", name: "User 1" });
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
                _id: "temp-uuid-1",
                conversationId: convId,
                content: "Hello world",
                sender,
                status: "sending...",
                createdAt: "2026-11-09T01:00:00Z",
                updatedAt: "2026-11-09T01:00:00Z",
              }),
            ],
            pagination: createMockPagination(),
          },
        ],
        pageParams: [undefined],
      };

      queryClient.setQueryData(conversationKeys.messages(convId), initialCache);

      const serverMsg = createMockMessage({
        _id: "mongo-id-1",
        conversationId: convId,
        content: "Hello world",
        sender,
        status: "",
        createdAt: "2026-11-09T01:00:01Z",
        updatedAt: "2026-11-09T01:00:01Z",
      });

      appendNewMessageToCache(queryClient, convId, serverMsg);

      const updated = queryClient.getQueryData<typeof initialCache>(
        conversationKeys.messages(convId),
      );
      expect(updated?.pages[0].messages).toHaveLength(1);
      expect(updated?.pages[0].messages[0]._id).toBe("mongo-id-1");
      expect(updated?.pages[0].messages[0].status).toBe("");
    });

    it("deduplicates if message with exact _id already exists in cache", () => {
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
                _id: "mongo-id-1",
                conversationId: convId,
                content: "Existing message",
              }),
            ],
            pagination: createMockPagination(),
          },
        ],
        pageParams: [undefined],
      };

      queryClient.setQueryData(conversationKeys.messages(convId), initialCache);

      const duplicateMsg = createMockMessage({
        _id: "mongo-id-1",
        conversationId: convId,
        content: "Existing message",
      });

      appendNewMessageToCache(queryClient, convId, duplicateMsg);

      const updated = queryClient.getQueryData<typeof initialCache>(
        conversationKeys.messages(convId),
      );
      expect(updated?.pages[0].messages).toHaveLength(1);
    });

    it("appends new incoming message from other user to the last page", () => {
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
                content: "Old message",
              }),
            ],
            pagination: createMockPagination(),
          },
        ],
        pageParams: [undefined],
      };

      queryClient.setQueryData(conversationKeys.messages(convId), initialCache);

      const otherUser = createMockUser({ _id: "u2", name: "User 2" });
      const otherUserMsg = createMockMessage({
        _id: "m2",
        conversationId: convId,
        content: "Message from User 2",
        sender: otherUser,
      });

      appendNewMessageToCache(queryClient, convId, otherUserMsg);

      const updated = queryClient.getQueryData<typeof initialCache>(
        conversationKeys.messages(convId),
      );
      expect(updated?.pages[0].messages).toHaveLength(2);
      expect(updated?.pages[0].messages[1]._id).toBe("m2");
    });
  });

  describe("reconcileMessagesInPages", () => {
    it("preserves older pages, retains pending optimistic/streaming messages, and updates confirmed messages", () => {
      const convId = "c1";

      const olderPage = {
        conversation: createMockConversation({ _id: convId }),
        messages: [
          createMockMessage({ _id: "m_older_1", conversationId: convId, content: "Older message" }),
        ],
        pagination: createMockPagination({ hasMore: true, nextCursor: "older_cursor" }),
      };

      const existingRecentPage = {
        conversation: createMockConversation({ _id: convId }),
        messages: [
          createMockMessage({ _id: "m_recent_1", conversationId: convId, content: "Recent 1" }),
          createMockMessage({
            _id: "temp_sending_1",
            conversationId: convId,
            content: "Pending send...",
            status: "sending...",
          }),
        ],
        pagination: createMockPagination({ hasMore: false }),
      };

      const initialCache = {
        pages: [olderPage, existingRecentPage],
        pageParams: ["older_cursor", undefined],
      };

      // Fresh page from server has an updated recent message and a new confirmed message
      const freshPage = {
        conversation: createMockConversation({ _id: convId }),
        messages: [
          createMockMessage({ _id: "m_recent_1", conversationId: convId, content: "Recent 1 (edited)" }),
          createMockMessage({ _id: "m_recent_2", conversationId: convId, content: "New confirmed from peer" }),
        ],
        pagination: createMockPagination({ hasMore: false }),
      };

      const reconciled = reconcileMessagesInPages(initialCache, freshPage);

      // 1. Older page is preserved verbatim
      expect(reconciled.pages).toHaveLength(2);
      expect(reconciled.pages[0].messages[0]._id).toBe("m_older_1");

      // 2. Recent page has updated message, new peer message, AND retained pending optimistic message
      const recentMessages = reconciled.pages[1].messages;
      expect(recentMessages).toHaveLength(3);
      expect(recentMessages[0].content).toBe("Recent 1 (edited)");
      expect(recentMessages[1]._id).toBe("m_recent_2");
      expect(recentMessages[2]._id).toBe("temp_sending_1");
      expect(recentMessages[2].status).toBe("sending...");
    });
  });
});
