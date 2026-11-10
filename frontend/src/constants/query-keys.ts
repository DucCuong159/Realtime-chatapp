/**
 * Hierarchical query key factory for TanStack Query v5.
 * Using tuples ensures precise cache invalidation and granular updates.
 */
export const conversationKeys = {
  all: ["conversations"] as const,
  lists: () => [...conversationKeys.all, "list"] as const,
  details: () => [...conversationKeys.all, "detail"] as const,
  detail: (id: string) => [...conversationKeys.details(), id] as const,
  messages: (id: string) => [...conversationKeys.all, "messages", id] as const,
};

export const userKeys = {
  all: ["users"] as const,
  lists: () => [...userKeys.all, "list"] as const,
};

export const aiKeys = {
  all: ["ai"] as const,
  models: () => [...aiKeys.all, "models"] as const,
};

export const conversationMutationKeys = {
  all: ["conversations", "mutation"] as const,
  sendMessage: ["conversations", "sendMessage"] as const,
  toggleReaction: ["conversations", "toggleReaction"] as const,
  createConversation: ["conversations", "createConversation"] as const,
};

