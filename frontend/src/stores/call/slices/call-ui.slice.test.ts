import { useSocket } from "@/hooks/use-socket";
import { webrtcManager } from "@/lib/webrtc";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCall } from "../index";

vi.mock("@/lib/webrtc", () => ({
  webrtcManager: {
    cleanup: vi.fn(),
    setVideoEnabled: vi.fn(),
    setMute: vi.fn(),
    switchCamera: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock("@/lib/sound-effects", () => ({
  soundEffects: {
    stopAll: vi.fn(),
    playOutgoingRing: vi.fn(),
    playIncomingRing: vi.fn(),
    playCallEndTone: vi.fn(),
  },
}));

vi.mock("@/hooks/use-socket", () => {
  const mockEmit = vi.fn();
  return {
    useSocket: {
      getState: vi.fn(() => ({
        socket: {
          connected: true,
          emit: mockEmit,
        },
      })),
    },
  };
});

describe("Call UI Slice - Video State", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCall.getState().resetCallState();
  });

  it("initializes with video enabled (isVideoOff: false)", () => {
    const state = useCall.getState();
    expect(state.isVideoOff).toBe(false);
    expect(state.isRemoteVideoOff).toBe(false);
    expect(state.localStream).toBeNull();
    expect(state.remoteStream).toBeNull();
  });

  it("resets video state on call reset", () => {
    useCall.setState({
      isVideoOff: true,
      isRemoteVideoOff: true,
    });

    useCall.getState().resetCallState();

    expect(useCall.getState().isVideoOff).toBe(false);
    expect(useCall.getState().isRemoteVideoOff).toBe(false);
  });
});

describe("Call UI Slice - Video Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCall.getState().resetCallState();
  });

  it("toggles video state and notifies peer via socket", () => {
    useCall.setState({
      session: {
        callId: "test-call-id",
        callType: "video",
        remoteUser: { _id: "user-2", name: "User Two" },
        isCaller: true,
        duration: 0,
        isMuted: false,
        isVideoOff: false,
        status: "CONNECTED",
      },
    });

    useCall.getState().toggleVideo();

    expect(useCall.getState().isVideoOff).toBe(true);
    expect(webrtcManager.setVideoEnabled).toHaveBeenCalledWith(false);

    const socket = useSocket.getState().socket;
    expect(socket?.emit).toHaveBeenCalledWith("call:toggle-video", {
      callId: "test-call-id",
      isVideoOff: true,
    });
  });

  it("updates remote video state when peer toggles camera", () => {
    useCall.setState({
      session: {
        callId: "test-call-id",
        callType: "video",
        remoteUser: { _id: "user-2", name: "User Two" },
        isCaller: false,
        duration: 0,
        isMuted: false,
        isVideoOff: false,
        isRemoteVideoOff: false,
        status: "CONNECTED",
      },
    });

    useCall.getState().handleToggleVideo({
      callId: "test-call-id",
      isVideoOff: true,
    });

    expect(useCall.getState().isRemoteVideoOff).toBe(true);
    expect(useCall.getState().session?.isRemoteVideoOff).toBe(true);
  });
});
