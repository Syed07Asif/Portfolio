import { Section, SectionHeading } from "@/components/ui";
import { getAchievements } from "@/lib/data";
import { SECTION_IDS } from "@/lib/constants";
import { AchievementsContent } from "./AchievementsContent";

/** Server component: getAchievements() already filters to published rows and orders by display_order then date desc. */
export async function Achievements() {
  const items = await getAchievements();

  if (items.length === 0) return null;

  return (
    <Section id={SECTION_IDS.achievements} labelledBy={`${SECTION_IDS.achievements}-heading`}>
      <SectionHeading eyebrow="Recognition" heading="Achievements" headingId={`${SECTION_IDS.achievements}-heading`} />
      <AchievementsContent items={items} />
    </Section>
  );
}
