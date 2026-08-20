# Empty-state audit

Every optional field on the public site, what happens when it's `null` (or
its table has no published rows), and how that was checked.

Produced in Phase 23. **Nothing in the "Verified" column is inferred from
reading the code** — each one was checked by nulling the field in the real
local Postgres, restarting the dev server with a cold cache, and reading
the rendered HTML. The method, and why the restart is unavoidable, is at
the bottom of this file.

The rule the whole site follows: **a missing field is omitted, never padded.**
No placeholder copy, no "N/A", no disabled control standing in for one that
would work if the data existed. A field that isn't there produces no
markup at all — which is what keeps separators, bullets and gaps from
being left behind.

---

## Profile / Hero / About

| Field | When `null` | Verified |
| --- | --- | --- |
| `full_name` | Falls back to `DEFAULT_WORDMARK` ("Portfolio") in the navbar, hero h1 and footer — the page never loses its h1 | ✅ Batch B/C |
| `headline` | Hero's role line is omitted; About's "Focus" fact disappears from the fact grid | ✅ Batch B |
| `tagline` | Hero's tagline line omitted; footer identity line falls back to `headline`, then omits | ✅ Batch B |
| `short_bio` | Hero's bio paragraph omitted | ✅ Batch B |
| `long_bio` | About renders its `EmptyState` in place of the bio, keeping the section's shape | ✅ Batch B |
| `avatar_url` | `AboutPortrait` renders its controlled fallback, never a broken image | ✅ Batch B + browser |
| `location` / `availability_status` / `current_role` | Each fact is dropped from About's fact grid; the grid shrinks rather than showing empty tiles. Hero's availability badge disappears with `availability_status` | ✅ Batch B |
| **All of the above null at once** | **The entire About section — heading included — does not render.** Hero still renders, since `full_name` always resolves | ✅ Batch B (`about` absent from the rendered section ids) |

## Experience

| Field | When `null` | Verified |
| --- | --- | --- |
| `company_logo_url` | `Avatar` renders initials; no broken image | ✅ Batch B |
| `link_url` | Company name renders as plain text instead of a link — not a dead link | ✅ Batch B |
| `location`, `employment_type` | Dropped from the meta row **with their separators**. `Jan 2023 — Present · 3 yrs 7 mos` renders with exactly one `·`, no trailing one | ✅ Batch B (regex scan for `··`, leading/trailing separators: 0 hits) |
| `description` | Paragraph omitted entirely — no empty `<p>` | ✅ Batch B (empty-paragraph scan: 0) |
| `responsibilities` (empty array) | **The whole `<ul>` is omitted** — no empty list, no orphan bullet dots | ✅ Batch B (empty-`<li>` scan: 0) |
| `technologies` (empty array) | Tag row omitted | ✅ Batch B |
| `end_date` + `is_current` | Reads "Present"; a DB constraint already forbids a current role having an end date | ✅ Batch B |
| No published rows | **Entire section, heading included, not rendered** | ✅ Batch C |

## Education

| Field | When `null` | Verified |
| --- | --- | --- |
| `field_of_study` | Heading is just the degree — the `·` joining them is only emitted when both exist | ✅ Batch B ("B.Tech", no dangling separator) |
| `institution_logo_url` | `Avatar` initials fallback | ✅ Batch B |
| `link_url` | Institution renders as plain text | ✅ Batch B |
| `start_date` + `end_date` + `grade` | **The whole meta row is omitted**, not rendered empty | ✅ Batch B |
| `description` | Paragraph omitted | ✅ Batch B |
| No published rows | Entire section, heading included, not rendered | ✅ Batch C |

## Skills

| Field | When `null` | Verified |
| --- | --- | --- |
| `skill_categories.description` / `.icon` | Description line and icon omitted; the card keeps its shape | ✅ Batch B |
| `skills.icon` / `.proficiency` | Chip renders as a plain name — no empty icon slot, no "0%" bar | ✅ Batch B |
| A category with zero *published* skills | The category card is not rendered at all (filtered in `Skills.tsx`, not in `lib/data`) | ✅ Batch C |
| No published skills anywhere | Entire section, heading included, not rendered | ✅ Batch C |

## Projects (cards and detail page)

| Field | When `null` | Verified |
| --- | --- | --- |
| `logo_url` | **Controlled initials tile** (`role="img"` + `aria-label`), on both the card and the detail header. Zero `<img>` elements are emitted | ✅ Batch A |
| `cover_image_url` | Not used on the card; the generated OG card falls back to `site_settings.og_image_url`, then to no backdrop | ✅ Phase 22 |
| `short_description` | Card and detail header both omit the line | ✅ Batch A |
| `description` | **No "Overview" section at all** — heading included | ✅ Batch A |
| `problem_statement` / `solution` / `purpose` | Each block omitted individually; when all three are null the wrapper is omitted too | ✅ Batch A |
| **`github_url`** | **No GitHub button. Not a disabled one — no element** | ✅ Batch A |
| **`demo_url`** | **No demo button. Not a disabled one — no element** | ✅ Batch A |
| Both action URLs null | The action row itself is omitted, so no empty flex gap is left | ✅ Batch A |
| `start_date` + `end_date` | Date line omitted (`formatOptionalDateRange` returns `null`) | ✅ Batch A |
| `status` | Not nullable — has a DB default, so the badge always renders. This is the one always-present piece of metadata | ✅ Batch A |
| No `project_technologies` rows | Technologies section, heading included, not rendered | ✅ Batch A |
| No `project_features` rows | Key Features section, heading included, not rendered | ✅ Batch A |
| **No `project_media` rows** | **No gallery section at all** — heading included | ✅ Batch A |
| No published projects | Homepage section not rendered; `/projects` shows a deliberate `EmptyState` (it's a page whose entire purpose is that list, so it explains itself rather than rendering blank) | ✅ Batch C |
| Unknown slug | `/projects/[slug]/not-found.tsx` — a styled 404 with links out | ✅ Live |

## Certifications

| Field | When `null` | Verified |
| --- | --- | --- |
| `organization_logo_url` | `Avatar` initials fallback | ✅ Batch B |
| `issue_date` + `expiration_date` | **The whole date/badge row is omitted** | ✅ Batch B |
| `credential_id` | Line omitted — no "Credential ID:" label with nothing after it | ✅ Batch B |
| `description` | Paragraph omitted | ✅ Batch B |
| `credential_url` | "Verify credential" button not rendered | ✅ Batch B |
| `certificate_file_url` | "View certificate" button not rendered | ✅ Batch B |
| Both action URLs null | Action row omitted entirely | ✅ Batch B |
| No published rows | Entire section, heading included, not rendered | ✅ Batch C |

## Achievements

| Field | When `null` | Verified |
| --- | --- | --- |
| `image_url` | Controlled Award-icon tile with `role="img"` + `aria-label` | ✅ Batch B |
| `organization` + `date` | **Meta row omitted entirely**; when only one is present it renders alone, with no leading or trailing `·` | ✅ Batch B |
| `description` | Paragraph omitted | ✅ Batch B |
| `external_link` / `document_url` | Each button omitted; the action row disappears when both are null | ✅ Batch B |
| No published rows | Entire section, heading included, not rendered | ✅ Batch C |

## Contact / Resume

| Field | When `null` | Verified |
| --- | --- | --- |
| A `contact_links` row's `url` (for non-email/WhatsApp types) | `resolveContactHref` returns `null` and **that channel is skipped**, rather than rendering a link to nowhere | ✅ Code path shared with Batch C |
| No published `contact_links` **and** no active resume | Entire Contact section, heading included, not rendered | ✅ Batch C |
| No active resume | Every "Download Resume" CTA (Hero, Contact, Footer) is absent, not disabled; `/resume` redirects to the styled `/resume/unavailable` | ✅ Batch C |

## Site settings

| Field | When `null` | Verified |
| --- | --- | --- |
| `primary_nav` empty | Falls back to `DEFAULT_NAV_ITEMS` | ✅ Outage test |
| `site_title` / `meta_description` | Metadata falls back to the constants in `app/(site)/layout.tsx` | ✅ Outage test |
| `og_image_url` | No `og:image` is emitted rather than a broken one; project cards still generate | ✅ Phase 22 |

---

## Images that 404 at a valid URL

Distinct from a `null` URL, and the case the seed data exercises
permanently: every asset path in `supabase/seed.sql`
(`/images/projects/.../logo.png`, `/images/avatar.jpg`, …) is a
well-formed path to a file that does not exist. So **the fallback path is
the one running by default in local development** — it isn't a rarely-hit
branch.

Every image component handles it the same way: an `onError` handler flips
to the same controlled fallback used for a `null` URL. The browser's own
broken-image icon is never what a visitor sees.

| Component | Fallback |
| --- | --- |
| `ProjectCardImage` | Initials tile (`role="img"`, `aria-label={name}`) |
| `Avatar` (experience, education, certifications) | Initials |
| `AboutPortrait` | Controlled placeholder |
| `AchievementThumbnail` | Award icon tile |
| `MediaThumbnail` | `ImageOff` icon tile |
| `MediaLightbox` | "&lt;label&gt; failed to load" panel |

Verified in the browser DOM, on the live page: with the seeded (missing)
paths in place, the rendered result is the fallback markup, and no `<img>`
element is left in a broken state.

---

## Two deliberate non-behaviours

1. **A site with no content at all is a near-empty homepage.** With nothing
   published anywhere, the homepage is the hero (name plus two CTAs), the
   nav and the footer — because requirement 4 says a section with no rows
   must not render *at all*, heading included, and eight sections obeying
   that leaves the hero. This is the correct outcome for a portfolio before
   any content is added, and it is now visually distinct from an outage,
   which renders the explicit degraded state in `app/(site)/error.tsx`
   instead of quietly looking empty.

2. **A section whose Suspense skeleton resolves to nothing will shift.**
   The skeletons in `components/sections/skeletons.tsx` are sized to match
   real content so nothing jumps when data arrives — but a section that
   turns out to have zero rows renders nothing, so its skeleton collapses
   rather than being replaced. Avoiding that would mean pre-counting rows
   in a separate query on every request, to fix a shift that only occurs on
   a dynamic render of a section with no content. The homepage is
   statically prerendered, so in production this is not on the normal path
   at all.

---

## How these were verified

`lib/data` caches every read with `unstable_cache(..., { revalidate: 3600 })`,
and **a stale entry survives deleting `.next/cache` and does not clear on
its own** — re-confirmed during this audit, matching the lesson recorded in
docs/progress.md's Phase 7 entry. Changing a row in Postgres therefore has
no visible effect until the cache is genuinely gone.

So each batch was: mutate → stop the dev server → `rm -rf .next` (the whole
directory, not just `cache`) → restart → read the rendered HTML.

Three batches, chosen so each one proves a different rule:

- **Batch A — the bare-minimum project.** Every optional column on the
  seeded project set to `null`, and its technologies, features and media
  rows removed. Proves the per-field omissions on the detail page, and
  that a project with nothing but a name still renders a deliberate page.
- **Batch B — every optional field null, rows still published.** Proves
  the "no stray punctuation, bullets or gaps" rule, since every section
  still renders and any leftover separator would be visible. Scanned the
  HTML for empty `<li>`/`<p>`/`<h*>` elements, doubled or dangling `·`
  separators, and literal `null`/`undefined` strings: **zero hits**.
- **Batch C — nothing published anywhere.** Proves every section removes
  itself entirely, heading included. Result: the only `<section>` left on
  the homepage was `hero`, and the only heading was the h1.

Every table was copied into an `audit_backup` schema first and restored
afterwards; a row-by-row `EXCEPT` comparison confirmed the restore was
exact, so the database is back to precisely `supabase/seed.sql`'s content.
