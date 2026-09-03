import type {
  CallAcceptedPayload,
  CallEndReason,
  CallEndedPayload,
  CallIncomingPayload,
  CallRejectedPayload,
  CallSession,
  CallStatus,
  CallType,
  CallUser,
  WebRTCAnswerPayload,
  WebRTCIceCandidatePayload,
  WebRTCOfferPayload,
} from "@/types/call.type";
import type { StateCreator } from "zustand";

export interface CallUiSlice {
  isMuted: boolean;
  isVideoOff: boolean;
  isRemoteVideoOff: boolean;
  isMinimized: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  toggleMute: () => void;
  toggleVideo: () => void;
  switchCamera: () => Promise<void>;
  toggleMinimize: () => void;
  resetCallState: () => void;
  setLocalStream: (stream: MediaStream | null) => void;
  setRemoteStream: (stream: MediaStream | null) => void;
}

export interface CallSessionSlice {
  status: CallStatus;
  session: CallSession | null;
  endReason: CallEndReason | null;
  initiateCall: (
    remoteUser: CallUser,
    conversationId?: string,
    callType?: CallType,
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
  handleToggleVideo: (payload: { callId: string; isVideoOff: boolean }) => void;
  handleWebRTCOffer: (payload: WebRTCOfferPayload) => Promise<void>;
  handleWebRTCAnswer: (payload: WebRTCAnswerPayload) => Promise<void>;
  handleWebRTCIceCandidate: (
    payload: WebRTCIceCandidatePayload,
  ) => Promise<void>;
  handleWebRTCConnected: () => void;
}

export type CallState = CallUiSlice & CallSessionSlice & CallSignalingSlice;

export type CallSlice<T> = StateCreator<CallState, [], [], T>;
export type CallSliceSet = Parameters<CallSlice<unknown>>[0];
export type CallSliceGet = Parameters<CallSlice<unknown>>[1];
