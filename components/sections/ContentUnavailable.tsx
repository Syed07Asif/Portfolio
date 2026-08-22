import Link from "next/link";
import { CloudOff } from "lucide-react";
import { Button, ErrorScreen } from "@/components/ui";
import { SECTION_IDS } from "@/lib/constants";

export interface ContentUnavailableProps {
  /** The current path — "Try again" is a full document request to it, since a Server Component has no `reset()` to call. */
  retryHref: string;
}

/**
 * The degraded state as a **Server Component**, for the one render path
 * where an error boundary cannot help.
 *
 * `app/(site)/error.tsx` covers dynamically-rendered routes, and was
 * verified doing so. It does **not** cover a page being generated
 * on-demand as static/ISR output: `/projects/[slug]` has
 * `revalidate = 3600` with `dynamicParams` on, so a slug that wasn't
 * prerendered is generated at request time as a *cacheable* response, and a
 * throw during that generation never reaches a React error boundary — Next
 * returns a bare "Internal Server Error" instead. That was confirmed in a
 * real production build with PostgREST stopped: `/admin` (dynamic) rendered
 * its boundary correctly while an unbuilt project slug returned raw 500
 * text.
 *
 * So pages that can be statically generated catch `DataUnavailableError`
 * themselves and return this, rather than delegating to a boundary that
 * won't run. See the callers for the `connection()` call that keeps the
 * outage from being cached as if it were the page.
 */
export function ContentUnavailable({ retryHref }: ContentUnavailableProps) {
  return (
    <ErrorScreen
      icon={CloudOff}
      title="We couldn't load this right now"
      description="The content didn't come through. This is almost always temporary — try again in a moment, and everything should be back."
      actions={
        <>
          {/* A real navigation, not a client-side one: the point is to re-run the server render that just failed. */}
          <Button asChild>
            <a href={retryHref}>Try again</a>
          </Button>
          <Button asChild variant="secondary">
            <Link href={`/#${SECTION_IDS.contact}`}>Contact me directly</Link>
          </Button>
        </>
      }
    />
  );
}
