import { expect, test } from "@playwright/test";
import { dbClient, deleteTestProjects, loginAsAdmin, TEST_PREFIX } from "./helpers";

/**
 * Critical journey 2 — the owner:
 *   log in -> create a project -> upload media -> preview -> publish
 *          -> verify it is live
 *
 * The upload step uses a real file through the real `<input type="file">`, so
 * it exercises lib/storage/upload.ts and Supabase Storage rather than
 * simulating a completed upload. The preview step goes through the actual
 * draft-mode route (`/admin/preview/enable`), which is the only way an
 * unpublished project is legitimately viewable — and is the assertion that
 * could not live in tests/lib/data/published.test.ts, since
 * `fetchProjectBySlugForPreview` needs a real request context.
 */
test.describe.configure({ mode: "serial" });

const SLUG = `${TEST_PREFIX}-owner`;
let projectId = "";

test.beforeAll(async () => { await deleteTestProjects(); });
test.afterAll(async () => { await deleteTestProjects(); });

test("owner logs in and creates a project", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/projects/new");

  await page.getByLabel("Name", { exact: true }).fill("ZZ Phase24 Owner");
  await page.getByLabel("Slug", { exact: true }).fill(SLUG);
  await page.getByLabel(/short description/i).fill("Owner journey end-to-end project.");
  await page.getByRole("button", { name: /^Create$/ }).click();
  await page.waitForURL(/\/admin\/projects(?!\/new)/, { timeout: 30_000 });

  const db = await dbClient();
  const { data } = await db.from("projects").select("id, published").eq("slug", SLUG).single();
  projectId = data!.id;
  expect(data!.published).toBe(false);
});

test("owner uploads media to the project", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto(`/admin/projects/${projectId}/edit`);
  await page.getByRole("tab", { name: /^media$/i }).click();

  // A real 1x1 PNG, uploaded through the real hidden file input. The input is
  // `aria-hidden` + `tabIndex={-1}` (Phase 24) but still perfectly usable by
  // `setInputFiles`, which is what the visible button drives via `.click()`.
  const png = Buffer.from(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6360000002000100" +
    "05fe02fea7b5f1cd0000000049454e44ae426082", "hex");
  // The Media tab has TWO file inputs: the project's Cover image
  // (ImageUploader -> projects.cover_image_url) and the Gallery
  // (ProjectMediaManager -> project_media rows). The gallery one is last;
  // targeting `.first()` silently uploads a cover image instead and never
  // creates the media row this test is about. Scoped to the active tabpanel
  // because Radix unmounts inactive ones, so "first"/"last" are only
  // meaningful within the open tab.
  const panel = page.locator('[role="tabpanel"][data-state="active"]');
  await panel.locator('input[type="file"]').last().setInputFiles({
    name: "phase24.png", mimeType: "image/png", buffer: png,
  });

  // Wait for the upload to actually resolve: the manager renders a preview
  // whose src is the real Supabase Storage public URL. Asserting on the
  // storage path rather than on the original filename, because the uploader
  // generates its own object key.
  await expect(panel.locator('img[src*="/storage/v1/object/public/projects"]').first())
    .toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("button", { name: /save changes/i })).toBeEnabled({ timeout: 30_000 });

  await page.getByRole("button", { name: /save changes/i }).click();
  await page.waitForURL(/\/admin\/projects(?!\/)/, { timeout: 30_000 });

  const db = await dbClient();
  const { data } = await db.from("project_media").select("file_url").eq("project_id", projectId);
  expect(data ?? []).not.toHaveLength(0);
  expect(data?.[0]?.file_url ?? "").toContain("/storage/v1/object/public/projects");
});

test("owner previews the unpublished project via draft mode", async ({ page }) => {
  await loginAsAdmin(page);

  // Anonymous access must still be refused while it is a draft.
  const anon = await page.request.get(`/projects/${SLUG}`);
  expect(await anon.text()).not.toContain("ZZ Phase24 Owner");

  // Draft mode is the one legitimate way in.
  await page.goto(`/admin/preview/enable?path=/projects/${SLUG}`);
  await page.waitForURL(`**/projects/${SLUG}`, { timeout: 30_000 });
  await expect(page.getByRole("heading", { level: 1 })).toContainText("ZZ Phase24 Owner");
  await expect(page.getByText(/draft|preview/i).first()).toBeVisible();

  await page.goto("/admin/preview/disable");
});

test("owner publishes it and it goes live", async ({ page, request }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/projects");
  await page.getByLabel("Search projects by name").fill("ZZ Phase24 Owner");
  await expect(page.getByText(`/projects/${SLUG}`)).toHaveCount(1, { timeout: 10_000 });
  await page.getByRole("switch", { name: /^Publish project$/ }).click();

  const db = await dbClient();
  await expect.poll(async () => {
    const { data } = await db.from("projects").select("published").eq("id", projectId).single();
    return data?.published;
  }, { timeout: 20_000 }).toBe(true);

  // Verified through the independent `request` fixture, which does not share
  // the browser context's HTTP cache — see admin-crud.spec.ts for why that
  // distinction matters on this route.
  await expect.poll(async () => {
    const res = await request.get(`/projects/${SLUG}`);
    return (await res.text()).includes("ZZ Phase24 Owner");
  }, { timeout: 30_000, intervals: [500, 1000, 2000, 3000] }).toBe(true);

  // And it is reachable from the public projects index, not just by URL.
  await expect.poll(async () => {
    const res = await request.get("/projects");
    return (await res.text()).includes(SLUG);
  }, { timeout: 30_000, intervals: [500, 1000, 2000, 3000] }).toBe(true);
});
