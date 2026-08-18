import { Section, SectionHeading } from "@/components/ui";
import { getProfile } from "@/lib/data";
import { DEFAULT_WORDMARK, SECTION_IDS } from "@/lib/constants";
import { splitParagraphs } from "@/lib/utils";
import { AboutContent } from "./AboutContent";

/**
 * Server component: fetches profile directly (see
 * components/sections/README.md for why sections fetch their own data
 * rather than being prop-drilled from app/page.tsx). Reuses the standard
 * `Section`/`SectionHeading` primitives — unlike Hero, About doesn't need a
 * full-bleed background layer, so there's no reason to hand-roll the outer
 * wrapper the way Hero does. Only the portrait/text grid inside needs its
 * own stagger, which is what AboutContent (a client child) handles.
 *
 * Hides the whole section — not an EmptyState, nothing — when the profile
 * has genuinely no About-relevant content at all (every field below is
 * empty, or getProfile() itself failed). A missing bio *alone* is handled
 * one level down instead (AboutContent renders EmptyState in its place)
 * since other fields might still be worth showing.
 */
export async function About() {
  const profile = await getProfile();

  const bioParagraphs = splitParagraphs(profile?.long_bio ?? "");
  const avatarUrl = profile?.avatar_url ?? null;
  const currentRole = profile?.current_role ?? null;
  const location = profile?.location ?? null;
  const focusArea = profile?.headline ?? null;
  const availability = profile?.availability_status ?? null;

  const hasAnyContent = Boolean(
    bioParagraphs.length || avatarUrl || currentRole || location || focusArea || availability,
  );

  if (!hasAnyContent) return null;

  return (
    <Section id={SECTION_IDS.about}>
      <SectionHeading eyebrow="About Me" heading="Background & focus" />
      <AboutContent
        name={profile?.full_name ?? DEFAULT_WORDMARK}
        avatarUrl={avatarUrl}
        bioParagraphs={bioParagraphs}
        currentRole={currentRole}
        location={location}
        focusArea={focusArea}
        availability={availability}
      />
    </Section>
  );
}
