"use client";

import { CircleCheck, CircleX, Info, Loader2, TriangleAlert } from "lucide-react";
import { Toaster as SonnerToaster } from "sonner";
import type { CSSProperties } from "react";

/**
 * Public-site toast host, mounted once in the root layout — call `toast(...)`
 * from "sonner" anywhere in the public site afterward. A separate instance
 * from `components/admin/ui/sonner.tsx` on purpose: that one is themed via
 * shadcn's own CSS variables and is admin/overlay use only per CLAUDE.md
 * (never imported by components/ui or sections/), so this wraps the same
 * underlying sonner dependency but themes it directly off our own design
 * tokens instead.
 */
export function Toaster() {
  return (
    <SonnerToaster
      theme="dark"
      position="bottom-right"
      icons={{
        success: <CircleCheck className="size-4" />,
        info: <Info className="size-4" />,
        warning: <TriangleAlert className="size-4" />,
        error: <CircleX className="size-4" />,
        loading: <Loader2 className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--color-surface-raised)",
          "--normal-text": "var(--color-foreground)",
          "--normal-border": "var(--color-border)",
          "--success-bg": "var(--color-surface-raised)",
          "--success-text": "var(--color-success)",
          "--success-border": "var(--color-border)",
          "--error-bg": "var(--color-surface-raised)",
          "--error-text": "var(--color-danger)",
          "--error-border": "var(--color-border)",
          "--border-radius": "var(--radius-md)",
        } as CSSProperties
      }
    />
  );
}
