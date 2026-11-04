import { z } from "zod";
import { aboutSchema, avatarSchema, nameSchema } from "./auth.validator";

export const profileFormSchema = z.object({
  name: nameSchema,
  avatar: avatarSchema.optional(),
  about: aboutSchema.optional(),
});

export type ProfileFormType = z.infer<typeof profileFormSchema>;
