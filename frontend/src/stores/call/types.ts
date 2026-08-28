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
import type { StateCreator } from "zustand";

export interface CallUiSlice {
  isMuted: boolean;
  isMinimized: boolean;
  toggleMute: () => void;
  toggleMinimize: () => void;
  resetCallState: () => void;
}

export interface CallSessionSlice {
  status: CallStatus;
  session: CallSession | null;
  endReason: CallEndReason | null;
  initiateCall: (
    remoteUser: CallUser,
    conversationId?: string,
  ) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: (reason?: CallEndReason) => void;
  endCall: (reason?: CallEndReason) => void;
}

export interface CallSignalingSlice {
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

export type CallState = CallUiSlice & CallSessionSlice & CallSignalingSlice;

export type CallSlice<T> = StateCreator<CallState, [], [], T>;
