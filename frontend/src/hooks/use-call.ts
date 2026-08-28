import { CALL_SOCKET_EVENTS, CALL_TIMINGS } from "@/constants/call.constant";
import { soundEffects } from "@/lib/sound-effects";
import { generateUUID } from "@/lib/utils";
import { webrtcManager } from "@/lib/webrtc";
import type {
  CallAcceptedPayload,
  CallEndReason,
  CallEndedPayload,
  CallIncomingPayload,
  CallRejectedPayload,
  CallSession,
  CallStatus,
  CallUser,
  WebRTCAnswerPayload,
  WebRTCIceCandidatePayload,
  WebRTCOfferPayload,
} from "@/types/call.type";
import { toast } from "sonner";
import { create } from "zustand";
import { useAuth } from "./use-auth";
import { useSocket } from "./use-socket";

interface CallState {
  status: CallStatus;
  session: CallSession | null;
  isMuted: boolean;
  isMinimized: boolean;
  endReason: CallEndReason | null;

  // Actions
  initiateCall: (
    remoteUser: CallUser,
    conversationId?: string,
  ) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: (reason?: CallEndReason) => void;
  endCall: (reason?: CallEndReason) => void;
  toggleMute: () => void;
  toggleMinimize: () => void;
  resetCallState: () => void;

  // Socket event handlers
  handleIncomingCall: (payload: CallIncomingPayload) => void;
  handleCallAccepted: (payload: CallAcceptedPayload) => Promise<void>;
  handleCallRejected: (payload: CallRejectedPayload) => void;
  handleCallEnded: (payload: CallEndedPayload) => void;
  handleWebRTCOffer: (payload: WebRTCOfferPayload) => Promise<void>;
  handleWebRTCAnswer: (payload: WebRTCAnswerPayload) => Promise<void>;
  handleWebRTCIceCandidate: (
    payload: WebRTCIceCandidatePayload,
  ) => Promise<void>;
  handleWebRTCConnected: () => void;
}

let callTimer: number | null = null;
let timeoutTimer: number | null = null;
let endedResetTimer: number | null = null;
let disconnectRecoveryTimer: number | null = null;

const clearTimers = () => {
  if (callTimer !== null) {
    clearInterval(callTimer);
    callTimer = null;
  }
  if (timeoutTimer !== null) {
    clearTimeout(timeoutTimer);
    timeoutTimer = null;
  }
  if (endedResetTimer !== null) {
    clearTimeout(endedResetTimer);
    endedResetTimer = null;
  }
  if (disconnectRecoveryTimer !== null) {
    clearTimeout(disconnectRecoveryTimer);
    disconnectRecoveryTimer = null;
  }
};

export const useCall = create<CallState>((set, get) => ({
  status: "IDLE",
  session: null,
  isMuted: false,
  isMinimized: false,
  endReason: null,

  resetCallState: () => {
    clearTimers();
    soundEffects.stopAll();
    webrtcManager.cleanup();
    set({
      status: "IDLE",
      session: null,
      isMuted: false,
      isMinimized: false,
      endReason: null,
    });
  },

  initiateCall: async (remoteUser: CallUser, conversationId?: string) => {
    const { status } = get();
    if (status !== "IDLE") {
      toast.error("You are already in a call");
      return;
    }

    const { socket } = useSocket.getState();
    const currentUser = useAuth.getState().user;

    if (!socket || !socket.connected || !currentUser) {
      toast.error("Network connection not available");
      return;
    }

    clearTimers();
    const callId = generateUUID();

    const newSession: CallSession = {
      callId,
      conversationId,
      remoteUser,
      isCaller: true,
      duration: 0,
      isMuted: false,
      status: "CALLING",
    };

    // Instant optimistic UI & dial tone (< 10ms response)
    set({
      status: "CALLING",
      session: newSession,
      isMuted: false,
      isMinimized: false,
      endReason: null,
    });

    soundEffects.playOutgoingRing();

    socket.emit(CALL_SOCKET_EVENTS.INITIATE, {
      callId,
      calleeId: remoteUser._id,
      conversationId,
      caller: {
        _id: currentUser._id,
        name: currentUser.name,
        avatar: currentUser.avatar,
      },
    });

    // Acquire microphone in background without blocking UI
    webrtcManager.getLocalAudioStream().catch((err: unknown) => {
      const currentStatus = get().status;
      // If the call was already ended, rejected, or reset, ignore cancellation
      if (currentStatus === "IDLE" || currentStatus === "ENDED") {
        return;
      }
      const message =
        err instanceof Error
          ? err.message
          : "Microphone access denied or unavailable";
      toast.error(message);
      get().endCall("failed");
    });

    // Timeout if callee does not answer
    timeoutTimer = window.setTimeout(() => {
      if (get().status === "CALLING") {
        get().endCall("timeout");
        toast.info("No answer from " + remoteUser.name);
      }
    }, CALL_TIMINGS.CALL_TIMEOUT_MS);
  },

  handleIncomingCall: (payload: CallIncomingPayload) => {
    const { status } = get();
    const { socket } = useSocket.getState();

    if (status !== "IDLE" && status !== "ENDED") {
      socket?.emit(CALL_SOCKET_EVENTS.REJECT, {
        callId: payload.callId,
        targetUserId: payload.caller._id,
        reason: "busy",
      });
      return;
    }

    clearTimers();

    const newSession: CallSession = {
      callId: payload.callId,
      conversationId: payload.conversationId,
      remoteUser: payload.caller,
      isCaller: false,
      duration: 0,
      isMuted: false,
      status: "RINGING",
    };

    set({
      status: "RINGING",
      session: newSession,
      isMuted: false,
      isMinimized: false,
      endReason: null,
    });

    soundEffects.playIncomingRing();

    // Timeout for incoming call
    timeoutTimer = window.setTimeout(() => {
      if (get().status === "RINGING") {
        get().rejectCall("timeout");
      }
    }, CALL_TIMINGS.CALL_TIMEOUT_MS);
  },

  acceptCall: async () => {
    const { session, status } = get();
    if (status !== "RINGING" || !session) return;

    const { socket } = useSocket.getState();
    if (!socket || !socket.connected) {
      toast.error("Network connection not available");
      get().rejectCall("failed");
      return;
    }

    clearTimers();
    soundEffects.stopAll();

    try {
      await webrtcManager.getLocalAudioStream();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Microphone access is required to join the call";
      toast.error(message);
      get().rejectCall("failed");
      return;
    }

    set({ status: "CONNECTING" });

    // Initialize peer connection on Callee side
    await webrtcManager.initializePeerConnection(
      (candidate) => {
        socket.emit(CALL_SOCKET_EVENTS.WEBRTC_ICE_CANDIDATE, {
          callId: session.callId,
          candidate,
        });
      },
      (connectionState) => {
        if (connectionState === "connected") {
          if (disconnectRecoveryTimer) {
            clearTimeout(disconnectRecoveryTimer);
            disconnectRecoveryTimer = null;
          }
          get().handleWebRTCConnected();
        } else if (connectionState === "failed") {
          if (disconnectRecoveryTimer) {
            clearTimeout(disconnectRecoveryTimer);
            disconnectRecoveryTimer = null;
          }
          get().endCall("failed");
        } else if (connectionState === "disconnected") {
          // Transient disconnection: start a 5s grace period before failing
          if (!disconnectRecoveryTimer) {
            disconnectRecoveryTimer = window.setTimeout(() => {
              if (
                get().status === "CONNECTED" ||
                get().status === "CONNECTING"
              ) {
                get().endCall("failed");
              }
            }, 5000);
          }
        }
      },
    );

    // Notify caller that call was accepted
    socket.emit(CALL_SOCKET_EVENTS.ACCEPT, {
      callId: session.callId,
    });
  },

  handleCallAccepted: async (payload: CallAcceptedPayload) => {
    const { session, status } = get();
    if (status !== "CALLING" || !session || session.callId !== payload.callId) {
      return;
    }

    clearTimers();
    soundEffects.stopAll();

    const { socket } = useSocket.getState();
    if (!socket) return;

    set({ status: "CONNECTING" });

    try {
      // Initialize peer connection on Caller side
      await webrtcManager.initializePeerConnection(
        (candidate) => {
          socket.emit(CALL_SOCKET_EVENTS.WEBRTC_ICE_CANDIDATE, {
            callId: session.callId,
            candidate,
          });
        },
        (connectionState) => {
          if (connectionState === "connected") {
            if (disconnectRecoveryTimer) {
              clearTimeout(disconnectRecoveryTimer);
              disconnectRecoveryTimer = null;
            }
            get().handleWebRTCConnected();
          } else if (connectionState === "failed") {
            if (disconnectRecoveryTimer) {
              clearTimeout(disconnectRecoveryTimer);
              disconnectRecoveryTimer = null;
            }
            get().endCall("failed");
          } else if (connectionState === "disconnected") {
            // Transient disconnection: start a 5s grace period before failing
            if (!disconnectRecoveryTimer) {
              disconnectRecoveryTimer = window.setTimeout(() => {
                if (
                  get().status === "CONNECTED" ||
                  get().status === "CONNECTING"
                ) {
                  get().endCall("failed");
                }
              }, 5000);
            }
          }
        },
      );

      // Create Offer and emit to callee
      const offer = await webrtcManager.createOffer();
      socket.emit(CALL_SOCKET_EVENTS.WEBRTC_OFFER, {
        callId: session.callId,
        sdp: offer,
      });
    } catch (error) {
      console.error("Error creating WebRTC offer:", error);
      get().endCall("failed");
    }
  },

  handleWebRTCOffer: async (payload: WebRTCOfferPayload) => {
    const { session, status } = get();
    if (!session || session.callId !== payload.callId) return;
    // Guard: Only process offer on the tab that actually accepted or is connecting the call
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

    set({
      status: "CONNECTED",
      session: session ? { ...session, startTime: Date.now() } : null,
    });

    // Start duration ticker every second
    callTimer = window.setInterval(() => {
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
  },

  rejectCall: (reason: CallEndReason = "rejected") => {
    const { session } = get();
    const { socket } = useSocket.getState();

    clearTimers();
    soundEffects.stopAll();

    if (session && socket) {
      socket.emit(CALL_SOCKET_EVENTS.REJECT, {
        callId: session.callId,
        reason,
      });
    }

    get().resetCallState();
  },

  endCall: (reason: CallEndReason = "normal") => {
    const { session, status } = get();
    if (status === "IDLE") return;

    const { socket } = useSocket.getState();

    clearTimers();
    soundEffects.playCallEndTone();

    if (session && socket) {
      socket.emit(CALL_SOCKET_EVENTS.END, {
        callId: session.callId,
        reason,
      });
    }

    webrtcManager.cleanup();

    set({
      status: "ENDED",
      endReason: reason,
    });

    endedResetTimer = window.setTimeout(() => {
      get().resetCallState();
    }, CALL_TIMINGS.RESET_STATE_DELAY_MS);
  },

  handleCallRejected: (payload: CallRejectedPayload) => {
    const { session } = get();
    if (!session || session.callId !== payload.callId) return;

    clearTimers();
    soundEffects.playCallEndTone();
    webrtcManager.cleanup();

    const reasonMessages: Record<string, string> = {
      busy: `${session.remoteUser.name} is currently busy`,
      rejected: `${session.remoteUser.name} declined the call`,
      offline: `${session.remoteUser.name} is offline`,
      timeout: "Call timed out",
    };

    if (reasonMessages[payload.reason]) {
      toast.info(reasonMessages[payload.reason]);
    }

    set({
      status: "ENDED",
      endReason: payload.reason,
    });

    endedResetTimer = window.setTimeout(() => {
      get().resetCallState();
    }, CALL_TIMINGS.RESET_STATE_DELAY_MS);
  },

  handleCallEnded: (payload: CallEndedPayload) => {
    const { session } = get();
    if (!session || session.callId !== payload.callId) return;

    clearTimers();

    // If answered on another tab of the same user, silently stop ringing and reset
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

    set({
      status: "ENDED",
      endReason: payload.reason,
    });

    endedResetTimer = window.setTimeout(() => {
      get().resetCallState();
    }, CALL_TIMINGS.RESET_STATE_DELAY_MS);
  },

  toggleMute: () => {
    const { isMuted } = get();
    const nextMuted = !isMuted;
    webrtcManager.setMute(nextMuted);
    set({ isMuted: nextMuted });
  },

  toggleMinimize: () => {
    set((state) => ({ isMinimized: !state.isMinimized }));
  },
}));
