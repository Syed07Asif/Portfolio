import { Briefcase, FolderGit2, Link2, Mail, MessageCircle, Share2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ContactLink, ContactType } from "@/types/content";

/**
 * Pure contact-link helpers, shared by Footer and the Contact section so
 * the resolution rules live in exactly one place — same "pure function in
 * lib/" precedent as lib/projects.ts/lib/media.ts/lib/certifications.ts.
 */

/**
 * One lookup object mapping the `contact_type` enum to a Lucide icon —
 * adding a fifth channel later is a database row plus one entry here,
 * never new component logic. This lucide-react version ships no brand/logo
 * marks (Github, Linkedin, Twitter, ... were removed upstream — CLAUDE.md
 * fixes Lucide as the only icon library), so every channel gets a generic
 * icon by type, not a brand mark. `other` (and any type added to the enum
 * later without a matching entry here) falls back to a plain Link2 mark
 * rather than rendering nothing.
 */
export const CONTACT_ICON_BY_TYPE: Record<ContactType, LucideIcon> = {
  email: Mail,
  linkedin: Briefcase,
  github: FolderGit2,
  whatsapp: MessageCircle,
  twitter: Share2,
  other: Link2,
};

const FALLBACK_CONTACT_ICON: LucideIcon = Link2;

/** Same fallback the map's own `other` entry uses — exported separately so a lookup miss on a genuinely new enum value (added to the DB type before this map is updated) degrades the same way `other` does, instead of crashing on `undefined`. */
export function resolveContactIcon(type: ContactType): LucideIcon {
  return CONTACT_ICON_BY_TYPE[type] ?? FALLBACK_CONTACT_ICON;
}

/**
 * Resolves the actual href for one contact_links row. Email and WhatsApp
 * are *always* derived from `value` (mailto:/wa.me), regardless of
 * whatever the row's own `url` column happens to hold — these are the two
 * channels whose target format is fixed enough to construct reliably from
 * a raw value. Every other type uses `url` (an external profile link) as
 * given, or resolves to `null` — the caller skips rendering that channel —
 * when it's unset, since `value` alone for those types is typically just a
 * handle/username, not a safe href on its own.
 */
export function resolveContactHref(link: Pick<ContactLink, "type" | "value" | "url">): string | null {
  if (link.type === "email") return `mailto:${link.value}`;

  if (link.type === "whatsapp") {
    const digits = link.value.replace(/\D/g, "");
    return digits ? `https://wa.me/${digits}` : null;
  }

  return link.url;
}

/** True for anything that isn't a same-site mailto:/tel: link — used to decide target="_blank" + rel="noreferrer noopener". */
export function isExternalContactHref(href: string): boolean {
  return href.startsWith("http");
}
