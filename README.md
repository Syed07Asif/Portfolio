# Syed Asif — Portfolio

A professional portfolio for Syed Asif, an Analytics & ML Engineer: a public
site, and an authenticated admin panel that is the only way its content is
ever edited.

**Core principle:** the code defines *how* the portfolio works; the database
defines *what* it contains. Adding a project, job, skill or certification
means adding a database row — never writing new frontend code. If a change to
"add content" requires touching a `.tsx` file, something is wrong.

---

## Stack

| | |
| --- | --- |
| Framework | [Next.js](https://nextjs.org/) 16 (App Router) + React 19 + TypeScript (strict) |
| Styling | [Tailwind CSS](https://tailwindcss.com/) v4 — CSS-first, no `tailwind.config.ts` |
| UI | Hand-built primitives for the public site; [shadcn/ui](https://ui.shadcn.com/) for admin only |
| Animation | [Motion](https://motion.dev/) (Framer Motion) |
| Backend | [Supabase](https://supabase.com/) — Postgres, Auth, Storage |
| Validation | [Zod](https://zod.dev/) |
| Icons | [Lucide](https://lucide.dev/) |
| Testing | [Vitest](https://vitest.dev/) + [Playwright](https://playwright.dev/) |
| Tooling | npm, deployed on [Vercel](https://vercel.com/) |

These are fixed. Don't introduce a second styling system, animation library
or query layer without changing [CLAUDE.md](./CLAUDE.md) first.

---

## Local setup

**Prerequisites:** Node.js (LTS), Docker Desktop **running** (Supabase runs
locally in containers).

```bash
npm install

# Start the local Supabase stack. The --exclude set is the minimum that
# reliably works on a laptop — see supabase/README.md for why.
npx supabase start --exclude studio,logflare,vector,imgproxy,edge-runtime,mailpit,supavisor,realtime,postgres-meta

# Apply all migrations and load one placeholder row per table.
npx supabase db reset

# Copy the env template, then fill it from `npx supabase status -o env`.
cp .env.example .env.local

npm run dev
```

The site runs at [http://localhost:3000](http://localhost:3000), the admin
panel at `/admin`.

> **Get the anon and service-role keys from `npx supabase status -o env`**,
> not from memory or a tutorial. The "well-known local demo JWT" some docs
> quote does not match this CLI version's local signing secret and fails with
> `PGRST301`, which looks exactly like an RLS bug and isn't one.

To create a local admin account so you can sign into `/admin`, see
[docs/development.md](./docs/development.md#getting-a-working-environment).

---

## Environment variables

Four. Copy [`.env.example`](./.env.example) to `.env.local` (git-ignored).

| Variable | What it is |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL. Public. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key. Public, and safe to expose — Row Level Security is the access boundary, not this key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key. Bypasses RLS entirely. **Server-only. Must never carry a `NEXT_PUBLIC_` prefix.** |
| `NEXT_PUBLIC_SITE_URL` | Public base URL. Drives canonical URLs, `sitemap.xml` and Open Graph image URLs — wrong here means wrong everywhere. |

Per-environment values for Vercel are in
[docs/deployment.md](./docs/deployment.md#3-environment-variables).

---

## Scripts

```bash
npm run dev            # Development server
npm run build          # Production build
npm run start          # Serve the production build
npm run lint           # ESLint
npm test               # Vitest (52 tests)
npm run test:e2e       # Playwright (33 tests x Chrome and Edge)
npm run smoke:data     # Sanity-check the whole data layer against a live stack
npm run backup         # Export content JSON + Storage media
npm run backup:content # Content only
npm run backup:storage # Storage media only
```

### Testing

Both suites need the local Supabase stack running. The E2E suite additionally
needs a **production** server (`npm run build && npm run start`) — Playwright
starts one itself but reuses an existing one. Dev-mode numbers are meaningless
for anything performance-related.

```bash
npm test && npm run test:e2e
```

### Backups

`npm run backup` writes a timestamped copy of every content row (including
unpublished drafts) and every Storage object to `backups/`, which is
git-ignored. By default it targets whatever `.env.local` points at — pass
`-- --env .env.production.local` to back up production, and `-- --dry-run` to
see what it *would* do first. See [`scripts/README.md`](./scripts/README.md)
and [docs/deployment.md](./docs/deployment.md#backups).

---

## Deploying

`main` is the release branch; Vercel deploys it to production, and every other
branch to a preview. The full runbook — Supabase setup, environment
variables, custom domain, security headers, smoke test, rollback, backup and
restore — is [docs/deployment.md](./docs/deployment.md).

---

## Admin access

Content is managed at `/admin`, behind Supabase Auth. There is exactly one
administrator account; "admin" means having a row in `private.admins`, an
allowlist table, rather than a JWT claim — the reasoning is in
[docs/architecture.md](./docs/architecture.md#what-admin-means).

- **Creating or rotating the account:**
  [docs/deployment.md](./docs/deployment.md#admin-account)
- **Using the panel** (non-technical, screen by screen):
  [docs/content-management.md](./docs/content-management.md)

Every content type has create, edit, publish, unpublish, delete and reorder.
Unpublished work is invisible to the public site — enforced by RLS in the
database, not by a filter in the frontend — and can be viewed via draft-mode
preview.

---

## Documentation

| Document | What's in it |
| --- | --- |
| [CLAUDE.md](./CLAUDE.md) | Project rules and conventions. Read first for structural changes. |
| [docs/progress.md](./docs/progress.md) | Phase-by-phase build log. **Start here to resume work** — it records decisions and bugs so they aren't re-derived. |
| [docs/architecture.md](./docs/architecture.md) | Architecture and data flow, security model, RLS, caching, design system, SEO, resilience. |
| [docs/database.md](./docs/database.md) | Schema, relationships, RLS policies, migration process. |
| [docs/deployment.md](./docs/deployment.md) | Vercel, Supabase, env vars, domain, rollback, backup and restore. |
| [docs/content-management.md](./docs/content-management.md) | Guide to every admin screen, plus a developer reference for the admin internals. |
| [docs/development.md](./docs/development.md) | Conventions, adding a content type end to end, adding a public section, **FUTURE WORK**. |
| [docs/empty-states.md](./docs/empty-states.md) | What every section does when its content is missing. |

Each top-level folder (`app/`, `components/`, `lib/`, `types/`, `hooks/`,
`styles/`, `supabase/`, `scripts/`, `tests/`) also has its own README covering
what belongs there.

---

## License

Private. All content — copy, images, resume, project descriptions — is Syed
Asif's.
