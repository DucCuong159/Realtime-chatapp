import { Server as SocketServer, type Socket } from "socket.io";
import ConversationModel from "../models/Conversation.js";
import MessageModel from "../models/Message.js";
import UserModel from "../models/User.js";
import { formatDuration } from "../utils/date-time.js";
import { capitalize } from "../utils/string.js";

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
  createdAt: number;
  status: "calling" | "connecting" | "connected" | "ended";
  callType?: "audio" | "video";
}

const CALL_RING_TIMEOUT_MS = 40_000;
const activeCalls = new Map<string, ActiveCallRecord>();

export const saveAndEmitCallMessage = async (
  io: SocketServer | null,
  callRecord: ActiveCallRecord,
  endReason: string,
) => {
  if (!callRecord.conversationId || !io) return;

  try {
    const isCompleted =
      callRecord.status === "connected" &&
      Boolean(callRecord.startTime) &&
      endReason !== "failed";
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

    const isVideo = callRecord.callType === "video";
    const typeLabel = isVideo ? "Video call" : "Audio call";
    const typeLabelLower = isVideo ? "video" : "audio";

    const contentText = isCompleted
      ? `${typeLabel}\n${formatDuration(duration)}`
      : `${capitalize(callStatus)} ${typeLabelLower} call`;

    const newMessage = await MessageModel.create({
      conversationId: callRecord.conversationId,
      sender: callRecord.callerId,
      receiver: callRecord.calleeId,
      contentType: "call",
      callInfo: {
        callType: callRecord.callType || "audio",
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
  const now = Date.now();
  for (const [callId, call] of activeCalls.entries()) {
    // Expire stale calling entries that remain in calling status beyond the ring timeout
    if (
      call.status === "calling" &&
      now - call.createdAt > CALL_RING_TIMEOUT_MS
    ) {
      activeCalls.delete(callId);
      continue;
    }

    const isParticipant =
      call.callerId === targetUserId || call.calleeId === targetUserId;
    const isActiveStatus =
      call.status === "calling" ||
      call.status === "connecting" ||
      call.status === "connected";

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
  try {
    if (conversationId) {
      const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(conversationId);
      if (!isValidObjectId) return undefined;

      const conversation = await ConversationModel.findOne({
        _id: conversationId,
        isGroup: false,
        participants: { $size: 2, $all: [callerId, calleeId] },
      }).select("_id");

      return conversation ? conversation._id.toString() : undefined;
    }

    // Lookup existing 1-1 direct conversation if conversationId is omitted
    const directKey =
      callerId < calleeId
        ? `${callerId}_${calleeId}`
        : `${calleeId}_${callerId}`;

    const directConversation = await ConversationModel.findOne({
      directKey,
      isGroup: false,
      participants: { $size: 2, $all: [callerId, calleeId] },
    }).select("_id");

    return directConversation ? directConversation._id.toString() : undefined;
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
  callType: "audio" | "video" = "audio",
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
        createdAt: Date.now(),
        status: "calling",
        callType,
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
      callType?: "audio" | "video";
    }) => {
      const { callId, calleeId, conversationId, callType = "audio" } = data;
      if (!calleeId || !callId) return;

      const targetCalleeId = String(calleeId).trim();
      if (targetCalleeId === currentUserId) return;

      // 0. Prevent duplicate call ID overwrite
      if (activeCalls.has(callId)) {
        socket.emit("call:rejected", { callId, reason: "failed" });
        return;
      }

      // Security: Fetch authentic caller profile server-side to prevent identity spoofing
      const callerUser = await UserModel.findById(currentUserId)
        .select("name avatar")
        .lean();

      if (!callerUser) {
        socket.emit("call:rejected", { callId, reason: "failed" });
        return;
      }

      const verifiedCaller = {
        _id: currentUserId,
        name: callerUser.name,
        avatar: callerUser.avatar ?? null,
      };

      // 1. Security: Validate conversation membership if provided, or resolve direct 1-1 conversation
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
      } else {
        verifiedConversationId = await validateCallConversation(
          undefined,
          currentUserId,
          targetCalleeId,
        );
      }

      const resolvedCallType = callType === "video" ? "video" : "audio";

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
          resolvedCallType,
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
          resolvedCallType,
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
          resolvedCallType,
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
        createdAt: Date.now(),
        status: "calling",
        callType: resolvedCallType,
      });

      // Forward to callee personal room (rings all callee's tabs)
      io.to(`user:${targetCalleeId}`).emit("call:incoming", {
        callId,
        conversationId: verifiedConversationId,
        caller: verifiedCaller,
        callType: resolvedCallType,
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
    callRecord.status = "connecting";
    callRecord.calleeSocketId = socket.id;

    // 1. Notify caller that call was accepted (route directly to caller's socket if available)
    const callerTarget =
      callRecord.callerSocketId || `user:${callRecord.callerId}`;
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

  socket.on("call:connected", (data: { callId: string }) => {
    const { callId } = data;
    if (!callId) return;

    const callRecord = activeCalls.get(callId);
    if (!callRecord) return;

    const isParticipant =
      currentUserId === callRecord.callerId ||
      currentUserId === callRecord.calleeId;
    if (!isParticipant) return;

    // Transition from connecting to connected and start duration accounting
    if (callRecord.status === "connecting") {
      callRecord.status = "connected";
      callRecord.startTime = Date.now();
    }
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
    "call:toggle-video",
    (data: { callId: string; isVideoOff: boolean }) => {
      const { callId, isVideoOff } = data;
      if (!callId) return;

      const callRecord = activeCalls.get(callId);
      if (!callRecord) return;

      const destination = getPeerDestinationFromRecord(callRecord);
      if (!destination) return;

      io.to(destination).emit("call:toggle-video", {
        callId,
        senderId: currentUserId,
        isVideoOff,
      });
    },
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
