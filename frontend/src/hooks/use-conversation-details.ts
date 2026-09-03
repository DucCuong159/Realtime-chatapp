import type { ConversationType } from "@/types/conversation.type";
import { useIsUserOnline } from "./use-is-user-online";

function getGroupDetails(conversation?: ConversationType | null) {
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
  other: ReturnType<NonNullable<ConversationType["participants"]>["find"]>,
  isOnline: boolean,
) {
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
) => {
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
