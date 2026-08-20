import Link from "next/link";
import { FolderSearch } from "lucide-react";
import { Button, Container, EmptyState } from "@/components/ui";

/**
 * Route-segment not-found — anything under /projects that calls
 * `notFound()` (an unknown or unpublished slug) renders this instead of
 * the generic root 404, so the message and the way back are specific to
 * where the visitor actually was.
 */
export default function ProjectNotFound() {
  return (
    <Container className="flex flex-col items-center py-(--space-section-y)">
      <EmptyState
        icon={FolderSearch}
        titleAs="h1"
        title="Project not found"
        description="This project doesn't exist, or isn't published yet. It may have moved or been renamed."
      />
      <Button asChild className="mt-6">
        <Link href="/projects">Back to all projects</Link>
      </Button>
    </Container>
  );
}
