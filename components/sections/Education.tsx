import { Section, SectionHeading } from "@/components/ui";
import { getEducation } from "@/lib/data";
import { SECTION_IDS } from "@/lib/constants";
import { EducationContent } from "./EducationContent";

/** Server component: getEducation() already filters to published rows and orders by display_order then start_date desc. */
export async function Education() {
  const entries = await getEducation();

  if (entries.length === 0) return null;

  return (
    <Section id={SECTION_IDS.education}>
      <SectionHeading eyebrow="Academic Background" heading="Education" />
      <EducationContent entries={entries} />
    </Section>
  );
}
