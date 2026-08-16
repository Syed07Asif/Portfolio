# lib/

Non-component application code:

- `supabase/` — Supabase client factories: `client.ts` (browser, anon key), `server.ts` (Server Components/Actions, anon key + cookie session), `admin.ts` (service-role key, `server-only`-guarded). `admin.ts` bypasses RLS — prefer `server.ts` unless a task genuinely needs to act outside RLS.
- `data/` — data access functions that query Supabase and return typed content (projects, jobs, skills, certifications).
- `utils/` — generic helpers (formatting, date logic, etc.) with no framework or content coupling.
- `constants/` — fixed, non-content configuration values (route paths, enums, limits).

Functions here are camelCase. This is the only layer allowed to talk to Supabase directly — components and routes should call into `lib/data`, not the Supabase client, directly.
