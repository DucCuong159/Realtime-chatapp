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

/**
 * Lightweight, idiomatic Virtual Chat Scroll Engine.
 * Manages reverse-scroll indexing, seamless pagination prepend,
 * reply target jump with highlight, and reliable auto-follow for messages.
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
  const prevLengthRef = useRef(items.length);
  const prevFirstIdRef = useRef<string | undefined>(items[0]?._id);
  const prevConvIdRef = useRef(conversationId);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [firstItemIndex, setFirstItemIndex] = useState(() =>
    calculateInitialFirstItemIndex(items.length),
  );
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // Clean up highlight timer on unmount
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
    if (hasMore && !isLoadingMore && onLoadMore) {
      void onLoadMore();
    }
  }, [hasMore, isLoadingMore, onLoadMore]);

  const handleAtBottomStateChange = useCallback((atBottom: boolean) => {
    isAtBottomRef.current = atBottom;
    setShowScrollToBottom(!atBottom);
  }, []);

  const scrollToItemById = useCallback(
    (targetId: string): boolean => {
      const targetIndex = findMessageIndexById(items, targetId);
      if (targetIndex !== -1 && virtuosoRef.current) {
        virtuosoRef.current.scrollToIndex({
          index: targetIndex,
          align: "center",
          behavior: "auto",
        });
        setHighlightedId(targetId);
        if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
        highlightTimerRef.current = setTimeout(() => {
          setHighlightedId(null);
        }, highlightDurationMs);
        return true;
      }
      return false;
    },
    [items, highlightDurationMs],
  );

  // Unified effect handling conversation switch, prepending, and appending
  useEffect(() => {
    // 1. Conversation switch: reset index and jump to bottom
    if (prevConvIdRef.current !== conversationId) {
      prevConvIdRef.current = conversationId;
      prevLengthRef.current = items.length;
      prevFirstIdRef.current = items[0]?._id;
      isAtBottomRef.current = true;
      setFirstItemIndex(calculateInitialFirstItemIndex(items.length));
      setShowScrollToBottom(false);
      setHighlightedId(null);
      scrollToBottom("auto");
      return;
    }

    const currentFirstId = items[0]?._id;
    const prevFirstId = prevFirstIdRef.current;
    const currentLength = items.length;
    const prevLength = prevLengthRef.current;

    // 2. Older messages prepended (pagination): adjust index without scroll jump
    if (
      isPrependedUpdate(currentFirstId, prevFirstId, currentLength, prevLength)
    ) {
      const prependedCount = currentLength - prevLength;
      setFirstItemIndex((prev) =>
        calculatePrependedFirstItemIndex(prev, prependedCount),
      );
    }
    // 3. New message appended: auto-scroll if outgoing or already at bottom
    else if (currentLength > prevLength) {
      const lastItem = items[currentLength - 1];
      const isOutgoing = Boolean(lastItem && isOutgoingItem?.(lastItem));

      if (shouldAutoScrollOnAppend(isOutgoing, isAtBottomRef.current)) {
        const behavior = getScrollBehaviorOnAppend(
          isOutgoing,
          isAtBottomRef.current,
          isStreaming,
        );
        scrollToBottom(behavior);
      }
    }

    prevFirstIdRef.current = currentFirstId;
    prevLengthRef.current = currentLength;
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
