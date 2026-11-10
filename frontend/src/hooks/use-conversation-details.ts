import type { UserType } from "@/types/auth.type";
import type { ConversationType } from "@/types/conversation.type";
import { useIsUserOnline } from "./use-is-user-online";

export interface ConversationDetailsResult {
  name: string;
  subheading: string;
  avatar: string;
  isGroup: boolean;
  isOnline: boolean;
  otherUser: UserType | null;
  isAI?: boolean;
}

function getGroupDetails(
  conversation?: ConversationType | null,
): ConversationDetailsResult {
  const count = conversation?.participants?.length ?? 0;
  return {
    name: conversation?.groupName || "Unnamed Group",
    subheading: `${count} members`,
    avatar: "",
    isGroup: true,
    isOnline: false,
    otherUser: null,
  };
}

function getDirectDetails(
  other: UserType | undefined,
  isOnline: boolean,
): ConversationDetailsResult {
  const subheading = other?.isAI
    ? "Assistant"
    : isOnline
      ? "Online"
      : "Offline";

  return {
    name: other?.name || "Unknown",
    subheading,
    avatar: other?.avatar || "",
    isGroup: false,
    isOnline,
    otherUser: other ?? null,
    isAI: Boolean(other?.isAI),
  };
}

export const useConversationDetails = (
  conversation?: ConversationType | null,
  currentUserId?: string | null,
): ConversationDetailsResult => {
  const isGroup = Boolean(conversation?.isGroup);
  const other = conversation?.participants?.find(
    (p) => p._id !== currentUserId,
  );
  const isOnline = useIsUserOnline(other?._id);

  if (isGroup) {
    return getGroupDetails(conversation);
  }

  return getDirectDetails(other, isOnline);
};

export default useConversationDetails;
