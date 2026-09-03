import { soundEffects } from "@/lib/sound-effects";
import { webrtcManager } from "@/lib/webrtc";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCall } from "../index";

vi.mock("@/lib/webrtc", () => ({
  webrtcManager: {
    getLocalStream: vi.fn().mockResolvedValue({ getTracks: () => [] }),
    initializePeerConnection: vi.fn().mockResolvedValue({}),
    createOffer: vi.fn().mockResolvedValue({ type: "offer", sdp: "v=0..." }),
    handleOffer: vi.fn().mockResolvedValue({ type: "answer", sdp: "v=0..." }),
    handleAnswer: vi.fn().mockResolvedValue(undefined),
    addIceCandidate: vi.fn().mockResolvedValue(undefined),
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

describe("CallSignalingSlice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCall.getState().resetCallState();
  });

  describe("handleIncomingCall", () => {
    it("should process incoming video call when IDLE", () => {
      useCall.getState().handleIncomingCall({
        callId: "incoming_call_1",
        caller: { _id: "caller_1", name: "Alice" },
        conversationId: "conv_1",
        callType: "video",
      });

      const state = useCall.getState();
      expect(state.status).toBe("RINGING");
      expect(state.session?.callType).toBe("video");
      expect(state.session?.remoteUser.name).toBe("Alice");
      expect(soundEffects.playIncomingRing).toHaveBeenCalled();
    });

    it("should auto-reject incoming call with busy if already in call", () => {
      useCall.setState({ status: "CONNECTED" });

      useCall.getState().handleIncomingCall({
        callId: "incoming_call_2",
        caller: { _id: "caller_2", name: "Bob" },
        callType: "audio",
      });

      expect(mockEmit).toHaveBeenCalledWith("call:reject", {
        callId: "incoming_call_2",
        reason: "busy",
      });
      expect(useCall.getState().status).toBe("CONNECTED");
    });
  });

  describe("handleCallAccepted", () => {
    it("should initialize peer connection, create offer, and emit webrtc:offer", async () => {
      useCall.setState({
        status: "CALLING",
        session: {
          callId: "call_abc",
          callType: "video",
          remoteUser: { _id: "peer_1", name: "Peer" },
          isCaller: true,
          duration: 0,
          isMuted: false,
          isVideoOff: false,
          status: "CALLING",
        },
      });

      await useCall.getState().handleCallAccepted({
        callId: "call_abc",
        calleeId: "peer_1",
      });

      expect(useCall.getState().status).toBe("CONNECTING");
      expect(webrtcManager.createOffer).toHaveBeenCalledWith("video");
      expect(mockEmit).toHaveBeenCalledWith("webrtc:offer", {
        callId: "call_abc",
        sdp: { type: "offer", sdp: "v=0..." },
      });
    });
  });

  describe("handleToggleVideo", () => {
    it("should update isRemoteVideoOff when receiving peer camera toggle event", () => {
      useCall.setState({
        status: "CONNECTED",
        session: {
          callId: "call_abc",
          callType: "video",
          remoteUser: { _id: "peer_1", name: "Peer" },
          isCaller: false,
          duration: 10,
          isMuted: false,
          isVideoOff: false,
          isRemoteVideoOff: false,
          status: "CONNECTED",
        },
      });

      useCall.getState().handleToggleVideo({
        callId: "call_abc",
        isVideoOff: true,
      });

      expect(useCall.getState().isRemoteVideoOff).toBe(true);
      expect(useCall.getState().session?.isRemoteVideoOff).toBe(true);
    });
  });

  describe("handleWebRTCOffer and handleWebRTCAnswer", () => {
    it("should handle offer and emit answer when CONNECTING", async () => {
      useCall.setState({
        status: "CONNECTING",
        session: {
          callId: "call_xyz",
          callType: "video",
          remoteUser: { _id: "peer_1", name: "Peer" },
          isCaller: false,
          duration: 0,
          isMuted: false,
          isVideoOff: false,
          status: "CONNECTING",
        },
      });

      await useCall.getState().handleWebRTCOffer({
        callId: "call_xyz",
        sdp: { type: "offer", sdp: "offer_sdp" },
      });

      expect(webrtcManager.handleOffer).toHaveBeenCalledWith({
        type: "offer",
        sdp: "offer_sdp",
      });
      expect(mockEmit).toHaveBeenCalledWith("webrtc:answer", {
        callId: "call_xyz",
        sdp: { type: "answer", sdp: "v=0..." },
      });
    });

    it("should handle incoming answer", async () => {
      useCall.setState({
        status: "CONNECTING",
        session: {
          callId: "call_xyz",
          callType: "video",
          remoteUser: { _id: "peer_1", name: "Peer" },
          isCaller: true,
          duration: 0,
          isMuted: false,
          isVideoOff: false,
          status: "CONNECTING",
        },
      });

      await useCall.getState().handleWebRTCAnswer({
        callId: "call_xyz",
        sdp: { type: "answer", sdp: "answer_sdp" },
      });

      expect(webrtcManager.handleAnswer).toHaveBeenCalledWith({
        type: "answer",
        sdp: "answer_sdp",
      });
    });
  });

  describe("handleWebRTCConnected, handleCallRejected, handleCallEnded", () => {
    it("should transition to CONNECTED on handleWebRTCConnected", () => {
      useCall.setState({
        status: "CONNECTING",
        session: {
          callId: "call_1",
          callType: "video",
          remoteUser: { _id: "u1", name: "User" },
          isCaller: true,
          duration: 0,
          isMuted: false,
          isVideoOff: false,
          status: "CONNECTING",
        },
      });

      useCall.getState().handleWebRTCConnected();

      expect(useCall.getState().status).toBe("CONNECTED");
      expect(mockEmit).toHaveBeenCalledWith("call:connected", { callId: "call_1" });
    });

    it("should set status to ENDED on handleCallRejected", () => {
      useCall.setState({
        status: "CALLING",
        session: {
          callId: "call_1",
          callType: "audio",
          remoteUser: { _id: "u1", name: "User" },
          isCaller: true,
          duration: 0,
          isMuted: false,
          isVideoOff: false,
          status: "CALLING",
        },
      });

      useCall.getState().handleCallRejected({
        callId: "call_1",
        reason: "rejected",
      });

      expect(useCall.getState().status).toBe("ENDED");
      expect(useCall.getState().endReason).toBe("rejected");
    });

    it("should silently reset state if answered elsewhere", () => {
      useCall.setState({
        status: "RINGING",
        session: {
          callId: "call_1",
          callType: "audio",
          remoteUser: { _id: "u1", name: "User" },
          isCaller: false,
          duration: 0,
          isMuted: false,
          isVideoOff: false,
          status: "RINGING",
        },
      });

      useCall.getState().handleCallEnded({
        callId: "call_1",
        reason: "answered_elsewhere",
      });

      expect(useCall.getState().status).toBe("IDLE");
      expect(soundEffects.stopAll).toHaveBeenCalled();
    });
  });
});
