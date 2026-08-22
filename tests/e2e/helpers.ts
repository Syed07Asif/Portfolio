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

/**
 * Removes this suite's test projects *and* the Storage objects they own.
 *
 * The storage half is not incidental tidying. This helper deletes rows
 * straight through PostgREST, deliberately — it is fixture cleanup, and
 * routing it through `deleteProject` would make setup depend on the very
 * action some of these tests are asserting about. But that also means it
 * skips `deleteStorageFolder`, which is the *only* thing that removes a
 * project's uploaded files. Phase 25 measured the result: `storage.objects`
 * went 0 -> 2 across a single full run (one per browser project), because
 * owner-journey.spec.ts uploads a real file and nothing ever removed it.
 *
 * So the folder has to be cleared explicitly here. The ids are read before
 * the delete, since afterwards there is nothing left to look them up by.
 */
export async function deleteTestProjects() {
  const db = await dbClient();

  const { data: doomed } = await db
    .from("projects")
    .select("id")
    .like("slug", `${TEST_PREFIX}%`);

  await db.from("projects").delete().like("slug", `${TEST_PREFIX}%`);

  for (const { id } of doomed ?? []) {
    const { data: entries } = await db.storage.from("projects").list(id);
    if (!entries || entries.length === 0) continue;
    await db.storage.from("projects").remove(entries.map((entry) => `${id}/${entry.name}`));
  }
}

/**
 * How many objects sit in the `projects` bucket right now. Used by
 * storage-cleanup.spec.ts to assert that a delete actually reclaims them
 * rather than leaving orphans behind — a count is the only way to see this,
 * since an orphaned file is invisible from the UI and from the database.
 */
export async function countProjectStorageObjects(): Promise<number> {
  const db = await dbClient();
  const { data: folders } = await db.storage.from("projects").list("");
  if (!folders) return 0;

  let total = 0;
  for (const folder of folders) {
    // A null id means "folder", matching the convention scripts/export-storage.ts
    // relies on; a non-null id is a file sitting at the bucket root.
    if (folder.id !== null) {
      total += 1;
      continue;
    }
    const { data: entries } = await db.storage.from("projects").list(folder.name);
    total += entries?.filter((entry) => entry.id !== null).length ?? 0;
  }
  return total;
}
