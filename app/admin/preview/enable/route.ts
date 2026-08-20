import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/auth";

/**
 * Only entry point that can ever set Next's draft-mode cookie for this site
 * — per CLAUDE.md's Phase 21 brief ("preview access must require an
 * authenticated admin session — never a guessable URL"), this checks the
 * exact same session+is_admin() gate every mutating Server Action already
 * uses (getAuthenticatedAdmin) before enabling it, so a signed-out visitor
 * who somehow guesses this path still can't turn draft mode on for
 * themselves. Once enabled, the cookie itself (cryptographically signed by
 * Next, httpOnly) is what the public page trusts — see
 * app/(site)/projects/[slug]/page.tsx.
 */
function resolvePreviewPath(path: string | null): string | null {
  if (!path) return null;
  if (!path.startsWith("/projects/")) return null;
  if (path.startsWith("//") || path.includes("://") || path.includes("\\")) return null;
  return path;
}

export async function GET(request: NextRequest) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  const path = resolvePreviewPath(request.nextUrl.searchParams.get("path"));
  if (!path) {
    redirect("/admin/projects");
  }

  const draft = await draftMode();
  draft.enable();

  redirect(path);
}
