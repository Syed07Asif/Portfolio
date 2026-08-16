# supabase/

- `migrations/` — every schema change as a timestamped SQL migration file, applied via the Supabase CLI. This is the only way the database schema changes — never hand-edit the schema in the dashboard and leave it undocumented.
- `seed.sql` — SQL to populate local/dev databases with sample content, one realistic placeholder row per table. Lives at this path (not in a subfolder) because that's where the Supabase CLI looks for it by default and runs it automatically on `supabase db reset`.

See [docs/database.md](../docs/database.md) for the full schema reference.
