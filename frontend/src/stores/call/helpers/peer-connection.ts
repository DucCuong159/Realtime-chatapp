import { CALL_SOCKET_EVENTS } from "@/constants/call.constant";
import type { useSocket } from "@/hooks/use-socket";
import { webrtcManager } from "@/lib/webrtc";
import type { CallStatus, CallType } from "@/types/call.type";
import {
  getDisconnectRecoveryTimer,
  setDisconnectRecoveryTimer,
} from "./call-timers";

export const setupPeerConnection = async (
  callId: string,
  callType: CallType,
  socket: NonNullable<ReturnType<typeof useSocket.getState>["socket"]>,
  onConnected: () => void,
  onFailed: () => void,
  getStatus: () => CallStatus,
) => {
  return webrtcManager.initializePeerConnection(
    callType,
    (candidate) => {
      socket.emit(CALL_SOCKET_EVENTS.WEBRTC_ICE_CANDIDATE, {
        callId,
        candidate,
      });
    },
    (connectionState) => {
      const activeRecoveryTimer = getDisconnectRecoveryTimer();

      if (connectionState === "connected") {
        if (activeRecoveryTimer) {
          clearTimeout(activeRecoveryTimer);
          setDisconnectRecoveryTimer(null);
        }
        onConnected();
      } else if (connectionState === "failed") {
        if (activeRecoveryTimer) {
          clearTimeout(activeRecoveryTimer);
          setDisconnectRecoveryTimer(null);
        }
        onFailed();
      } else if (connectionState === "disconnected") {
        // Transient disconnection: start a 5s grace period before failing
        if (!activeRecoveryTimer) {
          const timer = setTimeout(() => {
            const currentStatus = getStatus();
            if (
              currentStatus === "CONNECTED" ||
              currentStatus === "CONNECTING"
            ) {
              onFailed();
            }
          }, 5000);
          setDisconnectRecoveryTimer(timer);
        }
      }
    },
  );
};
