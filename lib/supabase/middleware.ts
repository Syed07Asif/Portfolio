import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

const LOGIN_PATH = "/admin/login";

/**
 * Belt-and-braces layer 1 of 2 (see app/admin/(protected)/layout.tsx for
 * layer 2, and docs/architecture.md's Security section for RLS as the
 * final backstop). This layer only checks *session existence* — cheap,
 * one token verification, no extra DB round trip — and refreshes the
 * session cookie on every /admin request. Whether the session belongs to
 * the actual admin (`is_admin()`, an allowlist-table lookup) is
 * deliberately left to the protected layout instead of duplicated here,
 * so a normal request doesn't pay for two RPC calls.
 *
 * Uses `supabase.auth.getUser()`, never `getSession()` — `getUser()`
 * revalidates the token against the Auth server on every call, while
 * `getSession()` only reads whatever's in the (client-supplied,
 * unverified-until-checked) cookie. For a route guard, that difference is
 * the whole point: `getSession()` here would trust a cookie that could be
 * stale or tampered with.
 *
 * Cookie-refresh plumbing follows Supabase's own documented middleware
 * pattern exactly (mutate `response` from inside `setAll`, then copy those
 * refreshed cookies onto whatever response actually gets returned) — get
 * this subtly wrong and session refresh silently stops working instead of
 * failing loudly, so it isn't worth improvising a variation.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;
  const isLoginRoute = pathname === LOGIN_PATH;

  function redirectWithRefreshedCookies(url: URL) {
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });
    return redirectResponse;
  }

  // No session anywhere under /admin except the login page itself ->
  // bounce to login, remembering where they were headed.
  if (!user && !isLoginRoute) {
    const loginUrl = new URL(LOGIN_PATH, request.url);
    loginUrl.searchParams.set("next", pathname + search);
    return redirectWithRefreshedCookies(loginUrl);
  }

  // Already signed in and landing on the login page -> skip straight past
  // it, per the brief's "redirect an already-authenticated user straight
  // to /admin" requirement.
  if (user && isLoginRoute) {
    const nextParam = request.nextUrl.searchParams.get("next");
    const target = nextParam && nextParam.startsWith("/admin") ? nextParam : "/admin";
    return redirectWithRefreshedCookies(new URL(target, request.url));
  }

  return supabaseResponse;
}
