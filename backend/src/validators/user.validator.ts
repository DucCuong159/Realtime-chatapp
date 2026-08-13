import { z } from "zod";
import { aboutSchema, avatarSchema, nameSchema } from "./auth.validator.js";

export const updateProfileSchema = z.object({
  name: nameSchema.optional(),
  avatar: avatarSchema.optional(),
  about: aboutSchema.optional(),
});

export type UpdateProfileSchemaType = z.infer<typeof updateProfileSchema>;
