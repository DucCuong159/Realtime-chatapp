import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Types } from "mongoose";
import { toggleReactionInList } from "./reaction.util.js";

describe("toggleReactionInList (Backend Reaction Logic)", () => {
  const userId = "65f0b5d91c2b8a001f3e7b1a";
  const otherUserId = "65f0b5d91c2b8a001f3e7b1b";

  it("adds a reaction when the user has not reacted yet", () => {
    const prior = [
      { user: new Types.ObjectId(otherUserId), emoji: "👍" },
    ];
    const result = toggleReactionInList(prior, userId, "❤️");

    assert.equal(result.length, 2);
    const userReaction = result.find(
      (r) => String((r.user as any)?._id || r.user) === userId,
    );
    assert.ok(userReaction);
    assert.equal(userReaction.emoji, "❤️");
  });

  it("removes reaction when clicking the exact same emoji (toggle off)", () => {
    const prior = [
      { user: new Types.ObjectId(userId), emoji: "❤️" },
      { user: new Types.ObjectId(otherUserId), emoji: "👍" },
    ];
    const result = toggleReactionInList(prior, userId, "❤️");

    assert.equal(result.length, 1);
    assert.equal(result[0]?.emoji, "👍");
    const userReaction = result.find(
      (r) => String((r.user as any)?._id || r.user) === userId,
    );
    assert.equal(userReaction, undefined);
  });

  it("switches to the new emoji and discards the old one when clicking a different emoji", () => {
    const prior = [
      { user: new Types.ObjectId(userId), emoji: "👍" },
      { user: new Types.ObjectId(otherUserId), emoji: "🔥" },
    ];
    const result = toggleReactionInList(prior, userId, "❤️");

    assert.equal(result.length, 2);
    const userReaction = result.find(
      (r) => String((r.user as any)?._id || r.user) === userId,
    );
    assert.ok(userReaction);
    assert.equal(userReaction.emoji, "❤️");
    assert.equal(
      result.some(
        (r) =>
          String((r.user as any)?._id || r.user) === userId &&
          r.emoji === "👍",
      ),
      false,
    );
  });

  it("handles populated user object in reaction list gracefully", () => {
    const prior = [
      {
        user: { _id: new Types.ObjectId(userId), name: "Cuong", avatar: null },
        emoji: "🔥",
      },
    ];
    // Toggling same emoji on populated user removes it
    const removedResult = toggleReactionInList(prior, userId, "🔥");
    assert.equal(removedResult.length, 0);

    // Switching emoji on populated user replaces it
    const switchedResult = toggleReactionInList(prior, userId, "😮");
    assert.equal(switchedResult.length, 1);
    assert.equal(switchedResult[0]?.emoji, "😮");
  });

  it("cleans up any duplicate reactions for the same user", () => {
    const prior = [
      { user: new Types.ObjectId(userId), emoji: "👍" },
      { user: new Types.ObjectId(userId), emoji: "👍" },
      { user: new Types.ObjectId(otherUserId), emoji: "❤️" },
    ];
    // Clicking same emoji removes all duplicates
    const removedResult = toggleReactionInList(prior, userId, "👍");
    assert.equal(removedResult.length, 1);
    assert.equal(removedResult[0]?.emoji, "❤️");
  });
});
