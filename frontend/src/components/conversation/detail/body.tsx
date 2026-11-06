import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/hooks/use-auth";
import { useToggleReaction } from "@/hooks/use-conversation-actions";
import { useConversationMessages } from "@/hooks/use-conversation-messages";
import { useVirtualChatScroll } from "@/hooks/use-virtual-chat-scroll";
import { cn } from "@/lib/utils";
import type { MessageType } from "@/types/conversation.type";
import { ChevronDown } from "lucide-react";
import { useCallback, useMemo } from "react";
import { Virtuoso } from "react-virtuoso";
import { toast } from "sonner";
import MessageItem from "./message-item";

interface VirtuosoHeaderContext {
  hasMore: boolean;
  messagesLength: number;
  isFetchingMoreMessages: boolean;
}

const VirtuosoHeader = ({ context }: { context?: VirtuosoHeaderContext }) => {
  if (!context) return null;
  const { hasMore, messagesLength, isFetchingMoreMessages } = context;

  return (
    <div className="w-full px-3 select-none">
      {!hasMore && messagesLength > 0 && (
        <div className="flex items-center justify-center py-4">
          <div className="text-[11px] text-muted-foreground/70 flex items-center gap-2 font-medium">
            <span className="h-px w-8 bg-border/60" />
            <span>Beginning of conversation history</span>
            <span className="h-px w-8 bg-border/60" />
          </div>
        </div>
      )}

      {isFetchingMoreMessages && (
        <div className="flex items-center justify-center pb-3">
          <Spinner className="size-6 text-primary!" />
        </div>
      )}
    </div>
  );
};

const VIRTUOSO_COMPONENTS = {
  Header: VirtuosoHeader,
};

const INITIAL_TOP_MOST_ITEM = {
  index: "LAST" as const,
  align: "end" as const,
};

interface ConversationBodyProps {
  conversationId: string;
  messages: MessageType[];
  onReply: (message: MessageType) => void;
  isSendingMsg?: boolean;
}

const ConversationBody = ({
  conversationId,
  messages,
  onReply,
  isSendingMsg = false,
}: ConversationBodyProps) => {
  const { user } = useAuth();
  const currentUserId = user?._id || null;

  const { hasMore, isFetchingMore, fetchMoreMessages } =
    useConversationMessages(conversationId);
  const { mutate: toggleReaction } = useToggleReaction();

  const isOutgoingMessage = useCallback(
    (msg: MessageType) =>
      Boolean(currentUserId && msg.sender?._id === currentUserId) ||
      msg.status === "sending...",
    [currentUserId],
  );

  const {
    virtuosoRef,
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
    isLoadingMore: isFetchingMore,
    onLoadMore: () => {
      void fetchMoreMessages();
    },
    isOutgoingItem: isOutgoingMessage,
  });

  const handleToggleReaction = useCallback(
    (messageId: string, emoji: string) => {
      toggleReaction({ conversationId, messageId, emoji });
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
      isFetchingMoreMessages: isFetchingMore,
    }),
    [hasMore, messages.length, isFetchingMore],
  );

  return (
    <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden bg-background">
      <Virtuoso<MessageType, VirtuosoHeaderContext>
        key={conversationId}
        ref={virtuosoRef}
        data={messages}
        firstItemIndex={firstItemIndex}
        initialTopMostItemIndex={INITIAL_TOP_MOST_ITEM}
        startReached={handleStartReached}
        alignToBottom
        followOutput="auto"
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
          const isLast = arrayIndex === messages.length - 1;
          const isLastFromUser = isLast && isCurrentUser;

          return (
            <div className={cn("w-full px-3", isLast ? "pb-2.5" : "pb-1")}>
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
