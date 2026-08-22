import { Skeleton } from "@/components/ui/Skeleton";

export interface AdminTableSkeletonProps {
  columns?: number;
  rows?: number;
}

/**
 * Exported for route `loading.tsx` files (Next's own loading-state
 * convention already covers the one real loading moment — the list page's
 * server fetch) — never rendered by AdminTable itself, which always has
 * `items` by the time it mounts.
 */
export function AdminTableSkeleton({ columns = 4, rows = 5 }: AdminTableSkeletonProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border" aria-hidden="true">
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, row) => (
          <div key={row} className="flex items-center gap-6 px-4 py-4">
            <Skeleton shape="rect" className="h-4 w-4 shrink-0 rounded-sm" />
            {Array.from({ length: columns }).map((_, col) => (
              <Skeleton key={col} shape="text" className={col === 0 ? "w-1/4" : "w-1/12"} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
