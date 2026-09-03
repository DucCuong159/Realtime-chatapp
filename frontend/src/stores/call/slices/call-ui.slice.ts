import { CALL_SOCKET_EVENTS } from "@/constants/call.constant";
import { useSocket } from "@/hooks/use-socket";
import { soundEffects } from "@/lib/sound-effects";
import { webrtcManager } from "@/lib/webrtc";
import { toast } from "sonner";
import { clearTimers } from "../helpers/call-timers";
import type { CallSlice, CallUiSlice } from "../types";

const initialUiState = {
  isMuted: false,
  isVideoOff: false,
  isRemoteVideoOff: false,
  isMinimized: false,
  localStream: null,
  remoteStream: null,
};

export const createCallUiSlice: CallSlice<CallUiSlice> = (set, get) => ({
  ...initialUiState,

  setLocalStream: (stream) => set({ localStream: stream }),
  setRemoteStream: (stream) => set({ remoteStream: stream }),

  resetCallState: () => {
    clearTimers();
    soundEffects.stopAll();
    webrtcManager.cleanup();
    set({
      status: "IDLE",
      session: null,
      endReason: null,
      ...initialUiState,
    });
  },

  toggleMute: () => {
    const { isMuted } = get();
    const nextMuted = !isMuted;
    webrtcManager.setMute(nextMuted);
    set({ isMuted: nextMuted });
  },

  toggleVideo: () => {
    const { isVideoOff, session } = get();
    const nextVideoOff = !isVideoOff;
    webrtcManager.setVideoEnabled(!nextVideoOff);
    set({ isVideoOff: nextVideoOff });

    const { socket } = useSocket.getState();
    if (session && socket && socket.connected) {
      socket.emit(CALL_SOCKET_EVENTS.TOGGLE_VIDEO, {
        callId: session.callId,
        isVideoOff: nextVideoOff,
      });
    }
  },

  switchCamera: async () => {
    const result = await webrtcManager.switchCamera();
    if (result === "no-alternate") {
      toast.info("No alternative camera found");
    } else if (result === "failed") {
      toast.error("Failed to switch camera");
    }
  },

  toggleMinimize: () => {
    set((state) => ({ isMinimized: !state.isMinimized }));
  },
});
