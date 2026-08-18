import { Badge } from "@/components/ui";
import type { BadgeProps } from "@/components/ui";
import type { ProjectStatus } from "@/types/content";

const STATUS_CONFIG: Record<ProjectStatus, { label: string; variant: BadgeProps["variant"] }> = {
  planned: { label: "Planned", variant: "neutral" },
  in_progress: { label: "In Progress", variant: "info" },
  completed: { label: "Completed", variant: "success" },
  archived: { label: "Archived", variant: "outline" },
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const config = STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
