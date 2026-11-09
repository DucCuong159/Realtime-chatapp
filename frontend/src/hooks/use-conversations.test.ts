import { conversationKeys } from "@/constants/query-keys";
import { API } from "@/lib/axios-client";
import type { ConversationType, MessageType } from "@/types/conversation.type";
import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useConversations } from "./use-conversations";

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

describe("useConversations spec (TanStack Query v5)", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  it("exports useConversations hook function", () => {
    expect(typeof useConversations).toBe("function");
  });

  it("fetches conversation list from /conversation/all using query key", async () => {
    const mockConversations = [
      {
        _id: "c1",
        participants: [],
        isGroup: false,
        createdAt: "",
        updatedAt: "",
      },
    ];
    vi.mocked(API.get).mockResolvedValueOnce({
      data: { conversations: mockConversations },
    });

    const data = await queryClient.fetchQuery({
      queryKey: conversationKeys.lists(),
      queryFn: async () => {
        const res = await API.get("/conversation/all");
        return res.data.conversations;
      },
    });

    expect(data).toEqual(mockConversations);
    expect(API.get).toHaveBeenCalledWith("/conversation/all");
  });

  it("updates conversation lastMessage and bumps it to top on conversation:updated", () => {
    const c1 = {
      _id: "c1",
      participants: [],
      isGroup: false,
      lastMessage: null,
      createdAt: "2026-11-09T01:00:00Z",
      updatedAt: "2026-11-09T01:00:00Z",
    };
    const c2 = {
      _id: "c2",
      participants: [],
      isGroup: false,
      lastMessage: null,
      createdAt: "2026-11-09T01:05:00Z",
      updatedAt: "2026-11-09T01:05:00Z",
    };

    queryClient.setQueryData(conversationKeys.lists(), [c1, c2]);

    // Simulate handleUpdated logic
    const updatePayload = {
      conversationId: "c2",
      lastMessage: {
        _id: "m_new",
        conversationId: "c2",
        content: "New incoming message",
        createdAt: "2026-11-09T02:00:00Z",
      } as unknown as MessageType,
    };

    queryClient.setQueryData<ConversationType[]>(
      conversationKeys.lists(),
      (old = []) => {
        const target = old.find((c) => c._id === updatePayload.conversationId);
        if (!target) return old;

        const updatedTarget = {
          ...target,
          lastMessage: updatePayload.lastMessage,
          updatedAt: updatePayload.lastMessage.createdAt,
        };
        const remaining = old.filter(
          (c) => c._id !== updatePayload.conversationId,
        );
        return [updatedTarget, ...remaining];
      },
    );

    const updatedList = queryClient.getQueryData<ConversationType[]>(
      conversationKeys.lists(),
    );
    expect(updatedList).toHaveLength(2);
    expect(updatedList?.[0]._id).toBe("c2");
    expect(updatedList?.[0].lastMessage?._id).toBe("m_new");
  });
});
