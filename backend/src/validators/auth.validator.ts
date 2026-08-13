import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .email("Invalid email address")
  .min(1);
export const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters long");
export const nameSchema = z.string().trim().min(1, "Name must not be empty");
export const avatarSchema = z.string().url("Avatar must be a valid URL");
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

export type RegisterSchemaType = z.infer<typeof registerSchema>;
export type LoginSchemaType = z.infer<typeof loginSchema>;
