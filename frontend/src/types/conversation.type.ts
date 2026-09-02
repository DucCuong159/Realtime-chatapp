import type { UserType } from "./auth.type";

export type PaginationType = {
  hasMore: boolean;
  nextCursor: string | null;
};

export type ConversationType = {
  _id: string;
  lastMessage?: MessageType | null;
  participants: UserType[];
  isGroup: boolean;
  isAiConversation?: boolean;
  createdBy: string;
  groupName?: string;
  createdAt: string;
  updatedAt: string;
};

export type CallInfoType = {
  callType: "audio" | "video";
  status: "completed" | "missed" | "declined" | "busy";
  duration?: number;
};

export type MessageType = {
  _id: string;
  content: string | null;
  image: string | null;
  contentType?: "text" | "image" | "video" | "call";
  callInfo?: CallInfoType;
  sender: UserType | null;
  replyTo: MessageType | null;
  conversationId: string;
  createdAt: string;
  updatedAt: string;
  // only frontend
  status?: string;
  streaming?: boolean;
};

export type CreateConversationType = {
  participantId?: string;
  isGroup?: boolean;
  participants?: string[];
  groupName?: string;
};

export type CreateMessageType = {
  conversationId: string | null;
  content?: string;
  image?: string;
  replyTo?: MessageType | null;
  aiModelId?: string;
};

export type AIStreamPayload = {
  conversationId: string;
  chunk: string | null;
  done: boolean;
  message: MessageType | null;
  sender?: UserType;
  error?: string;
};
