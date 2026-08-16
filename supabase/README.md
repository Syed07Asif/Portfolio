# supabase/

- `migrations/` — every schema change as a timestamped SQL migration file, applied via the Supabase CLI. This is the only way the database schema changes — never hand-edit the schema in the dashboard and leave it undocumented.
- `seed/` — SQL to populate local/dev databases with sample content for development.
