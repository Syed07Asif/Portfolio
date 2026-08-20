"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw, ServerCrash } from "lucide-react";
import { Button, ErrorScreen } from "@/components/ui";

export interface AppErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * The outermost recoverable error boundary — it catches anything the more
 * specific boundaries below it don't, most importantly a failure inside
 * `app/(site)/layout.tsx` itself (a layout's error is caught by its
 * *parent* segment, never by a sibling `error.tsx`). That's why this page
 * carries its own links: when it renders, there may be no Navbar.
 *
 * **Nothing about the error reaches the visitor.** `error.message` is
 * never rendered in production — only `digest`, an opaque hash Next
 * generates so a report can be matched to a server log line. Next already
 * redacts messages thrown in Server Components for exactly this reason,
 * but an error thrown during a *client* render keeps its real message, so
 * relying on the framework alone would leak. The `devDetail` prop below is
 * gated on NODE_ENV inside ErrorScreen and compiles to nothing in a
 * production build.
 *
 * The real error is logged where it belongs: server-side for a Server
 * Component failure (Next does that itself, in full, before this component
 * ever mounts), and to the browser console here for a client-side one.
 */
export default function AppError({ error, reset }: AppErrorProps) {
  useEffect(() => {
    console.error("[app] unhandled error:", error);
  }, [error]);

  return (
    <main id="main">
      <ErrorScreen
        icon={ServerCrash}
        title="Something went wrong"
        description="This page didn't load properly. It's usually temporary — trying again often fixes it."
        digest={error.digest}
        devDetail={error.message}
        actions={
          <>
            <Button onClick={reset} leadingIcon={RotateCcw}>
              Try again
            </Button>
            <Button asChild variant="secondary">
              <Link href="/">Back to home</Link>
            </Button>
          </>
        }
      />
    </main>
  );
}
