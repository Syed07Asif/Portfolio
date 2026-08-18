# Content Management

How content actually changes on this site: a database row changes through
the admin panel, and the public site picks it up — never a frontend code
change. This file covers the admin panel's shared infrastructure (Phase
18) and, per entity, exactly which cache paths/tags a change invalidates.

## The shape of an entity module

Every entity's admin support is deliberately thin, built entirely from
Phase 18's shared pieces. `lib/actions/education.ts` is the reference
implementation — the first (and, as of this writing, only) entity wired
all the way through. Adding the next one should mean:

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

*(This table grows by one row per entity as each gets wired up — Phase 18
only wired Education end to end; the pattern above is what the rest
follow.)*

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

- **No entity has a slug field wired up against `SlugField`'s live
  duplicate-check yet** — Education (Phase 18's proof entity) has no slug
  column at all. `SlugField` is built and ready; the first entity to
  actually need it (Projects) is the real proof of that piece.
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
