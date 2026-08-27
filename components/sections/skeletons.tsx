import { Container, Skeleton } from "@/components/ui";
import { cn } from "@/lib/utils";

/**
 * Loading placeholders for the public site, used as `<Suspense>` fallbacks
 * (app/(site)/page.tsx) and by the route-level `loading.tsx` files.
 *
 * The one rule these all follow: **reproduce the real component's own
 * wrapper classes rather than inventing a similar-looking box.** Every
 * skeleton below wraps its content in the same
 * `py-(--space-section-y)` + `Container` that `components/ui/Section`
 * uses, and the same `pb-10` + `gap-3` heading block that `SectionHeading`
 * renders — so the placeholder occupies the same vertical space the real
 * section will, and nothing jumps when the data lands. Sizes are taken
 * from the real type scale (`text-h2` ≈ the heading bar's height) for the
 * same reason.
 *
 * They are `aria-hidden` via `Skeleton` itself and paired with a
 * `role="status"` label per section, so a screen reader hears "Loading
 * projects" once instead of reading out two dozen empty boxes.
 */

function SectionShell({
  label,
  children,
  className,
}: {
  /** Announced to assistive tech while this placeholder is on screen. */
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("py-(--space-section-y)", className)} role="status" aria-label={label}>
      <Container>{children}</Container>
    </div>
  );
}

/** Matches SectionHeading's own `flex-col gap-3` block and its `pb-10` gap before the content. */
function HeadingSkeleton() {
  return (
    <div className="flex flex-col gap-3 pb-10">
      <Skeleton shape="text" className="h-3 w-28" />
      <Skeleton shape="text" className="h-9 w-64 max-w-full" />
    </div>
  );
}

/**
 * Hero: no `Section` wrapper (Hero doesn't use one either — see its own
 * comment), and the same `lg:min-h-(--hero-min-height)` so the fold sits
 * where it will once the profile loads.
 */
export function HeroSkeleton() {
  return (
    <div className="relative overflow-hidden" role="status" aria-label="Loading introduction">
      <Container className="relative z-10 flex flex-col justify-center lg:min-h-(--hero-min-height)">
        <div className="flex max-w-2xl flex-col gap-3 py-8 sm:gap-5 sm:py-20 lg:py-0">
          <Skeleton shape="text" className="h-3 w-24" />
          <Skeleton shape="text" className="h-14 w-80 max-w-full" />
          <Skeleton shape="text" className="h-7 w-64 max-w-full" />
          <Skeleton shape="text" className="h-6 w-40 rounded-full" />
          <Skeleton shape="text" className="h-5 w-96 max-w-full" />
          <div className="mt-2 flex flex-wrap items-center gap-4">
            <Skeleton shape="text" className="h-12 w-40 rounded-full" />
            <Skeleton shape="text" className="h-12 w-44 rounded-full" />
          </div>
        </div>
      </Container>
    </div>
  );
}

/**
 * About: mirrors AboutContent's real grid exactly — the 2/5 portrait column
 * (square on mobile, 4:5 from `lg`), the 3/5 bio column spanning both rows,
 * and the quick-facts panel under the portrait. Keeping the placement classes
 * identical is the point: a skeleton in a different shape than the content it
 * stands in for is a layout shift waiting to happen.
 */
export function AboutSkeleton() {
  return (
    <SectionShell label="Loading about">
      <HeadingSkeleton />
      <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-5 lg:grid-rows-[auto_1fr] lg:gap-12">
        <div className="mx-auto w-full max-w-sm lg:col-span-2 lg:col-start-1 lg:row-start-1 lg:mx-0 lg:max-w-none">
          <Skeleton shape="rect" className="aspect-square h-auto w-full lg:aspect-4/5" />
        </div>
        <div className="flex flex-col gap-4 lg:col-span-3 lg:col-start-3 lg:row-span-2 lg:row-start-1">
          <Skeleton shape="text" className="h-5" />
          <Skeleton shape="text" className="h-5" />
          <Skeleton shape="text" className="h-5 w-4/5" />
        </div>
        <div className="flex flex-wrap gap-4 lg:col-span-2 lg:col-start-1 lg:row-start-2 lg:flex-col">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} shape="rect" className="h-12 w-40 lg:w-full" />
          ))}
        </div>
      </div>
    </SectionShell>
  );
}

/**
 * The shared 1/2/3-column card grid — the exact `grid-cols-1 sm:grid-cols-2
 * lg:grid-cols-3 gap-6` that ProjectGrid and CertificationGrid both use.
 * `cardClassName` carries the card's real height so the grid reserves it.
 */
export function CardGridSkeleton({
  count = 3,
  cardClassName = "h-72",
}: {
  count?: number;
  cardClassName?: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} shape="rect" className={cardClassName} />
      ))}
    </div>
  );
}

/** Projects / Certifications / Skills — every card-grid section, sized by what its cards actually are. */
export function CardGridSectionSkeleton({
  label,
  count = 3,
  cardClassName,
}: {
  label: string;
  count?: number;
  cardClassName?: string;
}) {
  return (
    <SectionShell label={label}>
      <HeadingSkeleton />
      <CardGridSkeleton count={count} cardClassName={cardClassName} />
    </SectionShell>
  );
}

/** Experience / Education — a vertical list of cards rather than a grid. */
export function StackedListSectionSkeleton({
  label,
  count = 2,
  itemClassName = "h-40",
}: {
  label: string;
  count?: number;
  itemClassName?: string;
}) {
  return (
    <SectionShell label={label}>
      <HeadingSkeleton />
      <div className="flex flex-col gap-10">
        {Array.from({ length: count }).map((_, index) => (
          <Skeleton key={index} shape="rect" className={itemClassName} />
        ))}
      </div>
    </SectionShell>
  );
}

/** The `/projects` index page body — its own h1 block, then the shared card grid. */
export function ProjectsIndexSkeleton() {
  return (
    <Container
      className="flex flex-col gap-10 py-(--space-section-y)"
      role="status"
      aria-label="Loading projects"
    >
      <div className="flex flex-col gap-3">
        <Skeleton shape="text" className="h-3 w-24" />
        <Skeleton shape="text" className="h-10 w-72 max-w-full" />
        <Skeleton shape="text" className="h-6 w-96 max-w-full" />
      </div>
      <CardGridSkeleton count={6} />
    </Container>
  );
}

/**
 * A project detail page: the back link, the logo/title header (`size-20
 * sm:size-24` logo, matching ProjectCardImage's own sizing on that page),
 * and two content blocks.
 */
export function ProjectDetailSkeleton() {
  return (
    <Container
      className="flex flex-col gap-10 py-(--space-section-y)"
      role="status"
      aria-label="Loading project"
    >
      <Skeleton shape="text" className="h-8 w-36 rounded-full" />

      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <Skeleton shape="rect" className="size-20 shrink-0 sm:size-24" />
        <div className="flex flex-1 flex-col gap-3">
          <Skeleton shape="text" className="h-10 w-80 max-w-full" />
          <Skeleton shape="text" className="h-6 w-full max-w-prose" />
          <Skeleton shape="text" className="h-4 w-40" />
          <div className="flex flex-wrap gap-3 pt-2">
            <Skeleton shape="text" className="h-11 w-48 rounded-full" />
            <Skeleton shape="text" className="h-11 w-40 rounded-full" />
          </div>
        </div>
      </div>

      {Array.from({ length: 2 }).map((_, index) => (
        <div key={index} className="flex flex-col gap-4">
          <Skeleton shape="text" className="h-7 w-44" />
          <Skeleton shape="text" className="h-5" />
          <Skeleton shape="text" className="h-5 w-5/6" />
        </div>
      ))}
    </Container>
  );
}
