import { Badge } from "@/components/ui/Badge";
import { Tag } from "@/components/ui/Tag";
import { PreviewTile } from "./PreviewTile";

const BADGE_VARIANTS = ["neutral", "accent", "success", "warning", "danger", "info", "outline"] as const;

export function BadgeTagShowcase() {
  return (
    <div className="flex flex-col gap-10">
      <PreviewTile label="Badge — variants">
        <div className="flex flex-wrap items-center gap-3">
          {BADGE_VARIANTS.map((variant) => (
            <Badge key={variant} variant={variant}>
              {variant}
            </Badge>
          ))}
        </div>
      </PreviewTile>

      <PreviewTile label="Tag — default / subtle (subtle for dense lists)">
        <div className="flex flex-wrap items-center gap-2">
          <Tag>Python</Tag>
          <Tag>SQL</Tag>
          <Tag>scikit-learn</Tag>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {["Python", "SQL", "scikit-learn", "Airflow", "dbt", "Docker", "AWS", "Terraform"].map((tech) => (
            <Tag key={tech} variant="subtle">
              {tech}
            </Tag>
          ))}
        </div>
      </PreviewTile>
    </div>
  );
}
