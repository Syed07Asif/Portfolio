import type { NextConfig } from "next";

/**
 * Whitelists Supabase Storage as a remote image source for next/image, so
 * the Phase 14 media gallery's real (non-relative-path) file_urls actually
 * get optimized instead of erroring at request time — a gap Avatar.tsx and
 * AboutPortrait.tsx both already flagged in their own comments (worked
 * around there with `unoptimized`/same-origin-only images) but never fixed,
 * since nothing before this phase needed real optimization of remote
 * project assets. Scoped to Storage's public-object path specifically,
 * not the whole Supabase host, since that's the only path this project
 * ever serves images from.
 */
function supabaseStorageRemotePattern(): NonNullable<NextConfig["images"]>["remotePatterns"] {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return [];

  const { protocol, hostname, port } = new URL(supabaseUrl);
  return [
    {
      protocol: protocol === "https:" ? "https" : "http",
      hostname,
      port,
      pathname: "/storage/v1/object/public/**",
    },
  ];
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseStorageRemotePattern(),
  },
};

export default nextConfig;
