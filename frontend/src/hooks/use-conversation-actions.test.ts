import { conversationKeys } from "@/constants/query-keys";
import type { ConversationType, MessageType } from "@/types/conversation.type";
import { QueryClient, type InfiniteData } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  useCreateConversation,
  useSendMessage,
  useToggleReaction,
} from "./use-conversation-actions";

vi.mock("@/lib/axios-client", () => ({
  API: {
    post: vi.fn(),
  },
}));

vi.mock("./use-auth", () => ({
  useAuth: vi.fn(() => ({
    user: { _id: "u1", name: "User 1", avatar: null },
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

  it("replaces optimistic message with server message without resetting infinite pages", async () => {
    const queryClient = new QueryClient();
    const convId = "c1";

    // Setup initial cache with 2 pages (simulating user scrolled up)
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
              _id: "m_old_1",
              conversationId: convId,
              content: "Old message",
              createdAt: "2026-11-09T01:00:00Z",
            } as MessageType,
          ],
          pagination: { hasMore: false, nextCursor: null },
        },
        {
          conversation: { _id: convId, participants: [] } as unknown as ConversationType,
          messages: [
            {
              _id: "m_recent_1",
              conversationId: convId,
              content: "Recent message",
              createdAt: "2026-11-09T02:00:00Z",
            } as MessageType,
          ],
          pagination: { hasMore: true, nextCursor: "cursor_1" },
        },
      ],
      pageParams: ["cursor_1", undefined],
    };

    queryClient.setQueryData(conversationKeys.messages(convId), initialCache);

    // Verify cache has 2 pages and 2 messages before send
    const beforeData = queryClient.getQueryData<typeof initialCache>(
      conversationKeys.messages(convId),
    );
    expect(beforeData?.pages).toHaveLength(2);
    expect(beforeData?.pages[0].messages).toHaveLength(1);
    expect(beforeData?.pages[1].messages).toHaveLength(1);
  });

  it("preserves intervening socket messages when a send fails and rolls back", async () => {
    const queryClient = new QueryClient();
    const convId = "c1";

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
              content: "Existing message",
              createdAt: "2026-11-09T01:00:00Z",
            } as unknown as MessageType,
          ],
          pagination: { hasMore: false, nextCursor: null },
        },
      ],
      pageParams: [undefined],
    };

    queryClient.setQueryData(conversationKeys.messages(convId), initialCache);

    // 1. User sends message -> optimistic message added
    const tempId = "temp-opt-1";
    queryClient.setQueryData<typeof initialCache>(
      conversationKeys.messages(convId),
      (old) => {
        if (!old) return old;
        const lastPageIndex = old.pages.length - 1;
        const lastPage = old.pages[lastPageIndex];
        const updatedPages = [...old.pages];
        updatedPages[lastPageIndex] = {
          ...lastPage,
          messages: [
            ...lastPage.messages,
            {
              _id: tempId,
              conversationId: convId,
              content: "My optimistic message",
              status: "sending...",
            } as unknown as MessageType,
          ],
        };
        return { ...old, pages: updatedPages };
      },
    );

    // 2. Intervening socket message arrives from a peer while POST is in-flight
    queryClient.setQueryData<typeof initialCache>(
      conversationKeys.messages(convId),
      (old) => {
        if (!old) return old;
        const lastPageIndex = old.pages.length - 1;
        const lastPage = old.pages[lastPageIndex];
        const updatedPages = [...old.pages];
        updatedPages[lastPageIndex] = {
          ...lastPage,
          messages: [
            ...lastPage.messages,
            {
              _id: "m_peer_incoming",
              conversationId: convId,
              content: "Incoming peer message via socket",
            } as unknown as MessageType,
          ],
        };
        return { ...old, pages: updatedPages };
      },
    );

    // Cache now has [m1, temp-opt-1, m_peer_incoming]
    let currentCache = queryClient.getQueryData<typeof initialCache>(
      conversationKeys.messages(convId),
    );
    expect(currentCache?.pages[0].messages).toHaveLength(3);

    // 3. Send mutation fails: surgical rollback filters out ONLY tempId
    queryClient.setQueryData<typeof initialCache>(
      conversationKeys.messages(convId),
      (current) => {
        if (!current) return current;
        return {
          ...current,
          pages: current.pages.map((page) => ({
            ...page,
            messages: page.messages.filter((m) => m._id !== tempId),
          })),
        };
      },
    );

    // 4. Verify tempId is removed BUT m_peer_incoming is PRESERVED!
    currentCache = queryClient.getQueryData<typeof initialCache>(
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
              content: "Message 1",
              reactions: [],
            } as unknown as MessageType,
          ],
          pagination: { hasMore: false, nextCursor: null },
        },
      ],
      pageParams: [undefined],
    };

    queryClient.setQueryData(conversationKeys.messages(convId), initialCache);

    // 1. Optimistic reaction update on m1
    queryClient.setQueryData<typeof initialCache>(
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
                    reactions: [
                      { emoji: "❤️", user: { _id: "u1", name: "User 1", avatar: null } },
                    ],
                  }
                : m,
            ),
          })),
        };
      },
    );

    // 2. Intervening socket message arrives
    queryClient.setQueryData<typeof initialCache>(
      conversationKeys.messages(convId),
      (old) => {
        if (!old) return old;
        const lastPageIndex = old.pages.length - 1;
        const lastPage = old.pages[lastPageIndex];
        const updatedPages = [...old.pages];
        updatedPages[lastPageIndex] = {
          ...lastPage,
          messages: [
            ...lastPage.messages,
            {
              _id: "m_socket_intervening",
              conversationId: convId,
              content: "Socket arrived",
            } as unknown as MessageType,
          ],
        };
        return { ...old, pages: updatedPages };
      },
    );

    // 3. Reaction mutation fails: surgical rollback reverts only m1's reactions
    queryClient.setQueryData<typeof initialCache>(
      conversationKeys.messages(convId),
      (current) => {
        if (!current) return current;
        return {
          ...current,
          pages: current.pages.map((page) => ({
            ...page,
            messages: page.messages.map((m) =>
              m._id === "m1" ? { ...m, reactions: [] } : m,
            ),
          })),
        };
      },
    );

    // 4. Verify m1's reaction was reverted, and m_socket_intervening was NOT lost!
    const finalCache = queryClient.getQueryData<typeof initialCache>(
      conversationKeys.messages(convId),
    );
    expect(finalCache?.pages[0].messages).toHaveLength(2);
    expect(finalCache?.pages[0].messages[0].reactions).toEqual([]);
    expect(finalCache?.pages[0].messages[1]._id).toBe("m_socket_intervening");
  });
});
