import type { ConversationType } from "@/types/conversation.type";
import { useIsUserOnline } from "./use-is-user-online";

export const useConversationDetails = (
  conversation?: ConversationType | null,
  currentUserId?: string | null,
) => {
  const isGroup = conversation?.isGroup ?? false;

  const other = conversation?.participants?.find((p) => p._id !== currentUserId);
  const isOnline = useIsUserOnline(other?._id);

  if (isGroup) {
    return {
      name: conversation?.groupName || "Unnamed Group",
      subheading: `${conversation?.participants?.length || 0} members`,
      avatar: "",
      isGroup: true,
      isOnline: false,
      otherUser: null,
    };
  }

  return {
    name: other?.name || "Unknown",
    subheading: isOnline ? "Online" : "Offline",
    avatar: other?.avatar || "",
    isGroup: false,
    isOnline,
    otherUser: other ?? null,
  };
};

export default useConversationDetails;
