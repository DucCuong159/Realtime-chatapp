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
});
