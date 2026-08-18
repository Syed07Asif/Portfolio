import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

/**
 * Scoped to /admin only — the public site's Supabase reads are all
 * anon-key, cookie-free (`createStaticClient()`, see docs/architecture.md's
 * Caching section), so there's no session to refresh on public routes and
 * running this on every request would just be wasted middleware
 * invocations.
 */
export const config = {
  matcher: ["/admin/:path*"],
};
