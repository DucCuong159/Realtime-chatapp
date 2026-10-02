import Response from "@/components/ui/ai-response";
import { cn } from "@/lib/utils";
import type { MessageType } from "@/types/conversation.type";
import { RiCircleFill } from "@remixicon/react";
import { memo } from "react";
import ReactionBadges from "./reaction-badges";

const MessageReplyPreview = ({
  replyTo,
  isCurrentUser,
  currentUserId,
  onScrollToMessage,
}: {
  replyTo: NonNullable<MessageType["replyTo"]>;
  isCurrentUser: boolean;
  currentUserId: string | null;
  onScrollToMessage: (targetId: string) => void;
}) => {
  const replySenderName =
    replyTo.sender?._id === currentUserId
      ? "You"
      : replyTo.sender?.name || "User";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (replyTo._id) {
          onScrollToMessage(replyTo._id);
        }
      }}
      className={cn(
        "mb-0.5 rounded border-l-2 p-1.5 text-xs text-left overflow-hidden min-w-0 cursor-pointer hover:opacity-90 active:scale-[0.99] transition-all select-none",
        isCurrentUser
          ? "border-white/60 bg-white/10 text-white"
          : "border-[#3d61ff] bg-[#3d61ff]/5 text-foreground",
      )}
    >
      <span className="block font-medium text-[11px] opacity-90 truncate">
        {replySenderName}
      </span>
      <span className="block font-normal opacity-80 truncate">
        {replyTo.image ? "📷 Photo" : replyTo.content}
      </span>
    </button>
  );
};

const MessageAttachment = ({
  image,
  isImageOnly,
  isCurrentUser,
}: {
  image: string;
  isImageOnly: boolean;
  isCurrentUser: boolean;
}) => {
  const imageClassName = isImageOnly
    ? cn(
        "rounded-2xl max-w-sm w-auto",
        isCurrentUser ? "rounded-br-xs" : "rounded-bl-xs",
      )
    : "rounded-xl w-full";

  return (
    <img
      src={image}
      alt="Attachment"
      className={cn("max-h-80 object-cover", imageClassName)}
    />
  );
};

const MessageContent = ({
  content,
  isAI,
  isStreaming,
}: {
  content?: string | null;
  isAI?: boolean;
  isStreaming?: boolean;
}) => (
  <>
    {content &&
      (isAI ? (
        <Response>{content}</Response>
      ) : (
        <p className="whitespace-pre-wrap leading-relaxed">{content}</p>
      ))}

    {isStreaming && (
      <div className="flex items-center gap-2">
        <RiCircleFill
          className="size-2.5 animate-bounce rounded-full dark:text-white mt-1"
          style={{ animationDelay: "0s" }}
        />
        <RiCircleFill
          className="size-2.5 animate-bounce rounded-full dark:text-white mt-1"
          style={{ animationDelay: "0.2s" }}
        />
        <RiCircleFill
          className="size-2.5 animate-bounce rounded-full dark:text-white mt-1"
          style={{ animationDelay: "0.4s" }}
        />
      </div>
    )}
  </>
);

interface MessageBubbleProps {
  message: MessageType;
  isCurrentUser: boolean;
  currentUserId: string | null;
  onScrollToMessage: (targetId: string) => void;
  onToggleReaction: (emoji: string) => void;
  onTouchStart: () => void;
  onTouchEnd: () => void;
  onTouchMove: () => void;
}

const MessageBubble = memo(
  ({
    message,
    isCurrentUser,
    currentUserId,
    onScrollToMessage,
    onToggleReaction,
    onTouchStart,
    onTouchEnd,
    onTouchMove,
  }: MessageBubbleProps) => {
    const isImageOnly = Boolean(
      message.image && !message.content && !message.replyTo,
    );

    const bubbleClassName = isImageOnly
      ? "bg-transparent p-0 shadow-none"
      : cn(
          "gap-1.5 rounded-2xl px-3.5 py-2.5 shadow-xs",
          isCurrentUser
            ? "rounded-br-xs bg-[#3d61ff] text-white"
            : "rounded-bl-xs bg-muted text-foreground",
        );

    return (
      <div className="relative flex flex-col max-w-[80%] w-fit">
        <div
          id={`message-${message._id}`}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onTouchMove={onTouchMove}
          className={cn(
            "relative flex flex-col text-sm wrap-break-word wrap-anywhere",
            bubbleClassName,
          )}
        >
          {message.replyTo && (
            <MessageReplyPreview
              replyTo={message.replyTo}
              isCurrentUser={isCurrentUser}
              currentUserId={currentUserId}
              onScrollToMessage={onScrollToMessage}
            />
          )}

          {message.image && (
            <MessageAttachment
              image={message.image}
              isImageOnly={isImageOnly}
              isCurrentUser={isCurrentUser}
            />
          )}

          <MessageContent
            content={message.content}
            isAI={message.sender?.isAI}
            isStreaming={message.streaming}
          />
        </div>

        <ReactionBadges
          reactions={message.reactions}
          currentUserId={currentUserId}
          onToggleReaction={onToggleReaction}
        />
      </div>
    );
  },
);

MessageBubble.displayName = "MessageBubble";

export default MessageBubble;
