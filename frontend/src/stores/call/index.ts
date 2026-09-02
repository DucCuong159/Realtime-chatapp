import { create } from "zustand";
import { createCallSessionSlice } from "./slices/call-session.slice";
import { createCallSignalingSlice } from "./slices/call-signaling.slice";
import { createCallUiSlice } from "./slices/call-ui.slice";
import type { CallState } from "./types";

export const useCall = create<CallState>()((...a) => ({
  ...createCallUiSlice(...a),
  ...createCallSessionSlice(...a),
  ...createCallSignalingSlice(...a),
}));

export * from "./types";
