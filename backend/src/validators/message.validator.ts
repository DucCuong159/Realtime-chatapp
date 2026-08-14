import z from "zod";

export const sendMessageSchema = z
  .object({
    conversationId: z.string().trim().min(1),
    content: z.string().trim().optional(),
    image: z.string().trim().optional(),
    replyTo: z.string().trim().optional(),
  })
  .refine((data) => data.content || data.image, {
    message: "Content or image is required",
    path: ["content"],
  });

export type sendMessageSchemaType = z.infer<typeof sendMessageSchema>;
