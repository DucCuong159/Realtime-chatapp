import z from "zod";

// 24-character hexadecimal MongoDB ObjectId pattern to validate ids
const objectIdRegex = /^[0-9a-fA-F]{24}$/;

// Base64 image Data URI pattern (supports png, jpeg, jpg, webp, gif)
const imageDataUriRegex = /^data:image\/(png|jpeg|jpg|webp|gif);base64,/;

/**
 * Maximum encoded image payload size in characters/bytes (15MB).
 * Client allows up to 10MB raw binary files, which expand to ~13.33MB in Base64 Data URI format.
 * 15MB provides sufficient headroom for the encoded string.
 */
export const MAX_IMAGE_BASE64_SIZE = 15 * 1024 * 1024; // 15MB

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
      .max(
        MAX_IMAGE_BASE64_SIZE,
        "Image payload is too large (max 15MB Base64)",
      )
      .optional(),
    replyTo: z
      .string()
      .trim()
      .regex(objectIdRegex, "Invalid replyTo message ID")
      .optional(),
    aiModelId: z.string().trim().optional(),
  })
  .refine((data) => data.content || data.image, {
    message: "Content or image is required",
    path: ["content"],
  });

export type sendMessageSchemaType = z.infer<typeof sendMessageSchema>;
