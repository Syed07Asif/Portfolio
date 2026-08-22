import { expect, test } from "@playwright/test";
import {
  countProjectStorageObjects,
  dbClient,
  deleteTestProjects,
  loginAsAdmin,
  TEST_PREFIX,
} from "./helpers";

/**
 * Deleting a record must reclaim the files it owns.
 *
 * This is the regression test for a bug that was invisible from every
 * surface a person can look at. Uploading a file on a *create* form happens
 * before the row exists, so `<Entity>Form` generated a placeholder id and
 * uploaded to `projects/{placeholder}/…`. The insert then let Postgres
 * generate a *different* id, and nothing ever reconciled the two. The row's
 * `file_url` still pointed at the placeholder folder, so the image rendered
 * perfectly and the admin panel looked correct — but
 * `deleteStorageFolder(bucket, realId)` looked in a folder that had never
 * held anything, and every file uploaded before the first save was orphaned
 * permanently.
 *
 * Neither the database nor the UI can show you that. The only way to see it
 * is to count objects in the bucket before and after, which is what this
 * does. The fix (lib/actions/shared.ts's `resolveNewRecordId`) makes the
 * placeholder *become* the primary key, so there is no second folder.
 *
 * Both orderings are covered because they exercise different code paths:
 * uploading during create is the one that was broken; uploading during edit
 * already worked and must keep working.
 *
 * Note both tests delete through the **admin UI**, not through
 * `deleteTestProjects()`. That helper now sweeps Storage itself (it has to —
 * it bypasses the action deliberately), which would make these assertions
 * pass whether or not `deleteProject` reclaims anything. Only the real
 * delete button exercises the thing under test.
 */
test.describe.configure({ mode: "serial" });

const PNG = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6360000002000100" +
    "05fe02fea7b5f1cd0000000049454e44ae426082",
  "hex",
);

/**
 * Waits for an `ImageUploader` to finish *and* for its value to reach the
 * form, then submits nothing — the caller decides that.
 *
 * Getting this signal right took two wrong attempts, both worth recording
 * because both look correct:
 *
 * 1. Waiting for an `img` whose `src` is a Storage URL never resolves. The
 *    preview stays the local `blob:` URL from `URL.createObjectURL` for the
 *    whole lifetime of the component; only the *gallery* (a different
 *    component, used in owner-journey.spec.ts) renders the real URL.
 * 2. Waiting for the Replace button — which `ImageUploader` renders exactly
 *    when `!isUploading && displayUrl` — resolves too early. The test then
 *    clicked Create before `onChange(result.url)` had put the URL into
 *    react-hook-form's state, and the project saved with a null `logo_url`
 *    while the file sat in Storage. That failure is indistinguishable from
 *    the orphan bug this file exists to catch, which is exactly why it is
 *    called out here.
 *
 * The toast is the causally correct signal: `handleFile` emits it on the
 * line immediately after `onChange`, so seeing it guarantees the form
 * already holds the uploaded URL.
 */
async function waitForUpload(page: import("@playwright/test").Page) {
  await expect(page.getByText("Image uploaded.")).toBeVisible({ timeout: 60_000 });
}

/** Deletes a project through the real admin UI, so `deleteProject` — and therefore `deleteStorageFolder` — actually runs. */
async function deleteViaAdminUi(page: import("@playwright/test").Page, name: string) {
  await page.goto("/admin/projects");
  await page.getByLabel("Search projects by name").fill(name);
  await expect(page.getByText(`/projects/${TEST_PREFIX}`)).toHaveCount(1, { timeout: 10_000 });

  await page.getByRole("button", { name: /open menu|actions|more/i }).click();
  await page.getByRole("menuitem", { name: /delete/i }).click();
  await page.getByRole("button", { name: /^delete$/i }).click();

  const db = await dbClient();
  await expect
    .poll(async () => {
      const { data } = await db.from("projects").select("id").like("slug", `${TEST_PREFIX}%`);
      return data?.length;
    }, { timeout: 20_000 })
    .toBe(0);
}

test.beforeAll(async () => {
  await deleteTestProjects();
});
test.afterAll(async () => {
  await deleteTestProjects();
});

test("a file uploaded before the first save is reclaimed on delete", async ({ page }) => {
  const before = await countProjectStorageObjects();

  await loginAsAdmin(page);
  await page.goto("/admin/projects/new");

  const slug = `${TEST_PREFIX}-orphan-create`;
  await page.getByLabel("Name", { exact: true }).fill("ZZ Phase25 Orphan Create");
  await page.getByLabel("Slug", { exact: true }).fill(slug);
  await page.getByLabel(/short description/i).fill("Upload happens before the row exists.");

  // The Logo uploader, the one file input on the Basics tab — and the exact
  // path that used to write into a placeholder folder the record would never
  // own. (The cover-image and gallery uploaders live on the Media tab, which
  // Radix keeps unmounted until it is opened.)
  await page.locator('input[type="file"]').first().setInputFiles({
    name: "phase25.png",
    mimeType: "image/png",
    buffer: PNG,
  });
  await waitForUpload(page);

  await page.getByRole("button", { name: /^Create$/ }).click();
  await page.waitForURL(/\/admin\/projects(?!\/new)/, { timeout: 30_000 });

  const db = await dbClient();
  const { data: created } = await db.from("projects").select("id, logo_url").eq("slug", slug).single();
  expect(created?.logo_url ?? "").toContain("/storage/v1/object/public/projects");

  // The heart of it: the file must live under the folder named by the row's
  // own id. Before the fix it lived under a placeholder id instead, and this
  // assertion is what fails.
  expect(created?.logo_url ?? "").toContain(`/projects/${created!.id}/`);
  expect(await countProjectStorageObjects()).toBe(before + 1);

  await deleteViaAdminUi(page, "ZZ Phase25 Orphan Create");
  expect(await countProjectStorageObjects()).toBe(before);
});

test("a file uploaded while editing is reclaimed on delete", async ({ page }) => {
  const before = await countProjectStorageObjects();

  await loginAsAdmin(page);
  await page.goto("/admin/projects/new");

  const slug = `${TEST_PREFIX}-orphan-edit`;
  await page.getByLabel("Name", { exact: true }).fill("ZZ Phase25 Orphan Edit");
  await page.getByLabel("Slug", { exact: true }).fill(slug);
  await page.getByLabel(/short description/i).fill("Upload happens after the row exists.");
  await page.getByRole("button", { name: /^Create$/ }).click();
  await page.waitForURL(/\/admin\/projects(?!\/new)/, { timeout: 30_000 });

  const db = await dbClient();
  const { data: created } = await db.from("projects").select("id").eq("slug", slug).single();

  await page.goto(`/admin/projects/${created!.id}/edit`);
  await page.locator('input[type="file"]').first().setInputFiles({
    name: "phase25-edit.png",
    mimeType: "image/png",
    buffer: PNG,
  });
  await waitForUpload(page);
  await page.getByRole("button", { name: /save changes/i }).click();
  await page.waitForURL(/\/admin\/projects(?!\/)/, { timeout: 30_000 });

  expect(await countProjectStorageObjects()).toBe(before + 1);

  await deleteViaAdminUi(page, "ZZ Phase25 Orphan Edit");
  expect(await countProjectStorageObjects()).toBe(before);
});
