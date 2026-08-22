import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Server Component / Server Action / Route Handler client — anon key, with
 * the user's session read from cookies. Use this (not admin.ts) for any
 * server-side code that should act as the currently signed-in user and stay
 * subject to RLS.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component, which can't set cookies.
            // Safe to ignore as long as session refresh happens in
            // middleware instead.
          }
        },
      },
    },
  );
}

/**
 * Stateless anon-key client for public content reads — no cookies, so it's
 * safe to call from inside `unstable_cache` (which forbids dynamic APIs like
 * `cookies()`) and doesn't force whatever page calls it into per-request
 * dynamic rendering. RLS still applies, exactly as it would for a
 * signed-out visitor: only published content is visible either way, so
 * public read functions don't need session/cookie awareness at all. Used by
 * lib/data — see docs/architecture.md's Caching section.
 */
export function createStaticClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
}
