/**
 * Calls every lib/data read function against a real (seeded) database and
 * prints what each one returns. Not an assertion suite — the point is to
 * eyeball actual shapes before any UI exists that would otherwise be the
 * first thing to notice a broken query.
 *
 * Imports the raw `fetchX` functions (unwrapped query logic) rather than the
 * cached `getX` ones each module also exports: `getX` is `fetchX` wrapped in
 * Next.js's `unstable_cache`, which requires a full Next.js server runtime
 * (`next dev`/`next build`) and throws ("incrementalCache missing") when
 * called from a standalone script like this one. The query logic under test
 * is identical either way — `getX` adds only caching on top.
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to
 * point at a database that has run supabase/migrations and supabase/seed.sql
 * (e.g. `supabase start`, or a real project). Loads .env.local if present.
 *
 * Run: npx tsx tests/lib/data/smoke.ts
 */
import "dotenv/config";
import { fetchAchievements } from "../../../lib/data/achievements";
import { fetchActiveResume } from "../../../lib/data/resumes";
import { fetchCertifications } from "../../../lib/data/certifications";
import { fetchContactLinks } from "../../../lib/data/contactLinks";
import { fetchEducation } from "../../../lib/data/education";
import { fetchExperience } from "../../../lib/data/experience";
import { fetchProfile } from "../../../lib/data/profile";
import { fetchProjectBySlug, fetchProjects, fetchProjectSlugs } from "../../../lib/data/projects";
import { fetchSiteSettings } from "../../../lib/data/siteSettings";
import { fetchSkillCategoriesWithSkills } from "../../../lib/data/skills";

function summarize(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) {
    const first = value[0];
    const firstKeys = first !== null && typeof first === "object" ? Object.keys(first) : [];
    return `array(${value.length})${firstKeys.length ? ` — item keys: [${firstKeys.join(", ")}]` : ""}`;
  }
  if (typeof value === "object") {
    return `object — keys: [${Object.keys(value as object).join(", ")}]`;
  }
  return typeof value;
}

let failures = 0;
let emptyResults = 0;

async function check<T>(label: string, fn: () => Promise<T>) {
  console.log(`\n${label}`);
  try {
    const result = await fn();
    console.log(`  shape: ${summarize(result)}`);
    console.log(`  value: ${JSON.stringify(result, null, 2).slice(0, 600)}`);
    const isEmpty = result === null || (Array.isArray(result) && result.length === 0);
    if (isEmpty) {
      emptyResults += 1;
      console.warn("  ! empty — expected at least one row from supabase/seed.sql");
    }
  } catch (error) {
    failures += 1;
    console.error("  ! threw unexpectedly:", error);
  }
}

async function run() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error(
      "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set. " +
        "Run `supabase start` and copy its output into .env.local (see .env.example), or export them directly.",
    );
    process.exit(1);
  }

  await check("fetchProfile()", fetchProfile);
  await check("fetchSkillCategoriesWithSkills()", fetchSkillCategoriesWithSkills);
  await check("fetchExperience()", fetchExperience);
  await check("fetchEducation()", fetchEducation);
  await check("fetchProjects()", () => fetchProjects());
  await check("fetchProjects({ featuredOnly: true })", () => fetchProjects({ featuredOnly: true }));
  await check("fetchProjects({ limit: 1 })", () => fetchProjects({ limit: 1 }));
  await check("fetchProjectSlugs()", fetchProjectSlugs);

  const slugs = await fetchProjectSlugs();
  const firstSlug = slugs[0];
  if (firstSlug) {
    await check(`fetchProjectBySlug("${firstSlug}")`, () => fetchProjectBySlug(firstSlug));
  } else {
    console.warn('\nfetchProjectBySlug(...) — skipped, fetchProjectSlugs() returned none');
  }

  await check("fetchCertifications()", fetchCertifications);
  await check("fetchAchievements()", fetchAchievements);
  await check("fetchContactLinks()", fetchContactLinks);
  await check("fetchActiveResume()", fetchActiveResume);
  await check("fetchSiteSettings()", fetchSiteSettings);

  console.log(
    `\n${failures} threw, ${emptyResults} returned empty. ${
      failures === 0 ? "No function crashed." : "See errors above."
    }`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

run();
