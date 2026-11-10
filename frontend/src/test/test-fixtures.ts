import type { UserType } from "@/types/auth.type";
import type {
  ConversationType,
  MessageReactionType,
  MessageType,
  PaginationType,
} from "@/types/conversation.type";
import type { Socket } from "socket.io-client";

/**
 * Type-safe test fixture factory for UserType.
 * Eliminates the need for `as unknown as UserType` in test suites.
 */
export function createMockUser(overrides: Partial<UserType> = {}): UserType {
  return {
    _id: "u1",
    name: "Test User",
    email: "test@example.com",
    avatar: null,
    about: "Test bio",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

/**
 * Type-safe test fixture factory for MessageType.
 * Eliminates the need for `as unknown as MessageType` in test suites.
 */
export function createMockMessage(
  overrides: Partial<MessageType> = {},
): MessageType {
  return {
    _id: "m1",
    conversationId: "c1",
    content: "Test message",
    image: null,
    sender: createMockUser(),
    replyTo: null,
    reactions: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

/**
 * Type-safe test fixture factory for ConversationType.
 * Eliminates the need for `as unknown as ConversationType` in test suites.
 */
export function createMockConversation(
  overrides: Partial<ConversationType> = {},
): ConversationType {
  return {
    _id: "c1",
    participants: [createMockUser()],
    isGroup: false,
    createdBy: "u1",
    groupName: "",
    lastMessage: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

/**
 * Type-safe test fixture factory for PaginationType.
 */
export function createMockPagination(
  overrides: Partial<PaginationType> = {},
): PaginationType {
  return {
    hasMore: false,
    nextCursor: null,
    ...overrides,
  };
}

/**
 * Type-safe test fixture factory for MessageReactionType.
 */
export function createMockReaction(
  overrides: Partial<MessageReactionType> = {},
): MessageReactionType {
  return {
    emoji: "❤️",
    user: createMockUser(),
    ...overrides,
  };
}

/**
 * Type-safe test fixture factory for Socket mock.
 * Encapsulates third-party Socket.IO client interface casting in one place.
 */
export function createMockSocket(overrides: Partial<Socket> = {}): Socket {
  return {
    connected: false,
    on: () => {},
    off: () => {},
    emit: () => {},
    disconnect: () => {},
    ...overrides,
  } as unknown as Socket;
}
