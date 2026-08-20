import { ProjectDetailSkeleton } from "@/components/sections/skeletons";

/**
 * The leaf segment — nothing is nested below it, so this `loading.tsx`
 * cascades to nothing and is the safest possible placement of the
 * convention (see app/(site)/(home)/loading.tsx).
 *
 * Shown on a client-side navigation from a project card and on a cold
 * request for a slug that wasn't prerendered at build time (`dynamicParams`
 * is left on deliberately — see this segment's page.tsx).
 */
export default function ProjectDetailLoading() {
  return <ProjectDetailSkeleton />;
}
