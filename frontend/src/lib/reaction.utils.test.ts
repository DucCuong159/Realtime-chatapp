import { describe, expect, it } from "vitest";
import {
  ALLOWED_REACTION_EMOJIS,
  areReactionsEqual,
  formatReactionTooltip,
  groupReactions,
  toggleUserReaction,
  type MessageReactionType,
} from "./reaction.utils";

describe("reaction.utils", () => {
  it("defines the 6 allowed emoji reactions", () => {
    expect(ALLOWED_REACTION_EMOJIS).toEqual([
      "👍",
      "❤️",
      "😂",
      "😮",
      "😢",
      "🔥",
    ]);
  });

  describe("formatReactionTooltip", () => {
    it("returns 'You' when only current user reacted", () => {
      const users = [{ _id: "u1", name: "User 1", avatar: null }];
      expect(formatReactionTooltip(users, "u1")).toBe("You");
    });

    it("returns the user name when another user reacted", () => {
      const users = [{ _id: "u2", name: "Alice", avatar: null }];
      expect(formatReactionTooltip(users, "u1")).toBe("Alice");
    });

    it("formats 'You, Alice' when current user and another reacted", () => {
      const users = [
        { _id: "u2", name: "Alice", avatar: null },
        { _id: "u1", name: "User 1", avatar: null },
      ];
      expect(formatReactionTooltip(users, "u1")).toBe("You, Alice");
    });

    it("formats 'Alice, Bob' when two other users reacted", () => {
      const users = [
        { _id: "u2", name: "Alice", avatar: null },
        { _id: "u3", name: "Bob", avatar: null },
      ];
      expect(formatReactionTooltip(users, "u1")).toBe("Alice, Bob");
    });

    it("formats summary with others count when more than 3 reacted", () => {
      const users = [
        { _id: "u1", name: "User 1", avatar: null },
        { _id: "u2", name: "Alice", avatar: null },
        { _id: "u3", name: "Bob", avatar: null },
        { _id: "u4", name: "Charlie", avatar: null },
      ];
      expect(formatReactionTooltip(users, "u1")).toBe("You, Alice and 2 others");
    });
  });

  describe("groupReactions", () => {
    it("returns empty array for undefined or empty reactions", () => {
      expect(groupReactions(undefined, "u1")).toEqual([]);
      expect(groupReactions([], "u1")).toEqual([]);
    });

    it("groups reactions by emoji and calculates count and hasReacted flag", () => {
      const reactions: MessageReactionType[] = [
        { emoji: "👍", user: { _id: "u1", name: "User 1", avatar: null } },
        { emoji: "👍", user: { _id: "u2", name: "Alice", avatar: null } },
        { emoji: "🔥", user: { _id: "u2", name: "Alice", avatar: null } },
      ];

      const grouped = groupReactions(reactions, "u1");
      expect(grouped).toHaveLength(2);

      const thumbsUp = grouped.find((g) => g.emoji === "👍");
      expect(thumbsUp).toBeDefined();
      expect(thumbsUp?.count).toBe(2);
      expect(thumbsUp?.hasReacted).toBe(true);
      expect(thumbsUp?.tooltipText).toBe("You, Alice");

      const fire = grouped.find((g) => g.emoji === "🔥");
      expect(fire).toBeDefined();
      expect(fire?.count).toBe(1);
      expect(fire?.hasReacted).toBe(false);
      expect(fire?.tooltipText).toBe("Alice");
    });

    it("handles string userId in reaction gracefully", () => {
      const reactions: MessageReactionType[] = [
        { emoji: "❤️", user: "u1" },
        { emoji: "❤️", user: "u2" },
      ];

      const grouped = groupReactions(reactions, "u1");
      expect(grouped).toHaveLength(1);
      expect(grouped[0].emoji).toBe("❤️");
      expect(grouped[0].count).toBe(2);
      expect(grouped[0].hasReacted).toBe(true);
    });

    it("deduplicates multiple reactions from the same user for the same emoji", () => {
      const reactions: MessageReactionType[] = [
        { emoji: "❤️", user: { _id: "u1", name: "User 1", avatar: null } },
        { emoji: "❤️", user: { _id: "u1", name: "User 1", avatar: null } },
        { emoji: "❤️", user: "u2" },
      ];

      const grouped = groupReactions(reactions, "u1");
      expect(grouped).toHaveLength(1);
      expect(grouped[0].emoji).toBe("❤️");
      expect(grouped[0].count).toBe(2);
      expect(grouped[0].users).toHaveLength(2);
      expect(grouped[0].hasReacted).toBe(true);
    });
  });

  describe("toggleUserReaction (Single reaction per user, mutually exclusive toggle)", () => {
    it("adds a reaction if the user has not reacted yet", () => {
      const prior: MessageReactionType[] = [
        { emoji: "👍", user: { _id: "u2", name: "Alice", avatar: null } },
      ];
      const result = toggleUserReaction(prior, "u1", "❤️", {
        name: "User 1",
        avatar: null,
      });
      expect(result).toHaveLength(2);
      expect(
        result.some(
          (r) =>
            r.emoji === "❤️" &&
            typeof r.user === "object" &&
            r.user !== null &&
            r.user._id === "u1",
        ),
      ).toBe(true);
    });

    it("removes reaction if the user clicks the same emoji (toggle off)", () => {
      const prior: MessageReactionType[] = [
        { emoji: "❤️", user: { _id: "u1", name: "User 1", avatar: null } },
        { emoji: "👍", user: { _id: "u2", name: "Alice", avatar: null } },
      ];
      const result = toggleUserReaction(prior, "u1", "❤️");
      expect(result).toHaveLength(1);
      expect(result[0].emoji).toBe("👍");
    });

    it("switches to the new emoji and removes previous emoji when user clicks a different emoji", () => {
      const prior: MessageReactionType[] = [
        { emoji: "❤️", user: { _id: "u1", name: "User 1", avatar: null } },
        { emoji: "👍", user: { _id: "u2", name: "Alice", avatar: null } },
      ];
      const result = toggleUserReaction(prior, "u1", "🔥", {
        name: "User 1",
        avatar: null,
      });
      expect(result).toHaveLength(2);
      const u1Reaction = result.find(
        (r) =>
          typeof r.user === "object" && r.user !== null && r.user._id === "u1",
      );
      expect(u1Reaction?.emoji).toBe("🔥");
      expect(result.some((r) => r.emoji === "❤️")).toBe(false);
    });
  });

  describe("areReactionsEqual", () => {
    it("returns true for both undefined or empty arrays", () => {
      expect(areReactionsEqual(undefined, undefined)).toBe(true);
      expect(areReactionsEqual([], [])).toBe(true);
      expect(areReactionsEqual(undefined, [])).toBe(true);
    });

    it("returns true for identical reactions regardless of string or object user representation", () => {
      const listA: MessageReactionType[] = [
        { emoji: "❤️", user: { _id: "u1", name: "User 1", avatar: null } },
        { emoji: "👍", user: "u2" },
      ];
      const listB: MessageReactionType[] = [
        { emoji: "❤️", user: "u1" },
        { emoji: "👍", user: { _id: "u2", name: "Alice", avatar: null } },
      ];
      expect(areReactionsEqual(listA, listB)).toBe(true);
    });

    it("returns false when reactions differ in length, emoji, or user", () => {
      const listA: MessageReactionType[] = [
        { emoji: "❤️", user: "u1" },
      ];
      const listDifferentLength: MessageReactionType[] = [
        { emoji: "❤️", user: "u1" },
        { emoji: "👍", user: "u2" },
      ];
      const listDifferentEmoji: MessageReactionType[] = [
        { emoji: "🔥", user: "u1" },
      ];
      const listDifferentUser: MessageReactionType[] = [
        { emoji: "❤️", user: "u2" },
      ];

      expect(areReactionsEqual(listA, listDifferentLength)).toBe(false);
      expect(areReactionsEqual(listA, listDifferentEmoji)).toBe(false);
      expect(areReactionsEqual(listA, listDifferentUser)).toBe(false);
    });
  });
});
