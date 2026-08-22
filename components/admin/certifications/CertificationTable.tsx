"use client";

import { AwardIcon } from "lucide-react";
import { AdminTable } from "@/components/admin/table/AdminTable";
import { EmptyState } from "@/components/admin/EmptyState";
import { cn } from "@/lib/utils";
import { resolveExpiryStatus } from "@/lib/certifications";
import {
  deleteCertification,
  reorderCertifications,
  toggleCertificationPublished,
} from "@/lib/actions/certifications";
import type { AdminCertification } from "@/lib/data/certifications";

export interface CertificationTableProps {
  items: AdminCertification[];
}

/** At-a-glance expired indicator, reusing the exact same "honest but not alarming" resolveExpiryStatus badge logic the public Certifications section uses — see lib/certifications.ts. */
function ExpiryIndicator({ expirationDate }: { expirationDate: string | null }) {
  const status = resolveExpiryStatus(expirationDate);
  if (!status) return <span className="text-foreground-muted">No expiry</span>;

  return (
    <span className={cn("font-medium", status.expired ? "text-warning" : "text-foreground-muted")}>
      {status.label}
    </span>
  );
}

export function CertificationTable({ items }: CertificationTableProps) {
  return (
    <AdminTable
      items={items}
      entityName="certification"
      getItemLabel={(item) => item.name}
      editHref={(item) => `/admin/certifications/${item.id}/edit`}
      onReorder={reorderCertifications}
      onTogglePublished={(item, published) => toggleCertificationPublished(item.id, published)}
      onDelete={(item) => deleteCertification(item.id)}
      columns={[
        {
          key: "name",
          header: "Name",
          render: (item) => <span className="font-medium text-foreground">{item.name}</span>,
        },
        { key: "issuer", header: "Issuer", render: (item) => item.issuing_organization },
        {
          key: "expiry",
          header: "Expiry",
          render: (item) => <ExpiryIndicator expirationDate={item.expiration_date} />,
        },
      ]}
      emptyState={
        <EmptyState
          icon={AwardIcon}
          title="No certifications yet"
          description="Add your first certification to show it on the public site."
          createHref="/admin/certifications/new"
          createLabel="Add certification"
        />
      }
    />
  );
}
