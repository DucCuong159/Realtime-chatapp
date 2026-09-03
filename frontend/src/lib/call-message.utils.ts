import type { CallInfoType, ConversationType, MessageType } from "@/types/conversation.type";
import { formatConversationTime, formatDuration } from "./utils";

export interface CallDetails {
  isVideo: boolean;
  isMissed: boolean;
  title: string;
  subtitle: string;
}

export const checkIsCallMissed = (callInfo?: MessageType["callInfo"]): boolean => {
  if (!callInfo) return true;
  if (callInfo.status === "completed") return false;
  return (
    callInfo.status === "missed" ||
    callInfo.status === "declined" ||
    callInfo.status === "busy" ||
    !callInfo.duration
  );
};

export const getCallTitle = (
  isMissed: boolean,
  status: string | undefined,
  isVideo: boolean,
): string => {
  const typeLabel = isVideo ? "video call" : "audio call";
  if (!isMissed) {
    return isVideo ? "Video call" : "Audio call";
  }
  if (status === "declined") return `Declined ${typeLabel}`;
  if (status === "busy") return `Busy ${typeLabel}`;
  return `Missed ${typeLabel}`;
};

export const getCallDetails = (message: MessageType): CallDetails => {
  const isMissed = checkIsCallMissed(message.callInfo);
  const isVideo = message.callInfo?.callType === "video";
  const title = getCallTitle(isMissed, message.callInfo?.status, isVideo);
  const subtitle = isMissed
    ? formatConversationTime(message.createdAt)
    : formatDuration(message.callInfo?.duration);

  return { isVideo, isMissed, title, subtitle };
};

export const formatLastCallMessage = (callInfo?: CallInfoType): string => {
  const isVideo = callInfo?.callType === "video";
  const prefix = isVideo ? "📹" : "📞";
  const label = isVideo ? "video call" : "audio call";

  if (checkIsCallMissed(callInfo)) {
    return `${prefix} Missed ${label}`;
  }
  return `${prefix} ${isVideo ? "Video call" : "Audio call"}`;
};

export const getEmptyMessagePlaceholder = (
  isGroup: boolean | undefined,
  createdBy: string | undefined,
  currentUserId: string | null,
): string => {
  if (!isGroup) return "Send a message";
  return createdBy === currentUserId ? "Group created" : "You were added";
};

export const formatLastMessageText = (
  conversation: ConversationType,
  currentUserId: string | null,
  isGroup: boolean | undefined,
): string => {
  const { lastMessage } = conversation;
  if (!lastMessage) {
    return getEmptyMessagePlaceholder(isGroup, conversation.createdBy, currentUserId);
  }
  if (lastMessage.image) return "📷 Photo";
  if (lastMessage.contentType === "call") {
    return formatLastCallMessage(lastMessage.callInfo);
  }
  if (isGroup && lastMessage.sender) {
    const sender =
      lastMessage.sender._id === currentUserId ? "You" : lastMessage.sender.name;
    return `${sender}: ${lastMessage.content}`;
  }
  return lastMessage.content || "";
};
