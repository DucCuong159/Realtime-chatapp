import { Button } from "@/components/ui/button";
import { useCall } from "@/hooks/use-call";
import { formatConversationTime, formatDuration } from "@/lib/utils";
import type { MessageType } from "@/types/conversation.type";
import { Phone, PhoneMissed } from "lucide-react";
import { memo } from "react";

interface CallMessageItemProps {
  message: MessageType;
  currentUserId: string | null;
}

const CallMessageItem = ({ message, currentUserId }: CallMessageItemProps) => {
  const isCurrentUser = message.sender?._id === currentUserId;
  const isCompleted = message.callInfo?.status === "completed";
  const isMissed =
    !isCompleted &&
    (message.callInfo?.status === "missed" ||
      message.callInfo?.status === "declined" ||
      message.callInfo?.status === "busy" ||
      !message.callInfo?.duration);

  const callStatus = message.callInfo?.status;
  const title = isMissed
    ? callStatus === "declined"
      ? "Declined audio call"
      : callStatus === "busy"
        ? "Busy audio call"
        : "Missed audio call"
    : "Audio call";
  const subtitle = isMissed
    ? formatConversationTime(message.createdAt)
    : formatDuration(message.callInfo?.duration);

  const handleCallBack = () => {
    const targetUser = isCurrentUser ? null : message.sender;
    if (targetUser) {
      useCall.getState().initiateCall(
        {
          _id: targetUser._id,
          name: targetUser.name,
          avatar: targetUser.avatar,
        },
        message.conversationId,
      );
    }
  };

  return (
    <div className="flex flex-col w-56 rounded-2xl bg-card text-card-foreground p-3 shadow-xs border border-border/80 dark:bg-[#282828] dark:text-white dark:border-white/5 select-none transition-colors">
      {/* Top Info */}
      <div className="flex items-center gap-3">
        <div
          className={`size-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${
            isMissed
              ? "bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400"
              : "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
          }`}
        >
          {isMissed ? (
            <PhoneMissed className="size-5" />
          ) : (
            <Phone className="size-5" />
          )}
        </div>

        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold tracking-tight text-foreground dark:text-white/95 truncate">
            {title}
          </span>
          <span className="text-xs text-muted-foreground dark:text-white/60 truncate">
            {subtitle}
          </span>
        </div>
      </div>

      {/* Callback Action Button */}
      {!isCurrentUser && (
        <Button
          type="button"
          variant="ghost"
          className="mt-2.5 w-full h-9 rounded-xl bg-black/5 hover:bg-black/10 text-foreground dark:bg-white/10 dark:hover:bg-white/20 dark:text-white text-sm font-medium transition-colors border border-black/5 dark:border-white/5"
          onClick={handleCallBack}
        >
          Call back
        </Button>
      )}
    </div>
  );
};

export default memo(CallMessageItem);
