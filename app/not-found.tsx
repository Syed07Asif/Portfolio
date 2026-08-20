import type { Metadata } from "next";
import Link from "next/link";
import { Compass } from "lucide-react";
import { Button, ErrorScreen } from "@/components/ui";
import { SECTION_IDS } from "@/lib/constants";

/**
 * The root 404 — anything that doesn't match a route at all. Note this
 * renders inside `app/layout.tsx` only, *not* `app/(site)/layout.tsx`:
 * Next's root not-found sits above every route group, so there is no
 * Navbar or Footer here and the links below are the only way out. That's
 * why there are three of them rather than a single "go home".
 *
 * A 404 under `/projects` gets a more specific page instead — see
 * app/(site)/projects/[slug]/not-found.tsx.
 */
export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main id="main">
      <ErrorScreen
        icon={Compass}
        title="This page doesn't exist"
        description="The link may be out of date, or the address might have a typo in it. Everything below is still where it should be."
        actions={
          <>
            <Button asChild>
              <Link href="/projects">Browse projects</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href={`/#${SECTION_IDS.contact}`}>Get in touch</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/">Back to home</Link>
            </Button>
          </>
        }
      />
    </main>
  );
}
