/**
 * X/Twitter reads `twitter:image` when present and only falls back to
 * `og:image` when it isn't — re-exporting the Open Graph card here emits
 * both tags from one implementation, so the two can never drift apart.
 * `generateStaticParams` has to come along too, or these would be generated
 * on demand instead of at build time, as does `generateImageMetadata`
 * (which carries the per-project alt text).
 */
export { default, generateImageMetadata, generateStaticParams, size, contentType } from "./opengraph-image";

/**
 * Declared literally rather than re-exported: route segment config is parsed
 * out of the source at compile time, so Next refuses a re-exported
 * `revalidate` outright ("It mustn't be reexported") and the build fails.
 * Keep this in step with opengraph-image.tsx's own value.
 */
export const revalidate = 3600;
