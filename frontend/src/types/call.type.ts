export type CallStatus =
  | "IDLE"
  | "CALLING" // Outgoing call waiting for response
  | "RINGING" // Incoming call ringing
  | "CONNECTING" // WebRTC handshake in progress
  | "CONNECTED" // Call active and audio stream connected
  | "ENDED"; // Call terminated

export type CallEndReason =
  | "normal"
  | "rejected"
  | "busy"
  | "missed"
  | "timeout"
  | "failed"
  | "offline"
  | "peer_disconnected"
  | "answered_elsewhere";

export interface CallUser {
  _id: string;
  name: string;
  avatar?: string | null;
}

export interface CallSession {
  callId: string;
  conversationId?: string;
  remoteUser: CallUser;
  isCaller: boolean;
  startTime?: number;
  duration: number; // in seconds
  isMuted: boolean;
  status: CallStatus;
  endReason?: CallEndReason;
}

export interface CallInitiatePayload {
  callId: string;
  calleeId: string;
  conversationId?: string;
  caller: CallUser;
}

export interface CallIncomingPayload {
  callId: string;
  conversationId?: string;
  caller: CallUser;
}

export interface CallAcceptedPayload {
  callId: string;
  calleeId: string;
}

export interface CallRejectedPayload {
  callId: string;
  reason: CallEndReason;
}

export interface CallEndedPayload {
  callId: string;
  reason: CallEndReason;
}

export interface WebRTCOfferPayload {
  callId: string;
  senderId?: string;
  sdp: RTCSessionDescriptionInit;
}

export interface WebRTCAnswerPayload {
  callId: string;
  senderId?: string;
  sdp: RTCSessionDescriptionInit;
}

export interface WebRTCIceCandidatePayload {
  callId: string;
  senderId?: string;
  candidate: RTCIceCandidateInit;
}
