import type { NextConfig } from "next";

/**
 * The Supabase origin (scheme + host + port) this build talks to, or null
 * when NEXT_PUBLIC_SUPABASE_URL isn't set (which is the case for tooling
 * that imports this config without an env file). Both the image
 * remote-pattern allowlist and the Content-Security-Policy need it, and
 * both must agree — deriving them from one place is what keeps them in
 * sync when the project moves between local, preview and production.
 */
function supabaseOrigin(): string | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;
  try {
    return new URL(supabaseUrl).origin;
  } catch {
    return null;
  }
}

/**
 * Whitelists Supabase Storage as a remote image source for next/image, so
 * the Phase 14 media gallery's real (non-relative-path) file_urls actually
 * get optimized instead of erroring at request time — a gap Avatar.tsx and
 * AboutPortrait.tsx both already flagged in their own comments (worked
 * around there with `unoptimized`/same-origin-only images) but never fixed,
 * since nothing before this phase needed real optimization of remote
 * project assets. Scoped to Storage's public-object path specifically,
 * not the whole Supabase host, since that's the only path this project
 * ever serves images from.
 */
function supabaseStorageRemotePattern(): NonNullable<NextConfig["images"]>["remotePatterns"] {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return [];

  const { protocol, hostname, port } = new URL(supabaseUrl);
  return [
    {
      protocol: protocol === "https:" ? "https" : "http",
      hostname,
      port,
      pathname: "/storage/v1/object/public/**",
    },
  ];
}

/**
 * Content-Security-Policy (Phase 25).
 *
 * ## Why this is a static header and not a per-request nonce
 *
 * Next's own CSP guide offers two shapes: a nonce generated in `proxy.ts`,
 * or a static header in this file. The nonce is the stronger policy, and it
 * is the wrong one for this site: nonces must be unique per request, so
 * Next can only inject them while *dynamically* rendering. Adopting one
 * would disable static generation and ISR across the whole public site —
 * the homepage, /projects, every project page and the sitemap are all `○`
 * or `●` in the build output today, revalidating hourly. Trading all of
 * that for `'unsafe-inline'` removal is a bad deal here, because the thing
 * `'unsafe-inline'` protects against is injected inline script, and this
 * site renders no user-authored HTML anywhere: every string that reaches
 * the page comes from a Zod-validated admin form and is rendered as text
 * by React, which escapes it. The single `dangerouslySetInnerHTML` in the
 * codebase is components/seo/JsonLd.tsx, and it emits
 * `JSON.stringify(data)` with `<` escaped into a
 * `<script type="application/ld+json">` data block — not executable
 * script, and not a string a visitor can influence. So the realistic XSS
 * surface the nonce would close is empty, and the ISR it would cost is
 * real.
 *
 * `'unsafe-inline'` is required for `style-src` regardless of that choice:
 * Framer Motion animates by writing to `element.style`, which CSP governs
 * as an inline style.
 *
 * ## What each non-obvious source is for
 *
 * - `img-src blob:` — the admin uploaders preview a chosen file with
 *   `URL.createObjectURL(file)` before it is uploaded
 *   (components/admin/upload/ImageUploader.tsx).
 * - `connect-src <supabase>` — every public read and the uploader's own
 *   `XMLHttpRequest` (lib/storage/upload.ts) go to this origin directly
 *   from the browser, plus Auth's token refresh on /admin. `wss:` covers
 *   Supabase Realtime, which nothing subscribes to today but which the
 *   client library opens if anything ever does.
 * - `media-src <supabase>` — the `projects` bucket allows video/mp4 and
 *   video/webm, so a project media gallery item can be a video served
 *   straight from Storage.
 * - `frame-src`/`script-src https://vercel.live` — Vercel's comment
 *   toolbar, which is injected into preview deployments only. It is
 *   omitted from production entirely (see `isVercelPreview`), so the
 *   production policy allows no third-party script origin at all.
 *
 * ## The two directives that are environment-gated
 *
 * `upgrade-insecure-requests` and HSTS both assume https. Locally the site
 * is http://localhost:3000 talking to http://127.0.0.1:54321, and
 * `upgrade-insecure-requests` would rewrite every Supabase call to https
 * and break the entire local stack. Both are therefore emitted only when
 * NEXT_PUBLIC_SITE_URL is itself https, which is true on Vercel and false
 * on a developer machine. That is the *only* difference between the policy
 * verified locally and the policy served in production.
 */
function contentSecurityPolicy(): string {
  const supabase = supabaseOrigin();
  const isDev = process.env.NODE_ENV === "development";
  // VERCEL_ENV is "production" | "preview" | "development" on Vercel and
  // unset everywhere else — the same signal app/(site)/styleguide uses.
  const isVercelPreview = process.env.VERCEL_ENV === "preview";
  const isHttps = (process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("https:");

  const supabaseSources = supabase ? [supabase] : [];
  const supabaseWebSocket = supabase ? [supabase.replace(/^http/, "ws")] : [];
  const vercelToolbar = isVercelPreview ? ["https://vercel.live"] : [];

  const directives: Array<[string, string[]]> = [
    ["default-src", ["'self'"]],
    [
      "script-src",
      [
        "'self'",
        "'unsafe-inline'",
        // React uses eval() in development to reconstruct server stacks in
        // the browser. It does not in production.
        ...(isDev ? ["'unsafe-eval'"] : []),
        ...vercelToolbar,
      ],
    ],
    ["style-src", ["'self'", "'unsafe-inline'"]],
    ["img-src", ["'self'", "data:", "blob:", ...supabaseSources]],
    ["media-src", ["'self'", ...supabaseSources]],
    ["font-src", ["'self'", "data:"]],
    ["connect-src", ["'self'", ...supabaseSources, ...supabaseWebSocket, ...vercelToolbar]],
    ["frame-src", vercelToolbar.length > 0 ? vercelToolbar : ["'none'"]],
    ["worker-src", ["'self'", "blob:"]],
    ["manifest-src", ["'self'"]],
    ["object-src", ["'none'"]],
    ["base-uri", ["'self'"]],
    ["form-action", ["'self'"]],
    ["frame-ancestors", ["'none'"]],
  ];

  const policy = directives.map(([name, sources]) => `${name} ${sources.join(" ")}`);
  if (isHttps) policy.push("upgrade-insecure-requests");

  return policy.join("; ");
}

/**
 * Hardening headers applied to every response. `frame-ancestors 'none'` in
 * the CSP above already covers what X-Frame-Options does, and supersedes it
 * in every browser that supports both — X-Frame-Options is kept anyway
 * because it costs one line and still matters to older clients and to the
 * automated header scanners (securityheaders.com and friends) that a
 * hiring manager may well run against this site.
 *
 * Permissions-Policy denies every powerful feature outright rather than
 * enumerating an allowlist: this is a portfolio, it has no camera, mic,
 * geolocation, payment or sensor code, and writing `()` rather than
 * `(self)` means a future dependency that quietly tries to use one fails
 * loudly instead of succeeding silently.
 */
function securityHeaders(): Array<{ key: string; value: string }> {
  const isHttps = (process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("https:");

  const headers = [
    { key: "Content-Security-Policy", value: contentSecurityPolicy() },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: [
        "accelerometer=()",
        "autoplay=()",
        "camera=()",
        "display-capture=()",
        "encrypted-media=()",
        "fullscreen=(self)",
        "geolocation=()",
        "gyroscope=()",
        "magnetometer=()",
        "microphone=()",
        "midi=()",
        "payment=()",
        "publickey-credentials-get=()",
        "screen-wake-lock=()",
        "usb=()",
        "xr-spatial-tracking=()",
      ].join(", "),
    },
    { key: "X-DNS-Prefetch-Control", value: "on" },
  ];

  // Sent only over https. A browser ignores HSTS on a plaintext response
  // anyway, but emitting it locally would mean the header set verified in
  // development differs from the one reasoned about here for no benefit —
  // and a stray `max-age` pinned against localhost is genuinely annoying to
  // undo if a future dev server ever does serve https.
  if (isHttps) {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    });
  }

  return headers;
}

/**
 * Next 16 refuses to optimize a remote image whose host is a local/private
 * IP unless `dangerouslyAllowLocalIP` is set — a deliberate SSRF guard
 * added in 16.0.0. That guard fires against the *local* Supabase stack,
 * whose Storage URLs are `http://127.0.0.1:54321/...`: `/_next/image`
 * answers `400 "url" parameter is not allowed`, so a locally-uploaded
 * image renders through a plain `<img>` but not through `next/image`.
 * Found in Phase 25 by uploading a real file and then requesting its
 * optimized URL; it is invisible from the source and does not reproduce in
 * production, where the Supabase host is `<ref>.supabase.co`.
 *
 * Rather than turning the guard off outright, it is turned off only when
 * the configured Supabase host *is itself* a loopback/private address —
 * i.e. only when the "internal network" the guard protects is the
 * developer's own machine, and only for the one origin already trusted
 * enough to hold the whole database. Against a real hosted project this
 * evaluates to `false`, so production keeps the guard.
 */
function supabaseHostIsLocal(): boolean {
  const origin = supabaseOrigin();
  if (!origin) return false;
  const { hostname } = new URL(origin);
  return (
    hostname === "localhost" ||
    hostname === "::1" ||
    /^127\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  );
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseStorageRemotePattern(),
    dangerouslyAllowLocalIP: supabaseHostIsLocal(),
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders(),
      },
    ];
  },
};

export default nextConfig;
