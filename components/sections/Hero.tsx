import { Container } from "@/components/ui";
import { getActiveResume, getProfile } from "@/lib/data";
import { DEFAULT_WORDMARK, SECTION_IDS } from "@/lib/constants";
import { HeroBackground } from "./HeroBackground";
import { HeroReveal } from "./HeroReveal";

/**
 * The homepage's first section. Server component: fetches profile + active
 * resume directly (co-located with the one place that needs them, rather
 * than threaded down from app/page.tsx) and renders the CTA/heading markup
 * server-side so it's present in the initial HTML for LCP — only the
 * animated reveal and background glow are client components (HeroReveal,
 * HeroBackground).
 *
 * Doesn't reuse the `Section` primitive: Section's built-in `fadeInUp` +
 * `revealOnScroll` is a single scroll-triggered fade for the whole block,
 * whereas Hero needs an immediate staggered reveal of its individual pieces
 * plus a `position: relative; overflow-hidden` root for the background
 * layer — different enough to warrant its own wrapper. It still uses
 * `Container` and carries the same `id`/`scroll-mt-(--header-height)`
 * convention every other section gets from `Section`.
 */
export async function Hero() {
  const [profile, resume] = await Promise.all([getProfile(), getActiveResume()]);

  const name = profile?.full_name ?? DEFAULT_WORDMARK;
  const headline = profile?.headline ?? profile?.current_role ?? null;
  const tagline = profile?.tagline ?? null;
  const shortBio = profile?.short_bio ?? null;
  const availability = profile?.availability_status ?? null;

  return (
    <section
      id={SECTION_IDS.hero}
      aria-labelledby={`${SECTION_IDS.hero}-heading`}
      className="relative overflow-hidden scroll-mt-(--header-height)"
    >
      <HeroBackground />
      <Container className="relative z-10 flex flex-col justify-center lg:min-h-(--hero-min-height)">
        <HeroReveal
          headingId={`${SECTION_IDS.hero}-heading`}
          name={name}
          headline={headline}
          tagline={tagline}
          shortBio={shortBio}
          availability={availability}
          hasResume={Boolean(resume)}
        />
      </Container>
    </section>
  );
}
