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
          "group relative flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium shadow-xs transition-all hover:border-primary/50 hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer",
          open && "border-primary bg-accent ring-2 ring-primary/20",
        )}
        aria-label="Select AI model"
      >
        {/* Status Indicator Dot */}
        <span className="relative flex size-2 shrink-0">
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

        <div className="flex items-center gap-1.5 min-w-0">
          <Sparkles className="size-3.5 text-primary shrink-0" />
          <span className="max-w-30 truncate font-semibold text-foreground sm:max-w-40">
            {activeModel.name}
          </span>
        </div>

        {activeModel.latencyMs && activeModel.status === "ready" && (
          <span className="hidden items-center gap-0.5 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 sm:inline-flex">
            <Zap className="size-2.5" />
            {(activeModel.latencyMs / 1000).toFixed(1)}s
          </span>
        )}

        {activeModel.status === "quota_exceeded" && (
          <span className="rounded-full bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600 dark:text-rose-400">
            Quota Exceeded
          </span>
        )}

        <ChevronDown
          className={cn(
            "size-3.5 text-muted-foreground transition-transform duration-200 group-hover:text-foreground shrink-0",
            open && "rotate-180 text-primary",
          )}
        />
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-85 sm:w-95 rounded-2xl border border-border bg-background p-0 shadow-2xl z-50 overflow-hidden"
      >
        {/* Popover Header */}
        <div className="flex items-center justify-between border-b border-border/80 bg-muted/40 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Bot className="size-4.5" />
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
            className="size-7 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
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
        <div className="max-h-85 overflow-y-auto p-2 space-y-1.5">
          {isLoading && models.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <Spinner className="size-6 text-primary mb-2" />
              <p className="text-xs">Checking AI models quota status...</p>
            </div>
          ) : models.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
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
                      ? "bg-primary/10 border border-primary/40 shadow-xs"
                      : isQuotaExceeded
                        ? "opacity-50 bg-muted/20 cursor-not-allowed border border-transparent"
                        : "hover:bg-accent/70 border border-transparent cursor-pointer",
                  )}
                >
                  <div className="flex items-start gap-2.5 min-w-0 pr-2">
                    {/* Status Dot */}
                    <div className="mt-1 flex shrink-0">
                      {isReady ? (
                        <span className="size-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
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
                            className="h-4 px-1.5 text-[9px] font-bold bg-primary text-primary-foreground rounded-full"
                          >
                            Active
                          </Badge>
                        )}
                      </div>

                      <p className="truncate text-[10px] text-muted-foreground font-mono mt-0.5">
                        {model.id}
                      </p>

                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span className="rounded bg-muted/80 px-1.5 py-0.5 font-medium">
                          In: {formatTokenNum(model.inputTokenLimit)}
                        </span>
                        <span className="rounded bg-muted/80 px-1.5 py-0.5 font-medium">
                          Out: {formatTokenNum(model.outputTokenLimit)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    {/* Badge Status */}
                    {isReady ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {model.latencyMs
                          ? `⚡ ${(model.latencyMs / 1000).toFixed(1)}s`
                          : "🟢 Ready"}
                      </span>
                    ) : isQuotaExceeded ? (
                      <span className="inline-flex items-center rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-600 dark:text-rose-400 border border-rose-500/20">
                        🔴 429 Limit
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        🟡 {model.note}
                      </span>
                    )}

                    {isSelected && (
                      <div className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs">
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
        <div className="flex items-center gap-1.5 border-t border-border/80 bg-muted/30 px-3.5 py-2.5 text-[10px] text-muted-foreground">
          <Info className="size-3.5 shrink-0 text-muted-foreground/80" />
          <span>Google Gemini Free Tier (20 RPD) • Resets daily</span>
        </div>
      </PopoverContent>
    </Popover>
  );
});

AiModelSelector.displayName = "AiModelSelector";
