import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ALLOWED_REACTION_EMOJIS } from "@/lib/reaction.utils";
import { cn } from "@/lib/utils";
import { Reply, Smile } from "lucide-react";
import { memo } from "react";

interface MessageActionsProps {
  formattedTime: string;
  onReply: () => void;
  onToggleReaction: (emoji: string) => void;
  isPickerOpen: boolean;
  setIsPickerOpen: (open: boolean) => void;
  disabled: boolean;
  side: "left" | "right";
  currentUserReaction?: string;
}

const MessageActions = memo(
  ({
    formattedTime,
    onReply,
    onToggleReaction,
    isPickerOpen,
    setIsPickerOpen,
    disabled,
    side,
    currentUserReaction,
  }: MessageActionsProps) => {
    const replyButton = (
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={onReply}
        disabled={disabled}
        className="opacity-0 group-hover:opacity-100 transition-opacity rounded-full size-7 shrink-0 self-center text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-0"
        aria-label="Reply"
      >
        <Reply className={cn("size-3.5", side === "right" && "scale-x-[-1]")} />
      </Button>
    );

    const reactionPopover = (
      <Popover open={isPickerOpen} onOpenChange={setIsPickerOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="ghost"
              size="icon-xs"
              disabled={disabled}
              onMouseEnter={() => {
                if (!disabled) setIsPickerOpen(true);
              }}
              className="opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 transition-opacity rounded-full size-7 shrink-0 self-center text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-0 cursor-pointer"
              aria-label="React with emoji"
            />
          }
        >
          <Smile className="size-3.5" />
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align={side === "right" ? "end" : "start"}
          sideOffset={6}
          initialFocus={false}
          finalFocus={false}
          className="z-50 flex flex-row items-center gap-0.5 p-1 bg-popover border border-border shadow-md rounded-full w-auto"
        >
          {ALLOWED_REACTION_EMOJIS.map((emoji) => {
            const isCurrent = emoji === currentUserReaction;
            return (
              <button
                key={emoji}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleReaction(emoji);
                  setIsPickerOpen(false);
                }}
                className={cn(
                  "flex items-center justify-center size-8 rounded-full text-lg hover:scale-125 active:scale-95 transition-all cursor-pointer select-none",
                  isCurrent
                    ? "bg-primary/20 ring-1.5 ring-primary scale-110 shadow-xs"
                    : "hover:bg-muted/80",
                )}
                title={isCurrent ? `Remove ${emoji}` : `React with ${emoji}`}
                aria-label={isCurrent ? `Remove ${emoji}` : `React with ${emoji}`}
              >
                {emoji}
              </button>
            );
          })}
        </PopoverContent>
      </Popover>
    );

    const timeLabel = (
      <span className="text-[11px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity select-none self-center shrink-0">
        {formattedTime}
      </span>
    );

    if (side === "right") {
      return (
        <>
          {timeLabel}
          {replyButton}
          {reactionPopover}
        </>
      );
    }

    return (
      <>
        {reactionPopover}
        {replyButton}
        {timeLabel}
      </>
    );
  },
);

MessageActions.displayName = "MessageActions";

export default MessageActions;
