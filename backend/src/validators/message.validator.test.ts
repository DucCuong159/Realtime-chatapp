import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ALLOWED_EMOJIS,
  messageIdParamSchema,
  reactionSchema,
} from "./message.validator.js";

describe("message.validator reaction validation", () => {
  it("allows standard 6 reaction emojis", () => {
    for (const emoji of ALLOWED_EMOJIS) {
      const result = reactionSchema.safeParse({ emoji });
      assert.equal(result.success, true);
    }
  });

  it("rejects unauthorized emojis or arbitrary text", () => {
    const invalidEmojis = ["🎉", "hello", "", "123", "🚀"];
    for (const emoji of invalidEmojis) {
      const result = reactionSchema.safeParse({ emoji });
      assert.equal(result.success, false);
    }
  });

  it("validates 24-character hexadecimal ObjectId parameter", () => {
    const validId = "65f0b5d91c2b8a001f3e7b1a";
    const result = messageIdParamSchema.safeParse({ id: validId });
    assert.equal(result.success, true);

    const invalidResult = messageIdParamSchema.safeParse({ id: "invalid-id" });
    assert.equal(invalidResult.success, false);
  });
});
