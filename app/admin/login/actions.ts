"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveNextPath } from "@/lib/auth";
import { adminLoginSchema } from "@/lib/validation";

/**
 * True when sign-in failed before it could be judged — no network, DNS
 * failure, a dead Supabase URL, or a 5xx from the auth service. Everything
 * else stays behind the single generic credential message, which is what
 * keeps "does this email exist?" unanswerable.
 */
function isAuthTransportFailure(error: { name?: string; status?: number; message?: string }): boolean {
  if (error.name === "AuthRetryableFetchError") return true;
  if (typeof error.status === "number" && error.status >= 500) return true;
  if (!error.status) {
    const message = (error.message ?? "").toLowerCase();
    return (
      message.includes("fetch failed") ||
      message.includes("econnrefused") ||
      message.includes("enotfound") ||
      message.includes("network") ||
      message.includes("timeout")
    );
  }
  return false;
}

export interface SignInState {
  error: string | null;
}

/**
 * Server Action backing the login form (bound via `useActionState`).
 * Every failure path returns the *same* generic message regardless of
 * cause — wrong password, unknown email, and "correct password but not
 * the admin" (see below) are indistinguishable from the outside, per the
 * brief's "must not reveal whether an email exists" requirement. Supabase
 * Auth's own `signInWithPassword` already returns one generic error for
 * both "wrong password" and "no such user" by design; the one place this
 * function has to actively preserve that property itself is the
 * post-sign-in `is_admin()` check below, which easily could leak "your
 * password was right, you're just not the admin" if handled carelessly.
 */
export async function signIn(_prevState: SignInState, formData: FormData): Promise<SignInState> {
  const parsed = adminLoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Enter a valid email and password." };
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword(parsed.data);

  if (signInError) {
    if (signInError.status === 429) {
      return { error: "Too many attempts. Please wait a moment and try again." };
    }

    // A transport failure is not a credential failure, and saying "invalid
    // email or password" when the auth server simply couldn't be reached
    // sends the admin off resetting a password that was never wrong.
    // supabase-js surfaces this as AuthRetryableFetchError with status 0 or
    // undefined; the message check covers the plain-fetch shape too. This
    // leaks nothing about whether the account exists — it never got far
    // enough to find out.
    if (isAuthTransportFailure(signInError)) {
      console.error("[admin/login] auth unreachable:", signInError.message);
      return {
        error: "Couldn't reach the authentication service. Check your connection and try again — your details weren't sent.",
      };
    }

    return { error: "Invalid email or password." };
  }

  // The password was correct, but that alone doesn't make this the admin
  // — is_admin() is the actual gate (see docs/architecture.md). If it
  // fails, sign back out immediately (no lingering authenticated-but-not-
  // admin session) and report the exact same generic error as a wrong
  // password, never anything that would confirm the credentials were real.
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    await supabase.auth.signOut();
    return { error: "Invalid email or password." };
  }

  redirect(resolveNextPath(formData.get("next")?.toString()));
}
