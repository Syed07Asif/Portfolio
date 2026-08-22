import { defineConfig, devices } from "@playwright/test";

/**
 * E2E tests drive the *installed* Chrome and Edge via `channel`, deliberately
 * rather than Playwright's own bundled browsers: `npx playwright install`
 * pulls ~300MB, and this project's cross-browser requirement (Phase 24 item
 * 14) is specifically "Chrome and Edge at minimum" — both of which are
 * already on this machine. No Safari/WebKit on Windows, so that gap is
 * reported rather than silently skipped.
 *
 * Tests run against a *production* server (`npm run build && npm run start`),
 * never `next dev` — dev-mode timing and bundle behaviour are meaningless
 * for the performance targets, and draft-mode/caching behave differently.
 * `reuseExistingServer` keeps an already-running prod server rather than
 * rebuilding on every invocation.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  // Admin CRUD tests mutate shared rows in one local database; running them
  // in parallel would let one test's delete race another's edit.
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chrome", use: { ...devices["Desktop Chrome"], channel: "chrome" } },
    { name: "edge", use: { ...devices["Desktop Edge"], channel: "msedge" } },
  ],
  webServer: {
    command: "npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
