import type { MediaType, ProjectMedia } from "@/types/content";

/**
 * Pure project-media helpers — same "pure function in lib/" pattern as
 * lib/projects.ts's selectProjects, used by the gallery/lightbox components
 * in components/sections/projects/.
 */

const VIEWABLE_MEDIA_TYPES: readonly MediaType[] = ["image", "video", "gif", "diagram"];

/** Everything except `document` opens in the lightbox; documents are a plain download link instead. */
export function isViewableMedia(media: Pick<ProjectMedia, "media_type">): boolean {
  return VIEWABLE_MEDIA_TYPES.includes(media.media_type);
}

const MEDIA_TYPE_LABEL: Record<MediaType, string> = {
  image: "Screenshot",
  diagram: "Diagram",
  gif: "Animation",
  video: "Video",
  document: "Document",
};

/**
 * alt_text -> title -> a generated "<Type> <position>" label (e.g.
 * "Screenshot 3") — every gallery item gets a non-empty accessible name,
 * even when the admin left both fields blank. `position` is 1-based and is
 * whatever the caller's own list numbering is (the full grid, or just the
 * viewable subset shown in the lightbox) — this function doesn't assume one.
 */
export function resolveMediaLabel(
  media: Pick<ProjectMedia, "alt_text" | "title" | "media_type">,
  position: number,
): string {
  if (media.alt_text) return media.alt_text;
  if (media.title) return media.title;
  return `${MEDIA_TYPE_LABEL[media.media_type]} ${position}`;
}
