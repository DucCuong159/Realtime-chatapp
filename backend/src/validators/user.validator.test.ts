import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { updateProfileSchema } from "./user.validator.js";

describe("updateProfileSchema validation (TDD)", () => {
  it("validates valid name and about", () => {
    const input = {
      name: "John Doe",
      about: "Software Engineer passionate about TypeScript.",
    };
    const parsed = updateProfileSchema.parse(input);
    assert.equal(parsed.name, "John Doe");
    assert.equal(parsed.about, "Software Engineer passionate about TypeScript.");
  });

  it("accepts avatar as a valid base64 image data URI", () => {
    const input = {
      avatar: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    };
    const parsed = updateProfileSchema.parse(input);
    assert.ok(parsed.avatar?.startsWith("data:image/png;base64,"));
  });

  it("accepts avatar as null (to remove avatar)", () => {
    const input = {
      avatar: null,
    };
    const parsed = updateProfileSchema.parse(input);
    assert.equal(parsed.avatar, null);
  });

  it("rejects empty name", () => {
    const input = {
      name: "   ",
    };
    assert.throws(() => updateProfileSchema.parse(input));
  });

  it("rejects name exceeding 50 characters", () => {
    const input = {
      name: "a".repeat(51),
    };
    assert.throws(() => updateProfileSchema.parse(input));
  });

  it("rejects about exceeding 200 characters", () => {
    const input = {
      about: "a".repeat(201),
    };
    assert.throws(() => updateProfileSchema.parse(input));
  });

  it("rejects arbitrary text or link as avatar (only base64 data URI or null allowed)", () => {
    const input = {
      avatar: "https://example.com/not-allowed-direct-link.jpg",
    };
    assert.throws(() => updateProfileSchema.parse(input));
  });
});

