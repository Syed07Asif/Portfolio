import Link from "next/link";
import { FolderSearch } from "lucide-react";
import { Button, ErrorScreen } from "@/components/ui";

/**
 * Route-segment not-found for anything under /projects that isn't a
 * project detail page — the detail route has its own, more specific
 * `[slug]/not-found.tsx`, which wins for that segment. Kept so a stray
 * `/projects/whatever/extra` still lands somewhere deliberate instead of
 * the root 404, which has no site chrome around it.
 *
 * Uses the same `ErrorScreen` treatment as every other error surface: a
 * 404 that looks like a different website is its own kind of alarming.
 */
export default function ProjectsNotFound() {
  return (
    <ErrorScreen
      icon={FolderSearch}
      title="Page not found"
      description="There's nothing at this address under Projects. It may have moved, or the link may be out of date."
      actions={
        <Button asChild>
          <Link href="/projects">Back to all projects</Link>
        </Button>
      }
    />
  );
}
