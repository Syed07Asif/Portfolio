import { MediaGallery } from "./MediaGallery";
import type { ProjectMedia } from "@/types/content";

export interface ProjectMediaGalleryProps {
  media: ProjectMedia[];
}

/**
 * Server wrapper for the detail page's media gallery (Phase 14's seam,
 * previously a no-op — see git history for the original stub). Renders
 * nothing at all when a project has zero media rows, matching every other
 * optional block on this page (Technologies, Key Features, ...); otherwise
 * matches their exact heading treatment. All interactive gallery/lightbox
 * behavior lives in the "use client" MediaGallery child so this stays a
 * Server Component like the rest of components/sections.
 */
export function ProjectMediaGallery({ media }: ProjectMediaGalleryProps) {
  if (media.length === 0) return null;

  return (
    <section aria-labelledby="project-gallery" className="flex flex-col gap-4">
      <h2 id="project-gallery" className="text-h3 font-display font-semibold text-foreground">
        Gallery
      </h2>
      <MediaGallery media={media} />
    </section>
  );
}
