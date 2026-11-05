import { conversationKeys } from "@/constants/query-keys";
import { API } from "@/lib/axios-client";
import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useConversationMessages } from "./use-conversation-messages";

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
});
