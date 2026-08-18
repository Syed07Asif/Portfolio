"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveNextPath } from "@/lib/auth";
import { adminLoginSchema } from "@/lib/validation";

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
