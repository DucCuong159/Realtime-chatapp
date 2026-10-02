import { Types } from "mongoose";

export interface ReactionItem {
  user: unknown;
  emoji: string;
}

/**
 * Toggles a reaction in a reaction list.
 * Enforces single reaction per user per message:
 * - If user already reacted with the exact same emoji: removes the reaction (toggle off).
 * - If user already reacted with a different emoji: switches to the new emoji.
 * - If user has not reacted: adds the new emoji.
 */
export const toggleReactionInList = (
  reactions: ReactionItem[],
  userId: string,
  emoji: string,
): ReactionItem[] => {
  const isUserMatch = (r: ReactionItem) =>
    String((r.user as { _id?: unknown })?._id || r.user) === userId;

  const existing = reactions.find(isUserMatch);
  const isSameEmoji = existing?.emoji === emoji;
  const withoutUser = reactions.filter((r) => !isUserMatch(r));

  if (isSameEmoji) {
    return withoutUser;
  }

  return [...withoutUser, { user: new Types.ObjectId(userId), emoji }];
};
