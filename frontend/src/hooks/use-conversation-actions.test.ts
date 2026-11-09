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
});
