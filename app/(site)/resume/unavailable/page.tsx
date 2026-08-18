import Link from "next/link";
import { FileX } from "lucide-react";
import { Button, Container, EmptyState } from "@/components/ui";

/**
 * Where `app/resume/route.ts` redirects when there's no active resume to
 * serve (or the resolved file itself fails to fetch) — not a
 * route-segment `not-found.tsx`, because `notFound()` called from inside a
 * Route Handler does not render one: it was verified live to return a
 * genuinely empty 404 body (no HTML, `Content-Length: 0`) rather than the
 * nearest not-found boundary, unlike calling it from a Server Component or
 * Page. A real page route redirected to is the only way to get an actual
 * React-rendered, on-brand page (full site chrome, EmptyState, a way back)
 * out of what's otherwise a raw binary-streaming response — the trade-off
 * is a 307-then-200 status instead of a literal 404, which reads as
 * "friendly" to an actual visitor even though it isn't the HTTP status a
 * script checking the link would see. Every "Download Resume" CTA on the
 * site is already gated on an active resume existing, so in normal use
 * this is only reachable via a direct/bookmarked visit to /resume after
 * the admin removes the active resume — still a real visitor, so it gets
 * the same friendly, on-brand treatment as app/projects/not-found.tsx.
 */
export default function ResumeUnavailable() {
  return (
    <Container className="flex flex-col items-center py-(--space-section-y)">
      <EmptyState
        icon={FileX}
        title="No resume available right now"
        description="There isn't an active resume to download at the moment. Check back soon, or get in touch directly."
      />
      <Button asChild className="mt-6">
        <Link href="/#contact">Contact instead</Link>
      </Button>
    </Container>
  );
}
