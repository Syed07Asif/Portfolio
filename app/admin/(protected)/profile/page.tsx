import type { Metadata } from "next";
import { fetchProfileForAdmin } from "@/lib/data/profile";
import { EntityFormPageShell } from "@/components/admin/EntityFormPageShell";
import { ProfileForm } from "@/components/admin/profile/ProfileForm";

export const metadata: Metadata = { title: "Profile" };

/**
 * Single-record editor, not a list + create/edit route pair — `profile` is
 * a singleton table (see lib/data/profile.ts's fetchProfileForAdmin
 * comment), so there's nothing to list and no separate "new" page. This
 * page always renders the same form, pre-filled from whatever the
 * singleton row currently holds (or blank, the very first time).
 */
export default async function AdminProfilePage() {
  const profile = await fetchProfileForAdmin();

  return (
    <EntityFormPageShell
      title="Profile"
      description="Your name, bio, and availability — shown across the Hero and About sections of the public site."
    >
      <ProfileForm profile={profile} />
    </EntityFormPageShell>
  );
}
