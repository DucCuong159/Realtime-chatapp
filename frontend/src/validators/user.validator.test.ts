import { describe, expect, it } from "vitest";
import { profileFormSchema } from "./user.validator";

describe("profileFormSchema (TDD)", () => {
  it("validates valid name and about", () => {
    const input = {
      name: "Alice Smith",
      about: "Hey there! I am using this chat app.",
      avatar: null,
    };
    const parsed = profileFormSchema.parse(input);
    expect(parsed.name).toBe("Alice Smith");
    expect(parsed.about).toBe("Hey there! I am using this chat app.");
    expect(parsed.avatar).toBeNull();
  });

  it("accepts avatar as data URI", () => {
    const input = {
      name: "Alice",
      avatar: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    };
    const parsed = profileFormSchema.parse(input);
    expect(parsed.avatar).toContain("data:image/png;base64,");
  });

  it("accepts avatar as an existing valid image URL", () => {
    const input = {
      name: "Alice",
      avatar: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
    };
    const parsed = profileFormSchema.parse(input);
    expect(parsed.avatar).toBe("https://res.cloudinary.com/demo/image/upload/sample.jpg");
  });

  it("fails when name is empty", () => {
    const input = {
      name: "   ",
    };
    expect(() => profileFormSchema.parse(input)).toThrow();
  });

  it("fails when name exceeds 50 characters", () => {
    const input = {
      name: "a".repeat(51),
    };
    expect(() => profileFormSchema.parse(input)).toThrow();
  });

  it("fails when about exceeds 200 characters", () => {
    const input = {
      name: "Alice",
      about: "a".repeat(201),
    };
    expect(() => profileFormSchema.parse(input)).toThrow();
  });

  it("rejects arbitrary invalid text as avatar", () => {
    const input = {
      name: "Alice",
      avatar: "not-a-valid-data-uri-or-url",
    };
    expect(() => profileFormSchema.parse(input)).toThrow();
  });
});
