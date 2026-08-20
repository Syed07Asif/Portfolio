# components/seo/

Components that emit machine-readable markup for crawlers and social platforms — nothing here renders anything a visitor can see.

`JsonLd` is the only member: it serialises a schema.org document built by `lib/jsonLd.ts` into a `<script type="application/ld+json">` tag. The builders live in `lib/` (pure functions over database rows, easy to test); this folder is only the rendering seam.

Rules that apply here specifically:

- **Never state something the visible page doesn't.** Structured data describes the page, it doesn't augment it. If a claim isn't rendered in the DOM for a human to read, it doesn't belong in the JSON-LD either.
- **No client JavaScript.** Crawlers read the initial HTML; a structured-data node injected after hydration is a node that may never be seen.
- Everything else about SEO — titles, canonicals, Open Graph, Twitter cards, the sitemap, robots — lives in metadata, not components: see `lib/seo.ts` and `docs/architecture.md`'s SEO section.
