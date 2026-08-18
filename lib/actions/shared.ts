import { z } from "zod";
import { getAuthenticatedAdmin, type AuthenticatedAdmin } from "@/lib/auth";

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
    const admin = await getAuthenticatedAdmin();
    if (!admin) {
      return actionError("You must be signed in as an admin to do that.");
    }

    try {
      return await handler(admin, ...args);
    } catch (error) {
      console.error("[lib/actions] unexpected error:", error);
      return actionError("Something went wrong. Please try again.");
    }
  };
}
