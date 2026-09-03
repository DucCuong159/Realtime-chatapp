import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCall } from "./index";

// Mock sound effects
vi.mock("@/lib/sound-effects", () => ({
  soundEffects: {
    playIncomingRing: vi.fn(),
    playOutgoingRing: vi.fn(),
    playCallEndTone: vi.fn(),
    stopAll: vi.fn(),
  },
}));

// Mock WebRTC manager
vi.mock("@/lib/webrtc", () => ({
  webrtcManager: {
    getLocalStream: vi.fn().mockResolvedValue({
      getTracks: () => [],
      getAudioTracks: () => [],
      getVideoTracks: () => [],
    }),
    getLocalAudioStream: vi.fn().mockResolvedValue({
      getTracks: () => [],
      getAudioTracks: () => [],
      getVideoTracks: () => [],
    }),
    setMute: vi.fn(),
    setVideoEnabled: vi.fn(),
    switchCamera: vi.fn().mockResolvedValue(true),
    setOnLocalStream: vi.fn(),
    setOnRemoteTrack: vi.fn(),
    cleanup: vi.fn(),
    createOffer: vi.fn().mockResolvedValue({ type: "offer", sdp: "dummy" }),
    handleOffer: vi.fn().mockResolvedValue({ type: "answer", sdp: "dummy" }),
    handleAnswer: vi.fn().mockResolvedValue(undefined),
    addIceCandidate: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock socket
const mockEmit = vi.fn();
vi.mock("@/hooks/use-socket", () => ({
  useSocket: {
    getState: () => ({
      socket: {
        connected: true,
        emit: mockEmit,
      },
    }),
  },
}));

// Mock auth
vi.mock("@/hooks/use-auth", () => ({
  useAuth: {
    getState: () => ({
      user: {
        _id: "user_caller_1",
        name: "Caller User",
      },
    }),
  },
}));

describe("Call Store - Video and Audio Call", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCall.getState().resetCallState();
  });

  it("should initialize with default state", () => {
    const state = useCall.getState();
    expect(state.status).toBe("IDLE");
    expect(state.session).toBeNull();
    expect(state.isMuted).toBe(false);
    expect(state.isVideoOff).toBe(false);
    expect(state.isMinimized).toBe(false);
  });

  it("should toggle mute state", () => {
    expect(useCall.getState().isMuted).toBe(false);
    useCall.getState().toggleMute();
    expect(useCall.getState().isMuted).toBe(true);
    useCall.getState().toggleMute();
    expect(useCall.getState().isMuted).toBe(false);
  });

  it("should toggle camera state", () => {
    expect(useCall.getState().isVideoOff).toBe(false);
    useCall.getState().toggleVideo();
    expect(useCall.getState().isVideoOff).toBe(true);
    useCall.getState().toggleVideo();
    expect(useCall.getState().isVideoOff).toBe(false);
  });

  it("should initiate video call correctly", async () => {
    const callee = {
      _id: "callee_123",
      name: "Callee Test",
      avatar: null,
    };

    await useCall.getState().initiateCall(callee, "conv_123", "video");

    const state = useCall.getState();
    expect(state.status).toBe("CALLING");
    expect(state.session).not.toBeNull();
    expect(state.session?.callType).toBe("video");
    expect(state.session?.remoteUser._id).toBe("callee_123");
    expect(mockEmit).toHaveBeenCalledWith(
      "call:initiate",
      expect.objectContaining({
        calleeId: "callee_123",
        conversationId: "conv_123",
        callType: "video",
      }),
    );
  });

  it("should handle incoming video call correctly", () => {
    useCall.getState().handleIncomingCall({
      callId: "call_abc_456",
      conversationId: "conv_123",
      caller: {
        _id: "caller_999",
        name: "Remote Caller",
      },
      callType: "video",
    });

    const state = useCall.getState();
    expect(state.status).toBe("RINGING");
    expect(state.session?.callType).toBe("video");
    expect(state.session?.callId).toBe("call_abc_456");
    expect(state.session?.remoteUser.name).toBe("Remote Caller");
  });

  it("should reset state upon call rejection or ending", () => {
    useCall.getState().handleIncomingCall({
      callId: "call_abc_456",
      caller: { _id: "caller_999", name: "Remote Caller" },
      callType: "video",
    });

    useCall.getState().rejectCall("rejected");
    expect(mockEmit).toHaveBeenCalledWith("call:reject", {
      callId: "call_abc_456",
      reason: "rejected",
    });
    expect(useCall.getState().status).toBe("IDLE");
  });
});
