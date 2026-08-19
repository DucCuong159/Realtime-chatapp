import { useAuth } from "@/hooks/use-auth";
import { useConversation } from "@/hooks/use-conversation";
import { useSocket } from "@/hooks/use-socket";
import type { ConversationType, MessageType } from "@/types/conversation.type";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Spinner } from "../ui/spinner";
import ConversationListHeader from "./conversation-list-header";
import ConversationListItem from "./conversation-list-item";

const ConversationList = () => {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const {
    fetchConversations,
    conversations,
    isConversationsLoading,
    addNewConversation,
    updateConversationLastMessage,
  } = useConversation();
  const { user } = useAuth();
  const currentUserId = user?._id || null;

  const [searchQuery, setSearchQuery] = useState("");

  const filteredConversations =
    conversations?.filter(
      (conversation) =>
        conversation.groupName
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        conversation.participants?.some(
          (p) =>
            p._id !== currentUserId &&
            p.name?.toLowerCase().includes(searchQuery.toLowerCase()),
        ),
    ) || [];

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (!socket) return;

    const handleNewConversation = (newConversation: ConversationType) => {
      addNewConversation(newConversation);
    };

    socket.on("conversation:new", handleNewConversation);

    return () => {
      socket.off("conversation:new", handleNewConversation);
    };
  }, [addNewConversation, socket]);

  useEffect(() => {
    if (!socket) return;

    const handleConversationUpdate = (data: {
      conversationId: string;
      lastMessage: MessageType;
    }) => {
      updateConversationLastMessage(data.conversationId, data.lastMessage);
    };

    socket.on("conversation:updated", handleConversationUpdate);

    return () => {
      socket.off("conversation:updated", handleConversationUpdate);
    };
  }, [socket, updateConversationLastMessage]);

  const onRoute = (id: string) => {
    navigate(`/conversation/${id}`);
  };

  return (
    <aside className="fixed inset-y-0 left-14 flex w-full max-w-[calc(100%-56px)] flex-col border-r border-border bg-sidebar md:max-w-94.75">
      <ConversationListHeader onSearch={setSearchQuery} />

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="space-y-1 p-2">
          {isConversationsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="size-7" />
            </div>
          ) : filteredConversations?.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-center text-sm text-muted-foreground">
              {searchQuery
                ? "No conversation found"
                : "No conversations created"}
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <ConversationListItem
                key={conversation._id}
                conversation={conversation}
                currentUserId={currentUserId}
                onClick={() => onRoute(conversation._id)}
              />
            ))
          )}
        </div>
      </div>
    </aside>
  );
};

export default ConversationList;
