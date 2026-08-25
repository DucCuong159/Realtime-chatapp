import z from "zod";

export const createConversationSchema = z
  .object({
    participantId: z.string().trim().min(1).optional(),
    isGroup: z.boolean().default(false).optional(),
    participants: z.array(z.string().trim().min(1)).optional(),
    groupName: z.string().trim().min(1).optional(),
  })
  .refine(
    (data) => {
      if (data.isGroup) {
        return (
          !!data.groupName &&
          Array.isArray(data.participants) &&
          data.participants.length > 0
        );
      }
      return !!data.participantId;
    },
    {
      message:
        "For 1-on-1 conversation, participantId is required. For group conversation, groupName and participants are required.",
    },
  );

export const conversationIdSchema = z.object({
  conversationId: z.string().trim().min(1),
});

export const getConversationMessagesQuerySchema = z.object({
  cursor: z.string().trim().optional(),
  limit: z.coerce.number().int().positive().max(100).default(30).optional(),
});

export type CreateConversationSchemaType = z.infer<
  typeof createConversationSchema
>;

export type GetConversationMessagesQueryType = z.infer<
  typeof getConversationMessagesQuerySchema
>;
