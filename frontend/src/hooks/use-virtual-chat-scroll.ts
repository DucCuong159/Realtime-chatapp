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
  scrollerRef: (element: HTMLElement | Window | null) => void;
  firstItemIndex: number;
  showScrollToBottom: boolean;
  highlightedId: string | null;
  handleStartReached: () => void;
  handleAtBottomStateChange: (atBottom: boolean) => void;
  scrollToBottom: (behavior?: "auto" | "smooth") => void;
  scrollToItemById: (targetId: string) => boolean;
}

/**
 * Reusable Virtual Chat Scroll Engine.
 * Manages reverse-scroll indexing (firstItemIndex), seamless prepending without jump,
 * smooth bottom-sticking, target item jump/highlighting, and robust auto-follow
 * for outgoing and incoming messages.
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
  const prevLastItemIdRef = useRef<string | undefined>(
    items[items.length - 1]?._id,
  );
  const prevItemsLengthRef = useRef<number>(items.length);
  const isAtBottomRef = useRef<boolean>(true);
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

  // Snap to absolute bottom once mounted on initial load
  useEffect(() => {
    requestAnimationFrame(() => {
      snapScrollerToBottom();
    });
  }, [snapScrollerToBottom]);

  // Reset state and base index when switching conversations
  useEffect(() => {
    if (prevConversationIdRef.current !== conversationId) {
      prevConversationIdRef.current = conversationId;
      prevFirstItemIdRef.current = items[0]?._id;
      prevLastItemIdRef.current = items[items.length - 1]?._id;
      prevItemsLengthRef.current = items.length;
      isAtBottomRef.current = true;
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

  const handleStartReached = useCallback(() => {
    if (hasMore && !isLoadingMore && onLoadMore) {
      void onLoadMore();
    }
  }, [hasMore, isLoadingMore, onLoadMore]);

  const handleAtBottomStateChange = useCallback((atBottom: boolean) => {
    isAtBottomRef.current = atBottom;
    setShowScrollToBottom(!atBottom);
  }, []);

  const scrollToBottom = useCallback(
    (behaviorOverride?: "auto" | "smooth") => {
      if (!virtuosoRef.current) return;
      clearSnapTimers();

      const behavior =
        behaviorOverride ?? (isStreaming ? "auto" : "smooth");

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
      if (behavior === "smooth") {
        snapTimersRef.current = [250, 400, 600].map((delay) =>
          setTimeout(snapScrollerToBottom, delay),
        );
      } else {
        requestAnimationFrame(snapScrollerToBottom);
        snapTimersRef.current = [50, 150, 300].map((delay) =>
          setTimeout(snapScrollerToBottom, delay),
        );
      }

      setShowScrollToBottom(false);
    },
    [isStreaming, clearSnapTimers, snapScrollerToBottom],
  );

  // Handle prepend pagination and auto-scrolling on newly appended items
  useEffect(() => {
    // If conversation changed, handled by conversationId effect
    if (prevConversationIdRef.current !== conversationId) return;

    const currentFirstId = items[0]?._id;
    const prevFirstId = prevFirstItemIdRef.current;
    const prevLength = prevItemsLengthRef.current;
    const currentLength = items.length;

    if (
      isPrependedUpdate(currentFirstId, prevFirstId, currentLength, prevLength)
    ) {
      const prependedCount = currentLength - prevLength;
      setFirstItemIndex((prev) =>
        calculatePrependedFirstItemIndex(prev, prependedCount),
      );
    } else if (currentLength > prevLength) {
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
    } else if (currentLength === prevLength && currentLength > 0) {
      const lastItem = items[currentLength - 1];
      const prevLastId = prevLastItemIdRef.current;
      const isOutgoing = Boolean(lastItem && isOutgoingItem?.(lastItem));

      // When the last outgoing item transitions (e.g. temp UUID replaced with server _id),
      // snap to bottom if user is at the bottom to accommodate rendered status height changes
      if (isOutgoing && isAtBottomRef.current && prevLastId !== lastItem?._id) {
        snapScrollerToBottom();
      }
    }

    prevFirstItemIdRef.current = currentFirstId;
    prevLastItemIdRef.current = items[currentLength - 1]?._id;
    prevItemsLengthRef.current = currentLength;
  }, [
    items,
    conversationId,
    isOutgoingItem,
    isStreaming,
    scrollToBottom,
    snapScrollerToBottom,
  ]);

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
