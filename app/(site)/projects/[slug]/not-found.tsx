import Link from "next/link";
import { FolderSearch } from "lucide-react";
import { Button, ErrorScreen } from "@/components/ui";
import { SECTION_IDS } from "@/lib/constants";

/**
 * The 404 for a single project, one segment deeper (and therefore more
 * specific) than app/(site)/projects/not-found.tsx, which still covers
 * anything else under /projects.
 *
 * Reachable in exactly one way now: `getProjectBySlug` returned null for a
 * slug that genuinely isn't a published project. It used to *also* be what
 * a visitor saw when the database was unreachable — the fetch failed, the
 * page called `notFound()`, and a real project was reported as
 * non-existent. `lib/data` throws `DataUnavailableError` for that case as
 * of Phase 23, so an outage now renders the degraded state in
 * app/(site)/error.tsx and this page only ever makes a claim that's true.
 */
export default function ProjectSlugNotFound() {
  return (
    <ErrorScreen
      icon={FolderSearch}
      title="That project isn't here"
      description="It may have been renamed, or it isn't published yet. The full list below is up to date."
      actions={
        <>
          <Button asChild>
            <Link href="/projects">See all projects</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href={`/#${SECTION_IDS.contact}`}>Ask me about it</Link>
          </Button>
        </>
      }
    />
  );
}
