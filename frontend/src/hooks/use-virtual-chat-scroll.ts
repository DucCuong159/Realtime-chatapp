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

interface VirtualItemsSnapshot {
  conversationId: string;
  firstId: string | undefined;
  length: number;
}

/**
 * Lightweight, idiomatic Virtual Chat Scroll Engine.
 * Manages reverse-scroll indexing, seamless pagination prepend during render,
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
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [firstItemIndex, setFirstItemIndex] = useState(() =>
    calculateInitialFirstItemIndex(items.length),
  );
  const [itemsSnapshot, setItemsSnapshot] = useState<VirtualItemsSnapshot>(
    () => ({
      conversationId,
      firstId: items[0]?._id,
      length: items.length,
    }),
  );
  const prevEffectSnapshotRef = useRef<VirtualItemsSnapshot>({
    conversationId,
    firstId: items[0]?._id,
    length: items.length,
  });

  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const currentFirstId = items[0]?._id;
  const isConversationSwitch = itemsSnapshot.conversationId !== conversationId;
  const isPrepend =
    !isConversationSwitch &&
    isPrependedUpdate(
      currentFirstId,
      itemsSnapshot.firstId,
      items.length,
      itemsSnapshot.length,
    );

  // Detect conversation switches or prepended messages during render
  // and adjust firstItemIndex before Virtuoso receives the updated items.
  if (isConversationSwitch) {
    setItemsSnapshot({
      conversationId,
      firstId: currentFirstId,
      length: items.length,
    });
    setFirstItemIndex(calculateInitialFirstItemIndex(items.length));
  } else if (isPrepend) {
    const prependedCount = items.length - itemsSnapshot.length;
    setItemsSnapshot({
      conversationId,
      firstId: currentFirstId,
      length: items.length,
    });
    setFirstItemIndex((prev) =>
      calculatePrependedFirstItemIndex(prev, prependedCount),
    );
  } else if (
    items.length !== itemsSnapshot.length ||
    currentFirstId !== itemsSnapshot.firstId
  ) {
    setItemsSnapshot({
      conversationId,
      firstId: currentFirstId,
      length: items.length,
    });
  }

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

  // Unified effect handling scroll side effects (conversation switch and appends)
  useEffect(() => {
    const prev = prevEffectSnapshotRef.current;
    const currentFirst = items[0]?._id;
    const currentLength = items.length;

    // 1. Conversation switch: scroll to bottom and reset UI state
    if (prev.conversationId !== conversationId) {
      prevEffectSnapshotRef.current = {
        conversationId,
        firstId: currentFirst,
        length: currentLength,
      };
      isAtBottomRef.current = true;
      setShowScrollToBottom(false);
      setHighlightedId(null);
      scrollToBottom("auto");
      return;
    }

    const isPrependEffect = isPrependedUpdate(
      currentFirst,
      prev.firstId,
      currentLength,
      prev.length,
    );

    // 2. New message appended: auto-scroll side-effect
    if (!isPrependEffect && currentLength > prev.length) {
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

    prevEffectSnapshotRef.current = {
      conversationId,
      firstId: currentFirst,
      length: currentLength,
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
