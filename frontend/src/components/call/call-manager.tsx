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
    socket.on(CALL_SOCKET_EVENTS.INCOMING, s.handleIncomingCall);
    socket.on(CALL_SOCKET_EVENTS.ACCEPTED, s.handleCallAccepted);
    socket.on(CALL_SOCKET_EVENTS.REJECTED, s.handleCallRejected);
    socket.on(CALL_SOCKET_EVENTS.ENDED, s.handleCallEnded);
    socket.on(CALL_SOCKET_EVENTS.TOGGLE_VIDEO, s.handleToggleVideo);
    socket.on(CALL_SOCKET_EVENTS.WEBRTC_OFFER, s.handleWebRTCOffer);
    socket.on(CALL_SOCKET_EVENTS.WEBRTC_ANSWER, s.handleWebRTCAnswer);
    socket.on(CALL_SOCKET_EVENTS.WEBRTC_ICE_CANDIDATE, s.handleWebRTCIceCandidate);

    return () => {
      socket.off(CALL_SOCKET_EVENTS.INCOMING, s.handleIncomingCall);
      socket.off(CALL_SOCKET_EVENTS.ACCEPTED, s.handleCallAccepted);
      socket.off(CALL_SOCKET_EVENTS.REJECTED, s.handleCallRejected);
      socket.off(CALL_SOCKET_EVENTS.ENDED, s.handleCallEnded);
      socket.off(CALL_SOCKET_EVENTS.TOGGLE_VIDEO, s.handleToggleVideo);
      socket.off(CALL_SOCKET_EVENTS.WEBRTC_OFFER, s.handleWebRTCOffer);
      socket.off(CALL_SOCKET_EVENTS.WEBRTC_ANSWER, s.handleWebRTCAnswer);
      socket.off(CALL_SOCKET_EVENTS.WEBRTC_ICE_CANDIDATE, s.handleWebRTCIceCandidate);
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
