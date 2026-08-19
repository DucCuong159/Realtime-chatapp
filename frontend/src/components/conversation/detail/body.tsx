import AvatarWithBadge from "@/components/avatar-with-badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { cn, formatConversationTime } from "@/lib/utils";
import type { MessageType } from "@/types/conversation.type";
import { Reply } from "lucide-react";
import { memo, useCallback, useEffect, useRef } from "react";

interface ConversationBodyProps {
  messages: MessageType[];
  onReply: (message: MessageType) => void;
}

interface MessageItemProps {
  message: MessageType;
  currentUserId: string | null;
  isCurrentUser: boolean;
  isLastFromUser: boolean;
  onReply: (message: MessageType) => void;
  onScrollToMessage: (targetId: string) => void;
}

const MessageItem = memo(
  ({
    message,
    currentUserId,
    isCurrentUser,
    isLastFromUser,
    onReply,
    onScrollToMessage,
  }: MessageItemProps) => {
    const isSending = message.status === "sending...";
    const formattedTime = formatConversationTime(message.createdAt);

    const replySenderName =
      message.replyTo?.sender?._id === currentUserId
        ? "You"
        : message.replyTo?.sender?.name || "User";

    return (
      <div className="flex flex-col w-full transition-colors duration-500 rounded-2xl">
        <div
          className={cn(
            "group relative flex items-end gap-2 px-2 py-0.5 w-full",
            isCurrentUser ? "justify-end" : "justify-start",
          )}
        >
          {/* Receiver Avatar */}
          {!isCurrentUser && (
            <AvatarWithBadge
              name={message.sender?.name || "User"}
              src={message.sender?.avatar || ""}
              size="size-7"
            />
          )}

          {isCurrentUser && (
            <>
              <span className="text-[11px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity select-none self-center shrink-0">
                {formattedTime}
              </span>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => onReply(message)}
                className="opacity-0 group-hover:opacity-100 transition-opacity rounded-full size-7 shrink-0 self-center text-muted-foreground hover:text-foreground"
                aria-label="Reply"
              >
                <Reply className="size-3.5 scale-x-[-1]" />
              </Button>
            </>
          )}

          <div
            id={`message-${message._id}`}
            className={cn(
              "relative flex max-w-[80%] flex-col gap-1.5 rounded-2xl px-3.5 py-2.5 text-sm shadow-xs break-words [overflow-wrap:anywhere]",
              isCurrentUser
                ? "rounded-br-xs bg-[#3d61ff] text-white"
                : "rounded-bl-xs bg-muted text-foreground",
            )}
          >
            {message.replyTo && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  if (message.replyTo?._id) {
                    onScrollToMessage(message.replyTo._id);
                  }
                }}
                className={cn(
                  "mb-0.5 rounded border-l-2 p-1.5 text-xs text-left overflow-hidden min-w-0 cursor-pointer hover:opacity-90 active:scale-[0.99] transition-all select-none",
                  isCurrentUser
                    ? "border-white/60 bg-white/10 text-white"
                    : "border-[#3d61ff] bg-[#3d61ff]/5 text-foreground",
                )}
              >
                <p className="font-medium text-[11px] opacity-90 truncate">
                  {replySenderName}
                </p>
                <p className="font-normal opacity-80 truncate">
                  {message.replyTo.image ? "📷 Photo" : message.replyTo.content}
                </p>
              </div>
            )}

            {message.image && (
              <img
                src={message.image}
                alt="Attachment"
                className="max-h-72 w-full rounded-xl object-cover"
              />
            )}

            {message.content && (
              <p className="whitespace-pre-wrap leading-relaxed">
                {message.content}
              </p>
            )}
          </div>

          {!isCurrentUser && (
            <>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => onReply(message)}
                className="opacity-0 group-hover:opacity-100 transition-opacity rounded-full size-7 shrink-0 self-center text-muted-foreground hover:text-foreground"
                aria-label="Reply"
              >
                <Reply className="size-3.5" />
              </Button>
              <span className="text-[11px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity select-none self-center shrink-0">
                {formattedTime}
              </span>
            </>
          )}
        </div>

        {isCurrentUser && isLastFromUser && (
          <div className="flex justify-end pr-2 pt-0.5 select-none">
            <span className="text-[11px] text-muted-foreground">
              {isSending ? "Sending..." : "Sent"}
            </span>
          </div>
        )}
      </div>
    );
  },
);

MessageItem.displayName = "MessageItem";

const ConversationBody = ({ messages, onReply }: ConversationBodyProps) => {
  const { user } = useAuth();
  const currentUserId = user?._id || null;
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!messages.length) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  const handleScrollToMessage = useCallback((targetMessageId: string) => {
    const element = document.getElementById(`message-${targetMessageId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.classList.add("border-2", "border-secondary-foreground");
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
      highlightTimeoutRef.current = setTimeout(() => {
        element.classList.remove("border-2", "border-secondary-foreground");
      }, 1500);
    }
  }, []);

  return (
    <div className="flex flex-1 flex-col justify-end gap-1 p-3 max-w-6xl mx-auto w-full">
      {messages.map((message, index) => {
        const isCurrentUser = message.sender?._id === currentUserId;
        const isLastFromUser = index === messages.length - 1 && isCurrentUser;

        return (
          <MessageItem
            key={message._id}
            message={message}
            currentUserId={currentUserId}
            isCurrentUser={isCurrentUser}
            isLastFromUser={isLastFromUser}
            onReply={onReply}
            onScrollToMessage={handleScrollToMessage}
          />
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
};

export default ConversationBody;
