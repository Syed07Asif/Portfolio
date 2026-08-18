# Content Management

How content actually changes on this site: a database row changes through
the admin panel, and the public site picks it up — never a frontend code
change. This file covers the admin panel's shared infrastructure (Phase
18) and, per entity, exactly which cache paths/tags a change invalidates.

## The shape of an entity module

Every entity's admin support is deliberately thin, built entirely from
Phase 18's shared pieces. `lib/actions/education.ts` is the reference
implementation — the first entity wired all the way through; Phase 19
added Profile (a singleton upsert, not a list — see its own note below),
Skills (skill categories + skills, two related entities sharing one
screen), and Experience (the closest match to Education's own shape).
Adding the next one should mean:

1. **A Zod schema already exists** in `lib/validation/<entity>.ts` — it
   almost certainly already does; Phase 4 wrote one per entity. Never
   write new validation rules in the action file itself.
2. **An admin read function** in `lib/data/<entity>.ts` alongside the
   existing public `fetchX`/`getX` pair — `fetchXForAdmin()` (all rows,
   draft and published, via the cookie-aware `createClient()`) and, if the
   entity has an edit-by-id page, `fetchXByIdForAdmin(id)`. Not wrapped in
   `unstable_cache` — see that file's own comment on why.
3. **`lib/actions/<entity>.ts`** — `"use server"`, every exported function
   wrapped in `createAdminAction()` (`lib/actions/shared.ts`), which
   handles steps (a) session check and (b) admin check uniformly. Each
   handler then only does: (c) `parseInput(schema, input)`, (d) the actual
   Supabase call, (e) revalidate (see below), (f) return via
   `actionSuccess`/`actionError`. Six actions is the norm:
   `createX`, `updateX`, `deleteX` (calling `deleteStorageFolder` first if
   the entity has any uploaded files), `toggleXPublished`, `reorderX`,
   and — if it makes sense for the entity — `duplicateX`. Actions are
   plain exported `const`s wrapping `createAdminAction(...)` (a
   higher-order function), not `async function` declarations — this is a
   deliberately supported Server Actions pattern (the same one
   `next-safe-action` is built on): the *value* bound to the export is
   still an async function, which is what Next's `"use server"` transform
   actually requires.
4. **`components/admin/<entity>/<Entity>Form.tsx`** — one `useAdminForm()`
   call, one `<AdminFormShell>`, and a field component per column from
   `components/admin/form/fields/` (`TextField`, `TextareaField`,
   `DateField`, `SelectField`, `SwitchField`, `NumberField`,
   `TagInputField`, `SlugField`, `RepeatableGroupField`, plus
   `ImageUploader`/`MultiImageUploader` from `components/admin/upload/`
   for any file column). No entity-specific validation, error handling,
   toast, or unsaved-changes logic — that's all inherited from
   `useAdminForm`/`AdminFormShell`.
5. **`components/admin/<entity>/<Entity>Table.tsx`** — one `<AdminTable>`
   call with a `columns` array and the six actions wired as callback
   props. AdminTable itself owns the list UI: status pill, publish
   toggle, row menu (edit/duplicate/delete), drag-to-reorder, empty
   state, delete confirmation.
6. **Route files** under `app/admin/(protected)/<entity>/`: `page.tsx`
   (list), `new/page.tsx`, `[id]/edit/page.tsx` (the latter two just
   `EntityFormPageShell` + `<Entity>Form>`). **Do not add a route-level
   `loading.tsx`** for a segment that also has nested dynamic children
   (`new/`, `[id]/edit/`) — see "A real hydration bug, found and fixed"
   below for why; use an explicit `<Suspense>` scoped to just the list
   page's own data-fetching component instead, the way
   `app/admin/(protected)/education/page.tsx` does.

If step 3 onward starts requiring new shared machinery rather than just
calling into it, that's a sign the machinery belongs in Phase 18's
infrastructure, not the entity module — see that phase's own brief
("every content module after this should be mostly configuration, not new
machinery").

## Cache invalidation, per entity

Every mutation invalidates two independent layers, both required — see
[docs/architecture.md](./architecture.md#caching-strategy) for the full
model this follows:

- **`lib/data`'s query-result cache** (`unstable_cache`, tagged per entity
  via `CACHE_TAGS`) — busted with `updateTag(tag)`. Next 16 specifically:
  inside a Server Action, `updateTag` (not `revalidateTag`) is the correct
  call — it gives immediate expiration and read-your-own-writes semantics.
  `revalidateTag` still exists but now requires a cache-life profile
  argument (`revalidateTag(tag, profile)`) and is meant for contexts
  outside Server Actions (e.g. Route Handlers) — confirmed directly from
  `node_modules/next/dist/server/web/spec-extension/revalidate.d.ts`, not
  assumed.
- **Next's Full Route Cache** for whichever *rendered pages* embed that
  data — busted with `revalidatePath(path)`. A data-cache bust alone isn't
  enough for a route that was statically rendered; see
  [architecture.md's "Per-route revalidation"](./architecture.md#per-route-revalidation-projectsslug)
  section for why both layers matter independently.

Each entity's action module invalidates through one small helper function
(`revalidateEducation()` in `lib/actions/education.ts`) called at the end
of every mutating action, so the answer to "what does saving X actually
invalidate" is one function to read, not six.

| Entity | Renders on | Tag (`CACHE_TAGS`) | Paths revalidated |
| --- | --- | --- | --- |
| Education | `/` (homepage Education section) | `education` | `/` |
| Profile | `/` (homepage Hero + About sections) | `profile` | `/` |
| Skill categories + Skills | `/` (homepage Skills section) | `skills` | `/` |
| Experience | `/` (homepage Experience timeline) | `experience` | `/` |

*(This table grows by one row per entity as each gets wired up — Phase 18
wired Education end to end, Phase 19 added Profile, Skills, and
Experience; the pattern above is what the rest follow.)* Skill categories
and Skills share one revalidation helper
(`revalidateSkills()` in
[lib/actions/skillsShared.ts](../lib/actions/skillsShared.ts)) since they
render together in the same section — see that file's own comment for why
it isn't defined directly inside `lib/actions/skillCategories.ts` the way
every other entity's helper is private to its own action file: a function
*exported* from a `"use server"` module must itself be an async Server
Action, so a helper shared across two action files has to live in a plain
(non-`"use server"`) module instead.

Entities with their own detail route will need an extra
`revalidatePath` call once they exist — e.g. a future Projects action
should revalidate both `/` (the homepage's featured-projects section),
`/projects` (the index), and `/projects/[slug]` (that one project's own
ISR'd page) — the same three-place update `docs/architecture.md`'s
Per-route revalidation section already anticipated back in Phase 13.

## Uploads and storage cleanup

Every uploaded file lives at `{bucket}/{recordId}/{randomUUID}.{ext}` —
one bucket per content area (`STORAGE_BUCKETS`, matching the Storage
policies from Phase 3), one folder per record. That convention is what
lets a single call, `deleteStorageFolder(bucket, recordId)`
(`lib/storage/cleanup.ts`), remove every file a record owns when the
record itself is deleted — the entity doesn't need a `storage_path`
column or any bookkeeping of exactly which files it has; it just needs
its own id. Every entity's `deleteX` action calls this before deleting the
row, per the brief's explicit "deleting a record must also delete its
storage objects, never leave orphaned files" requirement. Uploads
themselves go straight from the browser to Storage
(`lib/storage/upload.ts`'s `uploadFile`, called from `ImageUploader`/
`MultiImageUploader`) using the signed-in admin's own session — Storage's
policies already grant `authenticated` + `is_admin()` insert/update/delete
on every bucket, so no service-role key or Server Action round trip is
needed just to move file bytes.

A record that doesn't exist yet (the create form, before Submit) still
needs somewhere to put an uploaded file — `<Entity>Form` generates a
stable client-side placeholder id (`useState(() => crypto.randomUUID())`)
and passes that as `recordId` until a real row exists, at which point
editing uses the row's real id instead. This placeholder is only ever
used as a Storage folder name, never rendered into the DOM, so it doesn't
need to match between server and client render passes.

`ImageUploader`/`MultiImageUploader`'s own "remove" action (as opposed to
deleting the whole record) also attempts an immediate delete of just that
one object — recovering its storage path from the public URL
(`extractStoragePath`) — but treats failure as non-fatal, since
`deleteStorageFolder` is the real backstop the moment the record is
eventually deleted regardless.

**Duplicating a record never duplicates its files** — a copy would
otherwise reference the *original* record's storage folder, silently
breaking the moment that original is edited (logo replaced) or deleted
(its whole folder removed). Every `duplicateX` action clears any file
columns on the copy instead, leaving the admin to re-upload if the
duplicate needs one.

## Two real bugs, found and fixed while proving this phase

Both were found by actually clicking through the admin panel in a real
browser against the real local Supabase stack — not assumed from reading
the code — and both are worth not re-discovering the hard way on a future
entity.

### A route-level `loading.tsx` broke hydration for its nested dynamic children

**Symptom**: clicking "Create" on `/admin/education/new` did a **native
browser form submission** (a real GET request, every field serialized
into the URL's query string) instead of React intercepting it — on a
freshly-built, carefully-reviewed form, using the textbook
`<form onSubmit={form.handleSubmit(onValid)}>` pattern. Confirmed live
that React had never attached to *any* element inside that form
(`Object.getOwnPropertyNames(el)` showed zero `__reactFiber$`/
`__reactProps$` keys on the `<form>`, its inputs, and its submit button —
even though the *component function itself* was provably executing,
confirmed via a temporary `console.log` at its top level) — while a
sibling client component elsewhere on the same page (the admin sidebar's
collapse toggle) hydrated and worked correctly. The exact same bare
`<form onSubmit={(e) => e.preventDefault()}>`, with zero other logic,
reproduced the identical failure when rendered on that same route.

**Root cause, isolated by bisection**: `app/admin/(protected)/education/
loading.tsx` existed to give the *list* page (`page.tsx`) a loading
skeleton. Next's `loading.js` file convention wraps not just the
co-located `page.tsx` but the whole segment's nested children too — so it
was also wrapping `new/page.tsx` and `[id]/edit/page.tsx`. Those are
`async` Server Components that call `cookies()` (via the admin data
layer), forcing dynamic, streamed rendering. On this project's exact
Next.js 16.3.1 + Turbopack + React 19 combination, a segment-level
`loading.tsx` Suspense boundary wrapping a nested dynamic route like that
reproducibly breaks client hydration for that nested route's streamed-in
content on a hard/initial navigation — confirmed by removing the file
(fixed it completely, verified via the same fiber-key check) and by
restoring it (broke it again, identically).

**Fix**: don't use the `loading.tsx` file convention for a segment that
also has nested `new/`/`[id]/edit/` children. Use a plain, JSX-scoped
`<Suspense>` around just the piece of the page that actually needs a
skeleton instead — see `app/admin/(protected)/education/page.tsx`, which
wraps only `<EducationTableSection>` (a small inner async component doing
the actual `fetchEducationForAdmin()` call) rather than the whole route
segment. An explicit `<Suspense>` placed in JSX only ever wraps exactly
what it's given — it doesn't cascade to sibling route segments the way
the file convention does, so it doesn't hit this interaction at all.

### dnd-kit's default accessibility id isn't SSR-deterministic

**Symptom**: a real (if non-fatal) React hydration-mismatch warning,
visible in the Next.js dev overlay, on every page using `AdminTable`:
`aria-describedby="DndDescribedBy-0"` (server) vs.
`"DndDescribedBy-1"` (client). React doesn't patch this up, so the
attribute silently stays wrong.

**Root cause**: `<DndContext>` generates its screen-reader description
element's id from a module-level counter by default, which isn't
guaranteed to produce the same value across the server render pass and
the client hydration pass.

**Fix**: pass a fixed, unique-per-usage `id` prop to every `<DndContext>`
(`"admin-table"` in `AdminTable.tsx`, `"multi-image-uploader"` in
`MultiImageUploader.tsx`) — dnd-kit uses it to derive the description id
deterministically instead, per dnd-kit's own documented SSR guidance.

## Known gaps, by design

- **`SlugField`'s live duplicate-check is still unproven.** Phase 19 wired
  `SlugField` for the first time (skill categories' `slug` column) and
  verified the auto-generate-from-name behavior live (typing "ZZ Category
  A" into Name produced "zz-category-a" automatically), but skill
  categories don't call `SlugField`'s optional `checkAvailability` prop —
  a duplicate slug is instead caught server-side by the database's own
  `unique` constraint and surfaced as a generic "That slug is already in
  use" error, not a live-as-you-type check. The first entity to actually
  wire `checkAvailability` (Projects) is still the real proof of that
  piece.
- **`MultiImageUploader` (gallery uploads) is unproven end-to-end** for
  the same reason — no entity with a gallery field has been wired up yet.
  It's built against the same primitives `ImageUploader` already proved
  live (upload, remove, storage cleanup), plus drag-to-reorder reusing
  `AdminTable`'s own dnd-kit pattern (including the SSR-id fix above).
- **`RepeatableGroupField` (repeatable sub-forms, e.g. project features)**
  is likewise built but not yet exercised by a real entity.

See [docs/progress.md](./progress.md)'s Phase 18 entry for the full
verification narrative — what was actually clicked through live, not just
reasoned about, and in what order.

## Phase 19 additions to shared infrastructure

Profile, Skills, and Experience (this phase's three modules) mostly
configured Phase 18's existing machinery, per that phase's own "every
content module after this should be mostly configuration" goal — but a
few real gaps surfaced by actually building and clicking through these
three needed small, generic additions to the shared components
themselves, not one-off workarounds:

- **`AdminTable` gained two optional props**, both backward-compatible
  (every existing caller is unaffected): `onTogglePublished` is now
  optional — omit it entirely for an entity with no publish/draft concept
  at all (skill categories have no `published` column; profile is a
  singleton with no list to publish), and the Status column/Switch simply
  don't render. `onRequestDelete` is an escape hatch for an entity whose
  delete needs more than a yes/no confirmation — skill categories must
  warn and require an explicit choice (delete its skills, or move them to
  another category first) before deleting a category that still has
  skills, since `skills.category_id references skill_categories(id) on
  delete restrict`. When provided, AdminTable's own generic confirmation
  dialog never opens; the caller (`SkillCategoryTable.tsx`) owns its own
  dialog and calls `router.refresh()` itself. See `AdminTable.tsx`'s
  updated doc comments for both.
- **`NumberField` gained an optional `allowEmpty` prop** — a cleared
  input commits `null` instead of coercing to `0`, for a genuinely
  optional numeric column (skill `proficiency`, 0–100 or unset) where
  "empty" and "zero" are different values. Every existing caller
  (`display_order`, always-a-number) is unaffected since the prop
  defaults to `false`.
- **`TextareaField` gained an optional `maxLength` prop** — renders a live
  "{count}/{maxLength}" caption and caps the native input, used by
  Profile's `short_bio`/`long_bio` fields per the brief's "live character
  count on the bio fields" requirement. Any future long-text field can opt
  into the same caption for free.
- **A new shared validation schema, `optionalImageUrlSchema`** (in
  `lib/validation/shared.ts`), alongside the existing `optionalUrlSchema`.
  See "Two more real bugs" below for why it exists and which entities'
  schemas were retroactively fixed to use it.

## Two more real bugs, found live while building Phase 19

Same practice as Phase 18's own "found and fixed while proving this
phase" section — both of these were caught by actually clicking through
the admin panel against the real local Supabase stack, not assumed from
reading the code.

### `optionalUrlSchema` rejected the placeholder asset paths every seed row actually uses

**Symptom**: saving the Profile form — without touching the avatar at
all — failed with "There is 1 error in this form," and the same thing
happened editing the pre-existing seeded Education row without touching
its logo. Neither field had been modified; the error came from a value
that was already sitting in the database before the form ever loaded.

**Root cause**: `supabase/seed.sql` seeds every logo/avatar column
(`profile.avatar_url`, `experience.company_logo_url`,
`education.institution_logo_url`, and likely others not yet wired to an
admin form) with a root-relative placeholder path like
`/images/avatar.jpg` — deliberate, since no real asset pipeline exists yet
(see docs/progress.md's Phase 8 entry). But `optionalUrlSchema` requires
`z.url()`, which demands a full absolute URL with a scheme — a value every
*uploaded* file satisfies (`lib/storage/upload.ts` always returns a real
`https://...` Storage URL), but a seeded relative path never does. Since
Zod validates the entire submitted payload regardless of which fields the
admin actually touched, this silently blocked saving *any* change to
Profile or to the still-seeded Education row, not just avatar/logo edits.

**Fix**: a new schema, `optionalImageUrlSchema` (`lib/validation/shared.ts`),
accepts either an absolute URL or a root-relative path (`/foo`, not
`//foo` — scheme-relative paths are rejected the same way
`lib/auth.ts`'s `resolveNextPath` rejects them, since browsers treat
`//` as pointing off-site). Swapped in for `profile.avatar_url`,
`experience.company_logo_url`, and (retroactively) `education
.institution_logo_url` — general-purpose external-link fields
(`link_url`, `github_url`, etc.) keep the stricter `optionalUrlSchema`
unchanged, since a relative path never makes sense for those. Verified by
saving the Education admin's pre-existing seeded row with zero changes
before and after the fix — it failed before, saved cleanly after.

### A helper shared between two `"use server"` action files broke the whole page

**Symptom**: `/admin/skills` 500'd immediately with "Server Actions must
be async functions," pointing at a plain, synchronous helper function.

**Root cause**: `revalidateSkills()` (busts the Skills cache tag +
revalidates `/`) is called from both `lib/actions/skillCategories.ts` and
`lib/actions/skills.ts`, so it was written once and `export`ed from the
former for the latter to import — but every function Next finds
`export`ed from a `"use server"` module must itself be an async Server
Action; a plain sync helper exported alongside the real actions breaks
the whole file's build, even though nothing about it needs to *be* a
Server Action. `lib/actions/education.ts`'s equivalent
`revalidateEducation()` never hit this because it's private to that one
file (no `export` keyword) — Phase 19 was the first time two action files
needed to share one.

**Fix**: moved `revalidateSkills()` into `lib/actions/skillsShared.ts`, a
plain module with no `"use server"` directive — the same reason
`lib/actions/shared.ts` (`actionSuccess`/`actionError`/`parseInput`/
`createAdminAction`) isn't itself a `"use server"` file either. Both
action files import it from there instead.

## How to update your content (for non-technical readers)

Everything below assumes you're signed in at `/admin`. Every save button
updates the live public site within a few seconds — there's nothing else
to publish or deploy.

### Profile

Go to **Profile** in the sidebar. This is the one page that's always
"live" — there's no separate list of profiles, just this one form, and no
Publish switch, because your profile always shows once it's filled in.

- **Avatar**: click the square (or drag a photo onto it) to upload your
  photo. It appears on the About section of the site.
- **Full name, Headline, Tagline**: these show up in the Hero (the very
  top of the homepage) and the About section. Each field's grey helper
  text underneath it says exactly where that field appears.
- **Short bio** and **Long bio**: the short one is your quick intro on the
  Hero; the long one is the full "About Me" story. Both show a live
  "used/limit" character count as you type. For the long bio, leave a
  completely blank line between paragraphs — each one becomes its own
  paragraph on the site.
- **Location** and **Availability status** (e.g. "Open to opportunities")
  show up as small details in the About section and the Hero badge.
- Click **Save changes** when you're done — you'll see a confirmation and
  stay on the same page so you can keep editing.

### Skills

Go to **Skills** in the sidebar. This page has two parts: your
**categories** at the top (e.g. "Machine Learning", "Languages"), and
each category's own **skills** listed underneath it.

**Managing categories:**
- Click **Add category** to create a new one (e.g. "Cloud & DevOps") —
  just give it a name; a URL-friendly slug fills in automatically.
- Drag the ⠿ handle on the left of a category row to reorder it — this
  controls the order categories appear on the site.
- The **⋯** menu on a category row lets you edit or delete it. **If a
  category still has skills in it, deleting will ask you to choose**:
  delete those skills along with the category, or move them into another
  category first. This is deliberate — a category can never be deleted
  "by accident" while it's still holding skills.

**Managing skills, the fast way:** under each category, there's a small
box that says "Quick-add skills." Type one skill name per line (e.g.
"Python", pressing Enter, then "SQL") and click **Add**. This is the
fastest way to add a whole list of skills at once — no page reloads, no
separate form per skill. Newly added skills start **unpublished** (not
yet visible on the site) — flip each one's switch to Published once
you're happy with it, or set proficiency/an icon first via the row's edit
option.

**Managing skills, the detailed way:** click **Add skill** (top of a
category, or in that category's own section) to open a full form where
you can also set a **proficiency** percentage (shown as a small fill bar
under the skill on the site) and choose whether it's published right
away. Every skill row also has drag-to-reorder and the same **⋯** edit/
delete menu as categories.

### Experience

Go to **Experience** in the sidebar, then **Add experience** (or click a
row's **⋯ → Edit** to change an existing one).

- **Company** and **Role** are required; everything else is optional.
- **Company logo**: click/drag an image onto the square at the top of the
  form.
- **Currently working here?** Turn on **Current role** — this
  automatically clears the End date field (and disables it) and makes the
  site show "Present" instead of an end date. You'll see a live preview
  under the date fields — "Duration shown on the public site: 2 yrs 7
  mos" — updating as you type, so you always know exactly what visitors
  will see.
- If you do set an End date, it can't be earlier than the Start date —
  the form will tell you immediately if it is.
- **Responsibilities** and **Technologies**: type one item, press Enter
  (or comma) to add it as a chip, repeat. Backspace on an empty box
  removes the last chip.
- **Display order** controls where this entry falls in the timeline
  relative to others (lower numbers first) — or just drag rows on the
  list page instead.
- **Published** controls whether this entry is visible on the site at
  all — leave it off while you're still drafting an entry.
