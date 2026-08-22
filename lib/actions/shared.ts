import { z } from "zod";
import { resolveAdminAuth, type AuthenticatedAdmin } from "@/lib/auth";

/**
 * Every mutating entity action returns one of these instead of throwing —
 * Server Actions called directly from a Client Component (not via
 * `<form action>`) don't get a `useActionState`-style error boundary for
 * free, so the typed result IS the error channel. `error` is always a
 * short, user-safe string; a raw Postgres/Supabase error never reaches it
 * (see `createAdminAction` below).
 */
export interface ActionSuccess<T> {
  success: true;
  data: T;
}

export interface ActionFailure {
  success: false;
  error: string;
  /** Zod's flattened field errors, keyed by form field name — lets AdminForm call `form.setError(name, ...)` per field instead of only showing the generic `error` string. */
  fieldErrors?: Record<string, string[]>;
}

export type ActionResult<T> = ActionSuccess<T> | ActionFailure;

export function actionSuccess<T>(data: T): ActionSuccess<T> {
  return { success: true, data };
}

export function actionError(error: string, fieldErrors?: Record<string, string[]>): ActionFailure {
  return { success: false, error, fieldErrors };
}

/**
 * Step (c) of every action: parse `input` against the entity's *existing*
 * `lib/validation` schema — this file never defines new validation rules,
 * only reshapes Zod's result into the fieldErrors shape above.
 */
export function parseInput<S extends z.ZodType>(
  schema: S,
  input: unknown,
): { success: true; data: z.infer<S> } | { success: false; fieldErrors: Record<string, string[]> } {
  const parsed = schema.safeParse(input);
  if (parsed.success) return { success: true, data: parsed.data };

  const fieldErrors: Record<string, string[]> = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path.join(".") || "_root";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return { success: false, fieldErrors };
}

/** Shared shape for every `reorderX` action — a full list of {id, display_order} pairs, written back in one call rather than one request per moved row. */
export const reorderInputSchema = z.array(
  z.object({ id: z.uuid(), display_order: z.int().nonnegative() }),
);
export type ReorderInput = z.infer<typeof reorderInputSchema>;

/**
 * Wraps every entity action with steps (a) and (b): verify a session exists
 * and that it belongs to the admin (`getAuthenticatedAdmin` — the same
 * check `app/admin/(protected)/layout.tsx` already does for page loads,
 * reused here for the mutation path specifically, since a signed-out or
 * non-admin caller could otherwise invoke a Server Action directly by
 * guessing its endpoint regardless of what any page renders). Also step
 * (f)'s other half: catches anything the handler throws (a Postgres error,
 * a Storage error, ...) so it can never reach the client as raw text —
 * only entity code paths that already return `actionError(...)` themselves
 * produce a specific message; anything unexpected gets one generic string,
 * logged server-side for the real detail.
 */
export function createAdminAction<TArgs extends unknown[], TResult>(
  handler: (admin: AuthenticatedAdmin, ...args: TArgs) => Promise<ActionResult<TResult>>,
) {
  return async (...args: TArgs): Promise<ActionResult<TResult>> => {
    const auth = await resolveAdminAuth();

    // Three-way, not two: "we couldn't check" is not "you're signed out",
    // and telling an admin to sign in again during a database outage sends
    // them to a login page that can't work either.
    if (auth.status === "unavailable") {
      return actionError(
        "Couldn't reach the database to verify your session. Nothing was saved — try again in a moment.",
      );
    }
    if (auth.status === "unauthenticated") {
      return actionError("You must be signed in as an admin to do that.");
    }
    const admin = auth.admin;

    try {
      return await handler(admin, ...args);
    } catch (error) {
      console.error("[lib/actions] unexpected error:", error);
      return actionError("Something went wrong. Please try again.");
    }
  };
}

/**
 * A v4 UUID, as produced by `crypto.randomUUID()` in the browser.
 * Deliberately narrow: this value becomes a primary key, so anything that
 * isn't unmistakably a generated UUID is rejected rather than coerced.
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Resolves the client-supplied record id that a `createX` action should
 * insert as the new row's primary key, or `null` to let Postgres generate
 * one.
 *
 * ## Why a create action takes an id at all
 *
 * Every uploader writes to `{bucket}/{recordId}/{uuid}.{ext}`, and on a
 * *create* form there is no row id yet — so `<Entity>Form` generates a
 * placeholder with `crypto.randomUUID()` and uploads under that (see
 * docs/content-management.md's "Uploads and storage cleanup").
 *
 * That placeholder used to be thrown away: the insert let Postgres generate
 * a different id, and the files stayed under the placeholder folder forever.
 * `deleteStorageFolder(bucket, id)` then looked in `{bucket}/{realId}/`,
 * which was empty, and every file uploaded before the first save was
 * orphaned permanently — invisible, because the row's `file_url` still
 * pointed at the placeholder folder and the image kept rendering.
 *
 * Adopting the placeholder *as* the primary key removes the mismatch at the
 * source rather than reconciling it afterwards: the folder a file was
 * uploaded to is, from the first byte, the folder the record owns. No move
 * step, nothing to keep in sync, and one code path for create and edit.
 *
 * ## Why it is safe to let the client choose a primary key
 *
 * The caller is an authenticated admin — `createAdminAction` has already
 * established that, and RLS independently requires `is_admin()` for the
 * insert. A v4 UUID collision is not a practical concern, and a deliberate
 * collision just produces a unique-violation error, which every create
 * action already handles. The id carries no authority of its own.
 *
 * A malformed or absent value falls back to the column default, so a caller
 * that has no sensible id (a bulk import, a future server-side creation
 * path) keeps working without inventing one.
 */
export function resolveNewRecordId(value: unknown): string | null {
  return typeof value === "string" && UUID_PATTERN.test(value) ? value : null;
}

/**
 * Spreadable `{ id }` for an insert — `{}` when there is no usable id, so
 * the column default applies. Lets a create action write
 * `.insert({ ...withRecordId(recordId), ...parsed.data })` without branching.
 */
export function withRecordId(value: unknown): { id?: string } {
  const id = resolveNewRecordId(value);
  return id ? { id } : {};
}
