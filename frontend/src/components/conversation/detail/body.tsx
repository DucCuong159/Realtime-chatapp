import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useConversation } from "@/hooks/use-conversation";
import { useSocket } from "@/hooks/use-socket";
import { useVirtualChatScroll } from "@/hooks/use-virtual-chat-scroll";
import type { AIStreamPayload, MessageType } from "@/types/conversation.type";
import { ChevronDown } from "lucide-react";
import { useCallback, useEffect, useMemo } from "react";
import { Virtuoso } from "react-virtuoso";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
import MessageItem from "./message-item";
import {
  VirtuosoFooter,
  VirtuosoHeader,
  type VirtuosoHeaderContext,
} from "./virtuoso-components";

const VIRTUOSO_COMPONENTS = {
  Header: VirtuosoHeader,
  Footer: VirtuosoFooter,
};

interface ConversationBodyProps {
  conversationId: string;
  messages: MessageType[];
  onReply: (message: MessageType) => void;
}

const ConversationBody = ({
  conversationId,
  messages,
  onReply,
}: ConversationBodyProps) => {
  const { user } = useAuth();
  const currentUserId = user?._id || null;
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

  const isAnyMessageStreaming = useMemo(
    () => messages.some((m) => Boolean(m.streaming)),
    [messages],
  );

  const {
    virtuosoRef,
    scrollerRef,
    firstItemIndex,
    showScrollToBottom,
    highlightedId,
    handleStartReached,
    handleAtBottomStateChange,
    scrollToBottom,
    scrollToItemById,
  } = useVirtualChatScroll({
    items: messages,
    conversationId,
    hasMore,
    isLoadingMore: isFetchingMoreMessages,
    onLoadMore: () => fetchMoreMessages(conversationId),
    isStreaming: isAnyMessageStreaming,
  });

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

  const handleToggleReaction = useCallback(
    (messageId: string, emoji: string) => {
      void toggleReaction(conversationId, messageId, emoji);
    },
    [conversationId, toggleReaction],
  );

  const handleScrollToMessage = useCallback(
    (targetId: string) => {
      const found = scrollToItemById(targetId);
      if (!found) {
        toast.info("Message is not in loaded history");
      }
    },
    [scrollToItemById],
  );

  const headerContext: VirtuosoHeaderContext = useMemo(
    () => ({
      hasMore,
      messagesLength: messages.length,
      isFetchingMoreMessages,
    }),
    [hasMore, messages.length, isFetchingMoreMessages],
  );

  const handleFollowOutput = useCallback(
    (isAtBottom: boolean) => {
      const lastMessage = messages[messages.length - 1];
      const isLastFromCurrentUser =
        Boolean(currentUserId && lastMessage?.sender?._id === currentUserId) ||
        lastMessage?.status === "sending...";

      if (isLastFromCurrentUser) {
        return "smooth";
      }
      return isAtBottom ? "auto" : false;
    },
    [messages, currentUserId],
  );

  return (
    <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden bg-background">
      <Virtuoso<MessageType, VirtuosoHeaderContext>
        key={conversationId}
        ref={virtuosoRef}
        scrollerRef={scrollerRef}
        data={messages}
        firstItemIndex={firstItemIndex}
        initialTopMostItemIndex={
          messages.length > 0
            ? { index: messages.length - 1, align: "end" }
            : 0
        }
        startReached={handleStartReached}
        alignToBottom
        followOutput={handleFollowOutput}
        atBottomThreshold={80}
        atBottomStateChange={handleAtBottomStateChange}
        components={VIRTUOSO_COMPONENTS}
        context={headerContext}
        style={{ height: "100%", width: "100%", overflowX: "hidden" }}
        className="overflow-x-hidden"
        computeItemKey={(_index, message) => message._id}
        itemContent={(index, message) => {
          const arrayIndex = index - firstItemIndex;
          const isCurrentUser = message.sender?._id === currentUserId;
          const isLastFromUser =
            arrayIndex === messages.length - 1 && isCurrentUser;

          return (
            <div className="pb-1 w-full px-3">
              <MessageItem
                message={message}
                currentUserId={currentUserId}
                isCurrentUser={isCurrentUser}
                isLastFromUser={isLastFromUser}
                isSendingMsg={isSendingMsg}
                isHighlighted={highlightedId === message._id}
                onReply={onReply}
                onScrollToMessage={handleScrollToMessage}
                onToggleReaction={handleToggleReaction}
              />
            </div>
          );
        }}
      />

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
