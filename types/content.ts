import type { Enums, Tables } from "./database";

/**
 * Hand-authored domain types the rest of the app actually imports.
 * types/database.ts is generated and reflects every column; these types
 * reflect only what a given piece of UI is meant to receive — see each
 * lib/data/*.ts module for the matching column selection. Never import from
 * types/database.ts outside this file.
 */

// -- Enums --------------------------------------------------------------

export type ProjectStatus = Enums<"project_status">;
export type MediaType = Enums<"media_type">;
export type BlogStatus = Enums<"blog_status">;
export type ContactType = Enums<"contact_type">;

// -- Profile --------------------------------------------------------------

export type Profile = Pick<
  Tables<"profile">,
  | "id"
  | "full_name"
  | "headline"
  | "short_bio"
  | "long_bio"
  | "avatar_url"
  | "location"
  | "availability_status"
  | "current_role"
  | "tagline"
>;

// -- Skills -----------------------------------------------------------------

export type SkillCategory = Pick<
  Tables<"skill_categories">,
  "id" | "name" | "slug" | "description" | "icon" | "display_order"
>;

export type SkillWithCategory = Pick<
  Tables<"skills">,
  "id" | "name" | "icon" | "proficiency" | "display_order"
> & {
  category: SkillCategory;
};

/** Return shape of getSkillCategoriesWithSkills(): categories grouped with their skills. */
export type SkillCategoryWithSkills = SkillCategory & {
  skills: SkillWithCategory[];
};

// -- Experience / Education --------------------------------------------------

export type Experience = Pick<
  Tables<"experience">,
  | "id"
  | "company"
  | "role"
  | "company_logo_url"
  | "location"
  | "employment_type"
  | "start_date"
  | "end_date"
  | "is_current"
  | "description"
  | "responsibilities"
  | "technologies"
  | "link_url"
  | "display_order"
>;

export type Education = Pick<
  Tables<"education">,
  | "id"
  | "institution"
  | "degree"
  | "field_of_study"
  | "institution_logo_url"
  | "start_date"
  | "end_date"
  | "grade"
  | "description"
  | "link_url"
  | "display_order"
>;

// -- Projects -----------------------------------------------------------------

export type ProjectTechnology = Pick<
  Tables<"project_technologies">,
  "id" | "name" | "icon" | "display_order"
>;

/** Lean shape for lists/cards — getProjects(). `technologies` is every row (ProjectCard slices to the top few itself), not a SQL-limited subset. */
export type Project = Pick<
  Tables<"projects">,
  | "id"
  | "slug"
  | "name"
  | "short_description"
  | "logo_url"
  | "cover_image_url"
  | "status"
  | "featured"
  | "display_order"
> & {
  technologies: Pick<ProjectTechnology, "id" | "name">[];
};

export type ProjectFeature = Pick<
  Tables<"project_features">,
  "id" | "title" | "description" | "display_order"
>;

/** storage_path is an internal Storage object path — public rendering only needs file_url. */
export type ProjectMedia = Pick<
  Tables<"project_media">,
  "id" | "file_url" | "media_type" | "title" | "alt_text" | "caption" | "display_order"
>;

/** Full shape for a single project page — getProjectBySlug(). */
export type ProjectDetail = Pick<
  Tables<"projects">,
  | "id"
  | "slug"
  | "name"
  | "short_description"
  | "description"
  | "problem_statement"
  | "solution"
  | "purpose"
  | "logo_url"
  | "cover_image_url"
  | "github_url"
  | "demo_url"
  | "video_url"
  | "status"
  | "start_date"
  | "end_date"
  | "featured"
> & {
  technologies: ProjectTechnology[];
  features: ProjectFeature[];
  media: ProjectMedia[];
};

// -- Certifications / Achievements -------------------------------------------

export type Certification = Pick<
  Tables<"certifications">,
  | "id"
  | "name"
  | "issuing_organization"
  | "organization_logo_url"
  | "issue_date"
  | "expiration_date"
  | "credential_id"
  | "credential_url"
  | "certificate_file_url"
  | "description"
  | "display_order"
>;

export type Achievement = Pick<
  Tables<"achievements">,
  | "id"
  | "title"
  | "description"
  | "date"
  | "organization"
  | "image_url"
  | "document_url"
  | "external_link"
  | "display_order"
>;

// -- Contact / Resume ---------------------------------------------------------

export type ContactLink = Pick<
  Tables<"contact_links">,
  "id" | "label" | "type" | "value" | "url" | "icon" | "display_order"
>;

/** storage_path and is_active are internal — getActiveResume() already resolved "the active one". */
export type Resume = Pick<Tables<"resumes">, "id" | "file_url" | "version_label" | "uploaded_at">;

// -- Site settings --------------------------------------------------------

export type NavItem = {
  label: string;
  href: string;
};

export type FeatureFlags = {
  blog_enabled: boolean;
} & Record<string, boolean>;

/**
 * Derived from the public_site_settings VIEW, not the site_settings table —
 * see docs/architecture.md's Security section for why. `primary_nav` and
 * `feature_flags` are typed by hand since the generated Json type is
 * intentionally unstructured.
 */
export type SiteSettings = {
  site_title: NonNullable<Tables<"public_site_settings">["site_title"]>;
  meta_description: Tables<"public_site_settings">["meta_description"];
  og_image_url: Tables<"public_site_settings">["og_image_url"];
  primary_nav: NavItem[];
  feature_flags: FeatureFlags;
  analytics_enabled: NonNullable<Tables<"public_site_settings">["analytics_enabled"]>;
};

// -- Blog (reserved — no UI yet) -----------------------------------------

export type BlogPost = Pick<
  Tables<"blog_posts">,
  | "id"
  | "title"
  | "slug"
  | "excerpt"
  | "content"
  | "cover_image_url"
  | "category"
  | "tags"
  | "author"
  | "reading_time"
  | "published_at"
  | "status"
  | "display_order"
>;
