import AvatarWithBadge from "@/components/avatar-with-badge";
import Response from "@/components/ui/ai-response";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/hooks/use-auth";
import { useConversation } from "@/hooks/use-conversation";
import { useSocket } from "@/hooks/use-socket";
import { cn, formatConversationTime } from "@/lib/utils";
import type { AIStreamPayload, MessageType } from "@/types/conversation.type";
import { RiCircleFill } from "@remixicon/react";
import { ChevronDown, Reply } from "lucide-react";
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";

interface ConversationBodyProps {
  conversationId: string;
  messages: MessageType[];
  onReply: (message: MessageType) => void;
}

interface MessageItemProps {
  message: MessageType;
  currentUserId: string | null;
  isCurrentUser: boolean;
  isLastFromUser: boolean;
  isSendingMsg: boolean;
  onReply: (message: MessageType) => void;
  onScrollToMessage: (targetId: string) => void;
}

const MessageItem = memo(
  ({
    message,
    currentUserId,
    isCurrentUser,
    isLastFromUser,
    isSendingMsg,
    onReply,
    onScrollToMessage,
  }: MessageItemProps) => {
    const isSending = message.status === "sending...";
    const formattedTime = formatConversationTime(message.createdAt);

    const replySenderName =
      message.replyTo?.sender?._id === currentUserId
        ? "You"
        : message.replyTo?.sender?.name || "User";

    const isImageOnly = Boolean(
      message.image && !message.content && !message.replyTo,
    );

    return (
      <div className="flex flex-col w-full transition-colors duration-500 rounded-2xl">
        <div
          className={cn(
            "group relative flex items-end gap-1.5 px-2 py-0.5 w-full",
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
                disabled={isSendingMsg}
                className="opacity-0 group-hover:opacity-100 transition-opacity rounded-full size-7 shrink-0 self-center text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-0"
                aria-label="Reply"
              >
                <Reply className="size-3.5 scale-x-[-1]" />
              </Button>
            </>
          )}

          <div
            id={`message-${message._id}`}
            className={cn(
              "relative flex max-w-[80%] flex-col text-sm wrap-break-word wrap-anywhere",
              isImageOnly
                ? "bg-transparent p-0 shadow-none"
                : cn(
                    "gap-1.5 rounded-2xl px-3.5 py-2.5 shadow-xs",
                    isCurrentUser
                      ? "rounded-br-xs bg-[#3d61ff] text-white"
                      : "rounded-bl-xs bg-muted text-foreground",
                  ),
            )}
          >
            {message.replyTo && (
              <button
                type="button"
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
                <span className="block font-medium text-[11px] opacity-90 truncate">
                  {replySenderName}
                </span>
                <span className="block font-normal opacity-80 truncate">
                  {message.replyTo.image ? "📷 Photo" : message.replyTo.content}
                </span>
              </button>
            )}

            {message.image && (
              <img
                src={message.image}
                alt="Attachment"
                className={cn(
                  "max-h-80 object-cover",
                  isImageOnly
                    ? cn(
                        "rounded-2xl max-w-sm w-auto",
                        isCurrentUser ? "rounded-br-xs" : "rounded-bl-xs",
                      )
                    : "rounded-xl w-full",
                )}
              />
            )}

            {message.content &&
              (message.sender?.isAI ? (
                <Response>{message.content}</Response>
              ) : (
                <p className="whitespace-pre-wrap leading-relaxed">
                  {message.content}
                </p>
              ))}

            {message.streaming && (
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
          </div>

          {!isCurrentUser && (
            <>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => onReply(message)}
                disabled={isSendingMsg}
                className="opacity-0 group-hover:opacity-100 transition-opacity rounded-full size-7 shrink-0 self-center text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-0"
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

const ConversationBody = ({
  conversationId,
  messages,
  onReply,
}: ConversationBodyProps) => {
  const { user } = useAuth();
  const currentUserId = user?._id || null;
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const { socket } = useSocket();

  const {
    addOrUpdateMessage,
    updateStreamingAIMessage,
    clearStreamingAIMessage,
    fetchMoreMessages,
    isFetchingMoreMessages,
    hasMore,
    isSendingMsg,
  } = useConversation(
    useShallow((state) => ({
      addOrUpdateMessage: state.addOrUpdateMessage,
      updateStreamingAIMessage: state.updateStreamingAIMessage,
      clearStreamingAIMessage: state.clearStreamingAIMessage,
      fetchMoreMessages: state.fetchMoreMessages,
      isFetchingMoreMessages: state.isFetchingMoreMessages,
      hasMore: Boolean(state.singleConversation?.pagination?.hasMore),
      isSendingMsg: state.isSendingMsg,
    })),
  );

  const prependAnchorRef = useRef<{
    messageId: string;
    viewportOffset: number;
  } | null>(null);
  const isPrependingRef = useRef<boolean>(false);
  const isInitialLoadRef = useRef<boolean>(true);
  const canAutoFetchMoreMessagesRef = useRef<boolean>(true);
  const prevConversationIdRef = useRef<string>(conversationId);

  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Reset initial load flag and scroll-to-bottom button when conversation switches
  useEffect(() => {
    if (prevConversationIdRef.current !== conversationId) {
      isInitialLoadRef.current = true;
      isPrependingRef.current = false;
      prependAnchorRef.current = null;
      canAutoFetchMoreMessagesRef.current = true;
      prevConversationIdRef.current = conversationId;
      setShowScrollToBottom(false);
    }
  }, [conversationId]);

  // Handle Socket AI streaming
  useEffect(() => {
    if (!socket) return;

    const handleAIStream = ({
      conversationId: streamConversationId,
      chunk,
      done,
      message,
      sender,
      error,
    }: AIStreamPayload) => {
      if (streamConversationId !== conversationId) return;

      if (chunk && !done) {
        updateStreamingAIMessage(conversationId, chunk, sender);
      }
      if (done && message) {
        addOrUpdateMessage(conversationId, message);
      } else if (done && !message) {
        clearStreamingAIMessage(conversationId);
        if (error) {
          toast.error(error);
        }
      }
    };

    socket.on("conversation:ai", handleAIStream);

    return () => {
      socket.off("conversation:ai", handleAIStream);
    };
  }, [
    socket,
    conversationId,
    updateStreamingAIMessage,
    addOrUpdateMessage,
    clearStreamingAIMessage,
  ]);

  // Scroll Position Restoration & Auto-Scroll
  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    if (isInitialLoadRef.current && messages.length > 0) {
      container.scrollTop = container.scrollHeight;
      isInitialLoadRef.current = false;
      return;
    }

    if (isPrependingRef.current) {
      const anchor = prependAnchorRef.current;
      if (anchor) {
        const anchorElement = document.getElementById(anchor.messageId);
        if (anchorElement && container.contains(anchorElement)) {
          const containerTop = container.getBoundingClientRect().top;
          const currentOffset =
            anchorElement.getBoundingClientRect().top - containerTop;

          container.scrollTop += currentOffset - anchor.viewportOffset;
        }
      }

      if (!isFetchingMoreMessages) {
        isPrependingRef.current = false;
        prependAnchorRef.current = null;
      }
      return;
    } else {
      const isNearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight <
        150;
      const lastMessage = messages[messages.length - 1];
      const isLastFromCurrentUser = lastMessage?.sender?._id === currentUserId;

      if (isNearBottom || isLastFromCurrentUser) {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [messages, currentUserId, isFetchingMoreMessages]);

  const handleScroll = useCallback((isUserInitiated: boolean) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    if (isUserInitiated) {
      canAutoFetchMoreMessagesRef.current = true;
    }

    // Detect when user reaches near top
    if (
      container.scrollTop <= 80 &&
      hasMore &&
      !isFetchingMoreMessages &&
      (isUserInitiated || canAutoFetchMoreMessagesRef.current)
    ) {
      const containerTop = container.getBoundingClientRect().top;
      const firstVisibleMessage = Array.from(
        container.querySelectorAll<HTMLElement>("[id^='message-']"),
      ).find((message) => message.getBoundingClientRect().bottom > containerTop);

      prependAnchorRef.current = firstVisibleMessage
        ? {
            messageId: firstVisibleMessage.id,
            viewportOffset:
              firstVisibleMessage.getBoundingClientRect().top - containerTop,
          }
        : null;
      isPrependingRef.current = true;

      void fetchMoreMessages(conversationId).then((success) => {
        if (!success) {
          isPrependingRef.current = false;
          prependAnchorRef.current = null;
          canAutoFetchMoreMessagesRef.current = false;
        }
      });
    }

    // Detect distance from bottom to show/hide scroll-to-bottom button
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    setShowScrollToBottom(distanceFromBottom > 200);
  }, [hasMore, isFetchingMoreMessages, fetchMoreMessages, conversationId]);

  const handleUserScroll = useCallback(() => {
    handleScroll(true);
  }, [handleScroll]);

  // Re-check the top boundary after render so short histories can load older
  // messages even when the container never emits a scroll event.
  useEffect(() => {
    if (messages.length === 0) return;
    handleScroll(false);
  }, [messages.length, handleScroll]);

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
    <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden">
      <div
        ref={scrollContainerRef}
        onScroll={handleUserScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden p-3 w-full bg-background flex flex-col justify-start"
      >
        {/* Beginning of conversation indicator */}
        {!hasMore && messages.length > 0 && (
          <div className="flex items-center justify-center py-4 select-none">
            <div className="text-[11px] text-muted-foreground/70 flex items-center gap-2 font-medium">
              <span className="h-px w-8 bg-border/60" />
              <span>Beginning of conversation history</span>
              <span className="h-px w-8 bg-border/60" />
            </div>
          </div>
        )}

        {/* Top Loading Indicator */}
        {isFetchingMoreMessages && (
          <div className="flex items-center justify-center pb-3 select-none">
            <Spinner className="size-6 text-primary!" />
          </div>
        )}

        {/* Flexible spacer to push messages to bottom when few messages exist */}
        <div className="flex-1 min-h-0" />

        <div className="flex flex-col gap-1 w-full">
          {messages.map((message, index) => {
            const isCurrentUser = message.sender?._id === currentUserId;
            const isLastFromUser =
              index === messages.length - 1 && isCurrentUser;

            return (
              <MessageItem
                key={message._id}
                message={message}
                currentUserId={currentUserId}
                isCurrentUser={isCurrentUser}
                isLastFromUser={isLastFromUser}
                isSendingMsg={isSendingMsg}
                onReply={onReply}
                onScrollToMessage={handleScrollToMessage}
              />
            );
          })}
        </div>
        <div ref={bottomRef} className="h-0 w-full shrink-0" />
      </div>

      {/* Floating Scroll-to-Bottom Button */}
      {showScrollToBottom && (
        <Button
          variant="secondary"
          size="icon"
          onClick={scrollToBottom}
          className="absolute bottom-4 right-5 z-20 size-9 rounded-full shadow-md border border-border/60 bg-background/90 hover:bg-background backdrop-blur-md transition-all hover:scale-105 active:scale-95 animate-in fade-in zoom-in-75 duration-200 cursor-pointer text-muted-foreground hover:text-foreground"
          aria-label="Scroll to bottom"
        >
          <ChevronDown className="size-5" />
        </Button>
      )}
    </div>
  );
};

export default ConversationBody;
