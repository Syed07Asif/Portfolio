import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Service-role client — bypasses Row Level Security entirely. The
 * `server-only` import makes any accidental client-component import of this
 * file a build error instead of a leaked secret. Use only for trusted
 * server-side operations that must act outside RLS (e.g. admin panel writes
 * already gated by `is_admin()` at the application layer); everything else
 * should go through server.ts or client.ts so RLS still applies.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
