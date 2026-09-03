import { formatLastCallMessage, formatLastMessageText } from "@/lib/call-message.utils";
import type { ConversationType } from "@/types/conversation.type";
import { describe, expect, it } from "vitest";

describe("conversation-list-item helpers", () => {
  describe("formatLastCallMessage", () => {
    it("formats completed video call preview", () => {
      expect(formatLastCallMessage({
        callType: "video",
        status: "completed",
        duration: 120,
      })).toBe("📹 Video call");
    });

    it("formats missed video call preview", () => {
      expect(formatLastCallMessage({
        callType: "video",
        status: "missed",
        duration: 0,
      })).toBe("📹 Missed video call");
    });

    it("formats completed audio call preview", () => {
      expect(formatLastCallMessage({
        callType: "audio",
        status: "completed",
        duration: 60,
      })).toBe("📞 Audio call");
    });

    it("formats missed audio call preview", () => {
      expect(formatLastCallMessage({
        callType: "audio",
        status: "missed",
        duration: 0,
      })).toBe("📞 Missed audio call");
    });
  });

  describe("formatLastMessageText", () => {
    it("formats photo message", () => {
      const conv = {
        lastMessage: {
          image: "https://example.com/photo.png",
          content: "look at this",
        },
      } as unknown as ConversationType;

      expect(formatLastMessageText(conv, "u1", false)).toBe("📷 Photo");
    });

    it("formats call message", () => {
      const conv = {
        lastMessage: {
          contentType: "call",
          callInfo: {
            callType: "video",
            status: "missed",
            duration: 0,
          },
        },
      } as unknown as ConversationType;

      expect(formatLastMessageText(conv, "u1", false)).toBe("📹 Missed video call");
    });

    it("formats normal text message", () => {
      const conv = {
        lastMessage: {
          content: "Hello there!",
        },
      } as unknown as ConversationType;

      expect(formatLastMessageText(conv, "u1", false)).toBe("Hello there!");
    });
  });
});
