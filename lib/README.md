# lib/

Non-component application code:

- `supabase/` — Supabase client factories: `client.ts` (browser, anon key), `server.ts` (Server Components/Actions, anon key + cookie session, plus a cookie-free `createStaticClient()` for cacheable public reads), `admin.ts` (service-role key, `server-only`-guarded). `admin.ts` bypasses RLS — prefer `server.ts` unless a task genuinely needs to act outside RLS.
- `data/` — one module per entity; typed, cached, server-only functions that query Supabase and return domain types from `types/content.ts` (never raw rows). The only layer allowed to talk to Supabase directly — components and routes call into `lib/data`, never the Supabase client themselves.
- `validation/` — one Zod schema per entity, the single source of truth for admin form validation and server-side validation (both here and in later phases).
- `utils/` — generic helpers (formatting, date logic, etc.) with no framework or content coupling.
- `constants.ts` — shared non-content constants: section ids, fallback nav, breakpoints, animation durations, cache tags, storage bucket limits.

Functions here are camelCase.
