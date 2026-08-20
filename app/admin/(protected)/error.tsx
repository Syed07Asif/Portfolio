"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangleIcon, RotateCcwIcon } from "lucide-react";
import { Button } from "@/components/admin/ui/button";

export interface ProtectedAdminErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * The admin-specific boundary, one segment deeper than app/admin/error.tsx
 * and the one that actually matters day to day: because it sits *inside*
 * `(protected)/layout.tsx`, the admin shell survives — sidebar, header and
 * all — so a failure on one screen leaves every other screen one click
 * away instead of dumping the admin onto a bare full-page error.
 *
 * `app/admin/error.tsx` remains the fallback for anything above this,
 * including a failure in the protected layout's own auth check (a layout's
 * error is caught by its parent segment, never by a boundary it renders).
 *
 * Same disclosure rule as the public boundaries: `error.message` is never
 * shown in production — a Postgres error string or a Storage path is
 * exactly the kind of implementation detail that must not surface, even to
 * a signed-in admin, since this markup is served over the same channel as
 * everything else. The digest is enough to find the real, fully-logged
 * error server-side.
 */
export default function ProtectedAdminError({ error, reset }: ProtectedAdminErrorProps) {
  useEffect(() => {
    console.error("[admin] screen error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-surface px-6 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-surface-raised">
        <AlertTriangleIcon className="size-6 text-danger" aria-hidden="true" />
      </span>

      <div className="flex max-w-md flex-col gap-1">
        <h2 className="font-display text-h4 font-semibold text-foreground">This screen didn&apos;t load</h2>
        <p className="text-small text-foreground-muted">
          Nothing was changed. Retrying usually works — if it doesn&apos;t, check that the database is reachable and
          that you&apos;re still signed in.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button onClick={reset}>
          <RotateCcwIcon className="size-4" aria-hidden="true" />
          Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin">Back to dashboard</Link>
        </Button>
      </div>

      {error.digest ? (
        <p className="text-caption text-foreground-muted">
          Reference code: <code className="font-mono">{error.digest}</code>
        </p>
      ) : null}

      {process.env.NODE_ENV !== "production" ? (
        <pre className="max-w-full overflow-x-auto rounded-lg border border-border bg-background p-4 text-left text-caption text-foreground-muted">
          {error.message}
        </pre>
      ) : null}
    </div>
  );
}
