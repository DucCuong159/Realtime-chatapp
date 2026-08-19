import { Button } from "@/components/ui/button";
import type { MessageType } from "@/types/conversation.type";
import { X } from "lucide-react";

interface Props {
  replyTo: MessageType | null;
  currentUserId: string | null;
  onCancel: () => void;
}

const ConversationReplyBar = ({ replyTo, currentUserId, onCancel }: Props) => {
  if (!replyTo) return null;

  const senderName =
    replyTo.sender?._id === currentUserId ? "You" : replyTo.sender?.name;
  return (
    <div className="absolute bottom-16 left-0 right-0 bg-card border-t border-border animate-in slide-in-from-bottom pb-4 px-6">
      <div className="flex flex-1 justify-between mt-2 p-3 text-sm border-l-4 border-l-primary bg-primary/10 rounded-md shadow-sm">
        <div className="flex-1 min-w-0">
          <h5 className="font-medium">{senderName}</h5>
          {replyTo?.image ? (
            <p className="text-muted-foreground">📷 Photo</p>
          ) : (
            <p className="truncate">{replyTo.content}</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onCancel}
          className="shrink-0 size-6"
        >
          <X size={14} />
        </Button>
      </div>
    </div>
  );
};

export default ConversationReplyBar;
