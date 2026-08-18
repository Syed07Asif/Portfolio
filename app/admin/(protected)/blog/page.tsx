import type { Metadata } from "next";
import { ComingSoon } from "@/components/admin/ComingSoon";
import { getSiteSettings } from "@/lib/data";

export const metadata: Metadata = { title: "Blog" };

/**
 * The sidebar disables this link when blog_enabled is off, but a direct
 * URL visit bypasses that UI-level gate — so this page checks the same
 * flag itself rather than trusting the sidebar's disabled state alone.
 */
export default async function AdminBlogPage() {
  const siteSettings = await getSiteSettings();
  const blogEnabled = siteSettings?.feature_flags.blog_enabled ?? false;

  if (!blogEnabled) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-20 text-center">
        <p className="text-body-lg font-medium text-foreground">Blog is disabled</p>
        <p className="max-w-sm text-small text-foreground-muted">
          Enable the blog feature flag in Settings to use this section.
        </p>
      </div>
    );
  }

  return <ComingSoon section="Blog" />;
}
