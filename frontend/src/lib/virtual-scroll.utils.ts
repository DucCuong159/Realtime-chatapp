export const START_INDEX = 1_000_000_000;

/**
 * Calculates the initial firstItemIndex for Virtuoso.
 * Pre-shifts the index by the count of existing messages so older prepended
 * messages can decrement without reaching negative indices.
 * Guaranteed to stay non-negative.
 */
export function calculateInitialFirstItemIndex(
  messagesLength: number,
  startIndex: number = START_INDEX,
): number {
  return Math.max(0, startIndex - messagesLength);
}

/**
 * Calculates new firstItemIndex when older messages are prepended to the top.
 * Guaranteed to stay non-negative to satisfy Virtuoso API requirements.
 */
export function calculatePrependedFirstItemIndex(
  currentFirstItemIndex: number,
  prependedCount: number,
): number {
  return Math.max(0, currentFirstItemIndex - prependedCount);
}

/**
 * Checks whether the incoming message update is a prepend of older messages
 * (i.e. first message ID changed and length increased).
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
 * Converts a 0-based array index into Virtuoso's absolute item index.
 */
export function toVirtuosoItemIndex(
  firstItemIndex: number,
  arrayIndex: number,
): number {
  if (arrayIndex < 0) return -1;
  return firstItemIndex + arrayIndex;
}
