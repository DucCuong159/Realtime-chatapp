import AvatarWithBadge from "@/components/avatar-with-badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/hooks/use-auth";
import { useConversation } from "@/hooks/use-conversation";
import { useSocket } from "@/hooks/use-socket";
import { getReactionUserId } from "@/lib/reaction.utils";
import { cn, formatConversationTime } from "@/lib/utils";
import type { AIStreamPayload, MessageType } from "@/types/conversation.type";
import { ChevronDown } from "lucide-react";
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
import CallMessageItem from "./call-message-item";
import MessageActions from "./message-actions";
import MessageBubble from "./message-bubble";

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
  onToggleReaction: (messageId: string, emoji: string) => void;
}

const CallMessageRow = ({
  message,
  currentUserId,
  isCurrentUser,
}: {
  message: MessageType;
  currentUserId: string | null;
  isCurrentUser: boolean;
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
      <CallMessageItem message={message} currentUserId={currentUserId} />
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

    const handleTouchStart = () => {
      if (isActionDisabled) return;
      touchTimerRef.current = setTimeout(() => {
        setIsPickerOpen(true);
      }, 500);
    };

    const handleTouchEnd = () => {
      if (touchTimerRef.current) {
        clearTimeout(touchTimerRef.current);
        touchTimerRef.current = null;
      }
    };

    const handleTouchMove = () => {
      if (touchTimerRef.current) {
        clearTimeout(touchTimerRef.current);
        touchTimerRef.current = null;
      }
    };

    useEffect(() => {
      return () => {
        if (touchTimerRef.current) {
          clearTimeout(touchTimerRef.current);
        }
      };
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
        />
      );
    }

    const formattedTime = formatConversationTime(message.createdAt);

    return (
      <div className="flex flex-col w-full transition-colors duration-500 rounded-2xl">
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

          {isCurrentUser && (
            <MessageActions
              formattedTime={formattedTime}
              onReply={() => onReply(message)}
              onToggleReaction={handleToggleReactionForMessage}
              isPickerOpen={isPickerOpen}
              setIsPickerOpen={setIsPickerOpen}
              disabled={isActionDisabled}
              side="right"
              currentUserReaction={currentUserReaction}
            />
          )}

          <MessageBubble
            message={message}
            isCurrentUser={isCurrentUser}
            currentUserId={currentUserId}
            onScrollToMessage={onScrollToMessage}
            onToggleReaction={handleToggleReactionForMessage}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchMove}
          />

          {!isCurrentUser && (
            <MessageActions
              formattedTime={formattedTime}
              onReply={() => onReply(message)}
              onToggleReaction={handleToggleReactionForMessage}
              isPickerOpen={isPickerOpen}
              setIsPickerOpen={setIsPickerOpen}
              disabled={isActionDisabled}
              side="left"
              currentUserReaction={currentUserReaction}
            />
          )}
        </div>

        {isCurrentUser && isLastFromUser && (
          <MessageStatus status={message.status} />
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
    toggleReaction,
  } = useConversation(
    useShallow((state) => ({
      addOrUpdateMessage: state.addOrUpdateMessage,
      updateStreamingAIMessage: state.updateStreamingAIMessage,
      clearStreamingAIMessage: state.clearStreamingAIMessage,
      fetchMoreMessages: state.fetchMoreMessages,
      isFetchingMoreMessages: state.isFetchingMoreMessages,
      hasMore: Boolean(state.singleConversation?.pagination?.hasMore),
      isSendingMsg: state.isSendingMsg,
      toggleReaction: state.toggleReaction,
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
  const prevMessagesLengthRef = useRef<number>(messages.length);

  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleToggleReaction = useCallback(
    (messageId: string, emoji: string) => {
      void toggleReaction(conversationId, messageId, emoji);
    },
    [conversationId, toggleReaction],
  );

  // Reset initial load flag and scroll-to-bottom button when conversation switches
  useEffect(() => {
    if (prevConversationIdRef.current !== conversationId) {
      isInitialLoadRef.current = true;
      isPrependingRef.current = false;
      prependAnchorRef.current = null;
      canAutoFetchMoreMessagesRef.current = true;
      prevConversationIdRef.current = conversationId;
      prevMessagesLengthRef.current = 0;
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

    const prevLength = prevMessagesLengthRef.current;
    prevMessagesLengthRef.current = messages.length;

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
    }

    // Only auto-scroll down if a NEW message was appended or if actively streaming.
    // Reaction updates, edits, or status updates must NEVER scroll the view down!
    const isNewMessageAppended = messages.length > prevLength;
    const lastMessage = messages[messages.length - 1];
    const isStreaming = Boolean(lastMessage?.streaming);

    if (isNewMessageAppended || isStreaming) {
      const isNearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight <
        150;
      const isLastFromCurrentUser = lastMessage?.sender?._id === currentUserId;

      if (isNearBottom || isLastFromCurrentUser) {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [messages, currentUserId, isFetchingMoreMessages]);

  const handleScroll = useCallback(
    (isUserInitiated: boolean) => {
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
        ).find(
          (message) => message.getBoundingClientRect().bottom > containerTop,
        );

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
    },
    [hasMore, isFetchingMoreMessages, fetchMoreMessages, conversationId],
  );

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
                onToggleReaction={handleToggleReaction}
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
