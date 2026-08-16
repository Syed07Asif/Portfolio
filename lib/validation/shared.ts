import { z } from "zod";

/**
 * Reusable pieces shared across the per-entity schemas in this folder.
 * These are the single source of truth for admin form validation AND
 * server-side validation in later phases — see lib/validation/README.md.
 */

/** Lowercase, hyphen-separated, no leading/trailing hyphen — matches what public.slugify() produces. */
export const slugSchema = z
  .string()
  .min(1, "Slug is required")
  .regex(
    /^[a-z0-9]+(-[a-z0-9]+)*$/,
    "Slug must be lowercase letters, numbers, and single hyphens, with no leading or trailing hyphen",
  );

export const requiredUrlSchema = z.url("Must be a valid URL");
/** Empty string is treated as "not provided" — form inputs left blank submit as "", not undefined. */
export const optionalUrlSchema = z
  .union([requiredUrlSchema, z.literal("")])
  .optional()
  .nullable()
  .transform((value) => (value === "" ? null : (value ?? null)));

export const dateSchema = z.iso.date("Must be a valid date (YYYY-MM-DD)");
export const optionalDateSchema = z
  .union([dateSchema, z.literal("")])
  .optional()
  .nullable()
  .transform((value) => (value === "" ? null : (value ?? null)));

export const displayOrderSchema = z.int().nonnegative().default(0);
export const publishedSchema = z.boolean().default(false);

/** Non-empty, reasonably bounded free text — most `description`/`bio` style columns. */
export function textSchema(maxLength = 5000) {
  return z.string().trim().max(maxLength);
}

export function requiredTextSchema(maxLength = 500) {
  return z.string().trim().min(1, "This field is required").max(maxLength);
}

/**
 * File constraints, mirrored from the storage bucket config in
 * supabase/migrations/20260816103908_rls_and_storage.sql — Storage enforces
 * these too, so a mismatch here only ever produces a confusing client-side
 * error, never a security gap.
 */
export function fileSchema({
  maxSizeBytes,
  allowedMimeTypes,
}: {
  maxSizeBytes: number;
  allowedMimeTypes: readonly string[];
}) {
  return z
    .instanceof(File)
    .refine(
      (file) => file.size <= maxSizeBytes,
      `File must be ${Math.round(maxSizeBytes / (1024 * 1024))}MB or smaller`,
    )
    .refine(
      (file) => allowedMimeTypes.includes(file.type),
      `File must be one of: ${allowedMimeTypes.join(", ")}`,
    );
}
