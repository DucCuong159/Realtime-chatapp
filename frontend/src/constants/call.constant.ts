export const CALL_SOCKET_EVENTS = {
  INITIATE: "call:initiate",
  INCOMING: "call:incoming",
  ACCEPT: "call:accept",
  ACCEPTED: "call:accepted",
  REJECT: "call:reject",
  REJECTED: "call:rejected",
  END: "call:end",
  ENDED: "call:ended",
  WEBRTC_OFFER: "webrtc:offer",
  WEBRTC_ANSWER: "webrtc:answer",
  WEBRTC_ICE_CANDIDATE: "webrtc:ice-candidate",
} as const;

export const CALL_TIMINGS = {
  /** Maximum time (ms) to wait for callee response before auto-timeout */
  CALL_TIMEOUT_MS: 35_000,
  /** Delay (ms) before resetting call state to IDLE after call ends */
  RESET_STATE_DELAY_MS: 1_600,
} as const;

export const DEFAULT_ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};
