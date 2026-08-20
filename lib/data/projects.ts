import { unstable_cache } from "next/cache";
import { createClient, createStaticClient } from "@/lib/supabase/server";
import { CACHE_TAGS } from "@/lib/constants";
import type { Project, ProjectDetail, ProjectFeature, ProjectMedia, ProjectTechnology } from "@/types/content";
import { logDataError } from "./shared";

type ProjectRow = Omit<Project, "technologies"> & {
  project_technologies: Pick<ProjectTechnology, "id" | "name">[];
};

/**
 * Raw query, unwrapped — see profile.ts's fetchProfile for why. Embeds each
 * project's technologies (every row, not SQL-limited — ProjectCard slices
 * to the top few for display) so card lists don't need a second round trip
 * per project; PostgREST orders the embedded rows by their own
 * display_order the same way fetchProjectBySlug does.
 */
export async function fetchProjects(options: { featuredOnly?: boolean; limit?: number } = {}): Promise<Project[]> {
  const supabase = createStaticClient();
  let query = supabase
    .from("projects")
    .select(
      `id, slug, name, short_description, logo_url, cover_image_url, status, featured, display_order,
       project_technologies ( id, name )`,
    )
    .eq("published", true)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true })
    .order("display_order", { referencedTable: "project_technologies", ascending: true });

  if (options.featuredOnly) {
    query = query.eq("featured", true);
  }
  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) {
    logDataError("getProjects", error);
    return [];
  }

  return ((data ?? []) as unknown as ProjectRow[]).map(({ project_technologies, ...project }) => ({
    ...project,
    technologies: project_technologies,
  }));
}

export const getProjects = unstable_cache(fetchProjects, ["projects"], {
  revalidate: 3600,
  tags: [CACHE_TAGS.projects],
});

/** Raw query, unwrapped — see profile.ts's fetchProfile for why. */
export async function fetchProjectSlugs(): Promise<string[]> {
  const supabase = createStaticClient();
  const { data, error } = await supabase
    .from("projects")
    .select("slug")
    .eq("published", true)
    .order("slug", { ascending: true });

  if (error) {
    logDataError("getProjectSlugs", error);
    return [];
  }
  return (data ?? []).map((row) => row.slug);
}

export const getProjectSlugs = unstable_cache(fetchProjectSlugs, ["project-slugs"], {
  revalidate: 3600,
  tags: [CACHE_TAGS.projects],
});

type ProjectDetailRow = Omit<ProjectDetail, "technologies" | "features" | "media"> & {
  project_technologies: ProjectTechnology[];
  project_features: ProjectFeature[];
  project_media: ProjectMedia[];
};

/**
 * Raw query, unwrapped — see profile.ts's fetchProfile for why. Fetches the
 * project plus its technologies, features, and media in one PostgREST
 * request (one SQL query with joins server-side), not four round trips.
 */
export async function fetchProjectBySlug(slug: string): Promise<ProjectDetail | null> {
  const supabase = createStaticClient();
  const { data, error } = await supabase
    .from("projects")
    .select(
      `id, slug, name, short_description, description, problem_statement, solution, purpose,
       logo_url, cover_image_url, github_url, demo_url, video_url, status, start_date, end_date, featured,
       project_technologies ( id, name, icon, display_order ),
       project_features ( id, title, description, display_order ),
       project_media ( id, file_url, media_type, title, alt_text, caption, display_order )`,
    )
    .eq("slug", slug)
    .eq("published", true)
    .order("display_order", { referencedTable: "project_technologies", ascending: true })
    .order("display_order", { referencedTable: "project_features", ascending: true })
    .order("display_order", { referencedTable: "project_media", ascending: true })
    .maybeSingle();

  if (error) {
    logDataError(`getProjectBySlug(${slug})`, error);
    return null;
  }
  if (!data) {
    return null;
  }

  const { project_technologies, project_features, project_media, ...project } =
    data as unknown as ProjectDetailRow;

  return {
    ...project,
    technologies: project_technologies,
    features: project_features,
    media: project_media,
  };
}

export const getProjectBySlug = unstable_cache(fetchProjectBySlug, ["project-by-slug"], {
  revalidate: 3600,
  tags: [CACHE_TAGS.projects],
});

/**
 * Draft-mode preview read — identical shape/query to fetchProjectBySlug,
 * minus the `.eq("published", true)` filter, so a still-unpublished draft
 * resolves instead of 404ing. Uses the cookie-aware `createClient()` (the
 * signed-in admin's own session, which RLS's `is_admin()` policies grant
 * full visibility to) rather than the static one, and is never wrapped in
 * `unstable_cache` — a preview must always reflect the exact current draft,
 * not a cached snapshot up to an hour stale. Called only from
 * app/(site)/projects/[slug]/page.tsx, and only when Next's draft mode is
 * enabled (see app/admin/preview/enable/route.ts for the only way that
 * cookie gets set — always behind an admin-auth check).
 */
export async function fetchProjectBySlugForPreview(slug: string): Promise<ProjectDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(
      `id, slug, name, short_description, description, problem_statement, solution, purpose,
       logo_url, cover_image_url, github_url, demo_url, video_url, status, start_date, end_date, featured,
       project_technologies ( id, name, icon, display_order ),
       project_features ( id, title, description, display_order ),
       project_media ( id, file_url, media_type, title, alt_text, caption, display_order )`,
    )
    .eq("slug", slug)
    .order("display_order", { referencedTable: "project_technologies", ascending: true })
    .order("display_order", { referencedTable: "project_features", ascending: true })
    .order("display_order", { referencedTable: "project_media", ascending: true })
    .maybeSingle();

  if (error) {
    logDataError(`fetchProjectBySlugForPreview(${slug})`, error);
    return null;
  }
  if (!data) {
    return null;
  }

  const { project_technologies, project_features, project_media, ...project } =
    data as unknown as ProjectDetailRow;

  return {
    ...project,
    technologies: project_technologies,
    features: project_features,
    media: project_media,
  };
}

// -- Admin ------------------------------------------------------------------

/** The admin list row — Project's card-list fields plus what only the admin table shows (draft state, last-updated, and a gallery size the public site never needs). */
export type AdminProjectListItem = Pick<
  Project,
  "id" | "slug" | "name" | "logo_url" | "status" | "featured" | "display_order"
> & {
  published: boolean;
  updated_at: string;
  mediaCount: number;
};

type AdminProjectListRow = Omit<AdminProjectListItem, "mediaCount"> & {
  project_media: { count: number }[];
};

/**
 * Admin-only list read — every project (draft and published), with each
 * row's gallery size via PostgREST's embedded `count` aggregate (one query,
 * not N+1). Uses the cookie-aware `createClient()` or the same reasons as
 * fetchEducationForAdmin — not cached via `unstable_cache`, live on every
 * load.
 */
export async function fetchProjectsForAdmin(): Promise<AdminProjectListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, slug, name, logo_url, status, featured, display_order, published, updated_at, project_media(count)")
    .order("display_order", { ascending: true });

  if (error) {
    logDataError("fetchProjectsForAdmin", error);
    return [];
  }

  return ((data ?? []) as unknown as AdminProjectListRow[]).map(({ project_media, ...project }) => ({
    ...project,
    mediaCount: project_media[0]?.count ?? 0,
  }));
}

/** storage_path is admin-only — the public ProjectMedia type omits it, but ProjectMediaManager needs it for storage cleanup on removal. */
export type AdminProjectMedia = ProjectMedia & { storage_path: string | null };

/** Full admin read/write shape for the create/edit form — ProjectDetail's fields plus display_order/published, which the public detail page never needs. */
export type AdminProjectDetail = Omit<ProjectDetail, "technologies" | "features" | "media"> & {
  display_order: number;
  published: boolean;
  technologies: ProjectTechnology[];
  features: ProjectFeature[];
  media: AdminProjectMedia[];
};

type AdminProjectDetailRow = Omit<AdminProjectDetail, "technologies" | "features" | "media"> & {
  project_technologies: ProjectTechnology[];
  project_features: ProjectFeature[];
  project_media: AdminProjectMedia[];
};

/** Single-project admin read for the edit page — draft or published, every column the form edits (including storage_path, which public reads never select). */
export async function fetchProjectByIdForAdmin(id: string): Promise<AdminProjectDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(
      `id, slug, name, short_description, description, problem_statement, solution, purpose,
       logo_url, cover_image_url, github_url, demo_url, video_url, status, start_date, end_date, featured,
       display_order, published,
       project_technologies ( id, name, icon, display_order ),
       project_features ( id, title, description, display_order ),
       project_media ( id, file_url, storage_path, media_type, title, alt_text, caption, display_order )`,
    )
    .eq("id", id)
    .order("display_order", { referencedTable: "project_technologies", ascending: true })
    .order("display_order", { referencedTable: "project_features", ascending: true })
    .order("display_order", { referencedTable: "project_media", ascending: true })
    .maybeSingle();

  if (error) {
    logDataError(`fetchProjectByIdForAdmin(${id})`, error);
    return null;
  }
  if (!data) return null;

  const { project_technologies, project_features, project_media, ...project } = data as unknown as AdminProjectDetailRow;

  return {
    ...project,
    technologies: project_technologies,
    features: project_features,
    media: project_media,
  };
}

/**
 * Distinct technology names already used across every project (draft or
 * published), case-insensitively de-duplicated but keeping the first-seen
 * casing — feeds SlugField's sibling, TagInputField's `suggestions` prop
 * on the Technologies field, so "Postgres" and "PostgreSQL" don't both end
 * up as separate tags across different projects (per CLAUDE.md's Phase 20
 * brief).
 */
export async function fetchProjectTechnologyNames(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("project_technologies").select("name");

  if (error) {
    logDataError("fetchProjectTechnologyNames", error);
    return [];
  }

  const seen = new Map<string, string>();
  for (const row of data ?? []) {
    const key = row.name.trim().toLowerCase();
    if (key && !seen.has(key)) seen.set(key, row.name.trim());
  }
  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
}
