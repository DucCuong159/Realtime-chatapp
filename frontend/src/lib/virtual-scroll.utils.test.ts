import { describe, expect, it } from "vitest";
import {
  START_INDEX,
  calculateInitialFirstItemIndex,
  calculatePrependedFirstItemIndex,
  findMessageIndexById,
  getScrollBehaviorOnAppend,
  isPrependedUpdate,
  shouldAutoScrollOnAppend,
  toVirtuosoItemIndex,
} from "./virtual-scroll.utils";

describe("virtual-scroll.utils", () => {
  describe("calculateInitialFirstItemIndex", () => {
    it("returns START_INDEX - length when messages are present", () => {
      expect(calculateInitialFirstItemIndex(30)).toBe(START_INDEX - 30);
      expect(calculateInitialFirstItemIndex(1)).toBe(START_INDEX - 1);
    });

    it("returns START_INDEX when messages list is empty", () => {
      expect(calculateInitialFirstItemIndex(0)).toBe(START_INDEX);
    });

    it("supports custom START_INDEX", () => {
      expect(calculateInitialFirstItemIndex(20, 5000)).toBe(4980);
    });

    it("keeps index positive and non-underflowing for 10,000+ messages", () => {
      const indexFor10k = calculateInitialFirstItemIndex(10000);
      expect(indexFor10k).toBeGreaterThan(0);
      expect(indexFor10k).toBe(START_INDEX - 10000);

      const indexFor50k = calculateInitialFirstItemIndex(50000);
      expect(indexFor50k).toBeGreaterThan(0);
      expect(indexFor50k).toBe(START_INDEX - 50000);
    });

    it("guards against negative underflow if length exceeds startIndex", () => {
      expect(calculateInitialFirstItemIndex(6000, 5000)).toBe(0);
    });
  });

  describe("calculatePrependedFirstItemIndex", () => {
    it("decrements firstItemIndex by the number of prepended messages", () => {
      const current = 9970;
      const prepended = 30;
      expect(calculatePrependedFirstItemIndex(current, prepended)).toBe(9940);
    });

    it("handles zero prepended messages gracefully", () => {
      expect(calculatePrependedFirstItemIndex(9970, 0)).toBe(9970);
    });

    it("guards against negative underflow if prepended exceeds current index", () => {
      expect(calculatePrependedFirstItemIndex(20, 50)).toBe(0);
    });
  });

  describe("isPrependedUpdate", () => {
    it("returns true when first message ID changed and length increased", () => {
      const result = isPrependedUpdate("msg-old-1", "msg-recent-1", 60, 30);
      expect(result).toBe(true);
    });

    it("returns false when new message is appended at the bottom (first ID stays the same)", () => {
      const result = isPrependedUpdate("msg-recent-1", "msg-recent-1", 31, 30);
      expect(result).toBe(false);
    });

    it("returns false when length did not increase (e.g. reaction update or message edit)", () => {
      const result = isPrependedUpdate("msg-recent-1", "msg-recent-1", 30, 30);
      expect(result).toBe(false);
    });

    it("returns false when transitioning from empty list", () => {
      const result = isPrependedUpdate("msg-1", undefined, 1, 0);
      expect(result).toBe(false);
    });
  });

  describe("findMessageIndexById", () => {
    const mockMessages = [
      { _id: "m1", content: "hello" },
      { _id: "m2", content: "world" },
      { _id: "m3", content: "test" },
    ];

    it("finds correct index of existing message", () => {
      expect(findMessageIndexById(mockMessages, "m2")).toBe(1);
      expect(findMessageIndexById(mockMessages, "m1")).toBe(0);
      expect(findMessageIndexById(mockMessages, "m3")).toBe(2);
    });

    it("returns -1 for non-existent message", () => {
      expect(findMessageIndexById(mockMessages, "m999")).toBe(-1);
    });

    it("returns -1 for empty array", () => {
      expect(findMessageIndexById([], "m1")).toBe(-1);
    });
  });

  describe("toVirtuosoItemIndex", () => {
    it("converts array index to virtuoso index using firstItemIndex", () => {
      const firstItemIndex = 9970;
      expect(toVirtuosoItemIndex(firstItemIndex, 0)).toBe(9970);
      expect(toVirtuosoItemIndex(firstItemIndex, 5)).toBe(9975);
    });

    it("returns -1 if array index is negative", () => {
      expect(toVirtuosoItemIndex(9970, -1)).toBe(-1);
    });
  });

  describe("shouldAutoScrollOnAppend", () => {
    it("returns true for outgoing message when user is scrolled up", () => {
      expect(shouldAutoScrollOnAppend(true, false)).toBe(true);
    });

    it("returns true for outgoing message when user is at bottom", () => {
      expect(shouldAutoScrollOnAppend(true, true)).toBe(true);
    });

    it("returns true for incoming message when user is already at bottom", () => {
      expect(shouldAutoScrollOnAppend(false, true)).toBe(true);
    });

    it("returns false for incoming message when user is scrolled up reading history", () => {
      expect(shouldAutoScrollOnAppend(false, false)).toBe(false);
    });
  });

  describe("getScrollBehaviorOnAppend", () => {
    it("returns auto for outgoing message when user was scrolled up", () => {
      expect(getScrollBehaviorOnAppend(true, false)).toBe("auto");
    });

    it("returns smooth for outgoing message when user was already at bottom", () => {
      expect(getScrollBehaviorOnAppend(true, true)).toBe("smooth");
    });

    it("returns smooth for incoming message when user is at bottom", () => {
      expect(getScrollBehaviorOnAppend(false, true)).toBe("smooth");
    });

    it("returns auto when isStreaming is true", () => {
      expect(getScrollBehaviorOnAppend(true, true, true)).toBe("auto");
      expect(getScrollBehaviorOnAppend(false, true, true)).toBe("auto");
    });
  });
});
