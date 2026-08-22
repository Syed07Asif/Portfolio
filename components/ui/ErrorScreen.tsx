import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Container } from "./Container";
import { cn } from "@/lib/utils";

export interface ErrorScreenProps {
  icon: LucideIcon;
  /** Rendered as the page's h1 — every one of these IS the whole page, so it owns the document's single top-level heading. */
  title: string;
  description: string;
  /** Buttons/links offering a route back. Never optional in practice: a dead end with no way out is the thing this component exists to prevent. */
  actions: ReactNode;
  /**
   * Next's opaque error hash. Safe to show — it's a digest, not a message,
   * and it's the only thing that lets someone say "this happened to me" and
   * have it findable in the server logs. Absent for 404s and for client-side
   * render errors.
   */
  digest?: string;
  /**
   * Development-only detail. Callers pass `error.message` here; it is
   * rendered *only* when NODE_ENV isn't production, so a stack trace or a
   * Postgres error string can never reach a visitor. See the note in
   * app/error.tsx about what Next already redacts on its own.
   */
  devDetail?: string;
  className?: string;
}

/**
 * The one visual treatment shared by every error and not-found route
 * (app/not-found.tsx, app/error.tsx, app/(site)/error.tsx, the project
 * 404, and the admin boundary's public sibling). Presentational only — no
 * hooks, no "use client" — so the Client Component error boundaries and
 * the Server Component not-found pages can both render it.
 *
 * Deliberately built from the same primitives as the rest of the site
 * (Container, the type scale, the colour tokens) rather than a bespoke
 * error style: an error page that looks like a different website is its
 * own kind of alarming.
 */
export function ErrorScreen({
  icon: Icon,
  title,
  description,
  actions,
  digest,
  devDetail,
  className,
}: ErrorScreenProps) {
  const showDevDetail = process.env.NODE_ENV !== "production" && Boolean(devDetail);

  return (
    <Container
      className={cn(
        "flex min-h-[60vh] flex-col items-center justify-center gap-6 py-(--space-section-y) text-center",
        className,
      )}
    >
      <span className="flex size-16 items-center justify-center rounded-full border border-border bg-surface-raised">
        <Icon className="size-7 text-foreground-muted" aria-hidden="true" />
      </span>

      <div className="flex max-w-prose flex-col gap-3">
        <h1 className="text-h2 font-display font-bold text-foreground">{title}</h1>
        <p className="text-body-lg text-foreground-secondary">{description}</p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">{actions}</div>

      {digest ? (
        <p className="text-caption text-foreground-muted">
          Reference code: <code className="font-mono">{digest}</code>
        </p>
      ) : null}

      {showDevDetail ? (
        <pre className="max-w-full overflow-x-auto rounded-lg border border-border bg-surface p-4 text-left text-caption text-foreground-muted">
          {devDetail}
        </pre>
      ) : null}
    </Container>
  );
}
