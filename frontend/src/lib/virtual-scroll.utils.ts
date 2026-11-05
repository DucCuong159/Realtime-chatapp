export const START_INDEX = 1_000_000_000;

/**
 * Calculates the initial firstItemIndex for Virtuoso.
 * Pre-shifts the index by messages length to prevent underflowing on prepend.
 */
export function calculateInitialFirstItemIndex(
  messagesLength: number,
  startIndex: number = START_INDEX,
): number {
  return Math.max(0, startIndex - messagesLength);
}

/**
 * Decrements firstItemIndex when older messages are prepended to the top.
 */
export function calculatePrependedFirstItemIndex(
  currentFirstItemIndex: number,
  prependedCount: number,
): number {
  return Math.max(0, currentFirstItemIndex - prependedCount);
}

/**
 * Checks whether the incoming update is a prepend of older messages.
 */
export function isPrependedUpdate(
  currentFirstId: string | undefined,
  prevFirstId: string | undefined,
  currentLength: number,
  prevLength: number,
): boolean {
  if (!prevFirstId || !currentFirstId) return false;
  return currentFirstId !== prevFirstId && currentLength > prevLength;
}

/**
 * Finds the index of a message by its _id within the messages array.
 */
export function findMessageIndexById<T extends { _id: string }>(
  messages: T[],
  targetId: string,
): number {
  return messages.findIndex((m) => m._id === targetId);
}

/**
 * Determines whether to auto-scroll to the bottom upon appending a new message.
 */
export function shouldAutoScrollOnAppend(
  isOutgoing: boolean,
  isAtBottom: boolean,
): boolean {
  return isOutgoing || isAtBottom;
}
