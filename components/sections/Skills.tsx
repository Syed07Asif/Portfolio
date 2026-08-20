import { Section, SectionHeading } from "@/components/ui";
import { getSkillCategoriesWithSkills } from "@/lib/data";
import { SECTION_IDS } from "@/lib/constants";
import { SkillsContent } from "./SkillsContent";

/**
 * Server component: fetches all skill categories (with their nested,
 * already-published-only skills — see lib/data/skills.ts) and renders
 * whatever exists, in whatever quantity, in `display_order` — no category
 * name is ever hard-coded here. A category is only ever a data row; adding
 * one is a database change, per CLAUDE.md.
 *
 * `fetchSkillCategoriesWithSkills` returns every category row regardless of
 * whether it ended up with any published skills attached (that's just how
 * the embedded query works), so the "a category with zero published skills
 * must not render at all" requirement is enforced here, not in lib/data.
 * If literally nothing is left after that filter, the whole section hides
 * — same pattern Hero/About already established for "no content at all".
 */
export async function Skills() {
  const categories = await getSkillCategoriesWithSkills();
  const categoriesWithSkills = categories.filter((category) => category.skills.length > 0);

  if (categoriesWithSkills.length === 0) return null;

  return (
    <Section id={SECTION_IDS.skills} labelledBy={`${SECTION_IDS.skills}-heading`}>
      <SectionHeading eyebrow="What I Work With" heading="Skills & Tools" headingId={`${SECTION_IDS.skills}-heading`} />
      <SkillsContent categories={categoriesWithSkills} />
    </Section>
  );
}
