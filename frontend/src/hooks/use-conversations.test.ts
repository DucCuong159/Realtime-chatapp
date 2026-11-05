import { conversationKeys } from "@/constants/query-keys";
import { API } from "@/lib/axios-client";
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
});
