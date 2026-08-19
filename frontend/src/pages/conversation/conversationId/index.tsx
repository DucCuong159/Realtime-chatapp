import ConversationBody from "@/components/conversation/detail/body";
import ConversationFooter from "@/components/conversation/detail/footer";
import ConversationHeader from "@/components/conversation/detail/header";
import EmptyState from "@/components/conversation/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/hooks/use-auth";
import { useConversation } from "@/hooks/use-conversation";
import useConversationId from "@/hooks/use-conversation-id";
import { useSocket } from "@/hooks/use-socket";
import { isArrayEmpty } from "@/lib/utils";
import type { MessageType } from "@/types/conversation.type";
import { useEffect, useState } from "react";

const SingleConversation = () => {
  const conversationId = useConversationId();
  const {
    fetchSingleConversation,
    isSingleConversationLoading,
    singleConversation,
    addNewMessage,
  } = useConversation();

  const { socket } = useSocket();
  const { user } = useAuth();

  const [replyTo, setReplyTo] = useState<MessageType | null>(null);

  const currentUserId = user?._id || null;
  const conversation = singleConversation?.conversation;
  const messages = singleConversation?.messages || [];

  useEffect(() => {
    if (!conversationId) return;
    fetchSingleConversation(conversationId);
  }, [fetchSingleConversation, conversationId]);

  useEffect(() => {
    if (!conversationId || !socket) return;
    socket.emit("conversation:join", conversationId);

    return () => {
      socket.emit("conversation:leave", conversationId);
    };
  }, [conversationId, socket]);

  useEffect(() => {
    if (!conversationId || !socket) return;

    const handleNewMessage = (msg: MessageType) =>
      addNewMessage(conversationId, msg);

    socket.on("message:new", handleNewMessage);
    return () => {
      socket.off("message:new", handleNewMessage);
    };
  }, [socket, conversationId, addNewMessage]);

  if (isSingleConversationLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="size-11 text-primary!" />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-lg">Conversation not found</p>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen flex-col">
      <ConversationHeader
        conversation={conversation}
        currentUserId={currentUserId}
      />

      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-background">
        {isArrayEmpty(messages) ? (
          <EmptyState
            title="Start a conversation"
            description="No messages yet. Send the first message"
          />
        ) : (
          <ConversationBody messages={messages} onReply={setReplyTo} />
        )}
      </div>

      <ConversationFooter
        replyTo={replyTo}
        conversationId={conversationId}
        currentUserId={currentUserId}
        onCancelReply={() => setReplyTo(null)}
      />
    </div>
  );
};

export default SingleConversation;
