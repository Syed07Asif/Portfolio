import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * `SITE_URL` resolution — the regression test for a build failure that only
 * ever appeared on a real host.
 *
 * The original implementation was
 * `process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"`, which is
 * wrong in one specific way: `??` falls back on `null`/`undefined` but not
 * on `""`. A variable that exists with an empty value — trivially easy to
 * create in a Vercel dashboard, and the natural state of one added before
 * the domain is known — passed straight through, and `new URL("")` threw
 * `ERR_INVALID_URL` during static generation. The build died with
 * `Failed to collect page data for /_not-found`, naming a route that has
 * nothing whatever to do with the cause.
 *
 * `SITE_URL` is a module-level const evaluated at import time, so each case
 * has to stub the environment and then re-import the module — hence
 * `resetModules` rather than a plain function call.
 */

async function siteUrlWith(value: string | undefined): Promise<string> {
  vi.resetModules();
  if (value === undefined) {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    // stubEnv can only set strings; deleting is the only way to model "unset".
    delete process.env.NEXT_PUBLIC_SITE_URL;
  } else {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", value);
  }
  const { SITE_URL } = await import("@/lib/seo");
  return SITE_URL;
}

const FALLBACK = "http://localhost:3000";

describe("SITE_URL", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("uses a valid absolute URL as-is", async () => {
    expect(await siteUrlWith("https://example.com")).toBe("https://example.com");
  });

  it("strips trailing slashes", async () => {
    expect(await siteUrlWith("https://example.com/")).toBe("https://example.com");
    expect(await siteUrlWith("https://example.com///")).toBe("https://example.com");
  });

  it("falls back when the variable is unset", async () => {
    expect(await siteUrlWith(undefined)).toBe(FALLBACK);
  });

  // The case that broke the first production build.
  it("falls back when the variable is set but empty", async () => {
    expect(await siteUrlWith("")).toBe(FALLBACK);
  });

  it("falls back when the variable is only whitespace", async () => {
    expect(await siteUrlWith("   ")).toBe(FALLBACK);
  });

  it("falls back when the value has no scheme", async () => {
    // A bare hostname is the single most likely thing to be typed by hand,
    // and `new URL("example.com")` throws rather than assuming https.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await siteUrlWith("example.com")).toBe(FALLBACK);
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it("never throws, whatever it is given", async () => {
    for (const value of ["", " ", "example.com", "http://", "://nope", "https://ok.example"]) {
      await expect(siteUrlWith(value)).resolves.toBeTypeOf("string");
    }
  });
});

describe("METADATA_BASE", () => {
  it("is constructible from the resolved SITE_URL even when the env var is empty", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    // This is the exact expression that threw ERR_INVALID_URL and failed the
    // build: `new URL(SITE_URL)` at module scope.
    const { METADATA_BASE } = await import("@/lib/seo");
    expect(METADATA_BASE.origin).toBe(FALLBACK);
    vi.unstubAllEnvs();
  });
});
