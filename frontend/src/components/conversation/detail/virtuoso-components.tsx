import { Spinner } from "@/components/ui/spinner";

export interface VirtuosoHeaderContext {
  hasMore: boolean;
  messagesLength: number;
  isFetchingMoreMessages: boolean;
}

export const VirtuosoHeader = ({
  context,
}: {
  context?: VirtuosoHeaderContext;
}) => {
  if (!context) return null;
  const { hasMore, messagesLength, isFetchingMoreMessages } = context;

  return (
    <div className="w-full select-none">
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

export const VirtuosoFooter = () => <div className="h-8 w-full shrink-0" />;
