import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Vitest covers the layers that can be exercised without a browser: Zod
 * schemas, pure helpers in lib/, and the lib/data access layer run against
 * the real local Supabase stack (the `fetchX` functions specifically — the
 * cached `getX` wrappers need a Next.js server runtime, exactly as
 * tests/lib/data/smoke.ts already documents).
 *
 * Browser-level behaviour (admin login, CRUD through the real forms, file
 * upload, the two critical journeys) lives in Playwright instead — see
 * playwright.config.ts. The split is deliberate: anything that needs a
 * Server Action, a session cookie, or a rendered page is an E2E test here,
 * not a mocked unit test that would pass while the real thing is broken.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // The data-layer tests hit a real database over the network; the 5s
    // default is tight for a cold PostgREST connection on Windows.
    testTimeout: 20_000,
    setupFiles: ["tests/setup.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
