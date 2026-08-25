---
name: websocket-socketio-patterns
description: "Master real-time communication patterns with Socket.IO and WebSockets in Node.js, Express, and React. Covers connection lifecycles, authentication middlewares, room/channel architecture, event acknowledgements, online presence tracking, typing indicators, heartbeat/reconnections, and Redis adapter clustering."
risk: safe
source: "AAS Specialist"
date_added: "2026-08-25"
---

# WebSocket & Socket.IO Specialist Skill

Comprehensive guide for designing, implementing, and debugging resilient real-time architectures using **Socket.IO** and **WebSockets** in TypeScript, Node.js/Express backends, and React frontends.

---

## 🎯 When to Use
Use this skill when:
- Designing real-time chat, notifications, live status, or collaborative features.
- Implementing Socket.IO server & client connection management and authentication.
- Designing room, channel, or direct message (1-on-1) routing.
- Handling socket reconnects, connection drops, buffering, and message delivery acknowledgements (`ack`).
- Managing user presence (online/offline status) and typing indicators.
- Scaling Socket.IO across multiple nodes using `@socket.io/redis-adapter` or `@socket.io/redis-streams-adapter`.

---

## 🏗️ 1. Server-Side Architecture & Authentication

### Type-Safe Socket.IO Server Setup
Always define strictly typed events for Server-to-Client, Client-to-Server, Inter-Server, and Socket Data:

```typescript
// types/socket.ts
export interface ServerToClientEvents {
  "message:received": (message: ChatMessageDTO) => void;
  "user:typing": (data: { conversationId: string; userId: string }) => void;
  "user:stop_typing": (data: { conversationId: string; userId: string }) => void;
  "presence:update": (data: { userId: string; status: "online" | "offline"; lastSeen?: Date }) => void;
  error: (err: { message: string; code: string }) => void;
}

export interface ClientToServerEvents {
  "message:send": (
    payload: { conversationId: string; content: string; tempId?: string },
    callback: (response: { status: "ok"; data: ChatMessageDTO } | { status: "error"; message: string }) => void
  ) => void;
  "conversation:join": (conversationId: string) => void;
  "conversation:leave": (conversationId: string) => void;
  "typing:start": (conversationId: string) => void;
  "typing:stop": (conversationId: string) => void;
}

export interface SocketData {
  user: {
    id: string;
    username: string;
  };
}
```

### Authentication Middleware (Handshake Verification)
Validate JWT / Session cookies at the handshake stage to reject unauthenticated connections before allocating socket resources:

```typescript
// socket/middleware/auth.ts
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import cookie from "cookie";

export const socketAuthMiddleware = (
  socket: Socket<ClientToServerEvents, ServerToClientEvents, any, SocketData>,
  next: (err?: Error) => void
) => {
  try {
    const rawCookies = socket.handshake.headers.cookie;
    const cookies = rawCookies ? cookie.parse(rawCookies) : {};
    const token = cookies.access_token || socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("AUTHENTICATION_REQUIRED"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string; username: string };
    socket.data.user = { id: decoded.id, username: decoded.username };
    next();
  } catch (err) {
    next(new Error("INVALID_TOKEN"));
  }
};
```

---

## 👥 2. Rooms, User Channels & Direct Messaging

### User-Specific Room Pattern
Always join a user to their dedicated personal room (`user:${userId}`) upon connection. This enables sending notifications or 1-on-1 messages across multiple active devices without querying socket lists:

```typescript
io.on("connection", (socket) => {
  const userId = socket.data.user.id;
  
  // Join user's personal channel
  socket.join(`user:${userId}`);

  // Join chat conversation rooms
  socket.on("conversation:join", (conversationId) => {
    socket.join(`conversation:${conversationId}`);
  });

  socket.on("conversation:leave", (conversationId) => {
    socket.leave(`conversation:${conversationId}`);
  });
});
```

### Reliable Message Delivery with Acknowledgement (`ack`)
Use ack callbacks so the client gets immediate feedback on database persistence:

```typescript
socket.on("message:send", async ({ conversationId, content, tempId }, callback) => {
  try {
    const savedMessage = await messageService.create({
      conversationId,
      senderId: socket.data.user.id,
      content,
    });

    // Broadcast to everyone else in the conversation
    socket.to(`conversation:${conversationId}`).emit("message:received", savedMessage);

    // Acknowledge back to sender
    callback({ status: "ok", data: savedMessage });
  } catch (error: any) {
    callback({ status: "error", message: error.message || "Failed to send message" });
  }
});
```

---

## 🟢 3. Presence & Typing Indicator Management

### Presence Tracking (Online / Offline)
Avoid naive disconnect listeners when users might refresh or have multiple tabs open. Track active socket count per user:

```typescript
// Use an in-memory Map or Redis Set for distributed clusters
const userSocketCount = new Map<string, number>();

io.on("connection", (socket) => {
  const userId = socket.data.user.id;
  const currentCount = (userSocketCount.get(userId) || 0) + 1;
  userSocketCount.set(userId, currentCount);

  if (currentCount === 1) {
    // First connection -> Broadcast online status
    socket.broadcast.emit("presence:update", { userId, status: "online" });
  }

  socket.on("disconnect", () => {
    const count = (userSocketCount.get(userId) || 1) - 1;
    if (count <= 0) {
      userSocketCount.delete(userId);
      socket.broadcast.emit("presence:update", { 
        userId, 
        status: "offline", 
        lastSeen: new Date() 
      });
    } else {
      userSocketCount.set(userId, count);
    }
  });
});
```

### Debounced Typing Indicators
Throttle typing broadcast on client and auto-clear on server if client disconnects:

```typescript
socket.on("typing:start", (conversationId) => {
  socket.to(`conversation:${conversationId}`).emit("user:typing", {
    conversationId,
    userId: socket.data.user.id,
  });
});

socket.on("typing:stop", (conversationId) => {
  socket.to(`conversation:${conversationId}`).emit("user:stop_typing", {
    conversationId,
    userId: socket.data.user.id,
  });
});
```

---

## ⚛️ 4. React Client-Side Socket Hook Pattern

Use a singleton socket instance with Zustand or React Context to prevent reconnect loops during React component re-renders:

```typescript
// hooks/useSocket.ts
import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { ServerToClientEvents, ClientToServerEvents } from "@/types/socket";

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(import.meta.env.VITE_BACKEND_URL, {
      withCredentials: true,
      autoConnect: false,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });
  }
  return socket;
};
```

---

## ⚡ 5. Production & Scaling Checklist
- [ ] **Heartbeat Config**: Set `pingTimeout: 20000` and `pingInterval: 25000` for stable connections over unstable mobile networks.
- [ ] **CORS Settings**: Whitelist specific frontend origins with `credentials: true` instead of `*`.
- [ ] **No Infinite Re-render**: Never initialize `io()` directly inside a React component body without `useEffect` or singleton storage.
- [ ] **Connection Buffering**: Use client-side queues for optimistic UI messages while reconnecting.
- [ ] **Multi-Node Scaling**: Attach `@socket.io/redis-adapter` when running more than 1 backend instance / cluster.
