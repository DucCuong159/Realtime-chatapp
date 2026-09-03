import { CALL_SOCKET_EVENTS, CALL_TIMINGS } from "@/constants/call.constant";
import { useAuth } from "@/hooks/use-auth";
import { useSocket } from "@/hooks/use-socket";
import { soundEffects } from "@/lib/sound-effects";
import { generateUUID } from "@/lib/utils";
import { webrtcManager } from "@/lib/webrtc";
import type {
  CallEndReason,
  CallSession,
  CallType,
  CallUser,
} from "@/types/call.type";
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

  initiateCall: async (
    remoteUser: CallUser,
    conversationId?: string,
    callType: CallType = "audio",
  ) => {
    if (get().status !== "IDLE") {
      toast.error("You are already in a call");
      return;
    }

    const { socket } = useSocket.getState();
    const currentUser = useAuth.getState().user;
    if (!socket?.connected || !currentUser) {
      toast.error("Network connection not available");
      return;
    }

    clearTimers();
    const callId = generateUUID();
    const session: CallSession = {
      callId,
      conversationId,
      callType,
      remoteUser,
      isCaller: true,
      duration: 0,
      isMuted: false,
      isVideoOff: false,
      isRemoteVideoOff: false,
      status: "CALLING",
    };

    set({
      status: "CALLING",
      session,
      isMuted: false,
      isVideoOff: false,
      isRemoteVideoOff: false,
      isMinimized: false,
      endReason: null,
      localStream: null,
      remoteStream: null,
    });

    webrtcManager.setOnLocalStream((s) => set({ localStream: s }));
    webrtcManager.setOnRemoteTrack((s) => set({ remoteStream: s }));
    soundEffects.playOutgoingRing();

    socket.emit(CALL_SOCKET_EVENTS.INITIATE, {
      callId,
      calleeId: remoteUser._id,
      conversationId,
      callType,
    });

    webrtcManager
      .getLocalStream(callType)
      .then((stream) => {
        const { isVideoOff, isMuted } = get();
        webrtcManager.setVideoEnabled(!isVideoOff);
        webrtcManager.setMute(isMuted);
        set({ localStream: stream });
      })
      .catch((err: unknown) => {
        const currentStatus = get().status;
        if (currentStatus === "IDLE" || currentStatus === "ENDED") return;
        const msg =
          err instanceof Error
            ? err.message
            : callType === "video"
              ? "Camera/Microphone access denied"
              : "Microphone access denied";
        toast.error(msg);
        get().endCall("failed");
      });

    const timeout = setTimeout(() => {
      if (get().status === "CALLING") {
        get().endCall("timeout");
        toast.info(`No answer from ${remoteUser.name}`);
      }
    }, CALL_TIMINGS.CALL_TIMEOUT_MS);
    setTimeoutTimer(timeout);
  },

  acceptCall: async () => {
    const { session, status } = get();
    if (status !== "RINGING" || !session) return;

    const { socket } = useSocket.getState();
    if (!socket?.connected) {
      toast.error("Network connection not available");
      get().rejectCall("failed");
      return;
    }

    clearTimers();
    soundEffects.stopAll();
    const callType = session.callType || "audio";

    webrtcManager.setOnLocalStream((s) => set({ localStream: s }));
    webrtcManager.setOnRemoteTrack((s) => set({ remoteStream: s }));

    try {
      const stream = await webrtcManager.getLocalStream(callType);
      const { isVideoOff, isMuted } = get();
      webrtcManager.setVideoEnabled(!isVideoOff);
      webrtcManager.setMute(isMuted);
      set({ localStream: stream });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : callType === "video"
            ? "Camera and microphone access required"
            : "Microphone access required";
      toast.error(msg);
      get().rejectCall("failed");
      return;
    }

    set({ status: "CONNECTING" });

    try {
      await setupPeerConnection(
        session.callId,
        callType,
        socket,
        () => get().handleWebRTCConnected(),
        () => get().endCall("failed"),
        () => get().status,
      );
      socket.emit(CALL_SOCKET_EVENTS.ACCEPT, { callId: session.callId });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      toast.error(msg);
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
    set({ status: "ENDED", endReason: reason });

    const resetTimer = setTimeout(() => {
      get().resetCallState();
    }, CALL_TIMINGS.RESET_STATE_DELAY_MS);
    setEndedResetTimer(resetTimer);
  },
});
