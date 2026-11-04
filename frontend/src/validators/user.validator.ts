import { z } from "zod";
import { aboutSchema, nameSchema } from "./auth.validator";

const imageDataUriRegex = /^data:image\/(png|jpeg|jpg|webp|gif);base64,/;
const MAX_IMAGE_BASE64_SIZE = 15 * 1024 * 1024; // 15MB headroom for 10MB raw file

export const profileAvatarSchema = z
  .string()
  .trim()
  .regex(imageDataUriRegex, "Avatar must be a valid image Data URI")
  .max(MAX_IMAGE_BASE64_SIZE, "Avatar image payload exceeds 10MB file limit")
  .nullable();

export const profileNameSchema = nameSchema.max(
  50,
  "Name must be at most 50 characters",
);

export const profileFormSchema = z.object({
  name: profileNameSchema,
  avatar: profileAvatarSchema.optional(),
  about: aboutSchema.optional(),
});

export type ProfileFormType = z.infer<typeof profileFormSchema>;

