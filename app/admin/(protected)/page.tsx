import Link from "next/link";
import type { Metadata } from "next";
import { fetchAdminDashboardStats } from "@/lib/data/adminDashboard";
import { formatMonthYear } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/admin/ui/table";
import type { EntityCounts } from "@/lib/data/adminDashboard";

export const metadata: Metadata = { title: "Dashboard" };

const COUNT_TILES: { key: keyof Pick<
  Awaited<ReturnType<typeof fetchAdminDashboardStats>>,
  "projects" | "experience" | "education" | "certifications" | "achievements" | "blogPosts"
>; label: string }[] = [
  { key: "projects", label: "Projects" },
  { key: "experience", label: "Experience" },
  { key: "education", label: "Education" },
  { key: "certifications", label: "Certifications" },
  { key: "achievements", label: "Achievements" },
  { key: "blogPosts", label: "Blog Posts" },
];

function CountTile({ label, counts }: { label: string; counts: EntityCounts }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5">
      <p className="text-small font-medium text-foreground-muted">{label}</p>
      <p className="font-display text-h2 font-bold text-foreground">{counts.total}</p>
      <div className="flex items-center gap-3 text-caption text-foreground-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
          {counts.published} published
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-foreground-muted" aria-hidden="true" />
          {counts.draft} draft
        </span>
      </div>
    </div>
  );
}

/**
 * Real counts only, per the brief's "useful information only — no vanity
 * analytics": total/published/draft per entity, the active resume's own
 * version/date, and what actually changed most recently — nothing that
 * needs a pageview tracker or third-party analytics to produce.
 */
export default async function AdminDashboardPage() {
  const stats = await fetchAdminDashboardStats();

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {COUNT_TILES.map(({ key, label }) => (
          <CountTile key={key} label={label} counts={stats[key]} />
        ))}

        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5">
          <p className="text-small font-medium text-foreground-muted">Resume</p>
          {stats.resume ? (
            <>
              <p className="font-display text-h4 font-bold text-foreground">
                {stats.resume.versionLabel ?? "Active version"}
              </p>
              <p className="text-caption text-foreground-muted">
                Uploaded {formatMonthYear(stats.resume.uploadedAt.slice(0, 10))}
              </p>
            </>
          ) : (
            <p className="text-body text-foreground-muted">No active resume</p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-4 font-display text-body-lg font-semibold text-foreground">Recently updated</h2>
        {stats.recentItems.length === 0 ? (
          <p className="text-body text-foreground-muted">Nothing has been edited yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.recentItems.map((item) => (
                <TableRow key={`${item.entity}-${item.id}`}>
                  <TableCell className="max-w-64 truncate font-medium">{item.label}</TableCell>
                  <TableCell className="text-muted-foreground">{item.entity}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatMonthYear(item.updatedAt.slice(0, 10))}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={item.editHref} className="text-accent hover:underline">
                      Edit
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
