# lib/

Non-component application code:

- `supabase/` — Supabase client factories (browser client, server client, service-role client). The service-role client must only ever be imported from server-side code.
- `data/` — data access functions that query Supabase and return typed content (projects, jobs, skills, certifications).
- `utils/` — generic helpers (formatting, date logic, etc.) with no framework or content coupling.
- `constants/` — fixed, non-content configuration values (route paths, enums, limits).

Functions here are camelCase. This is the only layer allowed to talk to Supabase directly — components and routes should call into `lib/data`, not the Supabase client, directly.
