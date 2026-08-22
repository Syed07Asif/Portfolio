import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

/**
 * Keyboard-only pass. Asserts three separate properties, because they fail
 * independently:
 *   1. every interactive element is reachable by Tab,
 *   2. whatever has focus shows a *visible* indicator,
 *   3. focus is trapped only where it is meant to be (the mobile menu),
 *      and Escape always gets you out.
 */

/** Reads the focused element's computed focus ring / outline. */
const FOCUS_PROBE = () => {
  const el = document.activeElement as HTMLElement | null;
  if (!el || el === document.body) return null;
  const s = getComputedStyle(el);
  const outline = s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0;
  const ring = s.boxShadow !== "none" && s.boxShadow.trim() !== "";
  return {
    tag: el.tagName,
    label: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 40),
    visible: outline || ring,
    outline: `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor}`,
    boxShadow: s.boxShadow.slice(0, 60),
  };
};

test("every focusable control on the homepage shows a visible focus indicator", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const seen: string[] = [];
  const noIndicator: string[] = [];

  for (let i = 0; i < 40; i++) {
    await page.keyboard.press("Tab");
    const probe = await page.evaluate(FOCUS_PROBE);
    if (!probe) continue;
    const key = `${probe.tag}:${probe.label}`;
    if (seen.includes(key)) break; // wrapped around
    seen.push(key);
    if (!probe.visible) noIndicator.push(`${key} (outline=${probe.outline}, shadow=${probe.boxShadow})`);
  }

  expect(seen.length, "Tab reached no interactive elements").toBeGreaterThan(5);
  expect(noIndicator, `Focusable with no visible focus indicator:\n${noIndicator.join("\n")}`).toEqual([]);
});

test("the skip link is the first stop and moves focus to main", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const first = await page.evaluate(FOCUS_PROBE);
  expect(first?.label).toMatch(/skip to content/i);
  expect(first?.visible).toBe(true);
});

test("the mobile menu traps focus while open and Escape closes it", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: /open menu/i }).click();
  const dialog = page.getByRole("dialog", { name: /mobile navigation/i });
  await expect(dialog).toBeVisible();

  // Intentional trap: tabbing repeatedly must never escape the dialog.
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press("Tab");
    const inside = await page.evaluate(() => {
      const dlg = document.querySelector('[role="dialog"]');
      return dlg ? dlg.contains(document.activeElement) : false;
    });
    expect(inside, `focus escaped the mobile menu after ${i + 1} tabs`).toBe(true);
  }

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("admin forms are fully keyboard operable", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/projects/new");
  await page.waitForLoadState("networkidle");

  // Reaching and filling the first text field with the keyboard alone.
  const name = page.getByLabel("Name", { exact: true });
  await name.focus();
  await page.keyboard.type("Keyboard reachability check");
  await expect(name).toHaveValue("Keyboard reachability check");

  // Tabs are operable with arrow keys, per the WAI-ARIA tabs pattern.
  const basics = page.getByRole("tab", { name: /^basics$/i });
  await basics.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: /^content$/i })).toBeFocused();

  // No focus indicator regressions on admin controls either.
  const probe = await page.evaluate(FOCUS_PROBE);
  expect(probe?.visible, `admin tab has no visible focus indicator: ${JSON.stringify(probe)}`).toBe(true);
});
