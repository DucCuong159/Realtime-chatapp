import { soundEffects } from "@/lib/sound-effects";
import { webrtcManager } from "@/lib/webrtc";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCall } from "../index";

vi.mock("@/lib/webrtc", () => ({
  webrtcManager: {
    getLocalStream: vi.fn().mockResolvedValue({
      getTracks: () => [],
      getAudioTracks: () => [],
      getVideoTracks: () => [],
    }),
    initializePeerConnection: vi.fn().mockResolvedValue({}),
    setVideoEnabled: vi.fn(),
    setMute: vi.fn(),
    cleanup: vi.fn(),
    setOnLocalStream: vi.fn(),
    setOnRemoteTrack: vi.fn(),
  },
}));

vi.mock("@/lib/sound-effects", () => ({
  soundEffects: {
    playIncomingRing: vi.fn(),
    playOutgoingRing: vi.fn(),
    playCallEndTone: vi.fn(),
    stopAll: vi.fn(),
  },
}));

const mockEmit = vi.fn();
vi.mock("@/hooks/use-socket", () => ({
  useSocket: {
    getState: vi.fn(() => ({
      socket: {
        connected: true,
        emit: mockEmit,
      },
    })),
  },
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: {
    getState: vi.fn(() => ({
      user: {
        _id: "user_caller_1",
        name: "Caller User",
      },
    })),
  },
}));

describe("CallSessionSlice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCall.getState().resetCallState();
  });

  describe("initiateCall", () => {
    it("should prevent initiate if status is not IDLE", async () => {
      useCall.setState({ status: "CONNECTED" });

      await useCall.getState().initiateCall({
        _id: "user_callee_1",
        name: "Callee",
      });

      expect(mockEmit).not.toHaveBeenCalled();
      expect(useCall.getState().status).toBe("CONNECTED");
    });

    it("should initiate audio call correctly", async () => {
      await useCall.getState().initiateCall(
        { _id: "user_callee_1", name: "Callee" },
        "conv_1",
        "audio",
      );

      const state = useCall.getState();
      expect(state.status).toBe("CALLING");
      expect(state.session?.callType).toBe("audio");
      expect(state.session?.remoteUser._id).toBe("user_callee_1");
      expect(soundEffects.playOutgoingRing).toHaveBeenCalled();
      expect(mockEmit).toHaveBeenCalledWith("call:initiate", expect.objectContaining({
        calleeId: "user_callee_1",
        conversationId: "conv_1",
        callType: "audio",
      }));
    });

    it("should initiate video call correctly", async () => {
      await useCall.getState().initiateCall(
        { _id: "user_callee_1", name: "Callee" },
        "conv_1",
        "video",
      );

      const state = useCall.getState();
      expect(state.status).toBe("CALLING");
      expect(state.session?.callType).toBe("video");
      expect(webrtcManager.getLocalStream).toHaveBeenCalledWith("video");
    });

    it("should end call with failed if media acquisition fails", async () => {
      vi.mocked(webrtcManager.getLocalStream).mockRejectedValueOnce(new Error("Permission denied"));

      await useCall.getState().initiateCall(
        { _id: "user_callee_1", name: "Callee" },
        "conv_1",
        "video",
      );

      // wait for microtask to resolve rejected promise
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(useCall.getState().status).toBe("ENDED");
      expect(useCall.getState().endReason).toBe("failed");
    });

    it("should persist and apply camera-off choice if toggled while media acquisition is pending", async () => {
      let resolveStream!: (stream: unknown) => void;
      const mediaPromise = new Promise((resolve) => {
        resolveStream = resolve;
      });
      vi.mocked(webrtcManager.getLocalStream).mockReturnValueOnce(mediaPromise as never);

      await useCall.getState().initiateCall(
        { _id: "user_callee_1", name: "Callee" },
        "conv_1",
        "video",
      );

      // User turns camera off while getUserMedia is still awaiting
      useCall.getState().toggleVideo();
      expect(useCall.getState().isVideoOff).toBe(true);

      // Media acquisition resolves
      const mockStream = { getTracks: () => [] };
      resolveStream(mockStream);
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Applied state when stream resolved
      expect(webrtcManager.setVideoEnabled).toHaveBeenCalledWith(false);
      expect(useCall.getState().localStream).toBe(mockStream);
    });
  });

  describe("acceptCall", () => {
    it("should do nothing if status is not RINGING", async () => {
      useCall.setState({ status: "IDLE", session: null });
      await useCall.getState().acceptCall();
      expect(mockEmit).not.toHaveBeenCalled();
    });

    it("should accept video call and transition to CONNECTING", async () => {
      useCall.setState({
        status: "RINGING",
        session: {
          callId: "call_123",
          callType: "video",
          remoteUser: { _id: "u2", name: "User 2" },
          isCaller: false,
          duration: 0,
          isMuted: false,
          isVideoOff: false,
          status: "RINGING",
        },
      });

      await useCall.getState().acceptCall();

      expect(soundEffects.stopAll).toHaveBeenCalled();
      expect(webrtcManager.getLocalStream).toHaveBeenCalledWith("video");
      expect(useCall.getState().status).toBe("CONNECTING");
      expect(mockEmit).toHaveBeenCalledWith("call:accept", { callId: "call_123" });
    });

    it("should reject call if media acquisition fails during accept", async () => {
      vi.mocked(webrtcManager.getLocalStream).mockRejectedValueOnce(new Error("No mic"));

      useCall.setState({
        status: "RINGING",
        session: {
          callId: "call_123",
          callType: "audio",
          remoteUser: { _id: "u2", name: "User 2" },
          isCaller: false,
          duration: 0,
          isMuted: false,
          isVideoOff: false,
          status: "RINGING",
        },
      });

      await useCall.getState().acceptCall();

      expect(mockEmit).toHaveBeenCalledWith("call:reject", {
        callId: "call_123",
        reason: "failed",
      });
      expect(useCall.getState().status).toBe("IDLE");
    });
  });

  describe("rejectCall and endCall", () => {
    it("should emit reject and reset call state", () => {
      useCall.setState({
        status: "RINGING",
        session: {
          callId: "call_999",
          callType: "audio",
          remoteUser: { _id: "u2", name: "User 2" },
          isCaller: false,
          duration: 0,
          isMuted: false,
          isVideoOff: false,
          status: "RINGING",
        },
      });

      useCall.getState().rejectCall("busy");

      expect(mockEmit).toHaveBeenCalledWith("call:reject", {
        callId: "call_999",
        reason: "busy",
      });
      expect(useCall.getState().status).toBe("IDLE");
    });

    it("should emit end and cleanup on endCall", () => {
      useCall.setState({
        status: "CONNECTED",
        session: {
          callId: "call_999",
          callType: "video",
          remoteUser: { _id: "u2", name: "User 2" },
          isCaller: true,
          duration: 10,
          isMuted: false,
          isVideoOff: false,
          status: "CONNECTED",
        },
      });

      useCall.getState().endCall("normal");

      expect(mockEmit).toHaveBeenCalledWith("call:end", {
        callId: "call_999",
        reason: "normal",
      });
      expect(soundEffects.playCallEndTone).toHaveBeenCalled();
      expect(webrtcManager.cleanup).toHaveBeenCalled();
      expect(useCall.getState().status).toBe("ENDED");
      expect(useCall.getState().endReason).toBe("normal");
    });
  });
});
