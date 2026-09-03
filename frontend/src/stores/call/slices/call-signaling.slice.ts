import { CALL_SOCKET_EVENTS, CALL_TIMINGS } from "@/constants/call.constant";
import { useSocket } from "@/hooks/use-socket";
import { soundEffects } from "@/lib/sound-effects";
import { webrtcManager } from "@/lib/webrtc";
import type {
  CallAcceptedPayload,
  CallEndedPayload,
  CallIncomingPayload,
  CallRejectedPayload,
  CallSession,
  WebRTCAnswerPayload,
  WebRTCIceCandidatePayload,
  WebRTCOfferPayload,
} from "@/types/call.type";
import { toast } from "sonner";
import {
  clearTimers,
  setCallTimer,
  setEndedResetTimer,
  setTimeoutTimer,
} from "../helpers/call-timers";
import { setupPeerConnection } from "../helpers/peer-connection";
import type { CallSignalingSlice, CallSlice } from "../types";

const notifyCallRejectReason = (name: string, reason: string) => {
  const reasonMessages: Record<string, string> = {
    busy: `${name} is currently busy`,
    rejected: `${name} declined the call`,
    offline: `${name} is offline`,
    timeout: "Call timed out",
  };
  if (reasonMessages[reason]) {
    toast.info(reasonMessages[reason]);
  }
};

export const createCallSignalingSlice: CallSlice<CallSignalingSlice> = (
  set,
  get,
) => ({
  handleIncomingCall: (payload: CallIncomingPayload) => {
    const { status } = get();
    const { socket } = useSocket.getState();

    if (status !== "IDLE" && status !== "ENDED") {
      socket?.emit(CALL_SOCKET_EVENTS.REJECT, {
        callId: payload.callId,
        reason: "busy",
      });
      return;
    }

    clearTimers();
    const newSession: CallSession = {
      callId: payload.callId,
      conversationId: payload.conversationId,
      callType: payload.callType || "audio",
      remoteUser: payload.caller,
      isCaller: false,
      duration: 0,
      isMuted: false,
      isVideoOff: false,
      isRemoteVideoOff: false,
      status: "RINGING",
    };

    set({
      status: "RINGING",
      session: newSession,
      isMuted: false,
      isVideoOff: false,
      isRemoteVideoOff: false,
      isMinimized: false,
      endReason: null,
      localStream: null,
      remoteStream: null,
    });

    soundEffects.playIncomingRing();

    const timeout = setTimeout(() => {
      if (get().status === "RINGING") {
        get().rejectCall("timeout");
      }
    }, CALL_TIMINGS.CALL_TIMEOUT_MS);
    setTimeoutTimer(timeout);
  },

  handleCallAccepted: async (payload: CallAcceptedPayload) => {
    const { session, status } = get();
    if (status !== "CALLING" || !session || session.callId !== payload.callId) {
      return;
    }
    const { socket } = useSocket.getState();
    if (!socket?.connected) {
      get().endCall("failed");
      return;
    }

    clearTimers();
    soundEffects.stopAll();
    const callType = session.callType || "audio";
    set({ status: "CONNECTING" });

    webrtcManager.setOnLocalStream((s) => set({ localStream: s }));
    webrtcManager.setOnRemoteTrack((s) => set({ remoteStream: s }));

    try {
      await setupPeerConnection(
        session.callId,
        callType,
        socket,
        () => get().handleWebRTCConnected(),
        () => get().endCall("failed"),
        () => get().status,
      );
      const offer = await webrtcManager.createOffer(callType);
      socket.emit(CALL_SOCKET_EVENTS.WEBRTC_OFFER, {
        callId: session.callId,
        sdp: offer,
      });
    } catch (error) {
      console.error("Error creating WebRTC offer:", error);
      get().endCall("failed");
    }
  },

  handleToggleVideo: (payload: { callId: string; isVideoOff: boolean }) => {
    const { session } = get();
    if (!session || session.callId !== payload.callId) return;

    set((state) => {
      if (!state.session) return state;
      return {
        isRemoteVideoOff: payload.isVideoOff,
        session: {
          ...state.session,
          isRemoteVideoOff: payload.isVideoOff,
        },
      };
    });
  },

  handleWebRTCOffer: async (payload: WebRTCOfferPayload) => {
    const { session, status } = get();
    if (!session || session.callId !== payload.callId) return;
    if (status !== "CONNECTING" && status !== "CONNECTED") return;

    const { socket } = useSocket.getState();
    if (!socket) return;

    try {
      const answer = await webrtcManager.handleOffer(payload.sdp);
      socket.emit(CALL_SOCKET_EVENTS.WEBRTC_ANSWER, {
        callId: session.callId,
        sdp: answer,
      });
    } catch (error) {
      console.error("Error handling WebRTC offer:", error);
      get().endCall("failed");
    }
  },

  handleWebRTCAnswer: async (payload: WebRTCAnswerPayload) => {
    const { session } = get();
    if (!session || session.callId !== payload.callId) return;

    try {
      await webrtcManager.handleAnswer(payload.sdp);
    } catch (error) {
      console.error("Error handling WebRTC answer:", error);
      get().endCall("failed");
    }
  },

  handleWebRTCIceCandidate: async (payload: WebRTCIceCandidatePayload) => {
    const { session } = get();
    if (!session || session.callId !== payload.callId) return;
    await webrtcManager.addIceCandidate(payload.candidate);
  },

  handleWebRTCConnected: () => {
    const { status, session } = get();
    if (status === "CONNECTED") return;

    clearTimers();
    soundEffects.stopAll();

    const { socket } = useSocket.getState();
    if (session && socket?.connected) {
      socket.emit(CALL_SOCKET_EVENTS.CONNECTED, { callId: session.callId });
    }

    set({
      status: "CONNECTED",
      session: session ? { ...session, startTime: Date.now() } : null,
    });

    const timer = setInterval(() => {
      set((state) => {
        if (!state.session) return state;
        return {
          session: {
            ...state.session,
            duration: state.session.duration + 1,
          },
        };
      });
    }, 1000);
    setCallTimer(timer);
  },

  handleCallRejected: (payload: CallRejectedPayload) => {
    const { session } = get();
    if (!session || session.callId !== payload.callId) return;

    clearTimers();
    soundEffects.playCallEndTone();
    webrtcManager.cleanup();

    notifyCallRejectReason(session.remoteUser.name, payload.reason);
    set({ status: "ENDED", endReason: payload.reason });

    const resetTimer = setTimeout(() => {
      get().resetCallState();
    }, CALL_TIMINGS.RESET_STATE_DELAY_MS);
    setEndedResetTimer(resetTimer);
  },

  handleCallEnded: (payload: CallEndedPayload) => {
    const { session } = get();
    if (!session || session.callId !== payload.callId) return;

    clearTimers();

    if (payload.reason === "answered_elsewhere") {
      soundEffects.stopAll();
      webrtcManager.cleanup();
      get().resetCallState();
      return;
    }

    soundEffects.playCallEndTone();
    webrtcManager.cleanup();

    if (payload.reason === "peer_disconnected") {
      toast.info(`${session.remoteUser.name} disconnected`);
    }

    set({ status: "ENDED", endReason: payload.reason });

    const resetTimer = setTimeout(() => {
      get().resetCallState();
    }, CALL_TIMINGS.RESET_STATE_DELAY_MS);
    setEndedResetTimer(resetTimer);
  },
});
