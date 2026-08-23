import { redirect } from "next/navigation";
import { getActiveResume, tolerateUnavailable } from "@/lib/data";
import { RESUME_DOWNLOAD_FILENAME } from "@/lib/constants";
// Same resolved origin the rest of the site uses, so an empty or malformed
// NEXT_PUBLIC_SITE_URL degrades here exactly as it does everywhere else
// rather than throwing mid-request. See lib/seo.ts.
import { SITE_URL } from "@/lib/seo";

/**
 * The stable, never-changing public resume URL — see RESUME_ROUTE's own
 * comment in lib/constants.ts for why every "Download Resume" CTA points
 * here instead of a resume row's own `file_url`. Always resolves whichever
 * row is currently `is_active`, so re-uploading a new version in the
 * (future) admin panel doesn't break a link already pasted into a job
 * application.
 *
 * Streams the file through this route (rather than a redirect to the
 * underlying Storage URL) so the response's Content-Disposition — and
 * therefore the downloaded filename — is always under this app's control,
 * regardless of what the underlying Storage object's own path happens to
 * be. `resume.file_url` may be a relative same-origin path (local dev,
 * matching how the seed data is shaped) or a fully-qualified remote
 * Storage URL (a real hosted Supabase project) — resolving relative paths
 * against NEXT_PUBLIC_SITE_URL first lets one code path handle both
 * uniformly.
 *
 * The no-resume/failed-fetch path redirects to app/resume/unavailable
 * rather than calling `notFound()` — see that page's own comment for why:
 * `notFound()` doesn't render a not-found boundary when called from a
 * Route Handler the way it does from a Page, verified live rather than
 * assumed.
 */
export async function GET() {
  // Tolerated: the /resume/unavailable page is already the right
  // destination for "there's nothing to serve you right now", whether the
  // cause is no active resume or an unreachable database.
  const resume = await tolerateUnavailable(getActiveResume(), null);

  if (!resume) {
    redirect("/resume/unavailable");
  }

  // TODO: once download analytics exist, increment a counter for
  // `resume.id` here — this route is the one place every real resume
  // download (as opposed to a raw Storage URL someone found some other
  // way) actually passes through.

  const fileUrl = resume.file_url.startsWith("/")
    ? new URL(resume.file_url, SITE_URL)
    : resume.file_url;

  const upstream = await fetch(fileUrl);
  if (!upstream.ok || !upstream.body) {
    redirect("/resume/unavailable");
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${RESUME_DOWNLOAD_FILENAME}"`,
      "Cache-Control": "no-store",
    },
  });
}
