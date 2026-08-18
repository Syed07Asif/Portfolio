"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import { isViewableMedia, resolveMediaLabel } from "@/lib/media";
import { MediaThumbnail } from "./MediaThumbnail";
import { MediaLightbox } from "./MediaLightbox";
import type { ProjectMedia } from "@/types/content";

export interface MediaGalleryProps {
  /** display_order is already applied by the data layer's query — this renders the array as given, no re-sorting. */
  media: ProjectMedia[];
}

// 2/3/4 columns rather than the page's usual 1/2/3 card grid: these are
// small thumbnail tiles, not full cards, so more columns fit before feeling
// cramped — and it's what keeps a single item from stretching full-width
// (it simply occupies one of several grid tracks) without special-casing
// the 1-item count at all.
const GRID_CLASSNAME = "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4";
const THUMBNAIL_SIZES = "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw";

/**
 * Owns the grid + lightbox as one piece of state (activeIndex into the
 * *viewable* subset — documents never open in the lightbox, they're a
 * download link rendered inline in the same grid). Focus trap, body-scroll
 * lock, and keyboard nav all live here rather than inside MediaLightbox
 * itself, mirroring how Navbar's mobile-nav overlay splits state (Navbar)
 * from presentation (the overlay markup) using the same two hooks.
 */
export function MediaGallery({ media }: MediaGalleryProps) {
  const viewable = useMemo(() => media.filter(isViewableMedia), [media]);
  const viewableIndexById = useMemo(() => {
    const map = new Map<string, number>();
    viewable.forEach((item, index) => map.set(item.id, index));
    return map;
  }, [viewable]);

  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [direction, setDirection] = useState(1);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const isOpen = activeIndex !== null;

  useFocusTrap(lightboxRef, isOpen);
  useLockBodyScroll(isOpen);

  const goTo = useCallback((index: number, dir: number) => {
    setDirection(dir);
    setActiveIndex(index);
  }, []);

  const handleClose = useCallback(() => setActiveIndex(null), []);

  const handleNext = useCallback(() => {
    setDirection(1);
    setActiveIndex((current) => (current === null ? current : (current + 1) % viewable.length));
  }, [viewable.length]);

  const handlePrevious = useCallback(() => {
    setDirection(-1);
    setActiveIndex((current) => (current === null ? current : (current - 1 + viewable.length) % viewable.length));
  }, [viewable.length]);

  // Escape/arrows/Home-End only matter while the lightbox is open, and are
  // prevented from also scrolling/navigating the page behind it.
  useEffect(() => {
    if (!isOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      switch (event.key) {
        case "Escape":
          event.preventDefault();
          handleClose();
          break;
        case "ArrowRight":
          event.preventDefault();
          handleNext();
          break;
        case "ArrowLeft":
          event.preventDefault();
          handlePrevious();
          break;
        case "Home":
          event.preventDefault();
          goTo(0, -1);
          break;
        case "End":
          event.preventDefault();
          goTo(viewable.length - 1, 1);
          break;
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, handleClose, handleNext, handlePrevious, goTo, viewable.length]);

  return (
    <>
      <div className={GRID_CLASSNAME}>
        {media.map((item, index) => {
          const viewableIndex = viewableIndexById.get(item.id);
          const label = resolveMediaLabel(item, index + 1);
          return (
            <MediaThumbnail
              key={item.id}
              media={item}
              label={label}
              sizes={THUMBNAIL_SIZES}
              onOpen={viewableIndex !== undefined ? () => goTo(viewableIndex, 1) : undefined}
            />
          );
        })}
      </div>

      <AnimatePresence>
        {isOpen ? (
          <MediaLightbox
            ref={lightboxRef}
            items={viewable}
            index={activeIndex}
            direction={direction}
            onClose={handleClose}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
        ) : null}
      </AnimatePresence>
    </>
  );
}
