import { conversationKeys } from "@/constants/query-keys";
import {
  createMockConversation,
  createMockMessage,
  createMockPagination,
  createMockReaction,
  createMockUser,
} from "@/test/test-fixtures";
import { QueryClient, type InfiniteData } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  appendOptimisticMessageToPages,
  removeOptimisticMessageFromPages,
  replaceOptimisticMessageInPages,
  revertMessageReactionsInPages,
  useCreateConversation,
  useSendMessage,
  useToggleReaction,
  type MessagesPage,
} from "./use-conversation-actions";

vi.mock("@/lib/axios-client", () => ({
  API: {
    post: vi.fn(),
  },
}));

vi.mock("./use-auth", () => ({
  useAuth: vi.fn(() => ({
    user: createMockUser({ _id: "u1", name: "User 1" }),
  })),
}));

describe("useConversationActions spec (TanStack Query v5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports all action mutation hooks", () => {
    expect(typeof useSendMessage).toBe("function");
    expect(typeof useToggleReaction).toBe("function");
    expect(typeof useCreateConversation).toBe("function");
  });

  it("exercises appendOptimisticMessageToPages and replaceOptimisticMessageInPages without resetting older pages", () => {
    const convId = "c1";

    // Setup initial cache with 2 pages (simulating user loaded older history)
    const initialCache: InfiniteData<MessagesPage> = {
      pages: [
        {
          conversation: createMockConversation({ _id: convId }),
          messages: [
            createMockMessage({
              _id: "m_old_1",
              conversationId: convId,
              content: "Old message",
              createdAt: "2026-11-09T01:00:00Z",
            }),
          ],
          pagination: createMockPagination({ hasMore: false, nextCursor: null }),
        },
        {
          conversation: createMockConversation({ _id: convId }),
          messages: [
            createMockMessage({
              _id: "m_recent_1",
              conversationId: convId,
              content: "Recent message",
              createdAt: "2026-11-09T02:00:00Z",
            }),
          ],
          pagination: createMockPagination({ hasMore: true, nextCursor: "cursor_1" }),
        },
      ],
      pageParams: ["cursor_1", undefined],
    };

    // 1. Optimistic append via production updater
    const tempId = "temp-opt-uuid";
    const optimisticMsg = createMockMessage({
      _id: tempId,
      conversationId: convId,
      content: "Sending...",
      status: "sending...",
    });

    const withOptimistic = appendOptimisticMessageToPages(initialCache, optimisticMsg);
    expect(withOptimistic?.pages).toHaveLength(2);
    expect(withOptimistic?.pages[0].messages).toHaveLength(1);
    expect(withOptimistic?.pages[1].messages).toHaveLength(2);
    expect(withOptimistic?.pages[1].messages[1]._id).toBe(tempId);

    // 2. Server success replace in-place via production updater
    const serverMsg = createMockMessage({
      _id: "mongo-real-id",
      conversationId: convId,
      content: "Sending...",
      status: "sent",
    });

    const replaced = replaceOptimisticMessageInPages(withOptimistic, tempId, serverMsg);
    expect(replaced?.pages).toHaveLength(2);
    expect(replaced?.pages[0].messages).toHaveLength(1);
    expect(replaced?.pages[1].messages).toHaveLength(2);
    expect(replaced?.pages[1].messages[1]._id).toBe("mongo-real-id");
    expect(replaced?.pages[1].messages[1].status).toBe("sent");
  });

  it("deduplicates optimistic message when server message already arrived via socket before onSuccess", () => {
    const convId = "c1";
    const tempId = "temp-opt-uuid";
    const serverMsgId = "m_server_123";

    const serverMsg = createMockMessage({
      _id: serverMsgId,
      conversationId: convId,
      content: "Hello world",
      status: "sent",
    });

    const optimisticMsg = createMockMessage({
      _id: tempId,
      conversationId: convId,
      content: "Hello world",
      status: "sending...",
    });

    // Cache where socket event message:new already appended serverMsg
    // so cache currently contains BOTH the optimistic message and the real server message
    const cacheWithBoth: InfiniteData<MessagesPage> = {
      pages: [
        {
          conversation: createMockConversation({ _id: convId }),
          messages: [optimisticMsg, serverMsg],
          pagination: createMockPagination(),
        },
      ],
      pageParams: [undefined],
    };

    const reconciled = replaceOptimisticMessageInPages(
      cacheWithBoth,
      tempId,
      serverMsg,
    );

    expect(reconciled?.pages[0].messages).toHaveLength(1);
    expect(reconciled?.pages[0].messages[0]._id).toBe(serverMsgId);
    expect(reconciled?.pages[0].messages.filter((m) => m._id === serverMsgId)).toHaveLength(1);
    expect(reconciled?.pages[0].messages.some((m) => m._id === tempId)).toBe(false);
  });

  it("preserves intervening socket messages when a send fails and rolls back", async () => {
    const queryClient = new QueryClient();
    const convId = "c1";

    const initialCache: InfiniteData<MessagesPage> = {
      pages: [
        {
          conversation: createMockConversation({ _id: convId }),
          messages: [
            createMockMessage({
              _id: "m1",
              conversationId: convId,
              content: "Existing message",
              createdAt: "2026-11-09T01:00:00Z",
            }),
          ],
          pagination: createMockPagination(),
        },
      ],
      pageParams: [undefined],
    };

    queryClient.setQueryData(conversationKeys.messages(convId), initialCache);

    // 1. User sends message -> optimistic message added
    const tempId = "temp-opt-1";
    const optimisticMsg = createMockMessage({
      _id: tempId,
      conversationId: convId,
      content: "My optimistic message",
      status: "sending...",
    });
    queryClient.setQueryData<InfiniteData<MessagesPage>>(
      conversationKeys.messages(convId),
      (old) => appendOptimisticMessageToPages(old, optimisticMsg),
    );

    // 2. Intervening socket message arrives from a peer while POST is in-flight
    const peerMsg = createMockMessage({
      _id: "m_peer_incoming",
      conversationId: convId,
      content: "Incoming peer message via socket",
    });
    queryClient.setQueryData<InfiniteData<MessagesPage>>(
      conversationKeys.messages(convId),
      (old) => appendOptimisticMessageToPages(old, peerMsg),
    );

    // Cache now has [m1, temp-opt-1, m_peer_incoming]
    let currentCache = queryClient.getQueryData<InfiniteData<MessagesPage>>(
      conversationKeys.messages(convId),
    );
    expect(currentCache?.pages[0].messages).toHaveLength(3);

    // 3. Send mutation fails: surgical rollback filters out ONLY tempId
    queryClient.setQueryData<InfiniteData<MessagesPage>>(
      conversationKeys.messages(convId),
      (current) => removeOptimisticMessageFromPages(current, tempId),
    );

    // 4. Verify tempId is removed BUT m_peer_incoming is PRESERVED!
    currentCache = queryClient.getQueryData<InfiniteData<MessagesPage>>(
      conversationKeys.messages(convId),
    );
    expect(currentCache?.pages[0].messages).toHaveLength(2);
    expect(
      currentCache?.pages[0].messages.map((m) => m._id),
    ).toEqual(["m1", "m_peer_incoming"]);
  });

  it("preserves other messages and incoming socket updates when a reaction fails and rolls back", async () => {
    const queryClient = new QueryClient();
    const convId = "c1";

    const initialCache: InfiniteData<MessagesPage> = {
      pages: [
        {
          conversation: createMockConversation({ _id: convId }),
          messages: [
            createMockMessage({
              _id: "m1",
              conversationId: convId,
              content: "Message 1",
              reactions: [],
            }),
          ],
          pagination: createMockPagination(),
        },
      ],
      pageParams: [undefined],
    };

    queryClient.setQueryData(conversationKeys.messages(convId), initialCache);

    // 1. Optimistic reaction update on m1
    queryClient.setQueryData<InfiniteData<MessagesPage>>(
      conversationKeys.messages(convId),
      (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            messages: page.messages.map((m) =>
              m._id === "m1"
                ? {
                    ...m,
                    reactions: [createMockReaction({ emoji: "❤️" })],
                  }
                : m,
            ),
          })),
        };
      },
    );

    // 2. Intervening socket message arrives
    const socketMsg = createMockMessage({
      _id: "m_socket_intervening",
      conversationId: convId,
      content: "Socket arrived",
    });
    queryClient.setQueryData<InfiniteData<MessagesPage>>(
      conversationKeys.messages(convId),
      (old) => appendOptimisticMessageToPages(old, socketMsg),
    );

    // 3. Reaction mutation fails: surgical rollback reverts only m1's reactions via production updater
    queryClient.setQueryData<InfiniteData<MessagesPage>>(
      conversationKeys.messages(convId),
      (current) => revertMessageReactionsInPages(current, "m1", []),
    );

    // 4. Verify m1's reaction was reverted, and m_socket_intervening was NOT lost!
    const finalCache = queryClient.getQueryData<InfiniteData<MessagesPage>>(
      conversationKeys.messages(convId),
    );
    expect(finalCache?.pages[0].messages).toHaveLength(2);
    expect(finalCache?.pages[0].messages[0].reactions).toEqual([]);
    expect(finalCache?.pages[0].messages[1]._id).toBe("m_socket_intervening");
  });
});
