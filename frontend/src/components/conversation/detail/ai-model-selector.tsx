import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { useAiModels } from "@/hooks/use-ai-models";
import { cn } from "@/lib/utils";
import type { AIModelInfo } from "@/types/ai.type";
import {
  Bot,
  Check,
  ChevronDown,
  Info,
  RefreshCw,
  Sparkles,
  Zap,
} from "lucide-react";
import { memo, useEffect, useState } from "react";

const formatTokenNum = (tokens?: number) => {
  if (!tokens) return "-";
  if (tokens >= 1_000_000) {
    const m = tokens / 1_000_000;
    return Number.isInteger(m) ? `${m}M` : `${m.toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    const k = tokens / 1_000;
    return Number.isInteger(k) ? `${k}K` : `${k.toFixed(1)}K`;
  }
  return `${tokens}`;
};

export const AiModelSelector = memo(() => {
  const {
    models,
    selectedModelId,
    isLoading,
    isRefreshing,
    fetchAiModels,
    setSelectedModelId,
    getSelectedModel,
  } = useAiModels();

  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchAiModels();
  }, [fetchAiModels]);

  const activeModel =
    getSelectedModel() ||
    ({
      id: selectedModelId,
      name: selectedModelId,
      status: "ready",
      statusBadge: "🟢 Ready",
      note: "Ready",
      isAvailable: true,
    } as AIModelInfo);

  const handleSelect = (model: AIModelInfo) => {
    if (!model.isAvailable) {
      return;
    }
    setSelectedModelId(model.id);
    setOpen(false);
  };

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    fetchAiModels(true);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        className={cn(
          "group relative flex items-center gap-2 rounded-full border border-border/80 bg-background/90 px-3 py-1.5 text-xs font-medium shadow-xs transition-all hover:border-primary/50 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer",
          open && "border-primary/60 bg-accent/50 ring-2 ring-primary/20",
        )}
        aria-label="Select AI model"
      >
        {/* Status Indicator Dot */}
        <span className="relative flex size-2">
          {activeModel.status === "ready" ? (
            <>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </>
          ) : activeModel.status === "quota_exceeded" ? (
            <span className="relative inline-flex size-2 rounded-full bg-rose-500" />
          ) : (
            <span className="relative inline-flex size-2 rounded-full bg-amber-500" />
          )}
        </span>

        <div className="flex items-center gap-1.5">
          <Sparkles className="size-3.5 text-primary" />
          <span className="max-w-32.5 truncate font-semibold text-foreground sm:max-w-42.5">
            {activeModel.name}
          </span>
        </div>

        {activeModel.latencyMs && activeModel.status === "ready" && (
          <span className="hidden items-center gap-0.5 rounded-full bg-emerald-500/10 px-1.5 py-0.2 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 sm:inline-flex">
            <Zap className="size-2.5" />
            {(activeModel.latencyMs / 1000).toFixed(1)}s
          </span>
        )}

        {activeModel.status === "quota_exceeded" && (
          <span className="rounded-full bg-rose-500/10 px-1.5 py-0.2 text-[10px] font-semibold text-rose-600 dark:text-rose-400">
            Quota Exceeded
          </span>
        )}

        <ChevronDown
          className={cn(
            "size-3.5 text-muted-foreground transition-transform duration-200 group-hover:text-foreground",
            open && "rotate-180 text-primary",
          )}
        />
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 rounded-2xl border-border/80 bg-card/95 p-0 shadow-2xl backdrop-blur-md sm:w-96"
      >
        {/* Popover Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3 bg-muted/30">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Bot className="size-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-foreground">
                AI Assistant Models
              </h4>
              <p className="text-[11px] text-muted-foreground">
                Select the optimal Gemini model for this chat
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon-xs"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="size-7 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
            title="Refresh quota status"
          >
            <RefreshCw
              className={cn(
                "size-3.5",
                (isRefreshing || isLoading) && "animate-spin text-primary",
              )}
            />
          </Button>
        </div>

        {/* Models List */}
        <div className="max-h-85 overflow-y-auto p-2 space-y-1">
          {isLoading && models.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <Spinner className="size-6 text-primary mb-2" />
              <p className="text-xs">Checking AI models quota status...</p>
            </div>
          ) : models.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              No supported AI models found.
            </div>
          ) : (
            models.map((model) => {
              const isSelected = model.id === selectedModelId;
              const isReady = model.status === "ready";
              const isQuotaExceeded = model.status === "quota_exceeded";

              return (
                <button
                  type="button"
                  key={model.id}
                  disabled={!model.isAvailable}
                  onClick={() => handleSelect(model)}
                  className={cn(
                    "group relative flex w-full items-start justify-between rounded-xl p-2.5 text-left transition-all",
                    isSelected
                      ? "bg-primary/10 border border-primary/30"
                      : isQuotaExceeded
                        ? "opacity-60 bg-muted/20 hover:bg-muted/40 cursor-not-allowed"
                        : "hover:bg-accent/60 border border-transparent cursor-pointer",
                  )}
                >
                  <div className="flex items-start gap-2.5 min-w-0 pr-2">
                    {/* Status Dot */}
                    <div className="mt-1 flex shrink-0">
                      {isReady ? (
                        <span className="size-2 rounded-full bg-emerald-500" />
                      ) : isQuotaExceeded ? (
                        <span className="size-2 rounded-full bg-rose-500" />
                      ) : (
                        <span className="size-2 rounded-full bg-amber-500" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-xs font-semibold text-foreground">
                          {model.name}
                        </span>
                        {isSelected && (
                          <Badge
                            variant="default"
                            className="h-4 px-1.5 text-[9px] font-bold bg-primary text-primary-foreground"
                          >
                            Active
                          </Badge>
                        )}
                      </div>

                      <p className="truncate text-[11px] text-muted-foreground font-mono">
                        {model.id}
                      </p>

                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span className="rounded bg-muted px-1.5 py-0.5">
                          In: {formatTokenNum(model.inputTokenLimit)}
                        </span>
                        <span className="rounded bg-muted px-1.5 py-0.5">
                          Out: {formatTokenNum(model.outputTokenLimit)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    {/* Badge Status */}
                    {isReady ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                        {model.latencyMs
                          ? `⚡ ${(model.latencyMs / 1000).toFixed(1)}s`
                          : "🟢 Ready"}
                      </span>
                    ) : isQuotaExceeded ? (
                      <span className="inline-flex items-center rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                        🔴 Quota Exceeded (429)
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                        🟡 {model.note}
                      </span>
                    )}

                    {isSelected && (
                      <div className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="size-3 stroke-3" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Popover Footer Info */}
        <div className="flex items-center gap-1.5 border-t border-border/60 bg-muted/20 px-3.5 py-2 text-[10px] text-muted-foreground">
          <Info className="size-3.5 shrink-0 text-muted-foreground/80" />
          <span>Google Gemini Free Tier (20 RPD) • Resets daily</span>
        </div>
      </PopoverContent>
    </Popover>
  );
});

AiModelSelector.displayName = "AiModelSelector";
