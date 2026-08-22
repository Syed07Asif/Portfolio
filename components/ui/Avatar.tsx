import Image from "next/image";
import { cn } from "@/lib/utils";

export type AvatarSize = "sm" | "md" | "lg" | "xl";

const sizeClassName: Record<AvatarSize, string> = {
  sm: "size-8 text-caption",
  md: "size-10 text-small",
  lg: "size-14 text-body",
  xl: "size-20 text-h4",
};

const imageSizePx: Record<AvatarSize, number> = {
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
};

function initialsFrom(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return `${words[0]![0]}${words[words.length - 1]![0]}`.toUpperCase();
}

export interface AvatarProps {
  src?: string | null;
  /** Used for the accessible name and, when `src` is absent, to derive initials. */
  name: string;
  size?: AvatarSize;
  className?: string;
}

/**
 * `unoptimized` on the underlying next/image: this project hasn't
 * configured `images.remotePatterns` for Supabase Storage yet, and an
 * avatar is small enough that skipping Next's optimization pipeline costs
 * nothing noticeable. Safe to drop once that config exists.
 */
export function Avatar({ src, name, size = "md", className }: AvatarProps) {
  const dimension = imageSizePx[size];

  return (
    <span
      role="img"
      aria-label={name}
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-raised font-medium text-foreground-secondary",
        sizeClassName[size],
        className,
      )}
    >
      {src ? (
        <Image
          src={src}
          alt=""
          width={dimension}
          height={dimension}
          unoptimized
          className="size-full object-cover"
        />
      ) : (
        <span aria-hidden="true">{initialsFrom(name)}</span>
      )}
    </span>
  );
}
