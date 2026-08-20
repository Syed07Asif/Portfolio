import { ImageResponse } from "next/og";
import { getProfile, getProjectBySlug, getProjectSlugs, getSiteSettings } from "@/lib/data";
import { DEFAULT_WORDMARK } from "@/lib/constants";
import { OG_IMAGE_SIZE, absoluteUrl } from "@/lib/seo";

/**
 * The social card a recruiter sees when a project link is pasted into
 * LinkedIn or WhatsApp — generated per project rather than shipped as a
 * static asset, so adding a project stays a database row (CLAUDE.md's core
 * principle) instead of a design task.
 *
 * Caching: this is a metadata route, so Next treats it exactly like a page.
 * `generateStaticParams` pre-renders one card per published project at
 * build time and `revalidate` re-renders at most hourly — the same 3600s
 * the detail page itself uses. Nothing here runs per request in production;
 * a slug published after the last build renders once, on first request, and
 * is then cached like the rest.
 */
export const size = OG_IMAGE_SIZE;
export const contentType = "image/png";
export const revalidate = 3600;

export async function generateStaticParams() {
  const slugs = await getProjectSlugs();
  return slugs.map((slug) => ({ slug }));
}

/**
 * Exists purely to give the card a per-project `og:image:alt` — the static
 * `alt` export a metadata image file normally uses can only be one fixed
 * string for every project.
 */
export async function generateImageMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);

  return [
    {
      id: "card",
      alt: project ? `${project.name} — project card` : "Project card",
      // Nested under `size`, not spread: flat width/height keys are silently
      // ignored and the og:image:width/height tags never get emitted.
      size: OG_IMAGE_SIZE,
      contentType,
    },
  ];
}

/**
 * styles/tokens.css, mirrored. Satori renders the JSX below without a
 * browser, so it can resolve neither Tailwind utilities nor CSS custom
 * properties — inline literals are the only thing it understands. This
 * constant is the one sanctioned duplication of the token values
 * (CLAUDE.md's rule 4 exists to stop one-off literals appearing *inside*
 * components; here there is no alternative), kept in one place so a token
 * change is a single edit rather than a hunt through the markup below.
 */
const OG_COLORS = {
  background: "#0a0d18", // --color-background
  surface: "#131729", // --color-surface
  border: "#242a44", // --color-border
  foreground: "#f2f4f8", // --color-foreground
  foregroundSecondary: "#b6bdcf", // --color-foreground-secondary
  foregroundMuted: "#7d84a0", // --color-foreground-muted
  accent: "#e3f566", // --color-accent
} as const;

const MAX_VISIBLE_TECHNOLOGIES = 4;

/**
 * Satori draws whatever bytes it is handed; a 404 HTML page handed to it as
 * an image throws and takes the whole card down with it. Every asset path
 * in this project is admin-uploaded and can be stale (or, in seed data,
 * a placeholder that was never uploaded at all), so the backdrop is probed
 * before it is trusted, and a failed probe degrades to no backdrop rather
 * than to no card. SVG is excluded deliberately — satori's SVG support is
 * partial enough that a logo could render as an empty box.
 */
async function resolveBackdrop(candidate: string | null | undefined): Promise<string | null> {
  if (!candidate) return null;

  const url = absoluteUrl(candidate);
  try {
    const response = await fetch(url, { method: "HEAD" });
    if (!response.ok) return null;

    const contentTypeHeader = response.headers.get("content-type") ?? "";
    if (!contentTypeHeader.startsWith("image/") || contentTypeHeader.includes("svg")) return null;

    return url;
  } catch {
    return null;
  }
}

export default async function ProjectOpenGraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [project, profile, siteSettings] = await Promise.all([
    getProjectBySlug(slug),
    getProfile(),
    getSiteSettings(),
  ]);

  const brandName = profile?.full_name ?? DEFAULT_WORDMARK;
  const brandLine = profile?.headline ?? profile?.current_role ?? null;

  // The project's own cover is the first choice; site_settings' default OG
  // image is the fallback when it has none, exactly as a project with no
  // artwork of its own should inherit the site's.
  const backdrop = await resolveBackdrop(project?.cover_image_url ?? siteSettings?.og_image_url);

  const title = project?.name ?? siteSettings?.site_title ?? brandName;
  const subtitle = project?.short_description ?? siteSettings?.meta_description ?? null;
  const technologies = (project?.technologies ?? []).slice(0, MAX_VISIBLE_TECHNOLOGIES);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: OG_COLORS.background,
          padding: "72px",
          position: "relative",
        }}
      >
        {backdrop ? (
          // eslint-disable-next-line @next/next/no-img-element -- satori has no next/image; it rasterises a plain img tag.
          <img
            src={backdrop}
            alt=""
            width={OG_IMAGE_SIZE.width}
            height={OG_IMAGE_SIZE.height}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: OG_IMAGE_SIZE.width,
              height: OG_IMAGE_SIZE.height,
              objectFit: "cover",
              opacity: 0.16,
            }}
          />
        ) : null}

        {/* The accent rule reads as the site's signature at thumbnail size, where the type is already too small to identify. */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: OG_IMAGE_SIZE.width,
            height: 10,
            backgroundColor: OG_COLORS.accent,
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div
            style={{
              fontSize: 26,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: OG_COLORS.accent,
            }}
          >
            {project ? "Project" : "Portfolio"}
          </div>
          <div
            style={{
              fontSize: title.length > 34 ? 68 : 86,
              fontWeight: 800,
              lineHeight: 1.05,
              color: OG_COLORS.foreground,
            }}
          >
            {title}
          </div>
          {subtitle ? (
            <div
              style={{
                fontSize: 32,
                lineHeight: 1.35,
                color: OG_COLORS.foregroundSecondary,
                // Satori has no line-clamp; a hard character budget is what keeps
                // a 600-word description from pushing the brand line off the card.
                display: "flex",
              }}
            >
              {subtitle.length > 150 ? `${subtitle.slice(0, 149).trimEnd()}…` : subtitle}
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "32px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ fontSize: 30, fontWeight: 700, color: OG_COLORS.foreground }}>{brandName}</div>
            {brandLine ? (
              <div style={{ fontSize: 24, color: OG_COLORS.foregroundMuted }}>{brandLine}</div>
            ) : null}
          </div>

          {technologies.length > 0 ? (
            <div style={{ display: "flex", gap: "12px" }}>
              {technologies.map((technology) => (
                <div
                  key={technology.id}
                  style={{
                    display: "flex",
                    padding: "10px 22px",
                    borderRadius: "999px",
                    border: `2px solid ${OG_COLORS.border}`,
                    backgroundColor: OG_COLORS.surface,
                    fontSize: 22,
                    color: OG_COLORS.foregroundSecondary,
                  }}
                >
                  {technology.name}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    ),
    { ...OG_IMAGE_SIZE },
  );
}
