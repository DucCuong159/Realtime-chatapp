import { soundEffects } from "@/lib/sound-effects";
import { webrtcManager } from "@/lib/webrtc";
import { clearTimers } from "../helpers/call-timers";
import type { CallSlice, CallUiSlice } from "../types";

export const createCallUiSlice: CallSlice<CallUiSlice> = (set, get) => ({
  isMuted: false,
  isMinimized: false,

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

  toggleMute: () => {
    const { isMuted } = get();
    const nextMuted = !isMuted;
    webrtcManager.setMute(nextMuted);
    set({ isMuted: nextMuted });
  },

  toggleMinimize: () => {
    set((state) => ({ isMinimized: !state.isMinimized }));
  },
});
