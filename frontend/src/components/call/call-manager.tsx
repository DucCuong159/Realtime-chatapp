import { CALL_SOCKET_EVENTS } from "@/constants/call.constant";
import { useCall } from "@/hooks/use-call";
import { useSocket } from "@/hooks/use-socket";
import type {
  CallAcceptedPayload,
  CallEndedPayload,
  CallIncomingPayload,
  CallRejectedPayload,
  WebRTCAnswerPayload,
  WebRTCIceCandidatePayload,
  WebRTCOfferPayload,
} from "@/types/call.type";
import { memo, useEffect } from "react";
import ActiveCallModal from "./active-call-modal";
import FloatingCallPill from "./floating-call-pill";
import IncomingCallModal from "./incoming-call-modal";

const CallManager = () => {
  const socket = useSocket((s) => s.socket);
  const resetCallState = useCall((s) => s.resetCallState);

  useEffect(() => {
    if (!socket) return;

    const handleIncoming = (payload: CallIncomingPayload) => {
      useCall.getState().handleIncomingCall(payload);
    };

    const handleAccepted = (payload: CallAcceptedPayload) => {
      useCall.getState().handleCallAccepted(payload);
    };

    const handleRejected = (payload: CallRejectedPayload) => {
      useCall.getState().handleCallRejected(payload);
    };

    const handleEnded = (payload: CallEndedPayload) => {
      useCall.getState().handleCallEnded(payload);
    };

    const handleOffer = (payload: WebRTCOfferPayload) => {
      useCall.getState().handleWebRTCOffer(payload);
    };

    const handleAnswer = (payload: WebRTCAnswerPayload) => {
      useCall.getState().handleWebRTCAnswer(payload);
    };

    const handleIceCandidate = (payload: WebRTCIceCandidatePayload) => {
      useCall.getState().handleWebRTCIceCandidate(payload);
    };

    socket.on(CALL_SOCKET_EVENTS.INCOMING, handleIncoming);
    socket.on(CALL_SOCKET_EVENTS.ACCEPTED, handleAccepted);
    socket.on(CALL_SOCKET_EVENTS.REJECTED, handleRejected);
    socket.on(CALL_SOCKET_EVENTS.ENDED, handleEnded);
    socket.on(CALL_SOCKET_EVENTS.WEBRTC_OFFER, handleOffer);
    socket.on(CALL_SOCKET_EVENTS.WEBRTC_ANSWER, handleAnswer);
    socket.on(CALL_SOCKET_EVENTS.WEBRTC_ICE_CANDIDATE, handleIceCandidate);

    return () => {
      socket.off(CALL_SOCKET_EVENTS.INCOMING, handleIncoming);
      socket.off(CALL_SOCKET_EVENTS.ACCEPTED, handleAccepted);
      socket.off(CALL_SOCKET_EVENTS.REJECTED, handleRejected);
      socket.off(CALL_SOCKET_EVENTS.ENDED, handleEnded);
      socket.off(CALL_SOCKET_EVENTS.WEBRTC_OFFER, handleOffer);
      socket.off(CALL_SOCKET_EVENTS.WEBRTC_ANSWER, handleAnswer);
      socket.off(CALL_SOCKET_EVENTS.WEBRTC_ICE_CANDIDATE, handleIceCandidate);
    };
  }, [socket]);

  // Clean up on component unmount
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
