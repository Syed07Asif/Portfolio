"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { EyeIcon, FolderGit2Icon, SearchIcon } from "lucide-react";
import { AdminTable } from "@/components/admin/table/AdminTable";
import { EmptyState } from "@/components/admin/EmptyState";
import { Input } from "@/components/admin/ui/input";
import { Button } from "@/components/admin/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/admin/ui/select";
import { Switch } from "@/components/admin/ui/switch";
import { deleteProject, reorderProject, toggleProjectFeatured, toggleProjectPublished } from "@/lib/actions/projects";
import { formatAdminDate } from "@/lib/utils";
import type { ActionResult } from "@/lib/actions/shared";
import type { AdminProjectListItem } from "@/lib/data/projects";
import type { ProjectStatus } from "@/types/content";

export interface ProjectsListClientProps {
  items: AdminProjectListItem[];
}

type StatusFilter = "all" | "published" | "draft";

const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  planned: "Planned",
  in_progress: "In Progress",
  completed: "Completed",
  archived: "Archived",
};

function FeaturedToggle({ project }: { project: AdminProjectListItem }) {
  const router = useRouter();
  const [featured, setFeatured] = useState(project.featured);
  const [pending, setPending] = useState(false);

  async function handleChange(checked: boolean) {
    const previous = featured;
    setPending(true);
    setFeatured(checked);

    const result = await toggleProjectFeatured(project.id, checked);

    setPending(false);
    if (!result.success) {
      setFeatured(previous);
      toast.error(result.error);
      return;
    }
    toast.success(checked ? "Marked as featured." : "Removed from featured.");
    router.refresh();
  }

  return (
    <Switch
      checked={featured}
      onCheckedChange={handleChange}
      disabled={pending}
      aria-label={featured ? `Remove ${project.name || "this project"} from featured` : `Feature ${project.name || "this project"}`}
    />
  );
}

function ProjectThumbnail({ project }: { project: AdminProjectListItem }) {
  if (!project.logo_url) {
    return (
      <div
        aria-hidden="true"
        className="flex size-9 shrink-0 items-center justify-center rounded-md bg-surface-raised text-caption font-medium text-foreground-muted"
      >
        {project.name.trim().slice(0, 1).toUpperCase() || "?"}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- small admin list thumbnail, arbitrary Storage URL
    <img src={project.logo_url} alt="" className="size-9 shrink-0 rounded-md border border-border object-cover" />
  );
}

/**
 * Wraps the generic AdminTable with two things it doesn't own itself:
 * search/status filtering, and a second inline toggle (featured) alongside
 * the standard published one — see AdminTable.tsx's own doc comments for
 * why a second toggle column lives here rather than as a new generic prop
 * (only Projects needs one).
 *
 * Reordering while filtered needs care: AdminTable's `onReorder` always
 * hands back *only the currently-visible rows*, resequenced 0..N-1 —
 * submitting that directly would silently collapse every hidden row's
 * `display_order` into the same tight range the moment a search/filter is
 * active. `handleReorder` instead merges the new visible order back into
 * the full canonical list (hidden rows keep their relative position; only
 * the visible ones take on the admin's new order) before submitting, so
 * filtering/searching never corrupts the order of rows it's hiding.
 */
export function ProjectsListClient({ items }: ProjectsListClientProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (statusFilter === "published" && !item.published) return false;
      if (statusFilter === "draft" && item.published) return false;
      if (query && !item.name.toLowerCase().includes(query) && !item.slug.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [items, search, statusFilter]);

  const isFiltering = search.trim() !== "" || statusFilter !== "all";

  async function handleReorder(order: { id: string; display_order: number }[]): Promise<ActionResult<unknown>> {
    const visibleIds = new Set(order.map((entry) => entry.id));
    const queue = [...order];
    let cursor = 0;
    const mergedIds = items.map((item) => (visibleIds.has(item.id) ? queue[cursor++]!.id : item.id));
    const finalOrder = mergedIds.map((id, index) => ({ id, display_order: index }));
    return reorderProject(finalOrder);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-foreground-muted"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name…"
            aria-label="Search projects by name"
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(value: StatusFilter) => setStatusFilter(value)}>
          <SelectTrigger className="w-full sm:w-40" aria-label="Filter by publish status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <AdminTable
        items={filteredItems}
        entityName="project"
        getItemLabel={(item) => item.name || "Untitled project"}
        editHref={(item) => `/admin/projects/${item.id}/edit`}
        onReorder={handleReorder}
        onTogglePublished={(item, published) => toggleProjectPublished(item.id, published)}
        onDelete={(item) => deleteProject(item.id)}
        columns={[
          {
            key: "project",
            header: "Project",
            render: (item) => (
              <div className="flex items-center gap-3">
                <ProjectThumbnail project={item} />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-medium text-foreground">{item.name || "Untitled project"}</span>
                  <span className="truncate text-caption text-foreground-muted">/projects/{item.slug}</span>
                </div>
                {/* Published rows are already reachable at their real URL — this is specifically the "preview a draft" affordance CLAUDE.md's Phase 21 brief asks for. */}
                {!item.published && item.slug ? (
                  <Button asChild variant="ghost" size="icon-sm" className="shrink-0">
                    <Link
                      href={`/admin/preview/enable?path=/projects/${item.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Preview ${item.name || "this project"}`}
                      title="Preview"
                    >
                      <EyeIcon className="size-4" />
                    </Link>
                  </Button>
                ) : null}
              </div>
            ),
          },
          {
            key: "progress",
            header: "Progress",
            render: (item) => PROJECT_STATUS_LABEL[item.status],
          },
          {
            key: "featured",
            header: "Featured",
            render: (item) => <FeaturedToggle project={item} />,
          },
          {
            key: "media",
            header: "Media",
            render: (item) => `${item.mediaCount} file${item.mediaCount === 1 ? "" : "s"}`,
          },
          {
            key: "updated",
            header: "Updated",
            render: (item) => formatAdminDate(item.updated_at),
          },
        ]}
        emptyState={
          <EmptyState
            icon={FolderGit2Icon}
            title={isFiltering ? "No projects match" : "No projects yet"}
            description={
              isFiltering
                ? "Try a different search term or status filter."
                : "Add your first project to show it on the public site."
            }
            createHref="/admin/projects/new"
            createLabel="Add project"
          />
        }
      />
    </div>
  );
}
