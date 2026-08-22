import type { Project } from "@/types/content";

export interface ProjectSelectOptions {
  /** Keep only featured projects. */
  featuredOnly?: boolean;
  /** Cap the result to at most this many projects, applied after sorting. */
  limit?: number;
  /** Not wired to any filter UI yet — the seam a future category filter plugs into. */
  category?: string | null;
  /** Not wired to any filter UI yet — the seam a future search box plugs into. */
  query?: string | null;
}

/**
 * The single place project lists get sorted (and, once there's a UI for
 * it, filtered) — featured projects first, then each group's own
 * display_order, exactly what the brief calls for. A pure function (no
 * Supabase, no fetching) so `ProjectGrid`, the homepage section, and the
 * `/projects` index page all go through the same logic instead of each
 * re-implementing it, and so `category`/`query` can start doing real work
 * later without changing this function's shape or any of its callers —
 * today they're accepted and intentionally ignored.
 */
export function selectProjects(projects: Project[], options: ProjectSelectOptions = {}): Project[] {
  let result = options.featuredOnly ? projects.filter((project) => project.featured) : [...projects];

  result.sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    return a.display_order - b.display_order;
  });

  if (options.limit !== undefined) {
    result = result.slice(0, options.limit);
  }

  return result;
}
