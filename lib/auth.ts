import { createClient } from "@/lib/supabase/server";

export interface AuthenticatedAdmin {
  id: string;
  email: string | null;
}

/**
 * Belt-and-braces layer 2 of 2 — see proxy.ts (Next's middleware convention,
 * renamed from `middleware.ts` as of this Next.js version) for layer 1 and
 * docs/architecture.md's Security section for RLS as the final backstop.
 * Checks *both* "is there a valid session" and "is this session the admin"
 * (`is_admin()`, the `private.admins` allowlist — see that doc's "What
 * admin means" section for why it's a table lookup, not a JWT claim).
 *
 * Returns `null` for either failure mode — no session, or a session that
 * isn't the admin's — and deliberately gives the caller no way to tell
 * those two apart. A signed-in-but-not-admin user is only a
 * theoretical case today (there's exactly one Supabase Auth user, the
 * admin), but if that ever changes, this must not become a way to probe
 * "does a non-admin account exist" from the outside.
 */
export async function getAuthenticatedAdmin(): Promise<AuthenticatedAdmin | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return null;

  const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");

  if (adminError || !isAdmin) return null;

  return { id: user.id, email: user.email ?? null };
}

/**
 * Validates a `next` redirect target before it's ever used in a
 * `redirect()` call — without this, `/admin/login?next=https://evil.com`
 * (or a protocol-relative `//evil.com`) would make a successful login
 * bounce the admin off-site. Only a path that's genuinely `/admin`-scoped,
 * with no scheme/host smuggled in, is accepted; anything else falls back
 * to the dashboard.
 */
export function resolveNextPath(next: string | null | undefined): string {
  if (!next) return "/admin";
  if (!next.startsWith("/admin")) return "/admin";
  if (next.startsWith("//") || next.includes("://") || next.includes("\\")) return "/admin";
  return next;
}
