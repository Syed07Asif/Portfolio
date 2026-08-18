"use client";

import { useEffect } from "react";

/**
 * Locks page scroll while `locked` is true — used by the mobile nav overlay
 * so the page behind it can't scroll while it's open. Restores whatever
 * inline `overflow` value was already there (if any) once unlocked.
 */
export function useLockBodyScroll(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [locked]);
}
