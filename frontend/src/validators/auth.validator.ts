import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .email("Invalid email address")
  .min(1);

export const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters long");

export const nameSchema = z
  .string()
  .trim()
  .min(1, "Name must not be empty")
  .max(50, "Name must be at most 50 characters");

export const avatarSchema = z
  .string()
  .trim()
  .refine(
    (val) =>
      val.startsWith("http://") ||
      val.startsWith("https://") ||
      (/^data:image\/(png|jpeg|jpg|webp|gif);base64,/.test(val) &&
        val.length <= 15 * 1024 * 1024),
    "Avatar must be a valid image URL or Data URI",
  )
  .nullable();

export const aboutSchema = z
  .string()
  .trim()
  .max(200, "About must be at most 200 characters");

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  avatar: avatarSchema.optional(),
  about: aboutSchema.optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export type RegisterType = z.infer<typeof registerSchema>;
export type LoginType = z.infer<typeof loginSchema>;
