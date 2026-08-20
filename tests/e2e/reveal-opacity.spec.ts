import { expect, test } from "@playwright/test";

/**
 * Guards the CSS scroll-driven reveal introduced in Phase 24
 * (styles/globals.css, `.reveal` / `.reveal-group`).
 *
 * `animation-timeline: view()` is scroll-*linked*, not scroll-*triggered*:
 * progress tracks the scroll position continuously instead of firing once the
 * way Framer Motion's `whileInView` + `viewport: { once: true }` did. The
 * failure mode that creates is real and was hit during this phase — with a
 * range ending at `cover 30%`, a section taller than the viewport could come
 * to rest part-way through its own fade, leaving body text sitting at roughly
 * 25% opacity for as long as the reader stayed at that scroll position.
 * Lighthouse reported it as a contrast failure (2.15:1 on the About heading)
 * and it was a genuine one.
 *
 * So this walks the real homepage down in viewport-sized steps and asserts
 * that nothing carrying a reveal class is ever left mid-fade while it is
 * meaningfully on screen. It is deliberately an assertion about *computed
 * opacity in a real browser*, not about the CSS text — the whole class of bug
 * is invisible in the source.
 */
const MIN_VISIBLE_OPACITY = 0.9;

test("no revealed element rests mid-fade while on screen", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const viewportHeight = page.viewportSize()!.height;
  const pageHeight = await page.evaluate(() => document.body.scrollHeight);
  const offenders: string[] = [];

  for (let y = 0; y <= pageHeight; y += Math.floor(viewportHeight / 2)) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" as ScrollBehavior }), y);
    // One frame for the scroll timeline to settle before sampling.
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

    const bad = await page.evaluate((minOpacity) => {
      const out: string[] = [];
      const nodes = document.querySelectorAll<HTMLElement>(".reveal, .reveal-group > *");
      for (const el of nodes) {
        const rect = el.getBoundingClientRect();
        // "Meaningfully on screen": at least 120px of it is inside the
        // viewport. An element barely peeking in is allowed to still be
        // fading — that is the animation doing its job.
        const visible = Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 0);
        if (visible < 120) continue;
        const opacity = Number(getComputedStyle(el).opacity);
        if (opacity < minOpacity) {
          out.push(`${el.tagName}${el.id ? "#" + el.id : ""}.${el.className.toString().slice(0, 40)} opacity=${opacity.toFixed(2)}`);
        }
      }
      return out;
    }, MIN_VISIBLE_OPACITY);

    for (const b of bad) offenders.push(`@scrollY=${y}: ${b}`);
  }

  expect(offenders, `Elements resting mid-fade:\n${offenders.join("\n")}`).toEqual([]);
});

/**
 * The reveal must not be able to strand content invisible for anyone who has
 * asked for reduced motion — under that setting the entire animation block in
 * globals.css does not exist, so every element should simply be opaque from
 * the start, with no scrolling required.
 */
test("reduced motion leaves all revealed content fully visible", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const faded = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>(".reveal, .reveal-group > *")]
      .filter((el) => Number(getComputedStyle(el).opacity) < 0.99)
      .map((el) => `${el.tagName}.${el.className.toString().slice(0, 40)}`),
  );

  expect(faded, `Faded under prefers-reduced-motion:\n${faded.join("\n")}`).toEqual([]);
  await ctx.close();
});

/**
 * The full `prefers-reduced-motion` pass (Phase 24 item 6), across every
 * animated component on the public site rather than just the scroll reveals:
 *
 *   - CSS-driven (Phase 24): `.reveal` / `.reveal-group` scroll reveals,
 *     `.hero-in-group` staggered hero entrance, `.hero-blob-*` ambient drift.
 *     All three live inside `@media (prefers-reduced-motion: no-preference)`
 *     in styles/globals.css, so under `reduce` the rules do not exist and no
 *     animation is even declared.
 *   - Framer-Motion-driven (still): the mobile menu, page transitions, the
 *     media lightbox. `MotionProvider`'s `reducedMotion="user"` collapses
 *     those.
 *   - `motion-safe:` utilities: Card's hover lift, the availability dot's
 *     pulse.
 *
 * Asserting on `getComputedStyle().animationName` is what makes this a real
 * check — it fails if someone adds a keyframe animation outside the guard.
 */
test("no animation is declared anywhere under prefers-reduced-motion", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const animating = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("body *")]
      .map((el) => ({ el, name: getComputedStyle(el).animationName }))
      .filter(({ name }) => name && name !== "none")
      .map(({ el, name }) => `${el.tagName}.${el.className.toString().slice(0, 50)} -> ${name}`),
  );

  expect(animating, `Animations still declared under reduced motion: ${animating.join(" | ")}`).toEqual([]);

  // And the hero's ambient blobs specifically — they are infinite, so a
  // regression here would animate forever rather than once.
  const blobs = await page.locator('[class*="hero-blob-"]').evaluateAll((els) =>
    els.map((e) => getComputedStyle(e).animationName),
  );
  expect(blobs.length).toBeGreaterThan(0);
  expect(blobs.every((n) => n === "none")).toBe(true);

  await ctx.close();
});

/**
 * The mirror of the test above: with motion *allowed*, the animations must
 * actually be declared. Without this, the reduced-motion test above would
 * still pass if someone deleted the animations altogether.
 */
test("animations are declared when motion is allowed", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "no-preference" });
  const page = await ctx.newPage();
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const blobs = await page.locator('[class*="hero-blob-"]').evaluateAll((els) =>
    els.map((e) => getComputedStyle(e).animationName),
  );
  expect(blobs.length).toBeGreaterThan(0);
  expect(blobs.every((n) => n.startsWith("hero-drift"))).toBe(true);

  const heroItems = await page.locator(".hero-in-group > *").evaluateAll((els) =>
    els.map((e) => getComputedStyle(e).animationName),
  );
  expect(heroItems.length).toBeGreaterThan(0);
  expect(heroItems.every((n) => n === "reveal-fade-up")).toBe(true);

  await ctx.close();
});
