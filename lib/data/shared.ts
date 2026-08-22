/**
 * Shared error handling for every `lib/data` read.
 *
 * The distinction this module exists to draw: **"there are no rows" and
 * "we could not reach the database" are completely different facts, and
 * before Phase 23 both produced an empty array.** That was wrong in three
 * visible ways, all confirmed by pointing `NEXT_PUBLIC_SUPABASE_URL` at a
 * dead port and looking at the result:
 *
 * 1. The homepage rendered a hollow shell — a nav, "Hello, I'm Portfolio",
 *    and a footer, with every section silently self-hiding.
 * 2. `/projects` told the visitor "No projects yet. Published projects will
 *    show up here once they're added" — a confident lie about content that
 *    exists and is merely unreachable.
 * 3. `/projects/[slug]` returned a 404 with a blank body, claiming a real
 *    project did not exist.
 *
 * On top of that, an empty result returned from inside `unstable_cache`
 * gets **cached for an hour**, so a few seconds of database trouble kept
 * the site looking empty long after it recovered (the same stale-cache
 * trap documented in docs/progress.md's Phase 7 entry).
 *
 * So: a connectivity-class failure now throws `DataUnavailableError`, which
 * both prevents the bad value being cached and lets the UI say something
 * true ("we can't load this right now" — see app/(site)/error.tsx). Every
 * other error keeps the old behaviour of logging and returning empty, since
 * those are developer bugs (a renamed column, a broken embed) that should
 * not take a whole production page down.
 */

/** Thrown when the content store could not be reached at all — never when a query legitimately matched zero rows. */
export class DataUnavailableError extends Error {
  /** The `lib/data` function that failed, e.g. `"getProjects"` — used in logs and in the degraded UI's copy. */
  readonly context: string;

  constructor(context: string, cause?: unknown) {
    super(`Content is temporarily unavailable (${context}).`);
    this.name = "DataUnavailableError";
    this.context = context;
    this.cause = cause;
  }
}

/**
 * Substrings that identify a transport-level failure. Matched against the
 * message *and* the `details` field, because supabase-js reports a failed
 * `fetch` as `{ message: "TypeError: fetch failed", code: "" }` and buries
 * the actual `ECONNREFUSED` in `details` — the message alone is too generic
 * to key on safely.
 */
const CONNECTIVITY_PATTERNS = [
  "fetch failed",
  "econnrefused",
  "enotfound",
  "eai_again",
  "etimedout",
  "econnreset",
  "epipe",
  "socket hang up",
  "network request failed",
  "connect timeout",
  "request timed out",
  "und_err",
  "service unavailable",
  "bad gateway",
];

/**
 * Error codes that mean "the database is there but cannot serve us":
 * PGRST301/302 are PostgREST's JWT failures (the exact symptom when
 * `.env.local`'s keys don't match the running stack — see docs/progress.md),
 * and the `08*`/`53300`/`57P03` family are Postgres connection failures and
 * "too many clients"/"cannot connect now". None of them mean "no rows".
 */
const CONNECTIVITY_CODES = new Set([
  "PGRST301",
  "PGRST302",
  "08000",
  "08001",
  "08003",
  "08004",
  "08006",
  "08P01",
  "53300",
  "57P03",
]);

function readString(source: Record<string, unknown>, key: string): string {
  const value = source[key];
  return typeof value === "string" ? value.toLowerCase() : "";
}

/** True when this error means the store was unreachable, rather than the query being wrong or matching nothing. */
export function isConnectivityError(error: unknown): boolean {
  if (error instanceof DataUnavailableError) return true;
  if (!error || typeof error !== "object") return false;

  const source = error as Record<string, unknown>;

  const code = source.code;
  if (typeof code === "string" && CONNECTIVITY_CODES.has(code.toUpperCase())) return true;

  // A 5xx from PostgREST/Kong is infrastructure, not a bad query.
  const status = source.status;
  if (typeof status === "number" && status >= 500) return true;

  const haystack = `${readString(source, "message")} ${readString(source, "details")} ${readString(source, "hint")}`;
  return CONNECTIVITY_PATTERNS.some((pattern) => haystack.includes(pattern));
}

/**
 * Called at every `if (error)` branch in lib/data. Logs the real error
 * server-side — always, and in full, because the visitor never sees any of
 * it — then throws `DataUnavailableError` if the cause was connectivity.
 * Returns normally otherwise, so the caller's existing `return null` /
 * `return []` still runs for genuine query errors.
 *
 * Internal to lib/data — not exported to consumers.
 */
export function handleDataError(context: string, error: unknown): void {
  const detail = error instanceof Error ? error.message : error;
  console.error(`[lib/data] ${context}:`, detail);

  if (isConnectivityError(error)) {
    throw new DataUnavailableError(context, error);
  }
}

/**
 * Runs a `lib/data` read and falls back instead of propagating an outage.
 *
 * For the small number of callers that must **not** fail the request when
 * the store is unreachable: the site layout's chrome (which has hard-coded
 * fallbacks for exactly this), `generateMetadata`, `sitemap.ts`, and the OG
 * image route. A page's actual *content* should never use this — that's the
 * path that has to surface the degraded state rather than quietly pretend
 * the site is empty.
 *
 * Only `DataUnavailableError` is swallowed; a genuine bug still throws.
 */
export async function tolerateUnavailable<T>(read: Promise<T>, fallback: T): Promise<T> {
  try {
    return await read;
  } catch (error) {
    if (error instanceof DataUnavailableError) return fallback;
    throw error;
  }
}
