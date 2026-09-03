import { checkIsCallMissed as checkIsMissed, getCallDetails, getCallTitle } from "@/lib/call-message.utils";
import type { MessageType } from "@/types/conversation.type";
import { describe, expect, it } from "vitest";

describe("call-message-item helpers", () => {
  describe("checkIsMissed", () => {
    it("returns true if callInfo is missing", () => {
      expect(checkIsMissed(undefined)).toBe(true);
    });

    it("returns false if call is completed", () => {
      expect(checkIsMissed({
        callType: "video",
        status: "completed",
        duration: 45,
      })).toBe(false);
    });

    it("returns true for missed, declined, or busy calls", () => {
      expect(checkIsMissed({
        callType: "audio",
        status: "missed",
        duration: 0,
      })).toBe(true);

      expect(checkIsMissed({
        callType: "video",
        status: "declined",
        duration: 0,
      })).toBe(true);

      expect(checkIsMissed({
        callType: "video",
        status: "busy",
        duration: 0,
      })).toBe(true);
    });
  });

  describe("getCallTitle", () => {
    it("returns appropriate title for completed video call", () => {
      expect(getCallTitle(false, "completed", true)).toBe("Video call");
    });

    it("returns appropriate title for completed audio call", () => {
      expect(getCallTitle(false, "completed", false)).toBe("Audio call");
    });

    it("returns appropriate title for missed video call", () => {
      expect(getCallTitle(true, "missed", true)).toBe("Missed video call");
    });

    it("returns appropriate title for declined video call", () => {
      expect(getCallTitle(true, "declined", true)).toBe("Declined video call");
    });

    it("returns appropriate title for busy audio call", () => {
      expect(getCallTitle(true, "busy", false)).toBe("Busy audio call");
    });
  });

  describe("getCallDetails", () => {
    it("extracts full details correctly for completed video call message", () => {
      const msg: MessageType = {
        _id: "msg_1",
        conversationId: "conv_1",
        content: null,
        image: null,
        replyTo: null,
        sender: {
          _id: "user_1",
          name: "Alice",
        } as unknown as MessageType["sender"],
        contentType: "call",
        callInfo: {
          callType: "video",
          status: "completed",
          duration: 125,
        },
        createdAt: "2026-09-03T10:00:00.000Z",
        updatedAt: "2026-09-03T10:00:00.000Z",
      };

      const details = getCallDetails(msg);
      expect(details.isVideo).toBe(true);
      expect(details.isMissed).toBe(false);
      expect(details.title).toBe("Video call");
      expect(details.subtitle).toBe("2m 5s");
    });

    it("extracts details for missed video call message", () => {
      const msg: MessageType = {
        _id: "msg_2",
        conversationId: "conv_1",
        content: null,
        image: null,
        replyTo: null,
        sender: {
          _id: "user_1",
          name: "Alice",
        } as unknown as MessageType["sender"],
        contentType: "call",
        callInfo: {
          callType: "video",
          status: "missed",
          duration: 0,
        },
        createdAt: "2026-09-03T10:00:00.000Z",
        updatedAt: "2026-09-03T10:00:00.000Z",
      };

      const details = getCallDetails(msg);
      expect(details.isVideo).toBe(true);
      expect(details.isMissed).toBe(true);
      expect(details.title).toBe("Missed video call");
    });
  });
});
