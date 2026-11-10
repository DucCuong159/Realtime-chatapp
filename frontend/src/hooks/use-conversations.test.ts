import { conversationKeys } from "@/constants/query-keys";
import { API } from "@/lib/axios-client";
import { createMockConversation, createMockMessage } from "@/test/test-fixtures";
import type { ConversationType } from "@/types/conversation.type";
import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchConversations,
  handleConversationNew,
  handleConversationUpdated,
  setupConversationsSocketListeners,
  updateConversationInList,
  useConversations,
} from "./use-conversations";

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

  it("fetches conversation list from /conversation/all using production fetchConversations", async () => {
    const mockConversations = [
      createMockConversation({ _id: "c1" }),
    ];
    vi.mocked(API.get).mockResolvedValueOnce({
      data: { conversations: mockConversations },
    });

    const data = await queryClient.fetchQuery({
      queryKey: conversationKeys.lists(),
      queryFn: fetchConversations,
    });

    expect(data).toEqual(mockConversations);
    expect(API.get).toHaveBeenCalledWith("/conversation/all");
  });

  it("updates conversation lastMessage and bumps it to top using production updateConversationInList", () => {
    const c1 = createMockConversation({
      _id: "c1",
      createdAt: "2026-11-09T01:00:00Z",
      updatedAt: "2026-11-09T01:00:00Z",
    });
    const c2 = createMockConversation({
      _id: "c2",
      createdAt: "2026-11-09T01:05:00Z",
      updatedAt: "2026-11-09T01:05:00Z",
    });

    queryClient.setQueryData(conversationKeys.lists(), [c1, c2]);

    const newLastMessage = createMockMessage({
      _id: "m_new",
      conversationId: "c2",
      content: "New incoming message",
      createdAt: "2026-11-09T02:00:00Z",
    });

    const updatePayload = {
      conversationId: "c2",
      lastMessage: newLastMessage,
    };

    // Exercise production updater function directly
    queryClient.setQueryData<ConversationType[]>(
      conversationKeys.lists(),
      (old = []) => updateConversationInList(old, updatePayload),
    );

    const updatedList = queryClient.getQueryData<ConversationType[]>(
      conversationKeys.lists(),
    );
    expect(updatedList).toHaveLength(2);
    expect(updatedList?.[0]._id).toBe("c2");
    expect(updatedList?.[0].lastMessage?._id).toBe("m_new");
    expect(updatedList?.[0].updatedAt).toBe("2026-11-09T02:00:00Z");
  });

  it("handles conversation:updated via handleConversationUpdated by updating cache if conversation exists", () => {
    const c1 = createMockConversation({ _id: "c1" });
    const c2 = createMockConversation({ _id: "c2" });
    queryClient.setQueryData(conversationKeys.lists(), [c1, c2]);

    const newLastMessage = createMockMessage({
      _id: "m_new",
      conversationId: "c2",
      content: "Hello from c2",
      createdAt: "2026-11-09T03:00:00Z",
    });

    handleConversationUpdated(queryClient, {
      conversationId: "c2",
      lastMessage: newLastMessage,
    });

    const updatedList = queryClient.getQueryData<ConversationType[]>(
      conversationKeys.lists(),
    );
    expect(updatedList?.[0]._id).toBe("c2");
    expect(updatedList?.[0].lastMessage?._id).toBe("m_new");
  });

  it("invalidates conversation list when handleConversationUpdated receives an unlisted conversation", () => {
    const c1 = createMockConversation({ _id: "c1" });
    queryClient.setQueryData(conversationKeys.lists(), [c1]);

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    handleConversationUpdated(queryClient, {
      conversationId: "c_unlisted",
      lastMessage: createMockMessage({ conversationId: "c_unlisted" }),
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: conversationKeys.lists(),
    });
  });

  it("adds new conversation to the front via handleConversationNew and avoids duplicates", () => {
    const c1 = createMockConversation({ _id: "c1" });
    queryClient.setQueryData(conversationKeys.lists(), [c1]);

    const c2 = createMockConversation({ _id: "c2" });
    handleConversationNew(queryClient, c2);

    let list = queryClient.getQueryData<ConversationType[]>(
      conversationKeys.lists(),
    );
    expect(list?.map((c) => c._id)).toEqual(["c2", "c1"]);

    // Attempting to add duplicate c2 should not duplicate
    handleConversationNew(queryClient, c2);
    list = queryClient.getQueryData<ConversationType[]>(
      conversationKeys.lists(),
    );
    expect(list?.map((c) => c._id)).toEqual(["c2", "c1"]);
  });

  it("updates conversation with full ConversationType payload including groupName and updatedAt", () => {
    const c1 = createMockConversation({
      _id: "c1",
      groupName: "Old Group Name",
      updatedAt: "2026-11-09T01:00:00Z",
    });
    queryClient.setQueryData(conversationKeys.lists(), [c1]);

    const fullUpdatedConv = createMockConversation({
      _id: "c1",
      groupName: "Renamed Group",
      updatedAt: "2026-11-09T05:00:00Z",
    });

    queryClient.setQueryData<ConversationType[]>(
      conversationKeys.lists(),
      (old = []) => updateConversationInList(old, fullUpdatedConv),
    );

    const updatedList = queryClient.getQueryData<ConversationType[]>(
      conversationKeys.lists(),
    );
    expect(updatedList?.[0].groupName).toBe("Renamed Group");
    expect(updatedList?.[0].updatedAt).toBe("2026-11-09T05:00:00Z");
  });

  it("attaches and removes socket listeners via setupConversationsSocketListeners", () => {
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

    const cleanup = setupConversationsSocketListeners(queryClient, mockSocket);

    expect(mockSocket.on).toHaveBeenCalledWith("conversation:new", expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith("conversation:updated", expect.any(Function));

    cleanup();

    expect(mockSocket.off).toHaveBeenCalledWith("conversation:new", listeners["conversation:new"]);
    expect(mockSocket.off).toHaveBeenCalledWith("conversation:updated", listeners["conversation:updated"]);
  });
});
