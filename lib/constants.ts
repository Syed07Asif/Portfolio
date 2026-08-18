import type { NavItem } from "@/types/content";

/**
 * Shared, non-content constants. Actual content (nav labels the admin can
 * edit, etc.) lives in the database — see lib/data/siteSettings.ts. What's
 * here is either structural (section ids, cache tags) or a fallback used
 * when that content hasn't loaded/failed to load.
 */

/** Anchor ids for the single-page public site's sections. */
export const SECTION_IDS = {
  hero: "hero",
  about: "about",
  skills: "skills",
  experience: "experience",
  projects: "projects",
  education: "education",
  certifications: "certifications",
  achievements: "achievements",
  contact: "contact",
} as const;

/**
 * Fallback nav shown if getSiteSettings() returns null (e.g. the database
 * is unreachable) — mirrors the shape seeded in supabase/seed.sql, not a
 * substitute for it.
 */
export const DEFAULT_NAV_ITEMS: NavItem[] = [
  { label: "About", href: `#${SECTION_IDS.about}` },
  { label: "Projects", href: `#${SECTION_IDS.projects}` },
  { label: "Experience", href: `#${SECTION_IDS.experience}` },
  { label: "Contact", href: `#${SECTION_IDS.contact}` },
];

/** Navbar wordmark shown if getProfile() returns null (e.g. the database is unreachable). */
export const DEFAULT_WORDMARK = "Portfolio";

/** Navbar's primary CTA — always points at the contact section, so it needs no content field of its own. */
export const NAV_CTA = {
  label: "Let's Talk",
  href: `#${SECTION_IDS.contact}`,
} as const;

/**
 * The one stable, never-changing public URL for resume downloads — every
 * "Download Resume" CTA on the site (Hero, Contact, Footer) points here,
 * never at a resume row's own `file_url` directly. `app/resume/route.ts`
 * resolves whichever resume is currently `is_active` behind this fixed
 * path, so a link already pasted into a job application keeps working
 * after the admin uploads a new version — see that route for the actual
 * resolution logic.
 */
export const RESUME_ROUTE = "/resume";

/** Forced download filename for the resume route's Content-Disposition header — deliberately not derived from the stored file's own name, which is an internal Storage path, not a polished public-facing filename. */
export const RESUME_DOWNLOAD_FILENAME = "Syed-Asif-Resume.pdf";

/** Matches the Tailwind breakpoints declared in styles/tokens.css usage across components. */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

/** Shared Framer Motion timings, in seconds, so animation feel stays consistent across sections. */
export const ANIMATION_DURATIONS = {
  fast: 0.15,
  base: 0.3,
  slow: 0.6,
} as const;

/**
 * Next.js cache tags used by lib/data — see docs/architecture.md's Caching
 * section. The (future) admin panel calls `revalidateTag(CACHE_TAGS.x)`
 * after publishing a change to entity `x`.
 */
export const CACHE_TAGS = {
  profile: "profile",
  skills: "skills",
  experience: "experience",
  education: "education",
  projects: "projects",
  certifications: "certifications",
  achievements: "achievements",
  contactLinks: "contact-links",
  resume: "resume",
  siteSettings: "site-settings",
} as const;

/**
 * Storage bucket constraints, mirrored from
 * supabase/migrations/20260816103908_rls_and_storage.sql — used by
 * lib/validation/ to reject bad files client-side before they ever reach
 * Storage (which enforces the same limits server-side regardless).
 */
export const STORAGE_BUCKETS = {
  profile: {
    id: "profile",
    maxSizeBytes: 5 * 1024 * 1024,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/svg+xml"],
  },
  projects: {
    id: "projects",
    maxSizeBytes: 50 * 1024 * 1024,
    allowedMimeTypes: [
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/gif",
      "image/svg+xml",
      "video/mp4",
      "video/webm",
      "application/pdf",
    ],
  },
  certifications: {
    id: "certifications",
    maxSizeBytes: 10 * 1024 * 1024,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "application/pdf"],
  },
  achievements: {
    id: "achievements",
    maxSizeBytes: 10 * 1024 * 1024,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "application/pdf"],
  },
  experience: {
    id: "experience",
    maxSizeBytes: 2 * 1024 * 1024,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/svg+xml"],
  },
  education: {
    id: "education",
    maxSizeBytes: 2 * 1024 * 1024,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/svg+xml"],
  },
  resume: {
    id: "resume",
    maxSizeBytes: 10 * 1024 * 1024,
    allowedMimeTypes: ["application/pdf"],
  },
  blog: {
    id: "blog",
    maxSizeBytes: 5 * 1024 * 1024,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
  },
} as const;
