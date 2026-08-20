import type { STORAGE_BUCKETS } from "@/lib/constants";

/**
 * Turns a Storage failure into something the admin can act on.
 *
 * Every one of these used to surface as either Supabase's own raw string
 * ("new row violates row-level security policy for table \"objects\"") or
 * the flat fallback "Upload failed." — neither of which tells the person
 * holding the file what to *do*. The rule here: name the cause, and name
 * the fix, in the admin's own terms (megabytes, file types, "sign in
 * again"), never in Postgres's.
 */

export type BucketConfig = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

/** Raised by lib/storage/upload.ts so callers get a status code alongside the message. */
export class UploadError extends Error {
  readonly status: number;

  constructor(message: string, status: number, cause?: unknown) {
    super(message);
    this.name = "UploadError";
    this.status = status;
    this.cause = cause;
  }
}

function formatMegabytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`;
}

/** "PNG, JPEG or WebP" — the mime list rewritten as something a person reads rather than parses. */
export function describeAllowedTypes(bucket: BucketConfig): string {
  const names = bucket.allowedMimeTypes.map((mime) => {
    const subtype = mime.split("/")[1] ?? mime;
    if (subtype === "svg+xml") return "SVG";
    if (subtype === "jpeg") return "JPEG";
    if (subtype === "pdf") return "PDF";
    return subtype.toUpperCase();
  });

  const unique = Array.from(new Set(names));
  if (unique.length === 1) return unique[0]!;
  return `${unique.slice(0, -1).join(", ")} or ${unique[unique.length - 1]}`;
}

/**
 * Maps a raw Storage failure onto actionable copy. Matching is on the
 * status code first (reliable) and the message second (Supabase's wording
 * has changed between versions, so several spellings of the same failure
 * are matched rather than one exact string).
 */
export function describeUploadError(error: unknown, bucket: BucketConfig): string {
  const status = error instanceof UploadError ? error.status : 0;
  const raw = (error instanceof Error ? error.message : String(error ?? "")).toLowerCase();

  // Network — the browser never reached Storage at all.
  if (status === 0 && (raw.includes("network") || raw.includes("failed to fetch") || raw.includes("load failed"))) {
    return "Couldn't reach file storage. Check your connection and try again — nothing was uploaded.";
  }

  if (status === 413 || raw.includes("payload too large") || raw.includes("maximum allowed size")) {
    return `That file is too big. The limit for this field is ${formatMegabytes(bucket.maxSizeBytes)} — try compressing it or uploading a smaller version.`;
  }

  if (status === 415 || raw.includes("mime type") || raw.includes("not supported")) {
    return `That file type isn't accepted here. Upload a ${describeAllowedTypes(bucket)} file instead.`;
  }

  if (status === 401 || raw.includes("jwt") || raw.includes("invalid token") || raw.includes("not authenticated")) {
    return "Your session expired before the upload finished. Sign in again, then re-select the file — your other unsaved changes are still on this page.";
  }

  if (status === 403 || raw.includes("row-level security") || raw.includes("unauthorized")) {
    return "You don't have permission to upload to this bucket. This usually means the session is no longer an admin session — sign out and back in.";
  }

  if (status === 404 || raw.includes("bucket not found")) {
    return `The "${bucket.id}" storage bucket doesn't exist yet. It has to be created in Supabase (see supabase/migrations) before uploads to this field will work.`;
  }

  if (status === 429 || raw.includes("too many requests")) {
    return "Too many uploads at once. Wait a few seconds and try again.";
  }

  if (status >= 500) {
    return "File storage is having a problem right now. Nothing was uploaded — try again in a moment.";
  }

  // Anything genuinely unrecognised: say so plainly rather than dressing it
  // up as a known cause, and keep the original text, which is admin-only
  // and useful. This is the admin panel behind a login, not a public page.
  const original = error instanceof Error && error.message ? ` (${error.message})` : "";
  return `The upload didn't complete${original}. Try again, or pick a different file.`;
}
