import type { BlogPostInput } from "@/lib/validation";

/**
 * A plain module, deliberately *not* `"use server"` — same reason
 * `lib/actions/shared.ts` and `lib/actions/skillsShared.ts` aren't: every
 * function exported from a `"use server"` file must itself be an async
 * Server Action, so a synchronous helper has to live outside one (the exact
 * trap that 500'd `/admin/skills` in Phase 19 — see
 * docs/content-management.md). Keeping it here also makes it directly
 * unit-testable, which a helper buried inside the action file wouldn't be.
 */

/**
 * `published_at` tracks the editorial workflow `blog_posts` uses instead of
 * a plain `published` boolean (see docs/database.md):
 *
 * - set once, the first time a post's status becomes `published`
 * - left untouched on subsequent saves while it stays published, so it
 *   always reads as "when this first went live", never "when it was last
 *   edited"
 * - cleared back to `null` the moment it's reverted to a draft
 */
export function resolvePublishedAt(
  status: BlogPostInput["status"],
  existingPublishedAt: string | null,
  now: () => string = () => new Date().toISOString(),
): string | null {
  if (status !== "published") return null;
  return existingPublishedAt ?? now();
}
