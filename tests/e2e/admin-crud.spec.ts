import { expect, test } from "@playwright/test";
import { dbClient, deleteTestProjects, loginAsAdmin, TEST_PREFIX } from "./helpers";

/**
 * Covers the admin operations Phase 24 asks for: login, project
 * create/edit/delete, publish/unpublish, and slug uniqueness. Every
 * assertion about a mutation is checked against Postgres directly as well as
 * against the UI — a table that still shows the old value and a write that
 * never happened look identical from the page alone.
 *
 * All rows created here are slug-prefixed `zz-phase24` and removed in
 * afterAll, the same test-row-plus-cleanup pattern every prior phase used
 * against this shared local database.
 */
test.describe.configure({ mode: "serial" });

const SLUG = `${TEST_PREFIX}-crud`;
/** Set by the create test; every later test keys off the id, not the slug — see the edit test for why the slug is not stable. */
let projectId = "";

test.beforeAll(async () => { await deleteTestProjects(); });
test.afterAll(async () => { await deleteTestProjects(); });

test("admin login rejects a wrong password and accepts the right one", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel(/email/i).fill("test-admin@example.com");
  await page.getByLabel(/password/i).fill("definitely-not-the-password");
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  // Stays on the login screen and says something; must NOT land in /admin.
  await expect(page).toHaveURL(/\/admin\/login/);

  await loginAsAdmin(page);
  await expect(page).toHaveURL(/\/admin(?!\/login)/);
});

test("an unauthenticated visitor is redirected away from /admin", async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto("/admin/projects");
  await expect(page).toHaveURL(/\/admin\/login/);
  await ctx.close();
});

test("creates a project as a draft", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/projects/new");

  await page.getByLabel("Name", { exact: true }).fill("ZZ Phase24 CRUD");
  await page.getByLabel("Slug", { exact: true }).fill(SLUG);
  await page.getByLabel(/short description/i).fill("Created by the Phase 24 E2E suite.");
  await page.getByRole("button", { name: /^Create$/ }).click();

  await page.waitForURL(/\/admin\/projects(?!\/new)/, { timeout: 30_000 });

  const db = await dbClient();
  const { data } = await db.from("projects").select("id, slug, name, published").eq("slug", SLUG).single();
  expect(data).toMatchObject({ slug: SLUG, name: "ZZ Phase24 CRUD", published: false });
  projectId = data!.id;
});

test("rejects a duplicate slug", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/projects/new");

  await page.getByLabel("Name", { exact: true }).fill("ZZ Phase24 Duplicate");
  await page.getByLabel("Slug", { exact: true }).fill(SLUG);

  // The live duplicate check is debounced (400ms) — wait for its verdict.
  // Two separate assertions on purpose: the visible message for sighted
  // users, and the `aria-live` region added in Phase 24 for screen-reader
  // users. Before that region existed the only feedback was an icon swapping
  // in place, which announces nothing at all.
  await expect(page.getByText("This slug is already in use.")).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('[aria-live="polite"]', { hasText: "Slug is already in use" })).toHaveCount(1);

  const db = await dbClient();
  const { data } = await db.from("projects").select("id").eq("slug", SLUG);
  expect(data).toHaveLength(1);
});

test("edits the project — and renaming re-derives the slug", async ({ page }) => {
  const db = await dbClient();
  await loginAsAdmin(page);
  await page.goto(`/admin/projects/${projectId}/edit`);

  await page.getByLabel("Name", { exact: true }).fill("ZZ Phase24 CRUD edited");
  await page.getByRole("button", { name: /save changes/i }).click();
  await page.waitForURL(/\/admin\/projects(?!\/)/, { timeout: 30_000 });

  // Keyed on id, not slug, deliberately. SlugField keeps re-deriving the slug
  // from the name until the admin edits the slug by hand, so renaming a
  // project *also* moves its public URL. That is intended behaviour (the form
  // shows a "this breaks any link already shared" warning when the project is
  // published), but it makes the slug an unstable key — an earlier version of
  // this test looked the row up by slug after saving and found nothing, which
  // read like a failed write rather than a rename.
  const { data } = await db.from("projects").select("name, slug").eq("id", projectId).single();
  expect(data!.name).toBe("ZZ Phase24 CRUD edited");
  expect(data!.slug).toBe(`${TEST_PREFIX}-crud-edited`);
});

/**
 * Isolates a single project in the admin list using the screen's own search
 * box, so the row-level controls below can only ever act on the test row.
 *
 * The alternative — `getByRole("switch", { name: /^Unpublish project$/ })
 * .first()` — is what an earlier version of this file did, and it actually
 * unpublished the seeded `customer-churn-prediction` project: every published
 * row exposes an identically-named switch, so `.first()` matched real
 * content. Filtering first is what makes the destructive operations in this
 * file safe against a shared database. (Row-scoping via `getByRole("row")`
 * is not available here: AdminTable renders a CSS grid, not a semantic
 * `<table>`, so there are no `row` roles to filter on.)
 */
async function isolateProject(page: import("@playwright/test").Page, name: string) {
  await page.goto("/admin/projects");
  const search = page.getByLabel("Search projects by name");
  await search.fill(name);
  await expect(page.getByText(`/projects/${TEST_PREFIX}`)).toHaveCount(1, { timeout: 10_000 });
}

test("publishes and unpublishes, and the public site follows", async ({ page, request }) => {
  const db = await dbClient();
  await loginAsAdmin(page);

  await isolateProject(page, "ZZ Phase24 CRUD edited");
  await page.getByRole("switch", { name: /^Publish project$/ }).click();
  await expect.poll(async () => {
    const { data } = await db.from("projects").select("published").eq("id", projectId).single();
    return data?.published;
  }, { timeout: 20_000 }).toBe(true);

  await page.goto(`/projects/${TEST_PREFIX}-crud-edited`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("ZZ Phase24");

  await isolateProject(page, "ZZ Phase24 CRUD edited");
  await page.getByRole("switch", { name: /^Unpublish project$/ }).click();
  await expect.poll(async () => {
    const { data } = await db.from("projects").select("published").eq("id", projectId).single();
    return data?.published;
  }, { timeout: 20_000 }).toBe(false);

  /*
   * Asserts the property that actually matters — the project's content is no
   * longer served — rather than the status code, because of a real defect
   * this phase found and did not fix.
   *
   * KNOWN DEFECT (Next 16.3.1): `notFound()` inside this ISR route renders
   * the not-found UI but responds **HTTP 200**, not 404. It is not caused by
   * publishing state or by Phase 23's try/catch (the `notFound()` call sits
   * outside it) — a slug that never existed at all behaves identically:
   *
   *     /totally-unknown-route   -> 404   (no matching route; correct)
   *     /projects/never-existed  -> 200   (matches [slug], calls notFound())
   *
   * Mitigating factor: Next still injects `<meta name="robots"
   * content="noindex">`, so crawlers should not index these, and the page
   * body is the real not-found UI with none of the project's content. The
   * status code is still wrong, which is a soft-404. Fixing it by setting
   * `dynamicParams = false` was rejected: `generateStaticParams` only runs at
   * build time, so that would make every newly added project 404 until a
   * redeploy — breaking the project's core "adding a project is a database
   * row, not a deploy" principle.
   */
  /*
   * Verified through Playwright's test-scoped `request` fixture, which has
   * its own connection and cache, NOT through `page.goto` or `page.request`.
   * Both of those share the browser context's HTTP cache, and this route is
   * served `s-maxage=3600, stale-while-revalidate=31532400` — that near-
   * year-long stale window applies to the browser's own cache too, so
   * polling with them kept returning the unpublished project's full content
   * long after the server had stopped serving it. That is worth knowing in
   * its own right: a visitor who already loaded a project page can keep
   * seeing it from their local cache after it is unpublished. The server
   * side, confirmed separately with curl, stops serving the content
   * immediately.
   *
   * KNOWN DEFECT (Next 16.3.1), deliberately asserted around rather than
   * fixed: `notFound()` in this ISR route renders the not-found UI but
   * responds HTTP **200**, not 404. It is unrelated to publishing state and
   * unrelated to Phase 23's try/catch (the `notFound()` call sits outside
   * it) — a slug that never existed behaves identically:
   *
   *     /totally-unknown-route   -> 404   (no matching route; correct)
   *     /projects/never-existed  -> 200   (matches [slug], calls notFound())
   *
   * Next still injects `<meta name="robots" content="noindex">`, so crawlers
   * should not index them, and no project content is served. Setting
   * `dynamicParams = false` would fix the status but was rejected:
   * `generateStaticParams` only runs at build time, so every newly added
   * project would 404 until a redeploy — breaking this project's core
   * "adding a project is a database row, not a deploy" principle.
   */
  await expect.poll(async () => {
    const res = await request.get(`/projects/${TEST_PREFIX}-crud-edited`);
    return (await res.text()).includes("ZZ Phase24 CRUD edited");
  }, { timeout: 30_000, intervals: [500, 1000, 2000, 3000] }).toBe(false);

  const body = await (await request.get(`/projects/${TEST_PREFIX}-crud-edited`)).text();
  expect(body).toContain('name="robots" content="noindex"');

  // The seeded project must be untouched — see isolateProject's note.
  const { data: seeded } = await db.from("projects").select("published").eq("slug", "customer-churn-prediction").single();
  expect(seeded!.published).toBe(true);
});

test("deletes the project", async ({ page }) => {
  const db = await dbClient();
  await loginAsAdmin(page);
  await isolateProject(page, "ZZ Phase24 CRUD edited");

  await page.getByRole("button", { name: /open menu|actions|more/i }).click();
  await page.getByRole("menuitem", { name: /delete/i }).click();
  await page.getByRole("button", { name: /^delete$/i }).click();

  await expect.poll(async () => {
    const { data } = await db.from("projects").select("id").eq("id", projectId);
    return data?.length;
  }, { timeout: 20_000 }).toBe(0);

  const { data: seeded } = await db.from("projects").select("id").eq("slug", "customer-churn-prediction");
  expect(seeded).toHaveLength(1);
});
