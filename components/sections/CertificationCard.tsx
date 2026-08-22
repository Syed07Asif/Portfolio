import { ExternalLink, FileText } from "lucide-react";
import { Avatar, Badge, Button, Card } from "@/components/ui";
import { formatMonthYear } from "@/lib/utils";
import { resolveExpiryStatus } from "@/lib/certifications";
import type { Certification } from "@/types/content";

export interface CertificationCardProps {
  certification: Certification;
}

/**
 * Same Card/hover-lift/grid rhythm as ProjectCard (this section's brief
 * asks for it explicitly), but the header composition borrows from
 * Experience/EducationItem instead — Avatar + name + issuer, since an
 * organization logo is a small mark, not a hero screenshot, and this
 * content type reads more like a credential record than a clickable
 * project. Not `interactive`/whole-card-link like ProjectCard, though:
 * a certification can have *two* distinct real links (verify credential,
 * view certificate), so it stays a static Card with real anchors inside —
 * same reasoning ExperienceItem/EducationItem already apply to their own
 * single optional link.
 */
export function CertificationCard({ certification }: CertificationCardProps) {
  const expiry = resolveExpiryStatus(certification.expiration_date);
  const hasActions = Boolean(certification.credential_url || certification.certificate_file_url);

  return (
    <Card padding="lg" hover="lift" className="flex h-full flex-col gap-4">
      <div className="flex items-start gap-4">
        <Avatar src={certification.organization_logo_url} name={certification.issuing_organization} size="lg" />
        <div className="flex flex-1 flex-col gap-1">
          <h3 className="text-h4 font-display font-semibold text-foreground">{certification.name}</h3>
          <p className="text-body font-medium text-foreground-secondary">{certification.issuing_organization}</p>
        </div>
      </div>

      {certification.issue_date || expiry ? (
        <div className="flex flex-wrap items-center gap-2">
          {certification.issue_date ? (
            <span className="text-small text-foreground-muted">Issued {formatMonthYear(certification.issue_date)}</span>
          ) : null}
          {expiry ? <Badge variant={expiry.expired ? "neutral" : "success"}>{expiry.label}</Badge> : null}
        </div>
      ) : null}

      {certification.credential_id ? (
        <p className="text-small text-foreground-muted">Credential ID: {certification.credential_id}</p>
      ) : null}

      {certification.description ? (
        <p className="text-body text-foreground-secondary">{certification.description}</p>
      ) : null}

      {hasActions ? (
        <div className="mt-auto flex flex-wrap gap-3 pt-2">
          {certification.credential_url ? (
            <Button asChild variant="outline" size="sm" trailingIcon={ExternalLink}>
              <a href={certification.credential_url} target="_blank" rel="noreferrer noopener">
                Verify credential
              </a>
            </Button>
          ) : null}
          {certification.certificate_file_url ? (
            <Button asChild variant="ghost" size="sm" leadingIcon={FileText}>
              <a href={certification.certificate_file_url} target="_blank" rel="noreferrer noopener">
                View certificate
              </a>
            </Button>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
