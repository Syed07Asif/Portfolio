# Build Progress

A phase-by-phase log of this build, kept so a new chat session (a fresh
context window with no memory of prior conversations) can pick up exactly
where the last one left off. This file answers "what's been done and why";
[CLAUDE.md](../CLAUDE.md), [docs/architecture.md](./architecture.md), and
[docs/database.md](./database.md) answer "how does it work" — read those
for the actual reference material, this one for history and continuity.

**To resume work in a new session:** read this file, then CLAUDE.md, then
skim `git log --oneline` to confirm nothing has changed since the "Current
state" section below was last updated. Each phase's commit message also has
a detailed writeup — `git show <hash>` for the full reasoning behind a
specific phase if this summary isn't enough.

## Where things stand

- **Branch:** `develop` (all phase work happens here; `main` is still just
  the Phase 1 scaffold — nothing has been merged up yet).
- **Latest commit:** `72f3b5a` — "Phase 6: reusable UI primitives".
- **No live Supabase project exists yet.** Every migration/RLS/data-layer
  verification so far has been done against disposable local Postgres
  containers or the local Supabase CLI stack (`supabase start`), never a
  real hosted project. `.env.local` doesn't exist; only `.env.example`
  (placeholders) is committed. Provisioning a real project, running the
  migrations against it, and creating the admin account (documented in
  [docs/deployment.md](./deployment.md#admin-account)) is still outstanding
  — needed before the site can actually go live, but not before Phases
  7+ can continue (those build UI against the local stack / mocked data).
- **Environment notes specific to this machine:** Windows, PowerShell is
  the working shell (Bash tool exists but has PATH/quoting quirks — prefer
  PowerShell for npm/node commands). Node.js and Docker Desktop were not
  preinstalled and were set up during Phase 1/2 (Node via `winget`, Docker
  was already present). `npx supabase start` works but the full stack
  (`storage-api`, `studio`, `logflare`/analytics) is flaky/resource-heavy
  locally — see [supabase/README.md](../supabase/README.md) for the minimal
  `--exclude` flag set that reliably starts just Postgres + PostgREST +
  Kong, which is all `lib/data` needs.

## Phase log

**Phase 1 — scaffold.** Next.js App Router + TypeScript strict + Tailwind
v4, npm, no `src/`. Replaced a pre-existing static HTML/CSS/JS portfolio
site (preserved in git history before removal — see commits before
`c859f71` if that content is ever needed again). Dark-mode-only from the
start. `main` branch created, `develop` branched off it — all subsequent
phases target `develop`.

**Phase 2 — content schema.** Full Postgres schema as one migration
(`supabase/migrations/20260816102304_create_content_schema.sql`): 15
tables, enums, an `updated_at` trigger, a `slugify()` helper, indexes,
`supabase/seed.sql` with one realistic row per table. Full reference:
[docs/database.md](./database.md).

**Phase 3 — RLS, storage, security.** A second migration
(`20260816103908_rls_and_storage.sql`) enabling RLS on every table, an
`is_admin()` allowlist-based helper (`private.admins`, not a JWT claim —
rationale in [docs/architecture.md](./architecture.md#what-admin-means)),
8 storage buckets with matching policies, and `lib/supabase/{client,server,admin}.ts`.
**Two real bugs were found and fixed directly in this migration file**
during Phase 4's verification against a genuine local Supabase stack (not
just the hand-rolled test harness that had been masking them): (1)
`storage.objects` RLS can't be altered by the migration role on real
Supabase — wrapped in a `do` block catching `insufficient_privilege`; (2)
new tables are **not** auto-granted to `anon`/`authenticated` the way the
original Phase 3 docs assumed — explicit `GRANT`s were added. Both fixes
landed in the original migration (never edited after the fact once
verified) since neither bug had ever reached a real environment. Full
writeup: [docs/architecture.md](./architecture.md#the-rls-model).

**Phase 4 — typed data access layer.** `types/database.ts` (generated,
never hand-edited) → `types/content.ts` (hand-authored domain types,
what everything else imports) → `lib/validation/` (Zod, mirrors
`content.ts`) → `lib/data/` (one module per entity, `fetchX` raw query +
`getX` = `fetchX` wrapped in `unstable_cache`). Caching strategy: tag-based
(`lib/constants.ts`'s `CACHE_TAGS`) + 1hr fallback revalidate, documented in
[docs/architecture.md](./architecture.md#caching-strategy). Key gotcha:
`unstable_cache` throws outside a real Next.js server runtime, which is why
`fetchX` (unwrapped) exists separately and is what
[`tests/lib/data/smoke.ts`](../tests/lib/data/smoke.ts) calls — run it with
`npm run smoke:data` against a running local Supabase stack to sanity-check
the whole data layer end-to-end.

**Phase 5 — design system.** `styles/tokens.css` (colour/type/spacing/
radius/shadow/motion tokens, extracted from UI reference images — dark
navy + chartreuse accent + soft colour glows), wired into Tailwind v4 via
`@theme inline` in `styles/globals.css` (**no `tailwind.config.ts`** — v4
is CSS-first, see [docs/architecture.md](./architecture.md#why-css-tokens-not-tailwindconfigts)
for why adding one would be dead weight). Sora + Inter via `next/font`.
`lib/motion.ts` (reusable Framer Motion variants) +
`components/motion/MotionProvider.tsx` (wraps `MotionConfig
reducedMotion="user"` — reduced-motion is automatic everywhere, no
per-section handling). `/styleguide` route created as the ongoing visual
QA tool (noindex, 404s on `VERCEL_ENV=production`, visible in dev/preview).

**Phase 6 — UI primitives.** Everything in `components/ui/` that Phases
7+ must compose rather than reinvent: `Button`, `IconButton`, `Card`,
`Section`/`Container`/`SectionHeading`, `Badge`/`Tag`, `Divider`, `Avatar`,
`EmptyState`, `Skeleton`. shadcn/ui installed into `components/admin/ui/`
(**deliberately not `components/ui/`** — prevents any collision with or
visual contamination of the hand-built public-site primitives; admin/
overlay use only, per CLAUDE.md), themed via a compatibility block in
`globals.css`'s `@theme` that aliases shadcn's expected variables onto
existing tokens (nothing new). **Two more real bugs caught by actually
building out `/styleguide`'s Primitives section**: Radix `Slot` rejecting
`Button`'s icon+children combo under `asChild` (fixed with `Slottable`),
and tailwind-merge silently dropping `text-accent-foreground` because it
didn't know our custom `text-h2`/`text-body`/etc. font-size scale is a
different utility group than text-color classes — fixed by extending
`cn()`'s tailwind-merge config in `lib/utils.ts`. Also added
`@custom-variant dark` (was missing entirely — without it, shadcn's
`dark:` utilities would have silently followed OS preference instead of
this permanently-dark site's `.dark` class) and dropped an unnecessary
`next-themes` dependency shadcn's installer pulled in.

## Recurring lessons worth not re-learning

- **Verify against the real thing, not a simulated harness.** Phase 3's
  RLS was "proven" against a hand-rolled Postgres container that happened
  to grant privileges the way I assumed Supabase does by default — wrong
  assumption, masked until Phase 4 tested against genuine `supabase start`.
  Prefer the real local Supabase stack over shortcuts once one is cheap to
  spin up (it now is — see the `--exclude` flags in `supabase/README.md`).
- **A block comment containing a literal `*/` inside a token name (e.g.
  `--duration-*/ --ease-*`) silently truncates the comment and corrupts the
  file.** Bit `lib/motion.ts` once in Phase 5. Watch for this whenever a
  comment mentions a wildcard-suffixed CSS custom property name right
  before a slash.
- **tailwind-merge doesn't know about custom `@theme` namespaces** (our
  font-size scale, and potentially others added later) unless told via
  `extendTailwindMerge` in `lib/utils.ts`. If a future token addition
  introduces a new custom Tailwind utility *prefix* that collides textually
  with a stock group (the way `text-h2` collided with `text-color`), the
  same class of bug can recur — check `cn()`'s config when adding one.
  Actually running the styleguide and reading *computed* styles (not just
  "it compiled") is what catches this class of bug; a clean build is not
  proof of correct rendering.
- **This is a Windows/PowerShell environment.** Background npm/npx
  installs routinely exceed the default tool timeout on first run (image
  pulls, cold caches) — use `run_in_background` and expect to check back
  rather than assume a timeout means failure.

## Next up

Phases 7–16 (per the user's own framing in Phase 6's brief) build the
actual portfolio sections — hero, about, skills, experience, projects,
education, certifications, achievements, contact, etc. — as
`components/sections/*`, composing:
- content from `lib/data` (Phase 4),
- design tokens + motion (Phase 5),
- primitives from `components/ui` (Phase 6, and per CLAUDE.md's rule, no
  section should define its own button/card/badge styling).

No further detail on Phases 7+ exists yet — those prompts haven't been
given. When they arrive, update this file's "Where things stand" and add a
new phase-log entry the same way the ones above are written: what got
built, key files touched, and anything non-obvious a future session would
otherwise have to re-discover the hard way.
