"use client";

import { NewspaperIcon } from "lucide-react";
import { AdminTable } from "@/components/admin/table/AdminTable";
import { EmptyState } from "@/components/admin/EmptyState";
import { cn } from "@/lib/utils";
import { deleteBlogPost, reorderBlogPosts } from "@/lib/actions/blogPosts";
import type { AdminBlogPost } from "@/lib/data/blogPosts";

export interface BlogPostTableProps {
  items: AdminBlogPost[];
}

/**
 * blog_posts uses a draft/published `status` enum, not a plain `published`
 * boolean (see docs/database.md) — so unlike every other entity table,
 * there's no `onTogglePublished` inline switch here; status changes go
 * through the form's own Select instead. `published` is still synthesized
 * per row purely to satisfy AdminTable's generic item shape (which renders
 * no Status column/switch at all when `onTogglePublished` is omitted, so
 * this value is never actually read).
 */
export function BlogPostTable({ items }: BlogPostTableProps) {
  const rows = items.map((item) => ({ ...item, published: item.status === "published" }));

  return (
    <AdminTable
      items={rows}
      entityName="post"
      getItemLabel={(item) => item.title || "Untitled post"}
      editHref={(item) => `/admin/blog/${item.id}/edit`}
      onReorder={reorderBlogPosts}
      onDelete={(item) => deleteBlogPost(item.id)}
      columns={[
        {
          key: "title",
          header: "Title",
          render: (item) => <span className="font-medium text-foreground">{item.title || "Untitled post"}</span>,
        },
        { key: "slug", header: "Slug", render: (item) => item.slug },
        {
          key: "status",
          header: "Status",
          render: (item) => (
            <span className={cn("font-medium", item.status === "published" ? "text-success" : "text-foreground-muted")}>
              {item.status === "published" ? "Published" : "Draft"}
            </span>
          ),
        },
      ]}
      emptyState={
        <EmptyState
          icon={NewspaperIcon}
          title="No posts yet"
          description="Add your first post. The public blog stays off regardless — this is the editor only."
          createHref="/admin/blog/new"
          createLabel="Add post"
        />
      }
    />
  );
}
