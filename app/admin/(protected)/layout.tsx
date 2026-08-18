import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getAuthenticatedAdmin } from "@/lib/auth";
import { getSiteSettings } from "@/lib/data";
import { AdminShell } from "@/components/admin/AdminShell";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s — Admin" },
  robots: { index: false, follow: false },
};

/**
 * Belt-and-braces layer 2 of 2 — see proxy.ts (Next's middleware convention,
 * renamed from `middleware.ts` as of this Next.js version) for layer 1 and
 * docs/architecture.md's Security section for RLS as the final backstop.
 * `/admin/login` is a *sibling* route group (`app/admin/login/`, not
 * `app/admin/(protected)/login/`), specifically so it never passes through
 * this check — a protected layout that also wrapped the login page would
 * redirect-loop against itself for every signed-out visitor. This file is
 * genuinely reached only for the pages actually inside `(protected)`.
 *
 * Because this is an `async` Server Component that `await`s the full auth
 * check (session *and* is_admin()) before rendering anything — including
 * the sidebar/header shell — there's no client-side "render, then redirect"
 * step for admin content to flash during: the HTTP response is either a
 * redirect, or HTML that already reflects a confirmed admin session.
 */
export default async function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  const admin = await getAuthenticatedAdmin();

  if (!admin) {
    // Reachable only if middleware was bypassed/misconfigured — in normal
    // operation it already redirected with a `next` param before this ever
    // runs, so there's no path here worth reproducing that param for.
    redirect("/admin/login");
  }

  const siteSettings = await getSiteSettings();
  const blogEnabled = siteSettings?.feature_flags.blog_enabled ?? false;

  return (
    <AdminShell adminEmail={admin.email} blogEnabled={blogEnabled}>
      {children}
    </AdminShell>
  );
}
