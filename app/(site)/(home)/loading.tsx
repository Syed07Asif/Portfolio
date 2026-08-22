import {
  AboutSkeleton,
  CardGridSectionSkeleton,
  HeroSkeleton,
  StackedListSectionSkeleton,
} from "@/components/sections/skeletons";

/**
 * Scoped to the homepage alone by the `(home)` route group — that group
 * exists for exactly this reason. A `loading.tsx` placed at `app/(site)/`
 * would cascade to every public route (Next's `loading` convention wraps a
 * segment's nested children too), so `/projects` would flash a *hero*
 * skeleton while loading a grid, which is worse than showing nothing.
 *
 * The cascade is also what caused Phase 18's hydration bug — a route-level
 * `loading.tsx` wrapping a nested dynamic route broke client hydration for
 * its streamed content on this exact Next/Turbopack/React combination (see
 * docs/progress.md). Scoping each loading file to a segment with no dynamic
 * children of its own avoids that shape entirely; `/projects/[slug]`
 * hydration was re-verified live after this landed rather than assumed.
 */
export default function HomeLoading() {
  return (
    <>
      <HeroSkeleton />
      <AboutSkeleton />
      <CardGridSectionSkeleton label="Loading skills" count={3} cardClassName="h-56" />
      <StackedListSectionSkeleton label="Loading experience" count={2} />
      <StackedListSectionSkeleton label="Loading education" count={1} itemClassName="h-32" />
      <CardGridSectionSkeleton label="Loading projects" count={3} />
    </>
  );
}
