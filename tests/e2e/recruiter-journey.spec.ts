import { expect, test, type Page } from "@playwright/test";

/**
 * Waits out PageTransition's cross-fade before asserting on page structure.
 *
 * `components/layout/PageTransition.tsx` uses AnimatePresence in its default
 * *sync* mode (deliberately — `mode="wait"` would make every navigation wait
 * for the outgoing page to finish exiting first), so during a client-side
 * navigation both the outgoing and incoming pages are mounted at once.
 * Measured on this build, that window is ~113ms and contains **two `<h1>`
 * elements and 7 duplicated `id` attributes**. `<main>` is not duplicated
 * (PageTransition sits inside it) and everything settles to a single copy.
 *
 * Transient, but real: duplicated `id`s are invalid HTML, and for that window
 * an `aria-labelledby` can resolve to the wrong element. Recorded rather than
 * fixed — the fix is a design trade-off (either `mode="wait"`, costing ~150ms
 * on every navigation, or marking the exiting page `inert`).
 */
async function settle(page: Page) {
  await page.waitForFunction(() => document.querySelectorAll("h1").length <= 1, null, { timeout: 10_000 });
}

/**
 * Critical journey 1 — the recruiter:
 *   land -> read about -> view skills -> browse projects -> open a project
 *        -> download resume -> reach contact
 *
 * Deliberately driven through real navigation (nav links, card clicks) rather
 * than `goto` per step, because the thing under test is that the path from
 * one section to the next actually exists and works, not that each URL renders
 * in isolation.
 */
test("recruiter can go from landing to contact", async ({ page }) => {
  // Land
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // The primary landmarks a screen reader (and this test) navigates by.
  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("contentinfo")).toBeVisible();

  // Read about
  await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: /about/i }).click();
  await expect(page.locator("#about")).toBeInViewport({ timeout: 10_000 });
  await expect(page.getByRole("heading", { name: /background & focus/i })).toBeVisible();

  // View skills — the section renders only when it has rows, so assert on
  // real content rather than merely on the anchor existing.
  const skills = page.locator("#skills");
  await expect(skills).toHaveCount(1);
  await skills.scrollIntoViewIfNeeded();
  await expect(skills.getByRole("heading").first()).toBeVisible();

  // Browse projects
  await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: /projects/i }).click();
  await expect(page.locator("#projects")).toBeInViewport({ timeout: 10_000 });

  // Open a project — click the card itself, which is one whole link.
  const firstCard = page.locator('#projects a[href^="/projects/"]').first();
  const href = await firstCard.getAttribute("href");
  await firstCard.click();
  await page.waitForURL(`**${href}`);
  await settle(page);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // Download resume. With the seeded placeholder assets the active resume
  // row exists (so every "Download Resume" CTA renders) but its file_url
  // points at a document that was never added to public/, so the route
  // redirects to its own explicit unavailable page instead of 404ing or
  // serving a broken download. Both outcomes are acceptable here; what must
  // not happen is an error page or a dead link.
  const resume = await page.request.get("/resume");
  expect(resume.status()).toBe(200);
  expect(resume.url()).toMatch(/\/resume(\/unavailable)?$/);

  // Reach contact
  await page.goto("/");
  await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: /contact/i }).click();
  await expect(page.locator("#contact")).toBeInViewport({ timeout: 10_000 });
  await expect(page.locator('#contact a[href^="mailto:"]').first()).toBeVisible();
});

/**
 * The same journey's entry points must work from a project page too — the
 * anchors are rewritten to "/#section" off the homepage, and a broken rewrite
 * would silently do nothing rather than error.
 */
test("section anchors still work from a project page", async ({ page }) => {
  await page.goto("/");
  const href = await page.locator('#projects a[href^="/projects/"]').first().getAttribute("href");
  await page.goto(href!);

  await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: /about/i }).click();
  await page.waitForURL(/\/#about$/);
  await settle(page);
  await expect(page.locator("#about")).toBeInViewport({ timeout: 10_000 });
});
