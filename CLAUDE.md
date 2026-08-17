# CLAUDE.md

Guidance for working on this repository. This is a long-term, multi-phase build — read this file before making structural changes.

**Starting a new session on this project? Read [docs/progress.md](docs/progress.md) next** — it's the phase-by-phase build log and current-state summary kept specifically so a fresh conversation with no memory of prior sessions can resume without re-deriving decisions already made (or re-hitting bugs already found and fixed).

## Core principle

**The code defines how the portfolio works. The database defines what the portfolio contains.**

Adding a project, job, skill, or certification must mean adding a database row — never writing new frontend code. If a change to "add content" requires touching a `.tsx` file, something is wrong: either the schema is missing a field, or the UI is hard-coding something that belongs in Supabase.

## Stack (fixed — do not substitute)

- Next.js (latest stable, App Router) + React + TypeScript (strict)
- Tailwind CSS for styling
- shadcn/ui for admin/interactive primitives only
- Framer Motion (`motion`) for animation
- Supabase for Postgres + Auth + Storage
- Zod for validation
- Lucide for icons
- npm as package manager, Vercel as host

Do not introduce alternative libraries that overlap with the above (e.g. a second styling system, a second animation library, a second ORM/query layer) without an explicit decision to change this file.

## Folder structure

```
app/            routes (public site + /admin), App Router
  styleguide/   dev/preview-only visual QA tool for every design token + UI primitive
components/
  ui/           hand-built, content-agnostic primitives for the PUBLIC SITE (Button, Card, Section, ...)
  motion/       MotionProvider — makes prefers-reduced-motion automatic app-wide
  sections/     public-site sections, receive content as props, compose components/ui
  admin/        admin panel UI (editors, tables, forms)
    ui/         shadcn/ui-generated primitives — admin/overlay use ONLY, never imported by components/ui or sections/
  layout/       shared chrome: header, footer, nav, page shells
lib/
  supabase/     Supabase client factories (browser / server-cookie / server-static / service-role)
  data/         data access functions — the only layer that queries Supabase (fetchX raw + getX cached)
  validation/   one Zod schema per entity — source of truth for form + server validation
  utils.ts      generic helpers (currently: cn(), tailwind-merge configured for our custom token scale)
  constants.ts  fixed, non-content configuration values
  motion.ts     reusable Framer Motion variants
types/
  database.ts   generated from the schema — never hand-edited, never imported outside types/
  content.ts    hand-authored domain types derived from database.ts — everything else imports from here
hooks/          custom React hooks
styles/         global CSS and design tokens (globals.css's @theme inline IS the Tailwind config — no tailwind.config.ts; tokens.css)
supabase/
  migrations/   one SQL file per schema change
  seed.sql      SQL seed data for local development (Supabase CLI's default path, not a seed/ subfolder)
docs/           progress (start here), architecture, database, deployment, content-management, development
tests/          test files, mirroring the structure under test
```

Each of these folders has its own README with more detail — read it before adding files there.

## Naming conventions

- **Components:** PascalCase (`ProjectCard.tsx`)
- **Functions/variables:** camelCase (`getProjects`, `formatDateRange`)
- **Route files/folders:** kebab-case (`app/case-studies/[slug]/page.tsx`)
- **Hooks:** camelCase, `use`-prefixed (`useMediaQuery`)

## Rules

1. **Content is never hard-coded.** Project names, job history, skills, certifications, copy for portfolio sections — all of it lives in Supabase and is fetched through `lib/data`. Components render whatever they're given as props.
2. **Secrets never reach client components.** `SUPABASE_SERVICE_ROLE_KEY` and any other server-only secret must only be read in server-side code (Server Components, Route Handlers, Server Actions) — never imported into a file marked `"use client"`, never sent to the browser.
3. **All schema changes go through a migration file** in `supabase/migrations`. No hand-editing the schema in the Supabase dashboard and leaving it undocumented — the migration files are the source of truth for the database shape.
4. **No arbitrary values in components.** Colors, spacing, radii, shadows, durations, and easings are all design tokens defined in `styles/tokens.css` and exposed as Tailwind utilities (`bg-surface`, `text-h2`, `rounded-lg`, `shadow-glow-accent-md`, `ease-out-expo`, ...) — see [docs/architecture.md](../docs/architecture.md)'s Design System section for the full list. Don't write `bg-[#1a1f38]`, `p-[18px]`, `rounded-[14px]`, or similar hardcoded/arbitrary Tailwind values in a component; if a token doesn't exist for what's needed, add it to `styles/tokens.css` rather than reaching for a one-off literal. The only exception is `[value:var(--token-name)]` arbitrary-property syntax when referencing an existing token has no matching utility class — that's still 100% token-driven, just spelled differently.
5. **Don't scaffold ahead of the current phase.** This is a multi-phase build — implement what's asked for in the current phase, not speculative future features.
