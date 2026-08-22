"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Bound to the header's sign-out control. Clears the Supabase session (server-side, cookie-based) and sends the admin back to the login page — never just a client-side redirect that leaves the cookie behind. */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
