import { createClient } from "@/lib/supabase/server";
import { handleDataError } from "./shared";

export interface EntityCounts {
  total: number;
  published: number;
  draft: number;
}

export interface RecentItem {
  id: string;
  label: string;
  entity: string;
  updatedAt: string;
  /** No per-item edit route exists yet (Phase 17 is auth + shell only) — points at the section's list page instead of a 404. */
  editHref: string;
}

export interface ResumeSummary {
  versionLabel: string | null;
  uploadedAt: string;
}

export interface AdminDashboardStats {
  projects: EntityCounts;
  experience: EntityCounts;
  education: EntityCounts;
  certifications: EntityCounts;
  achievements: EntityCounts;
  blogPosts: EntityCounts;
  resume: ResumeSummary | null;
  recentItems: RecentItem[];
}

function toCounts(total: number | null, published: number | null): EntityCounts {
  const totalCount = total ?? 0;
  const publishedCount = published ?? 0;
  return { total: totalCount, published: publishedCount, draft: Math.max(0, totalCount - publishedCount) };
}

const EMPTY_STATS: AdminDashboardStats = {
  projects: { total: 0, published: 0, draft: 0 },
  experience: { total: 0, published: 0, draft: 0 },
  education: { total: 0, published: 0, draft: 0 },
  certifications: { total: 0, published: 0, draft: 0 },
  achievements: { total: 0, published: 0, draft: 0 },
  blogPosts: { total: 0, published: 0, draft: 0 },
  resume: null,
  recentItems: [],
};

/**
 * Admin-only aggregate query — deliberately separate from lib/data's public
 * modules, which hardcode `.eq("published", true)` in the query itself
 * (not just relying on RLS). Even an admin session calling `fetchProjects()`
 * would only ever see published rows because of that filter, so real
 * total/draft counts need their own queries here instead. Uses the cookie-
 * aware `createClient()` (the current admin's session), which is what lets
 * RLS's `is_admin()` policies return every row, published or not — see
 * docs/architecture.md's "The three Supabase clients" table.
 *
 * Not wrapped in `unstable_cache` like lib/data's public functions: it
 * needs `cookies()` (forbidden inside `unstable_cache`), and dashboard
 * numbers should be live on every load anyway, not cached up to an hour —
 * there's exactly one viewer, and stale counts right after an edit would
 * be a worse experience than one extra query.
 *
 * `count: "exact", head: true` queries return only the count, no row data
 * — twelve of these run in parallel below and none of them transfer more
 * than a number.
 */
export async function fetchAdminDashboardStats(): Promise<AdminDashboardStats> {
  const supabase = await createClient();

  try {
    const [
      projectsTotal,
      projectsPublished,
      experienceTotal,
      experiencePublished,
      educationTotal,
      educationPublished,
      certificationsTotal,
      certificationsPublished,
      achievementsTotal,
      achievementsPublished,
      blogTotal,
      blogPublished,
    ] = await Promise.all([
      supabase.from("projects").select("*", { count: "exact", head: true }),
      supabase.from("projects").select("*", { count: "exact", head: true }).eq("published", true),
      supabase.from("experience").select("*", { count: "exact", head: true }),
      supabase.from("experience").select("*", { count: "exact", head: true }).eq("published", true),
      supabase.from("education").select("*", { count: "exact", head: true }),
      supabase.from("education").select("*", { count: "exact", head: true }).eq("published", true),
      supabase.from("certifications").select("*", { count: "exact", head: true }),
      supabase.from("certifications").select("*", { count: "exact", head: true }).eq("published", true),
      supabase.from("achievements").select("*", { count: "exact", head: true }),
      supabase.from("achievements").select("*", { count: "exact", head: true }).eq("published", true),
      supabase.from("blog_posts").select("*", { count: "exact", head: true }),
      supabase.from("blog_posts").select("*", { count: "exact", head: true }).eq("status", "published"),
    ]);

    const [resumeRow, recentProjects, recentExperience, recentEducation, recentCertifications, recentAchievements, recentBlog] =
      await Promise.all([
        supabase.from("resumes").select("version_label, uploaded_at").eq("is_active", true).maybeSingle(),
        supabase.from("projects").select("id, name, updated_at").order("updated_at", { ascending: false }).limit(5),
        supabase
          .from("experience")
          .select("id, role, company, updated_at")
          .order("updated_at", { ascending: false })
          .limit(5),
        supabase
          .from("education")
          .select("id, degree, institution, updated_at")
          .order("updated_at", { ascending: false })
          .limit(5),
        supabase.from("certifications").select("id, name, updated_at").order("updated_at", { ascending: false }).limit(5),
        supabase.from("achievements").select("id, title, updated_at").order("updated_at", { ascending: false }).limit(5),
        supabase.from("blog_posts").select("id, title, updated_at").order("updated_at", { ascending: false }).limit(5),
      ]);

    const recentItems: RecentItem[] = [
      ...(recentProjects.data ?? []).map((row) => ({
        id: row.id,
        label: row.name,
        entity: "Project",
        updatedAt: row.updated_at,
        editHref: "/admin/projects",
      })),
      ...(recentExperience.data ?? []).map((row) => ({
        id: row.id,
        label: `${row.role} at ${row.company}`,
        entity: "Experience",
        updatedAt: row.updated_at,
        editHref: "/admin/experience",
      })),
      ...(recentEducation.data ?? []).map((row) => ({
        id: row.id,
        label: row.institution,
        entity: "Education",
        updatedAt: row.updated_at,
        editHref: "/admin/education",
      })),
      ...(recentCertifications.data ?? []).map((row) => ({
        id: row.id,
        label: row.name,
        entity: "Certification",
        updatedAt: row.updated_at,
        editHref: "/admin/certifications",
      })),
      ...(recentAchievements.data ?? []).map((row) => ({
        id: row.id,
        label: row.title,
        entity: "Achievement",
        updatedAt: row.updated_at,
        editHref: "/admin/achievements",
      })),
      ...(recentBlog.data ?? []).map((row) => ({
        id: row.id,
        label: row.title,
        entity: "Blog Post",
        updatedAt: row.updated_at,
        editHref: "/admin/blog",
      })),
    ]
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
      .slice(0, 8);

    return {
      projects: toCounts(projectsTotal.count, projectsPublished.count),
      experience: toCounts(experienceTotal.count, experiencePublished.count),
      education: toCounts(educationTotal.count, educationPublished.count),
      certifications: toCounts(certificationsTotal.count, certificationsPublished.count),
      achievements: toCounts(achievementsTotal.count, achievementsPublished.count),
      blogPosts: toCounts(blogTotal.count, blogPublished.count),
      resume: resumeRow.data
        ? { versionLabel: resumeRow.data.version_label, uploadedAt: resumeRow.data.uploaded_at }
        : null,
      recentItems,
    };
  } catch (error) {
    handleDataError("fetchAdminDashboardStats", error);
    return EMPTY_STATS;
  }
}
