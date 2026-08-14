import z from "zod";

// 24-character hexadecimal MongoDB ObjectId pattern to validate ids
const objectIdRegex = /^[0-9a-fA-F]{24}$/;

// Base64 image Data URI pattern (supports png, jpeg, jpg, webp, gif)
const imageDataUriRegex = /^data:image\/(png|jpeg|jpg|webp|gif);base64,/;

export const sendMessageSchema = z
  .object({
    conversationId: z
      .string()
      .trim()
      .regex(objectIdRegex, "Invalid conversation ID"),
    content: z.string().trim().optional(),
    image: z
      .string()
      .trim()
      .regex(
        imageDataUriRegex,
        "Invalid image format. Must be a valid image Data URI",
      )
      .max(15 * 1024 * 1024, "Image payload is too large")
      .optional(),
    replyTo: z
      .string()
      .trim()
      .regex(objectIdRegex, "Invalid replyTo message ID")
      .optional(),
  })
  .refine((data) => data.content || data.image, {
    message: "Content or image is required",
    path: ["content"],
  });

export type sendMessageSchemaType = z.infer<typeof sendMessageSchema>;
