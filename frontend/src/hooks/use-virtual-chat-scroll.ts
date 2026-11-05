import {
  calculateInitialFirstItemIndex,
  calculatePrependedFirstItemIndex,
  findMessageIndexById,
  isPrependedUpdate,
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
}

export interface UseVirtualChatScrollReturn {
  virtuosoRef: React.RefObject<VirtuosoHandle | null>;
  scrollerRef: (element: HTMLElement | Window | null) => void;
  firstItemIndex: number;
  showScrollToBottom: boolean;
  highlightedId: string | null;
  handleStartReached: () => void;
  handleAtBottomStateChange: (atBottom: boolean) => void;
  scrollToBottom: () => void;
  scrollToItemById: (targetId: string) => boolean;
}

/**
 * Reusable Virtual Chat Scroll Engine.
 * Manages reverse-scroll indexing (firstItemIndex), seamless prepending without jump,
 * smooth bottom-sticking, and target item jump/highlighting.
 */
export function useVirtualChatScroll<T extends { _id: string }>({
  items,
  conversationId,
  hasMore,
  isLoadingMore,
  onLoadMore,
  highlightDurationMs = 2000,
  isStreaming = false,
}: UseVirtualChatScrollOptions<T>): UseVirtualChatScrollReturn {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const scrollerElementRef = useRef<HTMLElement | null>(null);

  const scrollerRef = useCallback((element: HTMLElement | Window | null) => {
    scrollerElementRef.current =
      element instanceof HTMLElement ? element : null;
  }, []);

  const [firstItemIndex, setFirstItemIndex] = useState(() =>
    calculateInitialFirstItemIndex(items.length),
  );
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const prevConversationIdRef = useRef<string>(conversationId);
  const prevFirstItemIdRef = useRef<string | undefined>(items[0]?._id);
  const prevItemsLengthRef = useRef<number>(items.length);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snapTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearSnapTimers = useCallback(() => {
    snapTimersRef.current.forEach(clearTimeout);
    snapTimersRef.current = [];
  }, []);

  const snapScrollerToBottom = useCallback(() => {
    if (scrollerElementRef.current) {
      scrollerElementRef.current.scrollTop =
        scrollerElementRef.current.scrollHeight;
    }
    virtuosoRef.current?.autoscrollToBottom();
  }, []);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
      clearSnapTimers();
    };
  }, [clearSnapTimers]);

  // Reset state and base index when switching conversations
  useEffect(() => {
    if (prevConversationIdRef.current !== conversationId) {
      prevConversationIdRef.current = conversationId;
      prevFirstItemIdRef.current = items[0]?._id;
      prevItemsLengthRef.current = items.length;
      setFirstItemIndex(calculateInitialFirstItemIndex(items.length));
      setShowScrollToBottom(false);
      setHighlightedId(null);

      // On conversation switch, snap to absolute bottom once mounted
      requestAnimationFrame(() => {
        snapScrollerToBottom();
        virtuosoRef.current?.scrollToIndex({
          index: "LAST",
          align: "end",
          behavior: "auto",
        });
      });
    }
  }, [conversationId, items, snapScrollerToBottom]);

  // Adjust firstItemIndex when older items are prepended to the top
  useEffect(() => {
    const currentFirstId = items[0]?._id;
    const prevFirstId = prevFirstItemIdRef.current;
    const prevLength = prevItemsLengthRef.current;

    if (
      isPrependedUpdate(currentFirstId, prevFirstId, items.length, prevLength)
    ) {
      const prependedCount = items.length - prevLength;
      setFirstItemIndex((prev) =>
        calculatePrependedFirstItemIndex(prev, prependedCount),
      );
    }

    prevFirstItemIdRef.current = currentFirstId;
    prevItemsLengthRef.current = items.length;
  }, [items]);

  const handleStartReached = useCallback(() => {
    if (hasMore && !isLoadingMore && onLoadMore) {
      void onLoadMore();
    }
  }, [hasMore, isLoadingMore, onLoadMore]);

  const handleAtBottomStateChange = useCallback((atBottom: boolean) => {
    setShowScrollToBottom(!atBottom);
  }, []);

  const scrollToBottom = useCallback(() => {
    if (!virtuosoRef.current) return;
    clearSnapTimers();

    const behavior = isStreaming ? "auto" : "smooth";

    // 1. Tell Virtuoso to align to the LAST item
    virtuosoRef.current.scrollToIndex({
      index: "LAST",
      align: "end",
      behavior,
    });

    // 2. Also scroll native scroller towards true DOM bottom
    if (scrollerElementRef.current) {
      scrollerElementRef.current.scrollTo({
        top: scrollerElementRef.current.scrollHeight,
        behavior,
      });
    }

    virtuosoRef.current.autoscrollToBottom();

    // 3. Multi-frame check to guarantee landing on absolute DOM bottom
    requestAnimationFrame(snapScrollerToBottom);
    snapTimersRef.current = [100, 300, 600].map((delay) =>
      setTimeout(snapScrollerToBottom, delay),
    );

    setShowScrollToBottom(false);
  }, [isStreaming, clearSnapTimers, snapScrollerToBottom]);

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
        if (highlightTimeoutRef.current) {
          clearTimeout(highlightTimeoutRef.current);
        }
        highlightTimeoutRef.current = setTimeout(() => {
          setHighlightedId(null);
        }, highlightDurationMs);
        return true;
      }
      return false;
    },
    [items, highlightDurationMs],
  );

  return {
    virtuosoRef,
    scrollerRef,
    firstItemIndex,
    showScrollToBottom,
    highlightedId,
    handleStartReached,
    handleAtBottomStateChange,
    scrollToBottom,
    scrollToItemById,
  };
}
