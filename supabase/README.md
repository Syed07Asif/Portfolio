# supabase/

- `migrations/` — every schema change as a timestamped SQL migration file, applied via the Supabase CLI. This is the only way the database schema changes — never hand-edit the schema in the dashboard and leave it undocumented.
- `seed.sql` — SQL to populate local/dev databases with sample content, one realistic placeholder row per table. Lives at this path (not in a subfolder) because that's where the Supabase CLI looks for it by default and runs it automatically on `supabase db reset`.
- `config.toml` — local dev stack config, created by `supabase init`. Committed so `supabase start` behaves the same for everyone.

`.branches/`, `.temp/`, and `snippets/` are CLI-generated local state — git-ignored, never committed.

## Running the local stack

```bash
npx supabase start   # first run pulls several Docker images
npx supabase status -o env   # get the local API URL + anon key for .env.local
```

`supabase start` runs every service (Postgres, PostgREST, Auth, Storage, Studio, ...). Locally, `analytics`/`storage-api`/`studio` can be resource-heavy and flaky to bring up alongside everything else; if `start` reports them unhealthy, a minimal stack (just Postgres, PostgREST, and the Kong gateway — enough for `lib/data`/`tests/lib/data/smoke.ts` to work against) is:

```bash
npx supabase start --exclude storage-api,studio,logflare,vector,imgproxy,edge-runtime,mailpit,supavisor,realtime,postgres-meta,gotrue
```

`supabase db reset` re-applies every migration and `seed.sql` from scratch against the running stack.

See [docs/database.md](../docs/database.md) for the full schema reference and [docs/architecture.md](../docs/architecture.md) for the security model and data access layer.
