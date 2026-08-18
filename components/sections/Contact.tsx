import { Section, SectionHeading } from "@/components/ui";
import { getActiveResume, getContactLinks } from "@/lib/data";
import { SECTION_IDS } from "@/lib/constants";
import { ContactContent } from "./ContactContent";

/**
 * Server component: getContactLinks() already filters to published rows;
 * getActiveResume() only gates whether the Download Resume CTA renders
 * here, same fact Hero's and Footer's own CTAs gate on. Hides entirely
 * (same as every other section on this page) when there's genuinely
 * nothing actionable to show — zero contact channels and no resume.
 */
export async function Contact() {
  const [contactLinks, resume] = await Promise.all([getContactLinks(), getActiveResume()]);

  if (contactLinks.length === 0 && !resume) return null;

  return (
    <Section id={SECTION_IDS.contact}>
      <SectionHeading
        eyebrow="Get In Touch"
        heading="Let's Build Something"
        description="Have a project in mind, an opportunity to discuss, or just want to say hi? I'd love to hear from you."
      />
      <ContactContent contactLinks={contactLinks} hasResume={Boolean(resume)} />
    </Section>
  );
}
