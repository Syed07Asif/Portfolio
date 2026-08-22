import { z } from "zod";

/**
 * Not a content entity — doesn't map to a types/content.ts type the way
 * every other schema in this folder does — but added here anyway since
 * it's the same "single source of truth for form + server validation"
 * concern this folder exists for, just for the admin login form instead
 * of a portfolio content type. Deliberately minimal: real credential
 * checking happens against Supabase Auth, not here — this only rejects
 * obviously-malformed input before it reaches that call.
 */
export const adminLoginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
