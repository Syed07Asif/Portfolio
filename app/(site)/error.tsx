"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CloudOff, RotateCcw } from "lucide-react";
import { Button, ErrorScreen } from "@/components/ui";
import { SECTION_IDS } from "@/lib/constants";

export interface SiteErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * The public site's degraded state, and the visible half of Phase 23's
 * answer to "what happens when Supabase is unreachable".
 *
 * `lib/data` now throws `DataUnavailableError` for connectivity-class
 * failures instead of returning an empty array (see lib/data/shared.ts for
 * the three specific lies the old behaviour told). That throw lands here —
 * inside `app/(site)/layout.tsx`, so the visitor keeps a real Navbar and
 * Footer and can still navigate — rather than producing a page that claims
 * the portfolio has no content.
 *
 * The copy is deliberately one message for every cause. This boundary
 * genuinely cannot tell an outage from a rendering bug: Next redacts the
 * messages of Server Component errors in production (by design, and this
 * component would refuse to print them anyway), so a specific "the
 * database is down" claim would sometimes be wrong. "Couldn't load right
 * now, try again" is true in both cases, which matters more than being
 * precise about a cause the visitor can do nothing about.
 */
export default function SiteError({ error, reset }: SiteErrorProps) {
  useEffect(() => {
    console.error("[site] unhandled error:", error);
  }, [error]);

  return (
    <ErrorScreen
      icon={CloudOff}
      title="We couldn't load this right now"
      description="The content didn't come through. This is almost always temporary — try again in a moment, and everything should be back."
      digest={error.digest}
      devDetail={error.message}
      actions={
        <>
          <Button onClick={reset} leadingIcon={RotateCcw}>
            Try again
          </Button>
          <Button asChild variant="secondary">
            <Link href={`/#${SECTION_IDS.contact}`}>Contact me directly</Link>
          </Button>
        </>
      }
    />
  );
}
