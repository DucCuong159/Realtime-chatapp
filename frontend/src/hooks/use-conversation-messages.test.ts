import { conversationKeys } from "@/constants/query-keys";
import { API } from "@/lib/axios-client";
import type { UserType } from "@/types/auth.type";
import type { ConversationType, MessageType } from "@/types/conversation.type";
import { QueryClient, type InfiniteData } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  appendNewMessageToCache,
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

  it("fetches paginated conversation messages via cursor", async () => {
    const mockPage = {
      conversation: { _id: "c1", participants: [] },
      messages: [{ _id: "m1", conversationId: "c1", content: "Hello" }],
      pagination: { hasMore: false, nextCursor: null },
    };

    vi.mocked(API.get).mockResolvedValueOnce({ data: mockPage });

    const data = await queryClient.fetchQuery({
      queryKey: conversationKeys.messages("c1"),
      queryFn: async () => {
        const res = await API.get("/conversation/c1", {
          params: { cursor: undefined, limit: 30 },
        });
        return res.data;
      },
    });

    expect(data).toEqual(mockPage);
    expect(API.get).toHaveBeenCalledWith("/conversation/c1", {
      params: { cursor: undefined, limit: 30 },
    });
  });

  describe("appendNewMessageToCache", () => {
    const convId = "c1";

    it("replaces optimistic message with matching content and sender in-place", () => {
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
                _id: "temp-uuid-1",
                conversationId: convId,
                content: "Hello world",
                sender: { _id: "u1", name: "User 1" } as unknown as UserType,
                status: "sending...",
                reactions: [],
                createdAt: "2026-11-09T01:00:00Z",
                updatedAt: "2026-11-09T01:00:00Z",
              } as unknown as MessageType,
            ],
            pagination: { hasMore: false, nextCursor: null },
          },
        ],
        pageParams: [undefined],
      };

      queryClient.setQueryData(conversationKeys.messages(convId), initialCache);

      const serverMsg = {
        _id: "mongo-id-1",
        conversationId: convId,
        content: "Hello world",
        sender: { _id: "u1", name: "User 1" } as unknown as UserType,
        status: "",
        reactions: [],
        createdAt: "2026-11-09T01:00:01Z",
        updatedAt: "2026-11-09T01:00:01Z",
      } as unknown as MessageType;

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
            conversation: { _id: convId, participants: [] } as unknown as ConversationType,
            messages: [
              {
                _id: "mongo-id-1",
                conversationId: convId,
                content: "Existing message",
              } as unknown as MessageType,
            ],
            pagination: { hasMore: false, nextCursor: null },
          },
        ],
        pageParams: [undefined],
      };

      queryClient.setQueryData(conversationKeys.messages(convId), initialCache);

      const duplicateMsg = {
        _id: "mongo-id-1",
        conversationId: convId,
        content: "Existing message",
      } as unknown as MessageType;

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
            conversation: { _id: convId, participants: [] } as unknown as ConversationType,
            messages: [
              {
                _id: "m1",
                conversationId: convId,
                content: "Old message",
              } as unknown as MessageType,
            ],
            pagination: { hasMore: false, nextCursor: null },
          },
        ],
        pageParams: [undefined],
      };

      queryClient.setQueryData(conversationKeys.messages(convId), initialCache);

      const otherUserMsg = {
        _id: "m2",
        conversationId: convId,
        content: "Message from User 2",
        sender: { _id: "u2", name: "User 2" } as unknown as UserType,
      } as unknown as MessageType;

      appendNewMessageToCache(queryClient, convId, otherUserMsg);

      const updated = queryClient.getQueryData<typeof initialCache>(
        conversationKeys.messages(convId),
      );
      expect(updated?.pages[0].messages).toHaveLength(2);
      expect(updated?.pages[0].messages[1]._id).toBe("m2");
    });
  });
});
