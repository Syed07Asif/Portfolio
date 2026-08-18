"use client";

import Image from "next/image";
import { forwardRef, useState } from "react";
import { AnimatePresence, motion, type PanInfo } from "motion/react";
import { ChevronLeft, ChevronRight, ImageOff, X } from "lucide-react";
import { IconButton } from "@/components/ui";
import { fadeIn, scaleIn, slideVariants } from "@/lib/motion";
import { resolveMediaLabel } from "@/lib/media";
import type { ProjectMedia } from "@/types/content";

export interface MediaLightboxProps {
  /** The viewable subset only (documents are excluded before this ever mounts). */
  items: ProjectMedia[];
  index: number;
  /** +1 advancing forward, -1 going back — drives which side the slide transition enters/exits from. */
  direction: number;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

const LIGHTBOX_SIZES = "(min-width: 1024px) 80vw, 100vw";
const SWIPE_THRESHOLD = 80;

/**
 * The accessible dialog itself. Ref is forwarded to the outer dialog node so
 * the caller (MediaGallery) can drive useFocusTrap/useLockBodyScroll on it —
 * same split as Navbar's mobile nav (ref + hooks live with the state owner,
 * not the presentational child). Keyboard (Escape/arrows/Home/End) is also
 * handled by the caller for the same reason: it's really state navigation,
 * not a concern of how the dialog renders.
 */
export const MediaLightbox = forwardRef<HTMLDivElement, MediaLightboxProps>(
  ({ items, index, direction, onClose, onNext, onPrevious }, ref) => {
    const current = items[index]!;
    const label = resolveMediaLabel(current, index + 1);
    const hasMultiple = items.length > 1;
    const upcoming = hasMultiple ? items[(index + 1) % items.length]! : null;

    function handleDragEnd(_event: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) {
      if (info.offset.x < -SWIPE_THRESHOLD) onNext();
      else if (info.offset.x > SWIPE_THRESHOLD) onPrevious();
    }

    return (
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        exit="hidden"
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4 backdrop-blur-md sm:p-8"
        onClick={onClose}
      >
        <IconButton
          icon={X}
          aria-label="Close gallery"
          variant="secondary"
          size="lg"
          className="absolute top-4 right-4 z-10"
          onClick={onClose}
        />

        {hasMultiple ? (
          <>
            <IconButton
              icon={ChevronLeft}
              aria-label="Previous item"
              variant="secondary"
              size="lg"
              className="absolute top-1/2 left-4 z-10 -translate-y-1/2"
              onClick={(event) => {
                event.stopPropagation();
                onPrevious();
              }}
            />
            <IconButton
              icon={ChevronRight}
              aria-label="Next item"
              variant="secondary"
              size="lg"
              className="absolute top-1/2 right-4 z-10 -translate-y-1/2"
              onClick={(event) => {
                event.stopPropagation();
                onNext();
              }}
            />
          </>
        ) : null}

        <motion.div
          variants={scaleIn}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className="flex max-h-full w-full max-w-5xl flex-col items-center gap-4"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="relative flex max-h-(--lightbox-media-max-height) w-full items-center justify-center overflow-hidden">
            <AnimatePresence custom={direction} initial={false}>
              <motion.div
                key={current.id}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                drag={hasMultiple ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={handleDragEnd}
                className="flex max-h-(--lightbox-media-max-height) w-full items-center justify-center"
              >
                <MediaLightboxItem media={current} label={label} sizes={LIGHTBOX_SIZES} />
              </motion.div>
            </AnimatePresence>
          </div>

          {current.caption || hasMultiple ? (
            <div className="flex flex-col items-center gap-1 text-center">
              {current.caption ? (
                <p className="max-w-prose text-small text-foreground-secondary">{current.caption}</p>
              ) : null}
              {hasMultiple ? (
                <p aria-live="polite" className="text-caption text-foreground-muted">
                  {index + 1} of {items.length}
                </p>
              ) : null}
            </div>
          ) : null}
        </motion.div>

        {/* One item ahead, preloaded at the same `sizes` the visible lightbox image uses, so navigating "next" is an instant cache hit instead of a fresh fetch. */}
        {upcoming ? <MediaPreload media={upcoming} sizes={LIGHTBOX_SIZES} /> : null}
      </motion.div>
    );
  },
);

MediaLightbox.displayName = "MediaLightbox";

function MediaLightboxItem({ media, label, sizes }: { media: ProjectMedia; label: string; sizes: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex h-64 w-full flex-col items-center justify-center gap-2 rounded-lg bg-surface-raised text-foreground-muted">
        <ImageOff className="size-8" aria-hidden="true" />
        <span className="text-small">{label} failed to load</span>
      </div>
    );
  }

  if (media.media_type === "gif") {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- next/image's optimizer would strip the animation; a plain <img> preserves it.
      <img
        src={media.file_url}
        alt={label}
        onError={() => setFailed(true)}
        className="max-h-(--lightbox-media-max-height) w-auto max-w-full rounded-lg object-contain"
      />
    );
  }

  if (media.media_type === "video") {
    return (
      // No autoplay (native <video> never autoplays without the attribute) and no `muted`/`autoPlay` — playback and sound are entirely user-initiated via the native controls.
      <video
        src={media.file_url}
        controls
        preload="metadata"
        onError={() => setFailed(true)}
        className="max-h-(--lightbox-media-max-height) w-full rounded-lg"
      >
        <track kind="captions" />
      </video>
    );
  }

  return (
    <div className="relative h-(--lightbox-media-max-height) w-full">
      <Image
        src={media.file_url}
        alt={label}
        fill
        sizes={sizes}
        onError={() => setFailed(true)}
        className="rounded-lg object-contain"
      />
    </div>
  );
}

/**
 * Invisible (but not `display:none`, so it genuinely fetches) 1px probe
 * that requests the exact same `src`+`sizes` combination the real lightbox
 * image will use once the user navigates there — same computed URL, so the
 * browser serves the real render from cache instead of re-fetching. Video/
 * document neighbors aren't preloaded: no poster field exists to preload,
 * and a document's "preload" would just be silently downloading a file.
 */
function MediaPreload({ media, sizes }: { media: ProjectMedia; sizes: string }) {
  if (media.media_type === "gif") {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- preload probe for the animation-preserving <img> path above, same reasoning.
      <img
        src={media.file_url}
        alt=""
        aria-hidden="true"
        loading="eager"
        className="pointer-events-none absolute size-px opacity-0"
      />
    );
  }
  if (media.media_type === "video" || media.media_type === "document") return null;

  return (
    <div aria-hidden="true" className="pointer-events-none absolute size-px overflow-hidden opacity-0">
      <Image src={media.file_url} alt="" fill sizes={sizes} loading="eager" />
    </div>
  );
}
