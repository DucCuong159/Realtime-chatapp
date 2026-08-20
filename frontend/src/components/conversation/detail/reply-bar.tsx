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
    replyTo.sender?._id === currentUserId
      ? "You"
      : replyTo.sender?.name || "User";
  return (
    <div className="px-4 sm:px-6 pb-2.5 animate-in slide-in-from-bottom">
      <div className="flex flex-1 justify-between items-center p-2.5 text-sm border-l-4 border-l-primary bg-primary/10 rounded-md shadow-xs">
        <div className="flex-1 min-w-0 mr-2">
          <h5 className="font-medium text-xs text-primary">{senderName}</h5>
          {replyTo.image ? (
            <p className="text-muted-foreground text-xs">📷 Photo</p>
          ) : (
            <p className="truncate text-xs text-foreground/80">
              {replyTo.content}
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={onCancel}
          className="shrink-0 size-6 rounded-full hover:bg-primary/20 text-muted-foreground hover:text-foreground"
          aria-label="Cancel reply"
        >
          <X className="size-3.5" />
        </Button>
      </div>
    </div>
  );
};

export default ConversationReplyBar;
