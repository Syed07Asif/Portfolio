import { z } from "zod";
import { Constants } from "@/types/database";
import { displayOrderSchema, optionalUrlSchema, publishedSchema, requiredTextSchema, textSchema } from "./shared";

export const contactTypeSchema = z.enum(Constants.public.Enums.contact_type);

/**
 * Deliberately validated on *digit count* rather than by pattern-matching
 * where the punctuation sits — a single regex describing every legitimate
 * international layout is a losing game. A first attempt
 * (`/^\+?[0-9][0-9\s\-()]{6,18}[0-9]$/`) required the character right after
 * the optional `+` to be a digit, which silently rejected the entirely
 * ordinary `(555) 123-4567`; caught by actually running the schema against
 * a table of real formats rather than eyeballing the regex.
 *
 * This also mirrors how the value is actually *consumed*:
 * `resolveContactHref` (lib/contactLinks.ts) builds the wa.me link by
 * stripping every non-digit, so "enough digits, and nothing that isn't
 * phone punctuation" is precisely the contract that matters. 7–15 digits is
 * the E.164 range (15 is its documented maximum).
 */
const PHONE_ALLOWED_CHARS = /^\+?[0-9\s\-().]+$/;

function isValidPhoneNumber(value: string): boolean {
  const trimmed = value.trim();
  if (!PHONE_ALLOWED_CHARS.test(trimmed)) return false;
  const digitCount = trimmed.replace(/\D/g, "").length;
  return digitCount >= 7 && digitCount <= 15;
}

/** Types whose card is meaningless without a real profile link — see resolveContactHref, which uses `url` as-is for every type except email/whatsapp. */
const PROFILE_TYPES = new Set(["linkedin", "github", "twitter"]);

export const contactLinkSchema = z
  .object({
    label: requiredTextSchema(100),
    type: contactTypeSchema,
    // Raw value: an email address, a handle, a phone number — shape depends
    // on `type`, so it can't be one blanket format check.
    value: requiredTextSchema(300),
    url: optionalUrlSchema,
    icon: textSchema(100).optional().nullable(),
    display_order: displayOrderSchema,
    published: publishedSchema,
  })
  .refine((data) => data.type !== "email" || z.email().safeParse(data.value).success, {
    message: "Must be a valid email address",
    path: ["value"],
  })
  .refine((data) => data.type !== "whatsapp" || isValidPhoneNumber(data.value), {
    message: "Must be a valid phone number, e.g. +1 555 123 4567",
    path: ["value"],
  })
  .refine((data) => !PROFILE_TYPES.has(data.type) || Boolean(data.url), {
    message: "A profile URL is required for this contact type",
    path: ["url"],
  });

export type ContactLinkInput = z.infer<typeof contactLinkSchema>;
