import type { Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

export const ADMIN_EMAIL = "test-admin@example.com";
export const ADMIN_PASSWORD = "Test-Admin-Pass-123!";

/**
 * Signs in through the real login form rather than by injecting a cookie —
 * the login flow is itself one of the things Phase 24 is asked to cover, and
 * a synthesised session would skip the middleware/proxy redirect logic that
 * has broken before.
 */
export async function loginAsAdmin(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
  await page.getByLabel(/password/i).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 30_000 });
}

/**
 * Direct database access for fixture setup and, more importantly, for
 * *verifying* what a UI action actually wrote. Asserting on the rendered page
 * alone would not distinguish "the row changed" from "the list is stale".
 *
 * Authenticates as the admin rather than using the service-role key: the JWT
 * carries `role: service_role` correctly but no migration ever granted that
 * role table privileges, so PostgREST rejects it with `42501`. See
 * tests/lib/data/published.test.ts for the same note.
 */
export async function dbClient() {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
  const { error } = await client.auth.signInWithPassword({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  if (error) throw new Error(`test db sign-in failed: ${error.message}`);
  return client;
}

/** Every row this suite creates is prefixed so cleanup can never touch real content. */
export const TEST_PREFIX = "zz-phase24";

export async function deleteTestProjects() {
  const db = await dbClient();
  await db.from("projects").delete().like("slug", `${TEST_PREFIX}%`);
}
