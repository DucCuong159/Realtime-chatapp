import ConversationBody from "@/components/conversation/detail/body";
import ConversationFooter from "@/components/conversation/detail/footer";
import ConversationHeader from "@/components/conversation/detail/header";
import EmptyState from "@/components/conversation/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/hooks/use-auth";
import { useSendMessage } from "@/hooks/use-conversation-actions";
import useConversationId from "@/hooks/use-conversation-id";
import { useConversationMessages } from "@/hooks/use-conversation-messages";
import { useConversationSocket } from "@/hooks/use-conversation-socket";
import { useSocket } from "@/hooks/use-socket";
import { isArrayEmpty } from "@/lib/utils";
import type { MessageType } from "@/types/conversation.type";
import { useEffect, useState } from "react";

const SingleConversation = () => {
  const conversationId = useConversationId();
  const {
    conversation,
    messages,
    isLoading: isSingleConversationLoading,
    hasMore,
    isFetchingMore,
    fetchMoreMessages,
  } = useConversationMessages(conversationId);
  const { isPending: isSendingMsg } = useSendMessage();

  // Install real-time socket listeners once for this active conversation page
  useConversationSocket(conversationId);

  const { socket } = useSocket();
  const { user } = useAuth();

  const currentUserId = user?._id || null;
  const isAiConversation = conversation?.isAiConversation ?? false;

  const [replyTo, setReplyTo] = useState<MessageType | null>(null);

  useEffect(() => {
    if (!conversationId || !socket) return;

    const handleJoin = () => {
      socket.emit("conversation:join", conversationId);
    };

    if (socket.connected) {
      handleJoin();
    }

    socket.on("connect", handleJoin);

    return () => {
      socket.off("connect", handleJoin);
      socket.emit("conversation:leave", conversationId);
    };
  }, [conversationId, socket]);

  if (
    isSingleConversationLoading ||
    (conversation && conversation._id !== conversationId)
  ) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="size-11 text-primary!" />
      </div>
    );
  }

  if (!conversation || conversation._id !== conversationId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-lg">Conversation not found</p>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen flex-col overflow-hidden">
      <ConversationHeader
        conversation={conversation}
        currentUserId={currentUserId}
      />

      {isArrayEmpty(messages) ? (
        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-background">
          <EmptyState
            title="Start a conversation"
            description="No messages yet. Send the first message"
          />
        </div>
      ) : (
        <ConversationBody
          conversationId={conversationId}
          messages={messages}
          onReply={setReplyTo}
          isSendingMsg={isSendingMsg}
          hasMore={hasMore}
          isFetchingMore={isFetchingMore}
          fetchMoreMessages={fetchMoreMessages}
        />
      )}

      <ConversationFooter
        replyTo={replyTo}
        conversationId={conversationId}
        currentUserId={currentUserId}
        isAiConversation={isAiConversation}
        onCancelReply={() => setReplyTo(null)}
      />
    </div>
  );
};

export default SingleConversation;
