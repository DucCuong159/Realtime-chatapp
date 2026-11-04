import { z } from "zod";
import { aboutSchema, nameSchema } from "./auth.validator.js";

const imageDataUriRegex = /^data:image\/(png|jpeg|jpg|webp|gif);base64,/;
// 10MB binary file expands to ~13.33MB Base64. 15MB allows sufficient headroom.
const MAX_IMAGE_BASE64_SIZE = 15 * 1024 * 1024;

export const profileAvatarSchema = z
  .string()
  .trim()
  .regex(imageDataUriRegex, "Avatar must be a valid image Data URI (PNG, JPEG, WebP, GIF)")
  .max(MAX_IMAGE_BASE64_SIZE, "Avatar image payload exceeds 10MB file limit")
  .nullable();

export const profileNameSchema = nameSchema.max(
  50,
  "Name must be at most 50 characters",
);

export const updateProfileSchema = z.object({
  name: profileNameSchema.optional(),
  avatar: profileAvatarSchema.optional(),
  about: aboutSchema.optional(),
});

export type UpdateProfileSchemaType = z.infer<typeof updateProfileSchema>;
