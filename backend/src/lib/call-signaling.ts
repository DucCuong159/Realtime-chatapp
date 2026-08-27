import { Server as SocketServer, type Socket } from "socket.io";
import ConversationModel from "../models/Conversation.js";
import MessageModel from "../models/Message.js";

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
  startTime?: number;
  status: "calling" | "connected" | "ended";
}

const activeCalls = new Map<string, ActiveCallRecord>();

const formatCallDurationText = (duration: number): string => {
  if (duration <= 0) return "0s";

  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor((duration % 3600) / 60);
  const seconds = duration % 60;

  if (hours > 0) {
    if (minutes > 0 && seconds > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    }
    if (minutes > 0) {
      return `${hours}h ${minutes}m`;
    }
    return seconds > 0 ? `${hours}h ${seconds}s` : `${hours}h`;
  }

  if (minutes > 0) {
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }

  return `${seconds}s`;
};

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

    const durationText = isCompleted ? formatCallDurationText(duration) : "";
    const contentText = isCompleted
      ? `Audio call\n${durationText}`
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

export const registerCallSignaling = (
  io: SocketServer,
  socket: AuthenticatedSocket,
  userId: string,
  onlineUsers: Map<string, Set<string>>,
  activeCallBySocket: Map<string, ActiveCallInfo>,
) => {
  const currentUserId = String(userId).trim();

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

      // Security: enforce authenticated user as caller
      const verifiedCaller = {
        ...caller,
        _id: currentUserId,
      };

      // Check if callee is online
      const isCalleeOnline =
        onlineUsers.has(targetCalleeId) &&
        (onlineUsers.get(targetCalleeId)?.size ?? 0) > 0;

      if (!isCalleeOnline) {
        console.log(
          `[Call Signaling] Callee ${targetCalleeId} is offline. Online users:`,
          Array.from(onlineUsers.keys()),
        );
        socket.emit("call:rejected", {
          callId,
          reason: "offline",
        });
        if (conversationId) {
          await saveAndEmitCallMessage(
            io,
            {
              callId,
              conversationId,
              callerId: currentUserId,
              calleeId: targetCalleeId,
              status: "calling",
            },
            "offline",
          );
        }
        return;
      }

      console.log(
        `[Call Signaling] Forwarding call:incoming to user:${targetCalleeId} from caller ${currentUserId}`,
      );

      activeCallBySocket.set(socket.id, { callId, peerId: targetCalleeId });
      activeCalls.set(callId, {
        callId,
        conversationId,
        callerId: currentUserId,
        calleeId: targetCalleeId,
        status: "calling",
      });

      // Forward to callee personal room
      io.to(`user:${targetCalleeId}`).emit("call:incoming", {
        callId,
        conversationId,
        caller: verifiedCaller,
      });
    },
  );

  socket.on("call:accept", (data: { callId: string; callerId: string }) => {
    const { callId, callerId } = data;
    if (!callerId || !callId) return;

    const targetCallerId = String(callerId).trim();
    activeCallBySocket.set(socket.id, { callId, peerId: targetCallerId });
    const callRecord = activeCalls.get(callId);
    if (callRecord) {
      callRecord.status = "connected";
      callRecord.startTime = Date.now();
    }

    // Notify caller that call was accepted
    io.to(`user:${targetCallerId}`).emit("call:accepted", {
      callId,
      calleeId: currentUserId,
    });
  });

  socket.on(
    "call:reject",
    async (data: {
      callId: string;
      targetUserId: string;
      reason?: "rejected" | "busy" | "timeout";
    }) => {
      const { callId, targetUserId, reason = "rejected" } = data;
      if (!targetUserId || !callId) return;

      const targetId = String(targetUserId).trim();
      await terminateCallSession(
        io,
        activeCallBySocket,
        socket.id,
        callId,
        reason,
      );

      io.to(`user:${targetId}`).emit("call:rejected", {
        callId,
        reason,
      });
    },
  );

  socket.on(
    "call:end",
    async (data: {
      callId: string;
      targetUserId: string;
      reason?: "ended" | "missed" | "failed";
    }) => {
      const { callId, targetUserId, reason = "ended" } = data;
      if (!targetUserId || !callId) return;

      const targetId = String(targetUserId).trim();
      await terminateCallSession(
        io,
        activeCallBySocket,
        socket.id,
        callId,
        reason,
      );

      io.to(`user:${targetId}`).emit("call:ended", {
        callId,
        reason,
      });
    },
  );

  socket.on(
    "webrtc:offer",
    (data: {
      callId: string;
      targetUserId: string;
      sdp: { type: "offer" | "answer" | "pranswer" | "rollback"; sdp?: string };
    }) => {
      const { callId, targetUserId, sdp } = data;
      if (!targetUserId || !callId || !sdp) return;

      const targetId = String(targetUserId).trim();
      io.to(`user:${targetId}`).emit("webrtc:offer", {
        callId,
        senderId: currentUserId,
        sdp,
      });
    },
  );

  socket.on(
    "webrtc:answer",
    (data: {
      callId: string;
      targetUserId: string;
      sdp: { type: "offer" | "answer" | "pranswer" | "rollback"; sdp?: string };
    }) => {
      const { callId, targetUserId, sdp } = data;
      if (!targetUserId || !callId || !sdp) return;

      const targetId = String(targetUserId).trim();
      io.to(`user:${targetId}`).emit("webrtc:answer", {
        callId,
        senderId: currentUserId,
        sdp,
      });
    },
  );

  socket.on(
    "webrtc:ice-candidate",
    (data: {
      callId: string;
      targetUserId: string;
      candidate: { candidate: string; sdpMid?: string | null; sdpMLineIndex?: number | null };
    }) => {
      const { callId, targetUserId, candidate } = data;
      if (!targetUserId || !callId || !candidate) return;

      const targetId = String(targetUserId).trim();
      io.to(`user:${targetId}`).emit("webrtc:ice-candidate", {
        callId,
        senderId: currentUserId,
        candidate,
      });
    },
  );
};
