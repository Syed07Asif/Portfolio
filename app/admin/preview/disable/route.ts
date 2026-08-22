import { draftMode } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Turning preview off is never itself a security-sensitive action (it only
 * ever narrows what's visible), so unlike enable/route.ts this doesn't
 * re-check admin auth — clearing the cookie is safe for anyone to trigger,
 * and someone without it already sees nothing different. Reached from
 * DraftPreviewBanner's exit control.
 */
export async function GET() {
  const draft = await draftMode();
  draft.disable();

  redirect("/admin/projects");
}
