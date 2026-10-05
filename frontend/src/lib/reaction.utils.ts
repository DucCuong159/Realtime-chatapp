export const ALLOWED_REACTION_EMOJIS = [
  "👍",
  "❤️",
  "😂",
  "😮",
  "😢",
  "🔥",
] as const;

export type ReactionEmojiType = (typeof ALLOWED_REACTION_EMOJIS)[number];

export type ReactionUserType = {
  _id: string;
  name: string;
  avatar?: string | null;
};

export type MessageReactionType = {
  user: ReactionUserType | string;
  emoji: string;
};

export interface GroupedReaction {
  emoji: string;
  count: number;
  hasReacted: boolean;
  users: ReactionUserType[];
  tooltipText: string;
}

/**
 * Format human-readable reaction tooltip summarizing who reacted.
 * e.g., "You", "Alice", "You, Alice", "Alice, Bob", "You, Alice and 2 others"
 */
export function formatReactionTooltip(
  users: ReactionUserType[],
  currentUserId: string | null,
): string {
  if (!users || users.length === 0) return "";

  const currentUser = currentUserId
    ? users.find((u) => u._id === currentUserId)
    : undefined;
  const otherUsers = currentUserId
    ? users.filter((u) => u._id !== currentUserId)
    : users;

  const names: string[] = [];
  if (currentUser) {
    names.push("You");
  }

  for (const u of otherUsers) {
    names.push(u.name || "User");
  }

  if (names.length === 1) {
    return names[0];
  }

  if (names.length === 2) {
    return `${names[0]}, ${names[1]}`;
  }

  if (names.length === 3) {
    return `${names[0]}, ${names[1]}, ${names[2]}`;
  }

  const remainingCount = names.length - 2;
  return `${names[0]}, ${names[1]} and ${remainingCount} others`;
}

export function getReactionUserId(
  user: MessageReactionType["user"] | unknown,
): string {
  if (!user) return "";
  if (typeof user === "string") return user;
  if (typeof user === "object" && user !== null && "_id" in user) {
    return String((user as { _id: unknown })._id);
  }
  return String(user);
}

/**
 * Compares two reaction lists for equality based on emoji and user ID.
 */
export function areReactionsEqual(
  a: MessageReactionType[] | undefined,
  b: MessageReactionType[] | undefined,
): boolean {
  const listA = a || [];
  const listB = b || [];

  if (listA.length !== listB.length) return false;

  return listA.every((itemA, index) => {
    const itemB = listB[index];
    return (
      itemB !== undefined &&
      itemA.emoji === itemB.emoji &&
      getReactionUserId(itemA.user) === getReactionUserId(itemB.user)
    );
  });
}

/**
 * Group message reactions by emoji with total count, current user state, and tooltip label.
 */
export function groupReactions(
  reactions: MessageReactionType[] | undefined,
  currentUserId: string | null,
): GroupedReaction[] {
  if (!reactions || reactions.length === 0) return [];

  const map = new Map<
    string,
    { users: ReactionUserType[]; hasReacted: boolean }
  >();

  for (const r of reactions) {
    if (!r.emoji) continue;

    const uId = getReactionUserId(r.user);
    const userObj: ReactionUserType =
      typeof r.user === "object" && r.user !== null && "name" in r.user
        ? {
            _id: uId,
            name: String(r.user.name || "User"),
            avatar: r.user.avatar || null,
          }
        : { _id: uId, name: "User", avatar: null };

    const isCurrent = Boolean(currentUserId && uId === currentUserId);

    const existing = map.get(r.emoji);
    if (existing) {
      if (!existing.users.some((u) => u._id === userObj._id)) {
        existing.users.push(userObj);
      }
      if (isCurrent) existing.hasReacted = true;
    } else {
      map.set(r.emoji, {
        users: [userObj],
        hasReacted: isCurrent,
      });
    }
  }

  const result: GroupedReaction[] = [];
  for (const [emoji, data] of map.entries()) {
    result.push({
      emoji,
      count: data.users.length,
      hasReacted: data.hasReacted,
      users: data.users,
      tooltipText: formatReactionTooltip(data.users, currentUserId),
    });
  }

  return result;
}

/**
 * Toggles a user's reaction on a message.
 * Enforces single reaction per user per message:
 * - If user already reacted with the same emoji: removes the reaction (toggle off).
 * - If user already reacted with a different emoji: switches to the new emoji.
 * - If user has not reacted: adds the new emoji reaction.
 */
export function toggleUserReaction(
  priorReactions: MessageReactionType[] | undefined,
  currentUserId: string,
  emoji: string,
  currentUserProfile?: { name: string; avatar?: string | null },
): MessageReactionType[] {
  const list = priorReactions || [];

  const isUserMatch = (r: MessageReactionType) =>
    getReactionUserId(r.user) === currentUserId;

  const existingReaction = list.find(isUserMatch);
  const withoutUser = list.filter((r) => !isUserMatch(r));

  if (existingReaction && existingReaction.emoji === emoji) {
    // Toggled off same emoji -> removes user's reaction completely
    return withoutUser;
  }

  // Add or switch emoji reaction for user
  const newReaction: MessageReactionType = {
    emoji,
    user: {
      _id: currentUserId,
      name: currentUserProfile?.name || "User",
      avatar: currentUserProfile?.avatar || null,
    },
  };

  return [...withoutUser, newReaction];
}
