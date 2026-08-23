import { parseCookie } from "cookie";
import { Server as HTTPServer } from "http";
import jwt from "jsonwebtoken";
import { Server as SocketServer, type Socket } from "socket.io";
import { Env } from "../config/env.config.js";
import type { ConversationDocument } from "../models/Conversation.js";
import type { MessageDocument } from "../models/Message.js";
import { validateConversationParticipantsService } from "../services/conversation.service.js";

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

let io: SocketServer | null = null;

// Each userId maps to a Set of socketIds (supports multi-tab)
const onlineUsers = new Map<string, Set<string>>();

export const initializeSocket = (httpServer: HTTPServer) => {
  io = new SocketServer(httpServer, {
    cors: {
      origin: Env.FRONTEND_ORIGIN,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const rawCookies = socket.handshake.headers.cookie || "";
      if (!rawCookies) return next(new Error("Unauthenticated"));

      const cookies = parseCookie(rawCookies);
      const token = cookies.accessToken;
      if (!token) return next(new Error("Unauthenticated"));

      const decodedToken = jwt.verify(token, Env.JWT_SECRET) as {
        userId: string;
      };
      if (!decodedToken || !decodedToken.userId) {
        return next(new Error("Unauthenticated"));
      }

      socket.userId = decodedToken.userId;
      return next();
    } catch (error) {
      if (
        error instanceof jwt.JsonWebTokenError ||
        error instanceof jwt.TokenExpiredError
      ) {
        return next(new Error("Unauthenticated"));
      }
      console.error("Error in socket authentication:", error);
      return next(new Error("Internal server error"));
    }
  });

  io.on("connection", (socket: AuthenticatedSocket) => {
    if (!socket.userId) {
      socket.disconnect(true);
      return;
    }

    const userId = socket.userId;
    const newSocketId = socket.id;
    console.log(`Socket connected: ${userId} - ${newSocketId}`);

    // save socketId to userId's Set (supports multi-tab)
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId)!.add(newSocketId);

    // broadcast online users to all socket
    io?.emit("online:users", Array.from(onlineUsers.keys()));

    // create personal room for user
    socket.join(`user:${userId}`);

    socket.on(
      "conversation:join",
      async (conversationId: string, callback?: (err?: string) => void) => {
        try {
          await validateConversationParticipantsService(conversationId, userId);
          socket.join(`conversation:${conversationId}`);
          callback?.();
        } catch (error) {
          callback?.("Error joining conversation");
        }
      },
    );

    socket.on("conversation:leave", (conversationId: string) => {
      if (conversationId) {
        socket.leave(`conversation:${conversationId}`);
        console.log(`User ${userId} left conversation ${conversationId}`);
      }
    });

    socket.on("disconnect", () => {
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(newSocketId);
        // Only mark offline when ALL tabs are closed
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          io?.emit("online:users", Array.from(onlineUsers.keys()));
        }
      }
      console.log(`Socket disconnected: ${userId} - ${newSocketId}`);
    });
  });
  return io;
};

export const isSocketOwnedByUser = (
  userId: string | any,
  socketId?: string,
): boolean => {
  if (!socketId || !userId) return false;
  const uid = typeof userId === "string" ? userId : String(userId);
  const userSockets = onlineUsers.get(uid);
  return Boolean(userSockets?.has(socketId));
};

export const getIO = () => {
  if (!io) throw new Error("Socket not initialized");
  return io;
};

export const emitNewConversationToParticipants = (
  participants: string[] = [],
  conversation: ConversationDocument | Record<string, unknown>,
) => {
  const io = getIO();
  participants.forEach((participantId) => {
    io.to(`user:${participantId}`).emit("conversation:new", conversation);
  });
};

export const emitNewMessageToConversationRoom = (
  conversationId: string,
  message: MessageDocument | Record<string, unknown>,
  originatingSocketId?: string,
) => {
  const io = getIO();

  // emit to all except the originating socket (allowing other tabs of the sender to receive it)
  if (originatingSocketId) {
    io.to(`conversation:${conversationId}`)
      .except(originatingSocketId)
      .emit("message:new", message);
  } else {
    io.to(`conversation:${conversationId}`).emit("message:new", message);
  }
};

export const emitLastMessageToParticipants = (
  participantIds: string[],
  conversationId: string,
  lastMessage: MessageDocument | Record<string, unknown>,
) => {
  const io = getIO();
  const payload = { conversationId, lastMessage };

  participantIds.forEach((participantId) => {
    io.to(`user:${participantId}`).emit("conversation:updated", payload);
  });
};

export const emitConversationAI = ({
  conversationId,
  chunk = null,
  sender,
  done = false,
  message = null,
  error,
}: {
  conversationId: string;
  chunk?: string | null;
  sender?: any;
  done?: boolean;
  message?: any;
  error?: string;
}) => {
  const io = getIO();
  if (chunk !== null && chunk !== undefined && !done) {
    io.to(`conversation:${conversationId}`).emit("conversation:ai", {
      conversationId,
      chunk,
      sender,
      done: false,
      message: null,
    });
    return;
  }

  if (done) {
    io.to(`conversation:${conversationId}`).emit("conversation:ai", {
      conversationId,
      chunk: null,
      sender,
      done: true,
      message,
      ...(error !== undefined && { error }),
    });
    return;
  }
};
