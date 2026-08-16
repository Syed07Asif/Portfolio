import { unstable_cache } from "next/cache";
import { createStaticClient } from "@/lib/supabase/server";
import { CACHE_TAGS } from "@/lib/constants";
import type { Project, ProjectDetail, ProjectFeature, ProjectMedia, ProjectTechnology } from "@/types/content";
import { logDataError } from "./shared";

/** Raw query, unwrapped — see profile.ts's fetchProfile for why. */
export async function fetchProjects(options: { featuredOnly?: boolean; limit?: number } = {}): Promise<Project[]> {
  const supabase = createStaticClient();
  let query = supabase
    .from("projects")
    .select("id, slug, name, short_description, logo_url, cover_image_url, status, featured, display_order")
    .eq("published", true)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

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
  return data ?? [];
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
