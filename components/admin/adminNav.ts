import {
  Award,
  Briefcase,
  FileText,
  FolderGit2,
  GraduationCap,
  LayoutDashboard,
  Mail,
  Newspaper,
  Settings,
  Trophy,
  UserCircle,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface AdminNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Only "blog" sets this — every other item is always enabled. */
  requiresBlogEnabled?: boolean;
}

/**
 * Single source of truth for the sidebar's items *and* the header's
 * section-title/breadcrumb lookup — both derive from this list rather than
 * keeping two hardcoded copies in sync. Order here is render order.
 */
export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Profile", href: "/admin/profile", icon: UserCircle },
  { label: "Skills", href: "/admin/skills", icon: Wrench },
  { label: "Experience", href: "/admin/experience", icon: Briefcase },
  { label: "Education", href: "/admin/education", icon: GraduationCap },
  { label: "Projects", href: "/admin/projects", icon: FolderGit2 },
  { label: "Certifications", href: "/admin/certifications", icon: Award },
  { label: "Achievements", href: "/admin/achievements", icon: Trophy },
  { label: "Contact", href: "/admin/contact", icon: Mail },
  { label: "Blog", href: "/admin/blog", icon: Newspaper, requiresBlogEnabled: true },
  { label: "Resume", href: "/admin/resume", icon: FileText },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

/**
 * Matches the *most specific* nav item whose href is a prefix of the
 * current path — "/admin" only matches exactly (it would otherwise prefix-
 * match every other route), everything else matches itself and anything
 * nested under it (e.g. a future "/admin/projects/[id]" edit page still
 * highlights "Projects" and reads as "Projects" in the header).
 */
export function resolveActiveNavItem(pathname: string): AdminNavItem | null {
  if (pathname === "/admin") {
    return ADMIN_NAV_ITEMS[0] ?? null;
  }
  const matches = ADMIN_NAV_ITEMS.filter(
    (item) => item.href !== "/admin" && (pathname === item.href || pathname.startsWith(`${item.href}/`)),
  );
  if (matches.length === 0) return null;
  return matches.reduce((longest, item) => (item.href.length > longest.href.length ? item : longest));
}
