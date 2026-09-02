import { CALL_SOCKET_EVENTS, CALL_TIMINGS } from "@/constants/call.constant";
import { useAuth } from "@/hooks/use-auth";
import { useSocket } from "@/hooks/use-socket";
import { soundEffects } from "@/lib/sound-effects";
import { generateUUID } from "@/lib/utils";
import { webrtcManager } from "@/lib/webrtc";
import type { CallEndReason, CallSession, CallUser } from "@/types/call.type";
import { toast } from "sonner";
import {
  clearTimers,
  setEndedResetTimer,
  setTimeoutTimer,
} from "../helpers/call-timers";
import { setupPeerConnection } from "../helpers/peer-connection";
import type { CallSessionSlice, CallSlice } from "../types";

export const createCallSessionSlice: CallSlice<CallSessionSlice> = (
  set,
  get,
) => ({
  status: "IDLE",
  session: null,
  endReason: null,

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
    const timeout = window.setTimeout(() => {
      if (get().status === "CALLING") {
        get().endCall("timeout");
        toast.info("No answer from " + remoteUser.name);
      }
    }, CALL_TIMINGS.CALL_TIMEOUT_MS);
    setTimeoutTimer(timeout);
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

    try {
      // Initialize peer connection on Callee side
      await setupPeerConnection(
        session.callId,
        socket,
        () => get().handleWebRTCConnected(),
        () => get().endCall("failed"),
        () => get().status,
      );

      // Notify caller that call was accepted
      socket.emit(CALL_SOCKET_EVENTS.ACCEPT, {
        callId: session.callId,
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to establish the call connection";
      toast.error(message);
      get().endCall("failed");
    }
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

    const resetTimer = window.setTimeout(() => {
      get().resetCallState();
    }, CALL_TIMINGS.RESET_STATE_DELAY_MS);
    setEndedResetTimer(resetTimer);
  },
});
