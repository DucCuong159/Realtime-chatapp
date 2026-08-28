import { useConversationDetails } from "@/hooks/use-conversation-details";
import { cn, formatConversationTime } from "@/lib/utils";
import type { ConversationType } from "@/types/conversation.type";
import { useLocation } from "react-router-dom";
import AvatarWithBadge from "../avatar-with-badge";

interface PropsType {
  conversation: ConversationType;
  currentUserId: string | null;
  onClick?: () => void;
}
const ConversationListItem = ({
  conversation,
  currentUserId,
  onClick,
}: PropsType) => {
  const { pathname } = useLocation();
  const { lastMessage, createdAt } = conversation;

  const { name, avatar, isOnline, isGroup } = useConversationDetails(
    conversation,
    currentUserId,
  );

  const getLastMessageText = () => {
    if (!lastMessage) {
      return isGroup
        ? conversation.createdBy === currentUserId
          ? "Group created"
          : "You were added"
        : "Send a message";
    }
    if (lastMessage.image) return "📷 Photo";

    if (lastMessage.contentType === "call") {
      const isMissed =
        lastMessage.callInfo?.status === "missed" ||
        lastMessage.callInfo?.status === "declined" ||
        lastMessage.callInfo?.status === "busy" ||
        !lastMessage.callInfo?.duration;
      return isMissed ? "📞 Missed audio call" : "📞 Audio call";
    }

    if (isGroup && lastMessage.sender) {
      return `${
        lastMessage.sender._id === currentUserId
          ? "You"
          : lastMessage.sender.name
      }: ${lastMessage.content}`;
    }

    return lastMessage.content;
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full cursor-pointer items-center gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-black/5 dark:hover:bg-sidebar-accent/70",
        pathname.includes(conversation._id) &&
          "bg-black/8 dark:bg-sidebar-accent shadow-xs font-medium",
      )}
    >
      <AvatarWithBadge
        name={name}
        src={avatar}
        isGroup={isGroup}
        isOnline={isOnline}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <h5 className="text-sm font-semibold truncate">{name}</h5>
          <span className="text-xs ml-2 shrink-0 text-muted-foreground">
            {formatConversationTime(lastMessage?.updatedAt || createdAt)}
          </span>
        </div>
        <p className="text-xs truncate text-muted-foreground -mt-px">
          {getLastMessageText()}
        </p>
      </div>
    </button>
  );
};

export default ConversationListItem;
