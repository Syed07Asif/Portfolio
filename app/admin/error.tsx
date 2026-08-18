"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/admin/ui/button";

export interface AdminErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Covers everything under /admin — both app/admin/login/ and
 * app/admin/(protected)/, since this file sits above both as their nearest
 * shared error boundary (same nesting rule as layout.tsx). A rendering
 * error anywhere in the admin panel lands here instead of a raw crash or
 * the framework's default error overlay in production.
 */
export default function AdminError({ error, reset }: AdminErrorProps) {
  useEffect(() => {
    console.error("[admin] unhandled error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <AlertTriangle className="size-10 text-danger" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-h4 font-semibold text-foreground">Something went wrong</h1>
        <p className="max-w-sm text-small text-foreground-muted">
          An unexpected error occurred in the admin panel. You can try again, or head back to the dashboard.
        </p>
      </div>
      <div className="flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/admin">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
