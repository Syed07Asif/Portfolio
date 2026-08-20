import { ProjectsIndexSkeleton } from "@/components/sections/skeletons";

/**
 * Scoped to `/projects` by the `(index)` route group, so it never appears
 * over `/projects/[slug]` — that route has its own, differently-shaped
 * loading state. See app/(site)/(home)/loading.tsx for the full reasoning
 * behind scoping every loading file this way.
 */
export default function ProjectsLoading() {
  return <ProjectsIndexSkeleton />;
}
