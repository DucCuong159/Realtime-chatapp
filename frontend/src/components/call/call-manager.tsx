import { CALL_SOCKET_EVENTS } from "@/constants/call.constant";
import { useCall } from "@/hooks/use-call";
import { useSocket } from "@/hooks/use-socket";
import { memo, useEffect } from "react";
import ActiveCallModal from "./active-call-modal";
import FloatingCallPill from "./floating-call-pill";
import IncomingCallModal from "./incoming-call-modal";

const useCallSocketListeners = (
  socket: ReturnType<typeof useSocket.getState>["socket"],
) => {
  useEffect(() => {
    if (!socket) return;

    const s = useCall.getState();
    type SocketListener = Parameters<NonNullable<typeof socket>["on"]>[1];
    const eventMap: [string, SocketListener][] = [
      [CALL_SOCKET_EVENTS.INCOMING, s.handleIncomingCall],
      [CALL_SOCKET_EVENTS.ACCEPTED, s.handleCallAccepted],
      [CALL_SOCKET_EVENTS.REJECTED, s.handleCallRejected],
      [CALL_SOCKET_EVENTS.ENDED, s.handleCallEnded],
      [CALL_SOCKET_EVENTS.TOGGLE_VIDEO, s.handleToggleVideo],
      [CALL_SOCKET_EVENTS.WEBRTC_OFFER, s.handleWebRTCOffer],
      [CALL_SOCKET_EVENTS.WEBRTC_ANSWER, s.handleWebRTCAnswer],
      [CALL_SOCKET_EVENTS.WEBRTC_ICE_CANDIDATE, s.handleWebRTCIceCandidate],
    ];

    eventMap.forEach(([event, handler]) => socket.on(event, handler));
    return () => {
      eventMap.forEach(([event, handler]) => socket.off(event, handler));
    };
  }, [socket]);
};

const CallManager = () => {
  const socket = useSocket((s) => s.socket);
  const resetCallState = useCall((s) => s.resetCallState);

  useCallSocketListeners(socket);

  useEffect(() => {
    return () => {
      resetCallState();
    };
  }, [resetCallState]);

  return (
    <>
      <IncomingCallModal />
      <ActiveCallModal />
      <FloatingCallPill />
    </>
  );
};

export default memo(CallManager);
