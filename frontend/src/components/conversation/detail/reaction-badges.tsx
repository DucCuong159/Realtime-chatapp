import { groupReactions, type MessageReactionType } from "@/lib/reaction.utils";
import { cn } from "@/lib/utils";
import { memo, useMemo } from "react";

interface ReactionBadgesProps {
  reactions?: MessageReactionType[];
  currentUserId: string | null;
  onToggleReaction: (emoji: string) => void;
}

const ReactionBadges = memo(
  ({
    reactions,
    currentUserId,
    onToggleReaction,
  }: ReactionBadgesProps) => {
    const groupedReactions = useMemo(
      () => groupReactions(reactions, currentUserId),
      [reactions, currentUserId],
    );

    if (groupedReactions.length === 0) return null;

    return (
      <div className="flex flex-wrap items-center justify-end gap-1 -mt-2.5 z-10 mr-1 self-end">
        {groupedReactions.map((reaction) => (
          <button
            key={reaction.emoji}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleReaction(reaction.emoji);
            }}
            title={reaction.tooltipText}
            className={cn(
              "relative group/reaction inline-flex items-center justify-center size-6 rounded-full border shadow-xs transition-all cursor-pointer select-none",
              reaction.hasReacted
                ? "bg-[#e8f0fe] text-primary border-primary/50 ring-1 ring-primary/25 hover:bg-[#dde8fd] dark:bg-[#1f2839] dark:text-blue-400 dark:border-primary/60 dark:ring-1 dark:ring-primary/40 dark:hover:bg-[#253248]"
                : "bg-white text-neutral-800 border-neutral-200/90 hover:bg-neutral-50 dark:bg-[#2c2d30] dark:text-neutral-200 dark:border-neutral-700/80 dark:hover:bg-[#36373b]",
            )}
            aria-label={`Reaction ${reaction.emoji}. ${reaction.tooltipText}`}
          >
            <span className="leading-none select-none text-[13px]">{reaction.emoji}</span>

            {/* Hover Tooltip displaying who reacted */}
            <div className="pointer-events-none absolute bottom-full mb-1.5 right-0 hidden group-hover/reaction:flex flex-col items-end z-30 min-w-max">
              <div className="rounded-md bg-popover px-2 py-1 text-[11px] font-medium text-popover-foreground shadow-md border border-border/80 whitespace-nowrap">
                {reaction.tooltipText}
              </div>
              <div className="w-2 h-1 border-t-4 border-t-popover border-x-4 border-x-transparent mr-2" />
            </div>
          </button>
        ))}
      </div>
    );
  },
);

ReactionBadges.displayName = "ReactionBadges";

export default ReactionBadges;
