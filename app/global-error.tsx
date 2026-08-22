"use client";

import { useEffect } from "react";
import "@/styles/globals.css";

export interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * The last line of defence: this only renders when `app/layout.tsx` — the
 * root layout — itself fails, which means it *replaces* that layout and has
 * to supply its own `<html>` and `<body>`. Everything the rest of the app
 * gets for free (fonts, providers, the toast host, site chrome) is absent
 * by definition.
 *
 * Deliberately self-contained as a result:
 *
 * - `globals.css` is imported here directly, since the root layout that
 *   normally imports it is the thing that just broke.
 * - `<body>` also carries inline `background`/`color`, written as
 *   `var(--token, #literal)` so they resolve from the design tokens when
 *   the stylesheet loaded and still render legible text when it didn't.
 *   That literal fallback is the one thing in this file that isn't purely
 *   token-driven, and it's here precisely because this is the code path
 *   where assuming the stylesheet loaded is unsafe.
 * - No shared components, no `next/link`. A plain `<a href="/">` triggers a
 *   full document load rather than a client-side navigation, which is what
 *   you actually want when the root of the React tree is broken.
 * - No `error.message`, same rule as every other boundary — only `digest`.
 *
 * In development you'll see Next's error overlay instead of this; it only
 * takes over in a production build.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("[app] root layout error:", error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body
        style={{
          background: "var(--color-background, #0a0d18)",
          color: "var(--color-foreground, #f2f4f8)",
        }}
      >
        <main
          id="main"
          className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 px-6 text-center"
        >
          <h1 className="text-h2 font-display font-bold">This site is having a problem</h1>
          <p className="text-body-lg text-foreground-secondary">
            Something failed badly enough that the page couldn&apos;t be built at all. Reloading usually clears it.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-11 items-center justify-center rounded-full bg-accent px-6 text-body font-medium text-accent-foreground transition-colors duration-fast ease-out-quart hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Try again
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages --
                deliberate: this file renders when the ROOT LAYOUT itself
                failed, so the React tree it would client-navigate within is
                the broken thing. A full document load is the recovery, which
                is exactly what a plain anchor does and what next/link avoids. */}
            <a
              href="/"
              className="inline-flex h-11 items-center justify-center rounded-full border border-border px-6 text-body font-medium text-foreground transition-colors duration-fast ease-out-quart hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Reload the site
            </a>
          </div>

          {error.digest ? (
            <p className="text-caption text-foreground-muted">
              Reference code: <code className="font-mono">{error.digest}</code>
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
