import type { Metadata } from "next";
import { fetchSiteSettingsForAdmin } from "@/lib/data/siteSettings";
import {
  getAchievements,
  getCertifications,
  getContactLinks,
  getEducation,
  getExperience,
  getProfile,
  getProjects,
  getSkillCategoriesWithSkills,
} from "@/lib/data";
import { SECTION_IDS } from "@/lib/constants";
import { PageHeader } from "@/components/admin/PageHeader";
import { SettingsForm } from "@/components/admin/settings/SettingsForm";

export const metadata: Metadata = { title: "Settings" };

/**
 * `sectionHasContent` reuses the exact same published-only reads the public
 * site itself calls (getProfile/getExperience/...) rather than a second,
 * admin-specific set of count queries — "does this section currently have
 * anything behind it" is precisely what decides whether each section
 * renders at all on the public site, so there's no separate truth to
 * compute. Feeds NavItemsField's "warn before hiding" confirmation.
 */
export default async function AdminSettingsPage() {
  const [settings, profile, skillCategories, experience, projects, education, certifications, achievements, contactLinks] =
    await Promise.all([
      fetchSiteSettingsForAdmin(),
      getProfile(),
      getSkillCategoriesWithSkills(),
      getExperience(),
      getProjects(),
      getEducation(),
      getCertifications(),
      getAchievements(),
      getContactLinks(),
    ]);

  const sectionHasContent: Record<string, boolean> = {
    [`#${SECTION_IDS.about}`]: Boolean(profile),
    [`#${SECTION_IDS.skills}`]: skillCategories.some((category) => category.skills.length > 0),
    [`#${SECTION_IDS.experience}`]: experience.length > 0,
    [`#${SECTION_IDS.projects}`]: projects.length > 0,
    [`#${SECTION_IDS.education}`]: education.length > 0,
    [`#${SECTION_IDS.certifications}`]: certifications.length > 0,
    [`#${SECTION_IDS.achievements}`]: achievements.length > 0,
    [`#${SECTION_IDS.contact}`]: contactLinks.length > 0,
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" description="Site branding, navigation, and feature flags." />
      <div className="rounded-xl border border-border bg-surface p-6">
        <SettingsForm settings={settings} sectionHasContent={sectionHasContent} />
      </div>
    </div>
  );
}
