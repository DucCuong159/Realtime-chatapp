import { Server as SocketServer, type Socket } from "socket.io";
import ConversationModel from "../models/Conversation.js";
import MessageModel from "../models/Message.js";
import { formatDuration } from "../utils/date-time.js";

export interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export interface ActiveCallInfo {
  callId: string;
  peerId: string;
}

export interface ActiveCallRecord {
  callId: string;
  conversationId?: string;
  callerId: string;
  calleeId: string;
  callerSocketId?: string;
  calleeSocketId?: string;
  startTime?: number;
  status: "calling" | "connected" | "ended";
}

const activeCalls = new Map<string, ActiveCallRecord>();

export const saveAndEmitCallMessage = async (
  io: SocketServer | null,
  callRecord: ActiveCallRecord,
  endReason: string,
) => {
  if (!callRecord.conversationId || !io) return;

  try {
    const isCompleted =
      callRecord.status === "connected" && Boolean(callRecord.startTime);
    const duration =
      isCompleted && callRecord.startTime
        ? Math.max(1, Math.round((Date.now() - callRecord.startTime) / 1000))
        : 0;

    const callStatus = isCompleted
      ? "completed"
      : endReason === "busy"
        ? "busy"
        : endReason === "rejected"
          ? "declined"
          : "missed";

const contentText = isCompleted
        ? `Audio call\n${formatDuration(duration)}`
        : callStatus === "busy"
          ? "Busy audio call"
          : callStatus === "declined"
            ? "Declined audio call"
            : "Missed audio call";

    const newMessage = await MessageModel.create({
      conversationId: callRecord.conversationId,
      sender: callRecord.callerId,
      receiver: callRecord.calleeId,
      contentType: "call",
      callInfo: {
        callType: "audio",
        status: callStatus,
        duration: isCompleted ? duration : 0,
      },
      content: contentText,
    });

    await newMessage.populate("sender", "name avatar isAI");

    await ConversationModel.findByIdAndUpdate(callRecord.conversationId, {
      lastMessage: newMessage._id,
    });

    // Broadcast new message to conversation room and direct participants
    io.to(`conversation:${callRecord.conversationId}`).emit(
      "message:new",
      newMessage,
    );

    [callRecord.callerId, callRecord.calleeId].forEach((userId) => {
      io.to(`user:${userId}`).emit("conversation:updated", {
        conversationId: callRecord.conversationId,
        lastMessage: newMessage,
      });
    });
  } catch (error) {
    console.error("Failed to save and emit call message:", error);
  }
};

export const terminateCallSession = async (
  io: SocketServer | null,
  activeCallBySocket: Map<string, ActiveCallInfo>,
  socketId: string,
  callId: string,
  reason: string,
) => {
  activeCallBySocket.delete(socketId);
  const callRecord = activeCalls.get(callId);
  if (callRecord) {
    activeCalls.delete(callId);
    await saveAndEmitCallMessage(io, callRecord, reason);
  }
};

const isUserInActiveCall = (targetUserId: string): boolean => {
  for (const call of activeCalls.values()) {
    const isParticipant =
      call.callerId === targetUserId || call.calleeId === targetUserId;
    const isActiveStatus =
      call.status === "calling" || call.status === "connected";

    if (isParticipant && isActiveStatus) {
      return true;
    }
  }
  return false;
};

const validateCallConversation = async (
  conversationId: string | undefined,
  callerId: string,
  calleeId: string,
): Promise<string | undefined> => {
  if (!conversationId) return undefined;

  try {
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(conversationId);
    if (!isValidObjectId) return undefined;

    const conversation = await ConversationModel.findOne({
      _id: conversationId,
      participants: { $all: [callerId, calleeId] },
    }).select("_id");

    return conversation ? conversation._id.toString() : undefined;
  } catch (error) {
    console.error("Error validating call conversation participants:", error);
    return undefined;
  }
};

const rejectInitiationEarly = async (
  io: SocketServer,
  socket: AuthenticatedSocket,
  callId: string,
  callerId: string,
  calleeId: string,
  reason: "offline" | "busy",
  conversationId?: string,
) => {
  socket.emit("call:rejected", { callId, reason });
  if (conversationId) {
    await saveAndEmitCallMessage(
      io,
      {
        callId,
        conversationId,
        callerId,
        calleeId,
        callerSocketId: socket.id,
        status: "calling",
      },
      reason,
    );
  }
};

export const registerCallSignaling = (
  io: SocketServer,
  socket: AuthenticatedSocket,
  userId: string,
  onlineUsers: Map<string, Set<string>>,
  activeCallBySocket: Map<string, ActiveCallInfo>,
) => {
  const currentUserId = String(userId).trim();

  // Helper to determine destination socket ID or user room for verified peer
  const getPeerDestinationFromRecord = (
    callRecord: ActiveCallRecord,
  ): string | null => {
    if (currentUserId === callRecord.callerId) {
      return callRecord.calleeSocketId || `user:${callRecord.calleeId}`;
    }
    if (currentUserId === callRecord.calleeId) {
      return callRecord.callerSocketId || `user:${callRecord.callerId}`;
    }
    return null;
  };

  // Reusable handler to terminate call session and notify peer
  const handleTermination = async (
    data: { callId?: string; reason?: string },
    defaultReason: string,
    outgoingEvent: "call:rejected" | "call:ended",
  ) => {
    const { callId, reason = defaultReason } = data;
    if (!callId) return;

    const callRecord = activeCalls.get(callId);
    if (!callRecord) return;

    // Enforce call membership: currentUserId must be caller or callee
    const destination = getPeerDestinationFromRecord(callRecord);
    if (!destination) return;

    await terminateCallSession(
      io,
      activeCallBySocket,
      socket.id,
      callId,
      reason,
    );
    io.to(destination).emit(outgoingEvent, { callId, reason });
  };

  // Reusable handler to relay WebRTC media signals strictly to the active peer socket
  const relaySignal = (
    eventName: "webrtc:offer" | "webrtc:answer" | "webrtc:ice-candidate",
    data: {
      callId?: string;
      sdp?: { type: string; sdp?: string };
      candidate?: {
        candidate: string;
        sdpMid?: string | null;
        sdpMLineIndex?: number | null;
      };
    },
  ) => {
    const { callId, ...payload } = data;
    if (!callId) return;

    const callRecord = activeCalls.get(callId);
    if (!callRecord) return;

    // Enforce call membership: currentUserId must be caller or callee
    const destination = getPeerDestinationFromRecord(callRecord);
    if (!destination) return;

    io.to(destination).emit(eventName, {
      callId,
      senderId: currentUserId,
      ...payload,
    });
  };

  socket.on(
    "call:initiate",
    async (data: {
      callId: string;
      calleeId: string;
      conversationId?: string;
      caller: { _id: string; name: string; avatar?: string | null };
    }) => {
      const { callId, calleeId, conversationId, caller } = data;
      if (!calleeId || !callId) return;

      const targetCalleeId = String(calleeId).trim();
      const verifiedCaller = {
        ...caller,
        _id: currentUserId,
      };

      // 0. Prevent duplicate call ID overwrite
      if (activeCalls.has(callId)) {
        socket.emit("call:rejected", { callId, reason: "failed" });
        return;
      }

      // 1. Security: Validate conversation membership if conversationId is provided
      let verifiedConversationId: string | undefined;
      if (conversationId) {
        verifiedConversationId = await validateCallConversation(
          conversationId,
          currentUserId,
          targetCalleeId,
        );

        if (!verifiedConversationId) {
          socket.emit("call:rejected", { callId, reason: "failed" });
          return;
        }
      }

      // 2. Check if caller already has an active call
      if (isUserInActiveCall(currentUserId)) {
        await rejectInitiationEarly(
          io,
          socket,
          callId,
          currentUserId,
          targetCalleeId,
          "busy",
          verifiedConversationId,
        );
        return;
      }

      // 3. Check if callee is online
      const isCalleeOnline =
        onlineUsers.has(targetCalleeId) &&
        (onlineUsers.get(targetCalleeId)?.size ?? 0) > 0;

      if (!isCalleeOnline) {
        await rejectInitiationEarly(
          io,
          socket,
          callId,
          currentUserId,
          targetCalleeId,
          "offline",
          verifiedConversationId,
        );
        return;
      }

      // 4. Server-side Busy Check: Check if callee is already engaged in another call
      if (isUserInActiveCall(targetCalleeId)) {
        await rejectInitiationEarly(
          io,
          socket,
          callId,
          currentUserId,
          targetCalleeId,
          "busy",
          verifiedConversationId,
        );
        return;
      }

      activeCallBySocket.set(socket.id, { callId, peerId: targetCalleeId });
      activeCalls.set(callId, {
        callId,
        conversationId: verifiedConversationId,
        callerId: currentUserId,
        calleeId: targetCalleeId,
        callerSocketId: socket.id,
        status: "calling",
      });

      // Forward to callee personal room (rings all callee's tabs)
      io.to(`user:${targetCalleeId}`).emit("call:incoming", {
        callId,
        conversationId: verifiedConversationId,
        caller: verifiedCaller,
      });
    },
  );

  socket.on("call:accept", (data: { callId: string }) => {
    const { callId } = data;
    if (!callId) return;

    const callRecord = activeCalls.get(callId);
    // Validate record exists, currentUserId is authentic callee, and status is calling
    if (
      !callRecord ||
      currentUserId !== callRecord.calleeId ||
      callRecord.status !== "calling"
    ) {
      return;
    }

    activeCallBySocket.set(socket.id, { callId, peerId: callRecord.callerId });
    callRecord.status = "connected";
    callRecord.startTime = Date.now();
    callRecord.calleeSocketId = socket.id;

    // 1. Notify caller that call was accepted (route directly to caller's socket if available)
    const callerTarget = callRecord.callerSocketId || `user:${callRecord.callerId}`;
    io.to(callerTarget).emit("call:accepted", {
      callId,
      calleeId: currentUserId,
    });

    // 2. Clear other ringing tabs of this callee so they stop ringing
    io.to(`user:${currentUserId}`).except(socket.id).emit("call:ended", {
      callId,
      reason: "answered_elsewhere",
    });
  });

  socket.on(
    "call:reject",
    (data: { callId: string; reason?: "rejected" | "busy" | "timeout" }) =>
      handleTermination(data, "rejected", "call:rejected"),
  );

  socket.on(
    "call:end",
    (data: { callId: string; reason?: "ended" | "missed" | "failed" }) =>
      handleTermination(data, "ended", "call:ended"),
  );

  socket.on(
    "webrtc:offer",
    (data: {
      callId: string;
      sdp: { type: "offer" | "answer" | "pranswer" | "rollback"; sdp?: string };
    }) => relaySignal("webrtc:offer", data),
  );

  socket.on(
    "webrtc:answer",
    (data: {
      callId: string;
      sdp: { type: "offer" | "answer" | "pranswer" | "rollback"; sdp?: string };
    }) => relaySignal("webrtc:answer", data),
  );

  socket.on(
    "webrtc:ice-candidate",
    (data: {
      callId: string;
      candidate: {
        candidate: string;
        sdpMid?: string | null;
        sdpMLineIndex?: number | null;
      };
    }) => relaySignal("webrtc:ice-candidate", data),
  );
};
