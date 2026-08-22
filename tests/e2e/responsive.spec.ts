import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

/**
 * Responsive verification at the six widths Phase 24 asks for. Captures a
 * full-page screenshot of every route at every width into
 * `screenshots/responsive/`, and asserts the one thing that is objectively
 * wrong rather than a matter of taste: **no horizontal overflow**. A layout
 * that pushes the document wider than the viewport is the failure mode these
 * widths exist to catch, and it is measurable.
 *
 * Screenshots are artifacts for a human to look through; the overflow
 * assertion is what actually fails the build.
 */
const WIDTHS = [360, 390, 768, 1024, 1440, 1920];

const PUBLIC_ROUTES = [
  ["home", "/"],
  ["projects", "/projects"],
  ["project-detail", "/projects/customer-churn-prediction"],
  ["resume-unavailable", "/resume/unavailable"],
  ["styleguide", "/styleguide"],
] as const;

const ADMIN_ROUTES = [
  ["admin-dashboard", "/admin"],
  ["admin-projects", "/admin/projects"],
  ["admin-project-new", "/admin/projects/new"],
  ["admin-skills", "/admin/skills"],
  ["admin-settings", "/admin/settings"],
  ["admin-resume", "/admin/resume"],
] as const;

/** Documents wider than their viewport — the objective failure at any width. */
async function horizontalOverflow(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const docWidth = document.documentElement.scrollWidth;
    const viewport = window.innerWidth;
    if (docWidth <= viewport + 1) return null;
    // Name the widest offender so a failure is actionable.
    let worst = { tag: "", width: 0, cls: "" };
    for (const el of document.querySelectorAll<HTMLElement>("body *")) {
      const r = el.getBoundingClientRect();
      if (r.right > viewport + 1 && r.width > worst.width) {
        worst = { tag: el.tagName, width: Math.round(r.width), cls: el.className.toString().slice(0, 60) };
      }
    }
    return { docWidth, viewport, worst };
  });
}

for (const width of WIDTHS) {
  test(`public routes at ${width}px have no horizontal overflow`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const failures: string[] = [];

    for (const [name, url] of PUBLIC_ROUTES) {
      await page.goto(url, { waitUntil: "networkidle" });
      await page.screenshot({ path: `screenshots/responsive/${test.info().project.name}/${width}-${name}.png`, fullPage: true });
      const overflow = await horizontalOverflow(page);
      if (overflow) failures.push(`${name}: doc ${overflow.docWidth}px > viewport ${overflow.viewport}px — widest: <${overflow.worst.tag} class="${overflow.worst.cls}"> ${overflow.worst.width}px`);
    }

    expect(failures, `Horizontal overflow at ${width}px:\n${failures.join("\n")}`).toEqual([]);
  });
}

for (const width of WIDTHS) {
  test(`admin routes at ${width}px have no horizontal overflow`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await loginAsAdmin(page);
    const failures: string[] = [];

    for (const [name, url] of ADMIN_ROUTES) {
      await page.goto(url, { waitUntil: "networkidle" });
      await page.screenshot({ path: `screenshots/responsive/${test.info().project.name}/${width}-${name}.png`, fullPage: true });
      const overflow = await horizontalOverflow(page);
      if (overflow) failures.push(`${name}: doc ${overflow.docWidth}px > viewport ${overflow.viewport}px — widest: <${overflow.worst.tag} class="${overflow.worst.cls}"> ${overflow.worst.width}px`);
    }

    expect(failures, `Horizontal overflow at ${width}px:\n${failures.join("\n")}`).toEqual([]);
  });
}
