import Link from "next/link";
import { ArrowRight, Download, Send } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { RESUME_ROUTE, SECTION_IDS } from "@/lib/constants";

export interface HeroRevealProps {
  name: string;
  headline?: string | null;
  tagline?: string | null;
  shortBio?: string | null;
  availability?: string | null;
  /** Whether an active resume exists — the Download Resume CTA renders only when true, and always points at the stable RESUME_ROUTE, never a resume row's own file_url directly. */
  hasResume?: boolean;
  /** DOM id for the page's h1, so Hero's own `<section>` can name itself via `aria-labelledby` — the h1 lives here, in the client child, but the landmark it names is the server parent's. */
  headingId?: string;
}

/**
 * The hero's animated text/CTA stack — a small client child of the server
 * `Hero` component (see Hero.tsx), receiving already-resolved plain values
 * so the server component stays the one doing the actual data fetch. Every
 * piece below `name` is optional and simply omitted when unset (profile.tsx
 * requirement: a mostly-empty profile row still has to look deliberate, not
 * broken) — the stagger sequence just has fewer steps, no empty gaps.
 *
 * **This is a Server Component** (Phase 24). The staggered entrance is now
 * the `.hero-in-group` rule in styles/globals.css — a plain CSS animation
 * with per-child `animation-delay`, timed to match what
 * staggerContainer/staggerItem used to do (~0.3s duration, 0.08s per item,
 * 0.04s initial delay; at most 7 items, so under 0.8s end-to-end).
 *
 * Making this server-rendered matters more here than anywhere else on the
 * site: it is the largest text block above the fold and therefore the LCP
 * candidate, and it previously sat behind a client boundary whose hydration
 * was measured blocking first paint for seconds on a throttled mobile
 * profile. As CSS, the text is painted from the first frame and the
 * animation only costs its own ~300ms.
 */
export function HeroReveal({
  name,
  headline,
  tagline,
  shortBio,
  availability,
  hasResume,
  headingId,
}: HeroRevealProps) {
  return (
    <div
      className="hero-in-group flex max-w-2xl flex-col gap-3 py-8 sm:gap-5 sm:py-20 lg:py-0"
    >
      <p
        className="text-caption font-medium uppercase tracking-wider text-accent"
      >
        Hello, I&apos;m
      </p>

      <h1
        id={headingId}
        className="text-h1 font-display font-extrabold tracking-tight text-foreground sm:text-display"
      >
        {name}
      </h1>

      {headline ? (
        <p
          className="text-h4 font-display font-semibold text-foreground-secondary sm:text-h3"
        >
          {headline}
        </p>
      ) : null}

      {availability ? (
        <div>
          <Badge variant="success">
            <span className="mr-1.5 inline-block size-1.5 rounded-full bg-success motion-safe:animate-pulse" />
            {availability}
          </Badge>
        </div>
      ) : null}

      {tagline ? (
        <p className="text-body-lg text-foreground-secondary">
          {tagline}
        </p>
      ) : null}

      {shortBio ? (
        <p className="text-body text-foreground-muted">
          {shortBio}
        </p>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-4">
        <Button asChild size="lg" trailingIcon={ArrowRight}>
          <Link href={`#${SECTION_IDS.projects}`}>View Projects</Link>
        </Button>
        {hasResume ? (
          <Button asChild variant="secondary" size="lg" leadingIcon={Download}>
            <a href={RESUME_ROUTE}>Download Resume</a>
          </Button>
        ) : null}
        <Button asChild variant="outline" size="lg" leadingIcon={Send}>
          <Link href={`#${SECTION_IDS.contact}`}>Contact Me</Link>
        </Button>
      </div>
    </div>
  );
}
