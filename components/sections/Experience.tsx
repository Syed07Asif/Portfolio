import { Section, SectionHeading } from "@/components/ui";
import { getExperience } from "@/lib/data";
import { SECTION_IDS } from "@/lib/constants";
import { ExperienceContent } from "./ExperienceContent";

/**
 * Server component: getExperience() already orders by display_order then
 * start_date desc and filters to published rows, so this just renders
 * whatever comes back — or nothing at all if it's empty.
 */
export async function Experience() {
  const entries = await getExperience();

  if (entries.length === 0) return null;

  return (
    <Section id={SECTION_IDS.experience}>
      <SectionHeading eyebrow="Where I've Worked" heading="Experience" />
      <ExperienceContent entries={entries} />
    </Section>
  );
}
