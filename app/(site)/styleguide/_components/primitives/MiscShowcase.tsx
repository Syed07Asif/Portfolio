import { FolderOpen } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Divider } from "@/components/ui/Divider";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { PreviewTile } from "./PreviewTile";

// Inline SVG data URI so the "image" state can be demoed without depending
// on a real uploaded asset (none exists yet — content comes from Supabase
// Storage starting in a later phase).
const DEMO_AVATAR_SRC =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' fill='%23e3f566'/%3E%3Ccircle cx='40' cy='32' r='14' fill='%230a0d18'/%3E%3Ccircle cx='40' cy='78' r='26' fill='%230a0d18'/%3E%3C/svg%3E";

export function MiscShowcase() {
  return (
    <div className="flex flex-col gap-10">
      <PreviewTile label="Avatar — sizes, initials fallback vs. image">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar name="Syed Asif" size="sm" />
          <Avatar name="Syed Asif" size="md" />
          <Avatar name="Syed Asif" size="lg" />
          <Avatar name="Syed Asif" size="xl" />
          <Avatar name="Syed Asif" src={DEMO_AVATAR_SRC} size="xl" />
        </div>
      </PreviewTile>

      <PreviewTile label="Divider — horizontal / vertical">
        <div className="flex w-full flex-col gap-4">
          <Divider />
          <div className="flex h-8 items-center gap-4">
            <span className="text-small text-foreground-muted">Left</span>
            <Divider orientation="vertical" />
            <span className="text-small text-foreground-muted">Right</span>
          </div>
        </div>
      </PreviewTile>

      <PreviewTile label="EmptyState">
        <EmptyState
          icon={FolderOpen}
          title="No projects published yet"
          description="Published projects will appear here once added in the admin panel."
        />
      </PreviewTile>

      <PreviewTile label="Skeleton — text / circle / rect shapes, composed into a card skeleton">
        <div className="flex w-full max-w-sm flex-col gap-3 rounded-xl border border-border bg-surface p-6">
          <Skeleton shape="rect" className="h-40" />
          <div className="flex items-center gap-3 pt-2">
            <Skeleton shape="circle" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton shape="text" className="w-3/4" />
              <Skeleton shape="text" className="w-1/2" />
            </div>
          </div>
        </div>
      </PreviewTile>
    </div>
  );
}
