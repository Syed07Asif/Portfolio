import { Section, SectionHeading } from "@/components/ui";
import { getCertifications } from "@/lib/data";
import { SECTION_IDS } from "@/lib/constants";
import { CertificationGrid } from "./CertificationGrid";

/** Server component: getCertifications() already filters to published rows and orders by display_order then issue_date desc. */
export async function Certifications() {
  const certifications = await getCertifications();

  if (certifications.length === 0) return null;

  return (
    <Section id={SECTION_IDS.certifications} labelledBy={`${SECTION_IDS.certifications}-heading`}>
      <SectionHeading eyebrow="Credentials" heading="Certifications" headingId={`${SECTION_IDS.certifications}-heading`} />
      <CertificationGrid certifications={certifications} />
    </Section>
  );
}
