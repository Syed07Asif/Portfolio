# Content Management

**This is the handbook for running the site.** Part 1 is a complete,
non-technical guide to every screen in the admin panel and how publishing
works — no code, no terminology you'd need a developer to explain. Part 2
is the developer reference for the machinery underneath it.

The one idea behind all of it: **the site's content lives in a database,
not in code.** Adding a project, a certification, a nav link, or a new
resume is something you do by filling in a form at `/admin`. Nothing needs
to be re-deployed, and no one needs to touch a file.

---

# Part 1 — Using the admin panel

## Signing in

Go to `/admin`. You'll be asked for your email and password. There's
exactly one admin account, and every page under `/admin` is private —
signed out, you can't reach any of it, and there are no guessable URLs
that let anyone around that (including the preview links described below).

Once you're in, the sidebar on the left is the full list of things you can
edit. On a phone, tap the menu button to open it as a drawer.

## How publishing works

This is the single most important thing to understand, and it works the
same way on almost every screen.

**Everything starts as a draft.** When you create something new, its
**Published** switch is off. A draft is saved in the database and visible
to you in the admin panel, but a visitor to the site cannot see it and has
no way to reach it. This means you can start writing something, save it
half-finished, and come back next week without ever showing an unfinished
page to the public.

**Publishing is one switch.** Turn **Published** on — either in the item's
own form, or directly from its row on the list page — and it appears on
the public site within a few seconds. Turn it off and it disappears again.
There's nothing else to click, no "deploy" step, no cache to clear.

**Empty sections hide themselves.** If nothing in a section is published,
that whole section vanishes from the homepage rather than showing an empty
heading. Publish the first item and the section reappears. So you never
have to worry about a bare "Certifications" heading with nothing under it.

**Order is yours to set.** Every list page has a ⠿ handle on the left of
each row. Drag it to reorder, and the public site immediately reflects the
new order. Every form also has a **Display order** number field if you'd
rather set it explicitly (lower numbers come first) — dragging is usually
easier.

**The ⋯ menu** at the right of each row has **Edit** and **Delete** (and
**Duplicate** on some screens). Deleting always asks you to confirm first,
and the confirmation names the exact item so you can't delete the wrong
one by muscle memory. **Deleting is permanent** — it also removes any
images or files that item owned.

**Unsaved changes are protected.** If you start editing a form and then
try to navigate away or close the tab without saving, you'll be warned
first.

**A few screens work slightly differently, on purpose:**

| Screen | How "live" works there |
| --- | --- |
| **Profile** | No Published switch. There's only one profile and it's always live once filled in. |
| **Projects** | Publishing requires a name, a slug, and a short description. Saving a draft never requires anything. |
| **Resume** | Uses **active** instead of published — exactly one version is the live download at a time. |
| **Blog** | Uses a **Draft / Published** dropdown instead of a switch, because posts have a real editorial workflow. |
| **Settings** | Not content — one settings form, saved like any other, affecting the whole site. |

## Uploading images and files

Anywhere you see a dashed square or box, you can either click it or drag a
file onto it. You'll see the image appear immediately while it finishes
uploading in the background.

To replace an upload, hover it and click the upload icon. To remove it,
click the X. Each screen only accepts the file types and sizes that make
sense there (for example, the resume screen accepts PDFs only), and it
will tell you plainly if a file is too large or the wrong type rather than
failing silently.

Files you upload while creating something that hasn't been saved yet are
handled correctly — you don't have to save first and then come back to
upload.

## Previewing unpublished work

Draft projects can be previewed exactly as they will look once published.

On the **Projects** list, a draft row has an 👁 (eye) button. In a
project's edit form, there's a **Preview** button at the top. Either one
opens the project's **real public page**, rendered by the real public
site — not a mock-up or an approximation. What you see is precisely what a
visitor will see: the same title, description, images, technologies,
features, links, and layout.

While you're in preview mode, a banner across the top says so, and it
stays there as you click around. It has two controls:

- **Exit preview** turns preview mode off completely and takes you back to
  the Projects list. Draft pages go back to being invisible.
- **X** just hides the banner for the current page, in case it's covering
  something you want to look at. Preview mode itself stays on, and the
  banner comes back when you navigate or reload.

Preview requires you to be signed in as the admin. There is no link you
could accidentally share that would let someone else see your drafts.

---

## Profile

**Sidebar → Profile.** One form, always live once filled in — there's no
list of profiles and no Published switch.

- **Avatar** — your photo, shown in the About section.
- **Full name**, **Headline**, **Tagline** — these appear in the Hero (the
  very top of the homepage) and the About section. The grey helper text
  under each field says exactly where that field shows up.
- **Short bio** and **Long bio** — the short one is your quick intro in the
  Hero; the long one is the full "About Me" story. Both show a live
  "used/limit" character count as you type. In the long bio, leave a
  completely blank line between paragraphs and each becomes its own
  paragraph on the site.
- **Location** and **Availability status** (e.g. "Open to opportunities") —
  small details in the About section and the Hero badge.

Click **Save changes** when you're done. You stay on the same page so you
can keep editing.

## Skills

**Sidebar → Skills.** Two parts on one screen: your **categories** at the
top (e.g. "Machine Learning", "Languages"), and each category's own
**skills** listed underneath it.

**Categories:**
- **Add category** creates a new one — just give it a name; the
  URL-friendly slug fills in automatically.
- Drag ⠿ to reorder categories on the site.
- The ⋯ menu edits or deletes. **If a category still has skills in it,
  deleting asks you to choose first**: delete those skills along with the
  category, or move them into another category. A category can never be
  deleted "by accident" while it's still holding skills.

**Adding skills quickly:** each category has a **Quick-add skills** box.
Type one skill name per line and click **Add** — that's the fastest way to
enter a whole list at once, with no page reloads. Newly added skills start
**unpublished**; flip each one's switch on when you're happy with it.

**Adding a skill in detail:** **Add skill** opens a full form where you can
also set a **proficiency** percentage (shown as a small fill bar on the
site) and publish it right away. Leave proficiency blank if you'd rather
not show a level — blank and zero are different, and blank shows no bar.

## Experience

**Sidebar → Experience → Add experience.**

- **Company** and **Role** are required; everything else is optional.
- **Company logo** — click or drag an image onto the square.
- **Currently working here?** Turn on **Current role**. This clears and
  disables the End date field, and the site shows "Present" instead of an
  end date. Under the date fields you'll see a live preview — "Duration
  shown on the public site: 2 yrs 7 mos" — updating as you type, so you
  always know what visitors will see.
- If you do set an End date, it can't be earlier than the Start date. The
  form tells you immediately if it is.
- **Responsibilities** and **Technologies** — type an item, press Enter (or
  comma) to add it as a chip, repeat. Backspace on an empty box removes the
  last chip.
- **Published** controls whether this entry appears at all.

## Education

**Sidebar → Education → Add education.** The simplest of the list screens.

- **Institution**, **Degree**, **Field of study**, **Grade** — all free
  text.
- **Institution logo** — click or drag an image onto the square.
- **Start date** / **End date** — leave the end date blank if you're still
  studying.
- **Description** — notable coursework, honours, anything worth adding.
- **Link URL** — the institution's site, if you want the entry to link
  somewhere.

## Projects

**Sidebar → Projects → Add project.** The biggest form in the panel, and
the only one split into tabs — **Basics**, **Content**, **Technologies**,
**Features**, **Links**, **Media** — so it never feels like one huge page.
Everything outside Basics is optional.

- **You can save at any point, even with almost nothing filled in.**
  Saving never blocks you. Only turning on **Published** requires a name, a
  slug, and a short description, and the form tells you exactly what's
  missing if you try to publish too early. Until then it sits as a draft,
  visible only to you.
- **Slug** — fills in automatically from the Name as you type, and shows a
  green check or red X to say whether another project already uses it.
  **If you change the slug of a project that's already published, you'll
  see a warning**: the slug is what the page's URL is built from
  (`/projects/your-slug`), so changing it breaks any link you've already
  shared. Your uploaded images are unaffected either way.
- **Technologies** — type a name and press Enter (or comma) to add a chip.
  As you type you'll see technologies already used on other projects
  suggested, so the same tool doesn't end up spelled two different ways
  across your portfolio.
- **Features** — **Add feature** for each notable one: a title and an
  optional description. Reorder with the up/down arrows.
- **Links** — GitHub, live demo, and video, all optional. A blank link
  simply won't appear on the page.
- **Media** — a **Logo** (small, shown in lists) and a **Cover image**,
  both separate from the **Gallery** (screenshots, diagrams, animations,
  videos, or documents). For each gallery item you can set its type, a
  title, alt text, and a caption. **You'll see a warning if you leave alt
  text blank**, since it affects accessibility and how the image appears in
  search results. Drag gallery items to reorder; deleting one removes the
  file for good.
- **Featured** surfaces the project in the homepage's featured section, on
  top of being published.
- **Preview** — see "Previewing unpublished work" above.

On the list page you can **search by name**, **filter by published/draft**,
and drag rows to reorder. Reordering while a search or filter is active is
safe — the rows you can't currently see keep their own relative order.

## Certifications

**Sidebar → Certifications → Add certification.**

- **Issuing organization logo** — click or drag an image onto the square.
- **Certification name** and **Issuing organization** are required.
- **Issue date** and **Expiration date** — leave the expiration blank if
  the certification doesn't expire. If you do set one, **it can't be
  earlier than the issue date** and the form will say so immediately.
- **Credential ID** and **Credential verification URL** — the issuer's
  reference number and the link someone would use to verify it.
- **Certificate (PDF or image)** — upload the certificate itself. Unlike
  the logo box, this accepts a PDF as well as an image, and shows the
  filename with a link to open it rather than a thumbnail.
- **Description** — anything worth adding about what the certification
  covers.

The list page shows an **Expiry** column at a glance: "Valid until Mar
2027" for something still current, "Expired Jan 2025" (highlighted) for
something that's lapsed, and "No expiry" for certifications that don't
expire. A certification expiring *today* still counts as valid.

## Achievements

**Sidebar → Achievements → Add achievement.** For awards, publications,
talks — anything notable that isn't a job, a degree, or a certification.

- **Image** — click or drag an image onto the square.
- **Title** is required; everything else is optional.
- **Organization** and **Date** — who gave it and when. Either can be left
  blank, and the site adjusts what it shows accordingly.
- **Description** — the details.
- **Supporting document** — a PDF or image (a paper, a certificate, a
  programme). Shows as a filename with a link, like the certificate
  upload.
- **External link** — a reference URL, if there's somewhere to point to.

## Contact

**Sidebar → Contact → Add contact link.** These are the contact channels
shown in the site's Contact section and in the footer.

- **Label** — the card's title, e.g. "Email".
- **Type** — Email, LinkedIn, GitHub, WhatsApp, Twitter / X, or Other. The
  type decides which icon is used and how the link is built.
- **Value** — what this changes based on the type, and **each type is
  checked for you**:
  - **Email**: must be a real email address. The card becomes a `mailto:`
    link automatically.
  - **WhatsApp**: must be a real phone number (spaces, dashes, brackets and
    a leading `+` are all fine). The card becomes a `wa.me` link built from
    the number automatically.
  - **Everything else**: a short label like your handle or username.
- **Profile URL** — shown for LinkedIn, GitHub, Twitter / X, and Other.
  **Required for LinkedIn, GitHub, and Twitter / X**, since those cards
  have nowhere to link without it. Email and WhatsApp don't ask for it at
  all — their links are built from the value instead.

Below the list there's a **live preview of the Contact section** showing
exactly how the published channels will render on the site — the real
component, not a picture of it. It updates as soon as you publish,
unpublish, or reorder a channel, and tells you plainly when nothing is
published yet and the section is therefore hidden.

## Resume

**Sidebar → Resume.** This screen manages the PDF that every "Download
Resume" button on the site points at.

**The stable download URL.** At the top is the one public link that always
resolves to whichever version is currently active, with a **Copy** button.
This is the link to put in a job application: it keeps working after you
upload a new version, so an application you sent months ago downloads your
current resume, not the old one. Copy this rather than a link to a specific
file.

**Uploading a new version.** Choose a **PDF file** (PDF only, up to 10MB),
give it a **Version label** so you can tell versions apart later (e.g.
"v3 — 2026"), and optionally turn on **Set as active immediately**. Click
**Upload**.

**Switching versions.** Every version you've ever uploaded is listed with
its upload date and whether it's **Published** (active) or a **Draft**
(inactive). Click **Set active** on any older version to make it the live
one again — the previously active version is switched off in the same
instant, so there is never a moment where the site has no resume to
download.

**Deleting old versions.** The 🗑 button removes a version for good, after
a confirmation. **You can't delete the active version** — the button is
disabled with an explanation. Activate a different version first, then
delete the old one. This is deliberate: it makes it impossible to
accidentally leave the site with a broken download link.

## Settings

**Sidebar → Settings.** One form for site-wide settings.

- **Site title** — the browser tab title and branding text.
- **Meta description** — the default description search engines and link
  previews use.
- **Default OG image** — the image shown when someone shares a link to your
  site on social media or in a chat app.

**Primary navigation** is the important part of this screen. It's the menu
at the top of the public site, and **this is how a new section gets into
the nav without anyone writing code**:

- **Add nav item** adds a row. Give it a **Label** (what visitors see) and
  an **Href** (where it goes: `#projects` for a section on the homepage, or
  `/blog` for a separate page).
- Rename by editing the Label. Reorder with the up/down arrows.
- **Visible / Hidden** toggles whether the item appears in the menu. **If
  you try to hide an item whose section still has published content behind
  it, you'll be asked to confirm first** — the warning explains that hiding
  only removes the menu link; the section itself stays on the page and is
  still reachable by scrolling or by a direct link. Hiding an item that has
  nothing behind it doesn't ask, since there's nothing to lose.

**Feature flags:**

- **Blog enabled** turns on the Blog section in this admin panel's sidebar.
  The public blog is not built yet, so this only affects the admin panel.
- **Analytics enabled** controls whether analytics scripts load on the
  public site.

Remember to click **Save changes** — nav edits, like everything else on
this form, aren't live until you do.

## Blog

**Sidebar → Blog** — only visible when **Blog enabled** is turned on in
Settings. If it's off, the sidebar link is greyed out, and visiting the URL
directly tells you it's disabled rather than showing a broken screen.

This is deliberately minimal: a list and a form, so posts can be written
and stored now, proving the site is ready for a blog whenever you want one.
**The public blog does not exist yet** — nothing you write here appears on
the site, whatever you set its status to.

- **Cover image**, **Title**, **Slug** (auto-filled from the title, with a
  duplicate check), **Excerpt**, **Content**, **Category**, **Author**,
  **Tags**, **Reading time**.
- **Status** — **Draft** or **Published**, instead of the Published switch
  other screens use. The first time you set a post to Published, the site
  records when it went live; setting it back to Draft clears that.

---

# Part 2 — Developer reference

Everything below is for whoever is working on the code, not for using the
panel. It covers how an entity module is put together, which caches a save
invalidates, how uploads and storage cleanup work, how preview mode is
wired, and the real bugs each phase found the hard way.

## The shape of an entity module

Every entity's admin support is deliberately thin, built entirely from
Phase 18's shared pieces. `lib/actions/education.ts` is the reference
implementation — the first entity wired all the way through; Phase 19
added Profile (a singleton upsert, not a list — see its own note below),
Skills (skill categories + skills, two related entities sharing one
screen), and Experience (the closest match to Education's own shape).
Phase 20 added Projects — the first entity with child tables edited
together on one screen (technologies/features/media, written as a full
replace on every save — see `writeProjectChildren()` in
`lib/actions/projects.ts`), the first to actually prove `SlugField`'s
`checkAvailability` and `RepeatableGroupField` live, and the first with a
draft/publish distinction where *saving* and *publishing* have genuinely
different requirements (see its schema's `superRefine` in
`lib/validation/project.ts`). Phase 21 added Certifications, Achievements,
and Contact links following this shape exactly, plus three screens that
deliberately *don't* (Resume, Settings, Blog — see "Phase 21 additions"
below). Adding the next one should mean:

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
   `ImageUploader`/`MultiImageUploader`/`FileUploader` from
   `components/admin/upload/` for any file column). No entity-specific
   validation, error handling, toast, or unsaved-changes logic — that's all
   inherited from `useAdminForm`/`AdminFormShell`.
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
7. **A sidebar entry** in `components/admin/adminNav.ts` if the entity is a
   new destination rather than a replaced `ComingSoon` placeholder — the
   sidebar *and* the header's section-title lookup both derive from that
   one list, so there's nothing else to keep in sync.

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
| Projects | `/` (featured section), `/projects` (index), `/projects/[slug]` (own detail page) | `projects` | `/`, `/projects`, `/projects/[slug]` (both the old *and* new slug on a rename) |
| Certifications | `/` (homepage Certifications section) | `certifications` | `/` |
| Achievements | `/` (homepage Achievements section) | `achievements` | `/` |
| Contact links | `/` (homepage Contact section **and** the site-wide Footer) | `contact-links` | `/` |
| Resume | `/` (Hero/Contact/Footer download CTAs), `/resume` (the download route) | `resume` | `/`, `/resume` |
| Site settings | every route (nav, `<title>`, OG defaults) | `site-settings` | `/` with `"layout"` scope |
| Blog posts | nothing yet — no public blog exists | *(none)* | *(none)* |

Two rows in that table are deliberately unlike the rest:

- **Site settings** passes `revalidatePath("/", "layout")` rather than a
  bare path, because `primary_nav`/`site_title` are rendered by the
  `(site)` layout that wraps *every* public route, not by one page.
- **Blog posts** revalidate nothing at all, and `lib/data/blogPosts.ts` has
  no public `fetchX`/`getX` pair to invalidate — the public blog stays
  unbuilt per CLAUDE.md's Phase 21 brief, so there is no cached public read
  and no rendered page to bust. The moment a public blog route is built,
  that entity needs a `CACHE_TAGS.blog` tag, a cached read, and the same
  three-place `revalidatePath` treatment Projects has (its own detail
  route makes it the closest existing precedent).

Skill categories and Skills share one revalidation helper
(`revalidateSkills()` in
[lib/actions/skillsShared.ts](../lib/actions/skillsShared.ts)) since they
render together in the same section — see that file's own comment for why
it isn't defined directly inside `lib/actions/skillCategories.ts` the way
every other entity's helper is private to its own action file: a function
*exported* from a `"use server"` module must itself be an async Server
Action, so a helper shared across two action files has to live in a plain
(non-`"use server"`) module instead.

## Uploads and storage cleanup

Every uploaded file lives at `{bucket}/{recordId}/{randomUUID}.{ext}` —
one bucket per content area (`STORAGE_BUCKETS`, matching the Storage
policies from Phase 3, plus `settings` added in Phase 21 for the default OG
image), one folder per record. That convention is what lets a single call,
`deleteStorageFolder(bucket, recordId)` (`lib/storage/cleanup.ts`), remove
every file a record owns when the record itself is deleted — the entity
doesn't need a `storage_path` column or any bookkeeping of exactly which
files it has; it just needs its own id. Every entity's `deleteX` action
calls this before deleting the row, per the brief's explicit "deleting a
record must also delete its storage objects, never leave orphaned files"
requirement. Uploads themselves go straight from the browser to Storage
(`lib/storage/upload.ts`'s `uploadFile`, called from `ImageUploader`/
`MultiImageUploader`/`FileUploader`) using the signed-in admin's own
session — Storage's policies already grant `authenticated` + `is_admin()`
insert/update/delete on every bucket, so no service-role key or Server
Action round trip is needed just to move file bytes.

A record that doesn't exist yet (the create form, before Submit) still
needs somewhere to put an uploaded file — `<Entity>Form` generates a
stable client-side placeholder id (`useState(() => crypto.randomUUID())`)
and passes that as `recordId` until a real row exists, at which point
editing uses the row's real id instead. This placeholder is only ever
used as a Storage folder name, never rendered into the DOM, so it doesn't
need to match between server and client render passes.

The uploaders' own "remove" action (as opposed to deleting the whole
record) also attempts an immediate delete of just that one object —
recovering its storage path from the public URL (`extractStoragePath`) —
but treats failure as non-fatal, since `deleteStorageFolder` is the real
backstop the moment the record is eventually deleted regardless.

**Duplicating a record never duplicates its files** — a copy would
otherwise reference the *original* record's storage folder, silently
breaking the moment that original is edited (logo replaced) or deleted
(its whole folder removed). Every `duplicateX` action clears any file
columns on the copy instead, leaving the admin to re-upload if the
duplicate needs one.

**`FileUploader` vs. `ImageUploader`** (Phase 21): `ImageUploader` renders
its value as an `<img>` thumbnail, which is wrong for a column that may
hold a PDF (a certification's certificate file, an achievement's
supporting document) — a PDF URL in an `<img>` is just a broken-image
icon. `FileUploader` (`components/admin/upload/FileUploader.tsx`) is the
same upload/remove mechanics with a filename-plus-open-link presentation
instead of a thumbnail. Same bucket config, same validation, same
best-effort immediate removal.

## Preview mode (Next.js draft mode)

Phase 21 replaced Phase 20's standalone admin preview page
(`app/admin/(protected)/projects/[id]/preview/page.tsx`, now deleted) with
real Next.js draft mode. The distinction matters and was the point of the
requirement: the old page *reused* the public page's presentational
components, but it was still a second page that could drift from the real
one. Draft mode instead makes **the actual public route** render
unpublished content, so there is structurally nothing to drift.

How it fits together:

- **`app/admin/preview/enable/route.ts`** is the only thing that can ever
  call `draftMode().enable()`. It runs `getAuthenticatedAdmin()` first —
  the same session + `is_admin()` gate every mutating Server Action uses —
  so an unauthenticated visitor who guesses the path is redirected to
  login, never given the cookie. It also validates its `path` parameter
  (must start with `/projects/`, no scheme, no protocol-relative `//`,
  no backslash) before redirecting, the same open-redirect guard
  `lib/auth.ts`'s `resolveNextPath` applies to login redirects. Note this
  route sits *outside* `(protected)` deliberately — it isn't a page in the
  admin shell, and wrapping a Route Handler in that layout would render
  admin chrome around a redirect.
- **`app/admin/preview/disable/route.ts`** clears it again. This one
  deliberately does *not* re-check auth: disabling only ever narrows what's
  visible, so it's safe for anyone to trigger, and someone without the
  cookie already sees nothing different.
- **`app/(site)/projects/[slug]/page.tsx`** — the real public page — reads
  `draftMode()` and swaps its data source: `getProjectBySlug` (cached,
  `published = true`) normally, `fetchProjectBySlugForPreview` (uncached,
  cookie-aware, no `published` filter) when draft mode is on.
  `generateMetadata` makes the same swap, so a draft's title/description
  don't fall back to empty. Nothing else about the page changes — same
  components, same layout, same everything.
- **`components/sections/projects/DraftPreviewBanner.tsx`** is the only
  added UI. Its "dismiss" (X) and "Exit preview" controls are deliberately
  separate: dismiss hides the banner locally for the current page (draft
  mode stays on, banner returns on navigation), exit actually clears the
  cookie. Conflating them would either make dismiss sticky-off with no way
  back short of clearing cookies by hand, or make exit reappear on every
  reload.
- **Entry points**: `ProjectForm`'s Preview button (any saved project) and
  `ProjectsListClient`'s per-row eye button (drafts only — a published
  project is already reachable at its real URL, so a preview link there
  would be redundant).

The preview read is deliberately never wrapped in `unstable_cache`: a
preview must reflect the exact current draft, not a snapshot up to an hour
stale. It also uses `createClient()` (the admin's own session) rather than
`createStaticClient()`, so RLS's `is_admin()` policies are what actually
authorize seeing an unpublished row — the draft-mode cookie gates the
*code path*, RLS still gates the *data*.

## Resume: why the active swap is a Postgres function

`resumes.is_active` is already constrained to at most one true row by the
partial unique index from the Phase 2 migration
(`resumes_single_active_idx`). But *setting* a new active resume is two
writes — deactivate the current one, activate the new one — and the brief
explicitly required those be atomic rather than two separate updates.

`supabase/migrations/20260818090000_resume_active_swap_function.sql` adds
`public.set_active_resume(resume_id uuid)`, and `activateResume` in
`lib/actions/resumes.ts` calls it via `supabase.rpc(...)`. A single
Postgres function call is one implicit transaction, so both `UPDATE`s
commit or roll back together for free — there is no window where zero rows
are active, which is the failure mode two independent round trips from the
browser could leave behind. The function re-checks `public.is_admin()`
itself rather than trusting the caller, since an RPC endpoint is reachable
independently of the action that normally calls it.

`createResume` inserts every new row with `is_active = false` first and
only then calls the RPC if "set as active" was requested — so even a
failure *between* those two steps can't produce two active rows, only a
correctly-inactive one the admin can activate from the list.

`deleteResume` refuses to delete the currently-active row, returning a
plain error telling the admin to activate a different version first. A
deletable active resume would let the public site lose its download link
entirely — a worse failure mode than one extra click.

## Known gaps, by design

- **`MultiImageUploader` is still unused by a real entity.** Projects — the
  first entity with a real gallery field — needed richer per-item metadata
  (`media_type`, `title`, `alt_text`, `caption`) than a plain ordered array
  of URLs can represent, so it uses a dedicated `ProjectMediaManager`
  (`components/admin/projects/ProjectMediaManager.tsx`) instead, built from
  the same proven primitives (`uploadFile`/`removeFiles`/
  `buildStoragePath`, the dnd-kit reorder pattern with a fixed
  `DndContext` id). Phase 20 did prove — and had to fix — the exact
  file-input `onChange` pattern `MultiImageUploader` itself still uses; see
  "Real bugs found and fixed" below. A future entity whose gallery really
  is just an ordered list of images (no per-item metadata) is still
  `MultiImageUploader`'s first real end-to-end proof.
- **No public blog exists**, by design (CLAUDE.md's Phase 21 brief). The
  admin module, the schema, and the feature flag are all real; the public
  route, cached read, and cache tag are the deliberate remainder. See the
  cache-invalidation table's note above for exactly what a future public
  blog would need to add.
- **`site_settings.primary_nav`'s `hidden` flag is admin-only state stored
  in the existing jsonb column**, not a schema change. `fetchSiteSettings`
  (the public read) filters hidden entries out and strips the flag, so the
  public `NavItem` type stays `{label, href}` and Navbar/Footer never learn
  the concept exists. If nav items ever need more per-item state than this,
  that's the point to consider promoting them to a real table.

See [docs/progress.md](./progress.md)'s per-phase entries for the full
verification narratives — what was actually clicked through live, not just
reasoned about, and in what order.

## Two real bugs, found and fixed while proving this phase

*(Phase 18.)* Both were found by actually clicking through the admin panel
in a real browser against the real local Supabase stack — not assumed from
reading the code — and both are worth not re-discovering the hard way on a
future entity.

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

## Real bugs found and fixed while proving Phase 20 (Projects)

Same practice as every phase's own section above — found by actually
clicking through the admin panel against the real local Supabase stack,
not assumed from reading the code.

### `SlugField`'s auto-derive-from-name broke under React Strict Mode

**Symptom**: a real, live console warning — "Cannot update a component
(`Controller`) while rendering a different component (`SlugControl`)" —
the first time `SlugField`'s `checkAvailability` prop was actually wired
up for real (Projects, the entity this file's own "Known gaps" section had
flagged as still needed). A first attempted fix (skip firing the
auto-derive effect on the very first render, via a plain `useRef(true)`
"have I run yet" flag) looked correct in isolation but produced a *worse*,
silent bug once retested: loading the edit page for a project with a blank
`name` but an already-saved `slug` wiped that slug back to `""` before the
admin touched anything.

**Root cause**: React Strict Mode (on by default, `next.config.ts` never
overrides it) double-invokes effects on mount in development. A boolean
"first run" ref flips to "already ran" after the *first* of the two
simulated mount passes, so the *second* pass no longer skips — it fires
`onChange(slugify(sourceValue))` for real, even though `sourceValue`
never actually changed between the two passes.

**Fix**: track the actual last-seen `sourceValue` in a ref (lazily
initialized to the value already there at mount), not a plain "have I
run" boolean — `components/admin/form/fields/SlugField.tsx`. Comparing
against the real previous value is correct regardless of how many times
Strict Mode (or anything else) happens to invoke the effect for the same
underlying value. The original render-time `onChange` call (calling the
*parent* Controller's setter mid-render, not adjusting `SlugControl`'s
own local state) had to move into a `useEffect` in the first place — that
part of the original design was never sound; only unwiring one specific
caller's use of `checkAvailability` was needed to actually surface it
live.

### The gallery/multi-file uploader's `onChange` silently never ran

**Symptom**: dropping or selecting a file in `ProjectMediaManager`'s
gallery drop zone did *nothing* — no error, no toast, no network request,
no new row. `ImageUploader`'s single-file version worked correctly on the
exact same page, same form, same bucket.

**Root cause**: `event.target.files` is a *live* `FileList` tied to the
`<input>` — confirmed directly (capturing the reference, then setting
`.value = ""` on the input, then re-reading `.length` on the *original*
captured reference: it read back `0`). Both `MultiImageUploader.tsx` and
the new `ProjectMediaManager.tsx` captured `event.target.files` into a
`files` variable and *then* reset `event.target.value = ""` before
checking `files.length > 0` — by the time that check ran, the live
FileList had already been emptied out from under it, so `handleFiles`
never executed. `ImageUploader` never hit this because it extracts the
actual `File` object immediately (`event.target.files?.[0]`) — a stable,
immutable value unaffected by the input's own selection later being
cleared — rather than holding onto the FileList container itself.

**Fix**: `Array.from(event.target.files ?? [])` immediately, copying out
the actual `File` objects before the `.value` reset — in both
`components/admin/upload/MultiImageUploader.tsx` (previously unused by
any real entity, so this was a real, previously-undiscoverable latent bug
in already-shipped Phase 18 code) and the new
`components/admin/projects/ProjectMediaManager.tsx`.
Phase 21's `FileUploader` follows `ImageUploader`'s single-file shape
(`files?.[0]`), so it never had the opportunity to repeat this.

### `toLocaleDateString()` produced a real hydration mismatch

**Symptom**: a live hydration-mismatch error on `/admin/projects` —
`"Aug 17, 2026"` (server) vs. `"17 Aug 2026"` (client) — for the list
table's "Updated" column.

**Root cause**: `new Date(item.updated_at).toLocaleDateString(undefined,
...)` formats using the *rendering environment's* locale, which differs
between the Node server-render pass and the browser's own locale — the
same class of non-deterministic-formatting trap `lib/utils.ts`'s existing
`formatMonthYear`/`formatDateRange` helpers were already written to avoid
for plain date columns, just not yet applied to a full `timestamptz`
value like `updated_at`.

**Fix**: a new `formatAdminDate()` in `lib/utils.ts`, hand-formatting
"Mon D, YYYY" without going through `toLocaleDateString` at all — same
fixed output regardless of server/client locale. Phase 21's Resume list
reuses it for `uploaded_at` rather than reaching for `toLocaleDateString`
again.

## Phase 19 additions to shared infrastructure

Profile, Skills, and Experience (that phase's three modules) mostly
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
  defaults to `false`. Phase 21's blog `reading_time` is its second user.
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

## Phase 21 additions to shared infrastructure

Certifications, Achievements, and Contact links were close to pure
configuration on top of Phases 18–20, as intended. The four remaining
requirements each needed something genuinely new, and in every case the
new thing is generic rather than entity-specific:

- **`FileUploader`** (`components/admin/upload/FileUploader.tsx`) — a
  document-or-image sibling to `ImageUploader`, for any column that may
  hold a PDF. See "Uploads and storage cleanup" above for why
  `ImageUploader` couldn't just be reused.
- **Per-type validation on `contactLinkSchema`** — the existing email
  refinement gained a phone-number refinement for `whatsapp` and a
  "profile URL is required" refinement for `linkedin`/`github`/`twitter`,
  matching what `lib/contactLinks.ts`'s `resolveContactHref` actually does
  with each type at render time (email/whatsapp derive their href from
  `value`; everything else needs `url`). Validation and rendering now
  agree, rather than the schema accepting a row the renderer would skip.
- **`navItemSchema` gained `hidden`**, and `fetchSiteSettings` filters on
  it. See "Known gaps" above for why this is a jsonb-level flag rather
  than a schema migration.
- **`public.set_active_resume(uuid)`**, a new migration — see "Resume: why
  the active swap is a Postgres function" above.
- **A `settings` Storage bucket**, a new migration
  (`20260818091500_settings_storage_bucket.sql`), for the default OG
  image. The four `storage.objects` policies are dropped and recreated with
  the new bucket added to their `bucket_id in (...)` lists rather than
  duplicated per bucket — same single-policy-set shape Phase 3 established.

Three Phase 21 screens deliberately don't follow "the shape of an entity
module" above, and shouldn't be made to:

- **Resume** has no create/edit page pair — upload and activate are the
  only writes, both inline on the list page (`ResumeUploadForm`,
  `ResumeList`). It's also the one screen whose upload must complete
  *before* there's a row to create at all, so it's a plain client
  component rather than `useAdminForm`/`AdminFormShell`.
- **Settings** is a singleton upsert like Profile, not a list — one form,
  no table, no publish toggle, no delete.
- **Blog** has no publish switch on its table (the `status` enum replaces
  it) and no revalidation at all (no public consumer yet). Its three route
  files each re-check `blog_enabled` themselves rather than trusting the
  sidebar's disabled state, since a direct URL visit bypasses that.

## Two real bugs, found live while building Phase 21

### `optionalUrlSchema` rejected seeded asset paths — again, on five more schemas

**This is Phase 19's bug repeating**, and it's the second time, which is why
it now has its own entry in docs/progress.md's "Recurring lessons."

**Symptom (predicted, then confirmed)**: Certifications, Achievements, Blog,
and Settings had all been written using the strict `optionalUrlSchema` for
their asset columns. Because Zod validates the *entire* submitted payload
regardless of which fields the admin actually touched, editing any seeded
row would have failed on a value that was already in the database before the
form loaded — exactly what happened to Profile and Education in Phase 19.

**Root cause**: `supabase/seed.sql` seeds *every* asset column with a
root-relative placeholder path, not just the avatar/logo ones Phase 19
happened to fix:
`certifications.organization_logo_url` (`/images/organizations/aws.png`),
`certifications.certificate_file_url`
(`/documents/certifications/aws-ml-specialty.pdf`),
`achievements.image_url`, `achievements.document_url`,
`blog_posts.cover_image_url`, and `site_settings.og_image_url`
(`/images/og-cover.png`). `optionalUrlSchema` requires `z.url()` — an
absolute URL with a scheme — which an uploaded Storage URL always satisfies
and a seeded relative path never does.

**Found by reading, not by hitting it** — grepping `supabase/seed.sql` for
asset columns while wiring up the new schemas, rather than discovering it
form-by-form. That grep is cheap and catches the whole class at once; it's
now the recommended first step in progress.md's recurring-lessons entry.

**Fix**: applied the existing exemption schema to all six columns. Genuine
external links (`credential_url`, `external_link`, `github_url`,
`link_url`, ...) correctly keep the strict `optionalUrlSchema` — a relative
path never makes sense for those. Also **renamed `optionalImageUrlSchema` →
`optionalAssetUrlSchema`**: two of the newly-covered columns hold PDFs, so
the Phase 19 name read wrong at those call sites. The rename touched the
three original Phase 19 call sites and is recorded in the schema's own doc
comment.

**Verified** by loading the seeded certification's edit page and clicking
Save with **zero changes**: it redirected to the list page (which
`useAdminForm` only does on success) with no field errors, and Postgres
confirmed a real write — `updated_at` bumped, both root-relative paths
still intact rather than nulled. Repeated for the seeded blog post.

### The WhatsApp phone validator rejected `(555) 123-4567`

**Symptom**: a perfectly ordinary US-formatted phone number failed
validation, while the admin guide in Part 1 of this very file promised
"spaces, dashes, brackets and a leading `+` are all fine."

**Root cause**: the first attempt was a single regex describing where
punctuation may sit — `/^\+?[0-9][0-9\s\-()]{6,18}[0-9]$/` — which requires
the character immediately after the optional `+` to be a **digit**. A value
starting with `(` can never match. The regex looked reasonable on
inspection; the bug was only obvious once run against real inputs.

**Fix**: validate on **digit count** plus an allowed-character check
(`lib/validation/contactLink.ts`'s `isValidPhoneNumber`) instead of
pattern-matching layout. 7–15 digits is the E.164 range. This also mirrors
how the value is actually *consumed*: `resolveContactHref`
(`lib/contactLinks.ts`) builds the `wa.me` link by stripping every
non-digit, so "enough digits, and nothing that isn't phone punctuation" is
precisely the contract that matters.

**Verified** across 14 cases in one throwaway script run: 8 real formats
(US/UK/India; parens, dashes, dots, spaces, with and without `+`) all
accepted *and* each producing the correct `wa.me` URL, and 6 garbage inputs
(letters, too short, empty, too many digits, an HTML tag) all rejected.

The generalizable lesson, now in progress.md's recurring lessons: don't
hand-roll a format regex when the consumer only needs a normalized value,
and always run a new validator against a table of real inputs before
trusting it.

See [docs/progress.md](./progress.md)'s Phase 21 entry for the full
verification narrative, including three environment gotchas worth knowing
before the next session: `supabase db reset` wipes the local test admin
account, Next 16's dev-server lock is keyed to the project directory rather
than the port, and Radix `Select` can't be driven by synthetic events in a
non-composited Browser pane.
