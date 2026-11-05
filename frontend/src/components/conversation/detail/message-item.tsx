import AvatarWithBadge from "@/components/avatar-with-badge";
import { getReactionUserId } from "@/lib/reaction.utils";
import { cn, formatConversationTime } from "@/lib/utils";
import type { MessageType } from "@/types/conversation.type";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import CallMessageItem from "./call-message-item";
import MessageActions from "./message-actions";
import MessageBubble from "./message-bubble";

export interface MessageItemProps {
  message: MessageType;
  currentUserId: string | null;
  isCurrentUser: boolean;
  isLastFromUser: boolean;
  isSendingMsg: boolean;
  isHighlighted?: boolean;
  onReply: (message: MessageType) => void;
  onScrollToMessage: (targetId: string) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
}

const CallMessageRow = ({
  message,
  currentUserId,
  isCurrentUser,
  isHighlighted,
}: {
  message: MessageType;
  currentUserId: string | null;
  isCurrentUser: boolean;
  isHighlighted?: boolean;
}) => (
  <div
    id={`message-${message._id}`}
    className="flex flex-col w-full px-2 py-1"
  >
    <div
      className={cn(
        "flex items-center gap-1.5 w-full",
        isCurrentUser ? "justify-end" : "justify-start",
      )}
    >
      {!isCurrentUser && (
        <AvatarWithBadge
          name={message.sender?.name || "User"}
          src={message.sender?.avatar || ""}
          size="size-7"
        />
      )}
      <div
        className={cn(
          "rounded-2xl transition-all duration-300",
          isHighlighted && "border-2 border-black dark:border-white",
        )}
      >
        <CallMessageItem message={message} currentUserId={currentUserId} />
      </div>
    </div>
  </div>
);

const MessageStatus = ({ status }: { status?: string }) => (
  <div className="flex justify-end pr-2 pt-0.5 select-none">
    <span className="text-[11px] text-muted-foreground">
      {status === "sending..." ? "Sending..." : "Sent"}
    </span>
  </div>
);

const MessageItem = memo(
  ({
    message,
    currentUserId,
    isCurrentUser,
    isLastFromUser,
    isSendingMsg,
    isHighlighted,
    onReply,
    onScrollToMessage,
    onToggleReaction,
  }: MessageItemProps) => {
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const touchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const isActionDisabled =
      isSendingMsg ||
      message.status === "sending..." ||
      Boolean(message.streaming);

    const currentUserReaction = useMemo(() => {
      const r = message.reactions?.find(
        (reaction) => getReactionUserId(reaction.user) === currentUserId,
      );
      return r?.emoji;
    }, [message.reactions, currentUserId]);

    const clearTouchTimer = () => {
      if (touchTimerRef.current) {
        clearTimeout(touchTimerRef.current);
        touchTimerRef.current = null;
      }
    };

    const handleTouchStart = () => {
      if (isActionDisabled) return;
      touchTimerRef.current = setTimeout(() => {
        setIsPickerOpen(true);
      }, 500);
    };

    useEffect(() => {
      return clearTouchTimer;
    }, []);

    const handleToggleReactionForMessage = useCallback(
      (emoji: string) => {
        onToggleReaction(message._id, emoji);
      },
      [message._id, onToggleReaction],
    );

    if (message.contentType === "call") {
      return (
        <CallMessageRow
          message={message}
          currentUserId={currentUserId}
          isCurrentUser={isCurrentUser}
          isHighlighted={isHighlighted}
        />
      );
    }

    const formattedTime = formatConversationTime(message.createdAt);

    const actions = (
      <MessageActions
        formattedTime={formattedTime}
        onReply={() => onReply(message)}
        onToggleReaction={handleToggleReactionForMessage}
        isPickerOpen={isPickerOpen}
        setIsPickerOpen={setIsPickerOpen}
        disabled={isActionDisabled}
        side={isCurrentUser ? "right" : "left"}
        currentUserReaction={currentUserReaction}
      />
    );

    return (
      <div className="flex flex-col w-full">
        <div
          className={cn(
            "group relative flex items-end gap-1.5 px-2 py-0.5 w-full",
            isCurrentUser ? "justify-end" : "justify-start",
          )}
        >
          {!isCurrentUser && (
            <AvatarWithBadge
              name={message.sender?.name || "User"}
              src={message.sender?.avatar || ""}
              size="size-7"
            />
          )}

          {isCurrentUser && actions}

          <MessageBubble
            message={message}
            isCurrentUser={isCurrentUser}
            currentUserId={currentUserId}
            isHighlighted={isHighlighted}
            onScrollToMessage={onScrollToMessage}
            onToggleReaction={handleToggleReactionForMessage}
            onTouchStart={handleTouchStart}
            onTouchEnd={clearTouchTimer}
            onTouchMove={clearTouchTimer}
          />

          {!isCurrentUser && actions}
        </div>

        {isCurrentUser && isLastFromUser && (
          <MessageStatus status={message.status} />
        )}
      </div>
    );
  },
);

MessageItem.displayName = "MessageItem";

export default MessageItem;
