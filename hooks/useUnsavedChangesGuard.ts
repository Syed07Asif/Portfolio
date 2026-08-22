"use client";

import { useEffect } from "react";

/**
 * Warns before losing unsaved form changes via two different navigation
 * paths, since the App Router has no single "block this navigation" API:
 *
 * 1. **Real browser navigation** (reload, close tab, typed URL) —
 *    `beforeunload`, the standard mechanism; the browser shows its own
 *    generic prompt regardless of what string is set on
 *    `event.returnValue`.
 * 2. **In-app `<Link>`/`<a>` clicks** — a capture-phase `document` click
 *    listener that intercepts the click, confirms with the user, and only
 *    lets it through (re-dispatching a synthetic click at the same
 *    element) if they accept. Capture-phase specifically so this runs
 *    before the anchor's own navigation, and `stopImmediatePropagation()`
 *    on cancel so nothing else (including React's own synthetic event
 *    system) sees the original click.
 *
 * Deliberately does not attempt to intercept browser back/forward
 * (`popstate`) for in-app soft navigation — the App Router already
 * commits the new route before a `popstate` handler can run, so there's
 * nothing left to block by the time one would fire; a full solution needs
 * a router-level API this app doesn't have yet.
 */
export function useUnsavedChangesGuard(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return;

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }

    function handleClick(event: MouseEvent) {
      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (!anchor || !anchor.href) return;
      // Ignore same-page hash links, new-tab/modified clicks, and anything already handled.
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const confirmed = window.confirm("You have unsaved changes. Leave this page without saving?");
      if (confirmed) return;

      event.preventDefault();
      event.stopImmediatePropagation();
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleClick, true);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleClick, true);
    };
  }, [isDirty]);
}
