"use client";

import { useState } from "react";
import { EyeIcon, XIcon } from "lucide-react";

/**
 * Shown on the real public project page (app/(site)/projects/[slug]/page.tsx)
 * whenever Next's draft mode is enabled — the whole point of Phase 21's
 * draft-mode preview requirement is that this is the REAL public page
 * rendering unpublished content, not a separate mock layout, so the only
 * thing that needs to change is this one banner layered on top. Dismissible
 * (the X just hides the banner locally — draft mode itself stays on, so
 * navigating or reloading the page still shows it) is a separate control
 * from "Exit preview" (which actually clears the draft-mode cookie via
 * app/admin/preview/disable/route.ts) — conflating the two would either
 * make "dismiss" sticky-off forever with no way back short of clearing
 * cookies by hand, or make "exit" reappear every reload.
 */
export function DraftPreviewBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b border-warning/30 bg-warning/15 px-4 py-3 text-warning backdrop-blur">
      <span className="flex items-center gap-2 text-small font-medium">
        <EyeIcon className="size-4 shrink-0" aria-hidden="true" />
        Preview mode — you&apos;re viewing unpublished content. This isn&apos;t visible to the public.
      </span>
      <span className="flex items-center gap-3">
        <a href="/admin/preview/disable" className="text-small font-semibold underline underline-offset-2 hover:no-underline">
          Exit preview
        </a>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss preview banner"
          className="text-warning/80 hover:text-warning"
        >
          <XIcon className="size-4" aria-hidden="true" />
        </button>
      </span>
    </div>
  );
}
