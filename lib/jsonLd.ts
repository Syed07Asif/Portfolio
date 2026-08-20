import { SITE_URL, absoluteUrl, truncateForMeta } from "@/lib/seo";
import { resolveContactHref } from "@/lib/contactLinks";
import type {
  BlogPost,
  ContactLink,
  Education,
  Experience,
  Profile,
  ProjectDetail,
  SiteSettings,
  SkillCategoryWithSkills,
} from "@/types/content";

/**
 * Schema.org JSON-LD builders. Pure functions over the same database rows
 * the visible page already renders — nothing here invents a claim the page
 * doesn't make, which is both the honest thing to do and what Google's
 * structured-data guidelines actually require ("content must be visible to
 * the user"). Every field is dropped when its source column is empty rather
 * than padded with a plausible-sounding default, and nothing is stuffed
 * with keywords: `knowsAbout` is exactly the skills table, `keywords` on a
 * project is exactly its project_technologies rows.
 *
 * Certifications and achievements are deliberately *not* modelled:
 * schema.org's EducationalOccupationalCredential wants an accrediting-body
 * identity this schema doesn't store, and there is no honest schema.org type
 * for a generic "achievement" — inventing one would be exactly the
 * keyword-stuffing this phase was told to avoid.
 *
 * Emitted into the DOM by components/seo/JsonLd.tsx.
 */

export type JsonLdNode = Record<string, unknown>;

const SCHEMA_CONTEXT = "https://schema.org";

/**
 * Stable node identities so the graph can cross-reference instead of
 * repeating the same Person object on every page — `@id` is how a crawler
 * merges "the author of this project" with "the person this site is about".
 */
export const PERSON_ID = `${SITE_URL}/#person`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

/** Drops null/undefined/empty-string/empty-array entries so no key ever ships with a meaningless value. */
function compact(node: JsonLdNode): JsonLdNode {
  return Object.fromEntries(
    Object.entries(node).filter(([, value]) => {
      if (value === null || value === undefined || value === "") return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    }),
  );
}

/** Wraps one or more nodes in a single `@graph` document — one script tag per page, not one per entity. */
export function jsonLdGraph(...nodes: (JsonLdNode | null)[]): JsonLdNode {
  return {
    "@context": SCHEMA_CONTEXT,
    "@graph": nodes.filter((node): node is JsonLdNode => node !== null),
  };
}

// -- Person -------------------------------------------------------------------

export interface PersonJsonLdInput {
  profile: Profile | null;
  /** Name fallback when the profile row is missing/unreadable — the same DEFAULT_WORDMARK every visible component falls back to. */
  fallbackName: string;
  skillCategories?: SkillCategoryWithSkills[];
  education?: Education[];
  experience?: Experience[];
  contactLinks?: ContactLink[];
}

/**
 * The homepage's Person node. `sameAs` carries only genuinely external
 * http(s) profile URLs (a mailto: belongs in `email`, not `sameAs`, which
 * schema.org defines as "another web page about this entity").
 * `worksFor` is emitted only when an experience row is actually flagged
 * `is_current` — a stale employer would be a false claim, not an SEO win.
 */
export function buildPersonJsonLd({
  profile,
  fallbackName,
  skillCategories = [],
  education = [],
  experience = [],
  contactLinks = [],
}: PersonJsonLdInput): JsonLdNode {
  const name = profile?.full_name ?? fallbackName;

  const knowsAbout = skillCategories.flatMap((category) => category.skills.map((skill) => skill.name));

  const alumniOf = education.map((entry) =>
    compact({
      "@type": "EducationalOrganization",
      name: entry.institution,
      url: entry.link_url,
    }),
  );

  const currentRole = experience.find((entry) => entry.is_current);

  const emailLink = contactLinks.find((link) => link.type === "email");
  const sameAs = contactLinks
    .map((link) => resolveContactHref(link))
    .filter((href): href is string => href !== null && /^https?:\/\//i.test(href));

  return compact({
    "@type": "Person",
    "@id": PERSON_ID,
    name,
    url: SITE_URL,
    jobTitle: profile?.headline ?? profile?.current_role ?? undefined,
    description: truncateForMeta(profile?.short_bio ?? profile?.tagline, 300),
    image: profile?.avatar_url ? absoluteUrl(profile.avatar_url) : undefined,
    address: profile?.location
      ? { "@type": "PostalAddress", addressLocality: profile.location }
      : undefined,
    email: emailLink ? `mailto:${emailLink.value}` : undefined,
    worksFor: currentRole
      ? compact({ "@type": "Organization", name: currentRole.company, url: currentRole.link_url })
      : undefined,
    alumniOf,
    knowsAbout,
    sameAs,
  });
}

// -- WebSite ------------------------------------------------------------------

export interface WebSiteJsonLdInput {
  siteSettings: SiteSettings | null;
  /** Falls back to the person's name when site_settings is unreadable. */
  fallbackTitle: string;
}

/** The site itself, published by (and about) the Person node above. */
export function buildWebSiteJsonLd({ siteSettings, fallbackTitle }: WebSiteJsonLdInput): JsonLdNode {
  return compact({
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: SITE_URL,
    name: siteSettings?.site_title ?? fallbackTitle,
    description: truncateForMeta(siteSettings?.meta_description, 300),
    inLanguage: "en",
    publisher: { "@id": PERSON_ID },
    about: { "@id": PERSON_ID },
  });
}

// -- Project ------------------------------------------------------------------

export interface ProjectJsonLdInput {
  project: ProjectDetail;
  /** Author name for the author node's human-readable label — the Person `@id` carries the identity. */
  authorName: string;
  /** Absolute URL of the card image this page advertises to social platforms — reused as the CreativeWork's `image`. */
  imageUrl?: string;
}

/**
 * `SoftwareSourceCode` when the project actually has a repository behind it
 * (`github_url`), `CreativeWork` otherwise — the distinction is real, not
 * cosmetic: `codeRepository`/`programmingLanguage` are only meaningful on
 * the former, and claiming source code exists when it doesn't is exactly
 * the kind of thing a structured-data review flags.
 */
export function buildProjectJsonLd({ project, authorName, imageUrl }: ProjectJsonLdInput): JsonLdNode {
  const url = absoluteUrl(`/projects/${project.slug}`);
  const technologies = project.technologies.map((technology) => technology.name);
  const isSourceCode = Boolean(project.github_url);

  return compact({
    "@type": isSourceCode ? "SoftwareSourceCode" : "CreativeWork",
    "@id": `${url}#project`,
    name: project.name,
    url,
    mainEntityOfPage: url,
    description: truncateForMeta(project.short_description ?? project.description, 300),
    image: imageUrl,
    author: { "@id": PERSON_ID, "@type": "Person", name: authorName },
    isPartOf: { "@id": WEBSITE_ID },
    inLanguage: "en",
    dateCreated: project.start_date ?? undefined,
    ...(project.end_date ? { datePublished: project.end_date } : {}),
    keywords: technologies,
    ...(isSourceCode
      ? { codeRepository: project.github_url, programmingLanguage: technologies }
      : {}),
    // A live deployment genuinely is "another web page about this work"; a
    // repo link is not — that is already codeRepository.
    sameAs: project.demo_url ? [project.demo_url] : undefined,
  });
}

// -- BreadcrumbList -----------------------------------------------------------

export interface BreadcrumbItem {
  name: string;
  /** Route-relative path; absolutised here. */
  path: string;
}

/** Positions are 1-based and contiguous — callers pass the trail in display order, root first. */
export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]): JsonLdNode {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

// -- Article (blog — scaffolding) ---------------------------------------------

export interface ArticleJsonLdInput {
  post: BlogPost;
  /** Route-relative path the future public blog route will live at. */
  path: string;
  authorName: string;
}

/**
 * Article scaffolding for the blog, which is real in the schema and in the
 * admin panel but has no public route yet (see docs/progress.md's "Next
 * up"). Gated by `blogJsonLdEnabled` below rather than called
 * unconditionally: emitting Article markup for posts no crawler can reach
 * would be markup describing a page that doesn't exist. The moment a public
 * blog route lands, that route calls this — nothing else has to change.
 */
export function buildArticleJsonLd({ post, path, authorName }: ArticleJsonLdInput): JsonLdNode {
  const url = absoluteUrl(path);

  return compact({
    "@type": "Article",
    "@id": `${url}#article`,
    headline: post.title,
    url,
    mainEntityOfPage: url,
    description: truncateForMeta(post.excerpt, 300),
    image: post.cover_image_url ? absoluteUrl(post.cover_image_url) : undefined,
    author: { "@id": PERSON_ID, "@type": "Person", name: post.author ?? authorName },
    publisher: { "@id": PERSON_ID },
    isPartOf: { "@id": WEBSITE_ID },
    inLanguage: "en",
    datePublished: post.published_at ?? undefined,
    articleSection: post.category ?? undefined,
    keywords: post.tags ?? undefined,
  });
}

/** The single feature flag gating every blog-related SEO surface (Article JSON-LD today, blog sitemap entries once the public route exists). */
export function blogJsonLdEnabled(siteSettings: SiteSettings | null): boolean {
  return Boolean(siteSettings?.feature_flags?.blog_enabled);
}
