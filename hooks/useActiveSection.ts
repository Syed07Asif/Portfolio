"use client";

import { useEffect, useRef, useState } from "react";

export interface UseActiveSectionOptions {
  /** Passed straight to IntersectionObserver — shift the trigger band down to clear a fixed header and keep the "active" line near the top of the viewport rather than its vertical center. */
  rootMargin?: string;
}

/**
 * Tracks which of the given section ids is currently active for nav
 * scrollspy highlighting: the topmost (in `sectionIds` order) section
 * element currently intersecting a thin band near the top of the viewport.
 * Returns `null` before any section has entered that band (e.g. while still
 * inside the hero) or if none of the ids resolve to an element in the DOM.
 */
export function useActiveSection(
  sectionIds: string[],
  { rootMargin = "-96px 0px -70% 0px" }: UseActiveSectionOptions = {},
): string | null {
  const [activeId, setActiveId] = useState<string | null>(null);
  const visibleIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    visibleIds.current = new Set();

    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visibleIds.current.add(entry.target.id);
          } else {
            visibleIds.current.delete(entry.target.id);
          }
        }
        const topmost = sectionIds.find((id) => visibleIds.current.has(id));
        setActiveId(topmost ?? null);
      },
      { rootMargin, threshold: 0 },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // sectionIds is expected to be a stable (module- or memo-level) array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionIds.join("|"), rootMargin]);

  return activeId;
}
