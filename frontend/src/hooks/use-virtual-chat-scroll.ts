import {
  calculateInitialFirstItemIndex,
  calculatePrependedFirstItemIndex,
  findMessageIndexById,
  getScrollBehaviorOnAppend,
  isPrependedUpdate,
  shouldAutoScrollOnAppend,
} from "@/lib/virtual-scroll.utils";
import { useCallback, useEffect, useRef, useState } from "react";
import type { VirtuosoHandle } from "react-virtuoso";

export interface UseVirtualChatScrollOptions<T extends { _id: string }> {
  items: T[];
  conversationId: string;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void | Promise<unknown>;
  highlightDurationMs?: number;
  isStreaming?: boolean;
  isOutgoingItem?: (item: T) => boolean;
}

export interface UseVirtualChatScrollReturn {
  virtuosoRef: React.RefObject<VirtuosoHandle | null>;
  firstItemIndex: number;
  showScrollToBottom: boolean;
  highlightedId: string | null;
  handleStartReached: () => void;
  handleAtBottomStateChange: (atBottom: boolean) => void;
  scrollToBottom: (behavior?: "auto" | "smooth") => void;
  scrollToItemById: (targetId: string) => boolean;
}

interface ItemSnapshot {
  conversationId: string;
  firstId: string | undefined;
  length: number;
}

/**
 * Lightweight Virtual Chat Scroll Engine.
 * Manages reverse-scroll indexing during render, reply jump, and auto-follow.
 */
export function useVirtualChatScroll<T extends { _id: string }>({
  items,
  conversationId,
  hasMore,
  isLoadingMore,
  onLoadMore,
  highlightDurationMs = 2000,
  isStreaming = false,
  isOutgoingItem,
}: UseVirtualChatScrollOptions<T>): UseVirtualChatScrollReturn {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const isAtBottomRef = useRef(true);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [firstItemIndex, setFirstItemIndex] = useState(() =>
    calculateInitialFirstItemIndex(items.length),
  );
  const [snapshot, setSnapshot] = useState<ItemSnapshot>(() => ({
    conversationId,
    firstId: items[0]?._id,
    length: items.length,
  }));
  const prevRef = useRef<ItemSnapshot>({
    conversationId,
    firstId: items[0]?._id,
    length: items.length,
  });

  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // Adjust firstItemIndex during render so Virtuoso never renders with stale offsets
  const currentFirstId = items[0]?._id;
  const isSwitch = snapshot.conversationId !== conversationId;
  const isPrepend =
    !isSwitch &&
    isPrependedUpdate(
      currentFirstId,
      snapshot.firstId,
      items.length,
      snapshot.length,
    );
  const isChanged =
    isSwitch ||
    isPrepend ||
    items.length !== snapshot.length ||
    currentFirstId !== snapshot.firstId;

  if (isChanged) {
    setSnapshot({
      conversationId,
      firstId: currentFirstId,
      length: items.length,
    });
    if (isSwitch) {
      setFirstItemIndex(calculateInitialFirstItemIndex(items.length));
    } else if (isPrepend) {
      setFirstItemIndex((prev) =>
        calculatePrependedFirstItemIndex(
          prev,
          items.length - snapshot.length,
        ),
      );
    }
  }

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, []);

  const scrollToBottom = useCallback(
    (behavior: "auto" | "smooth" = "smooth") => {
      virtuosoRef.current?.scrollToIndex({
        index: "LAST",
        align: "end",
        behavior: isStreaming ? "auto" : behavior,
      });
      setShowScrollToBottom(false);
    },
    [isStreaming],
  );

  const handleStartReached = useCallback(() => {
    if (hasMore && !isLoadingMore && onLoadMore) void onLoadMore();
  }, [hasMore, isLoadingMore, onLoadMore]);

  const handleAtBottomStateChange = useCallback((atBottom: boolean) => {
    isAtBottomRef.current = atBottom;
    setShowScrollToBottom(!atBottom);
  }, []);

  const scrollToItemById = useCallback(
    (targetId: string): boolean => {
      const index = findMessageIndexById(items, targetId);
      if (index === -1 || !virtuosoRef.current) return false;

      virtuosoRef.current.scrollToIndex({
        index,
        align: "center",
        behavior: "auto",
      });
      setHighlightedId(targetId);
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = setTimeout(
        () => setHighlightedId(null),
        highlightDurationMs,
      );
      return true;
    },
    [items, highlightDurationMs],
  );

  // Scroll side-effects for conversation changes and new messages
  useEffect(() => {
    const prev = prevRef.current;
    const currentFirst = items[0]?._id;
    const currentLen = items.length;

    if (prev.conversationId !== conversationId) {
      isAtBottomRef.current = true;
      setShowScrollToBottom(false);
      setHighlightedId(null);
      scrollToBottom("auto");
    } else if (
      !isPrependedUpdate(
        currentFirst,
        prev.firstId,
        currentLen,
        prev.length,
      ) &&
      currentLen > prev.length
    ) {
      const isOutgoing = Boolean(
        items[currentLen - 1] && isOutgoingItem?.(items[currentLen - 1]),
      );
      if (shouldAutoScrollOnAppend(isOutgoing, isAtBottomRef.current)) {
        scrollToBottom(
          getScrollBehaviorOnAppend(
            isOutgoing,
            isAtBottomRef.current,
            isStreaming,
          ),
        );
      }
    }

    prevRef.current = {
      conversationId,
      firstId: currentFirst,
      length: currentLen,
    };
  }, [items, conversationId, isOutgoingItem, isStreaming, scrollToBottom]);

  return {
    virtuosoRef,
    firstItemIndex,
    showScrollToBottom,
    highlightedId,
    handleStartReached,
    handleAtBottomStateChange,
    scrollToBottom,
    scrollToItemById,
  };
}
