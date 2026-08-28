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

const turnUrls =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_TURN_URL
    ? import.meta.env.VITE_TURN_URL.split(",").map((u: string) => u.trim())
    : [];
const turnUsername =
  typeof import.meta !== "undefined"
    ? import.meta.env?.VITE_TURN_USERNAME
    : undefined;
const turnCredential =
  typeof import.meta !== "undefined"
    ? import.meta.env?.VITE_TURN_CREDENTIAL
    : undefined;

const iceServers: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

if (turnUrls.length > 0 && turnUsername && turnCredential) {
  iceServers.push({
    urls: turnUrls,
    username: turnUsername,
    credential: turnCredential,
  });
}

export const DEFAULT_ICE_SERVERS: RTCConfiguration = {
  iceServers,
  iceCandidatePoolSize: 10,
};
