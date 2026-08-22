import { z } from "zod";
import { STORAGE_BUCKETS } from "@/lib/constants";
import {
  displayOrderSchema,
  fileSchema,
  optionalAssetUrlSchema,
  optionalDateSchema,
  optionalUrlSchema,
  publishedSchema,
  requiredTextSchema,
  textSchema,
} from "./shared";

export const certificationSchema = z
  .object({
    name: requiredTextSchema(200),
    issuing_organization: requiredTextSchema(200),
    // Uploaded assets (see optionalAssetUrlSchema) — the seed points both at
    // root-relative placeholder paths. `credential_url` below stays strict:
    // it's a genuine external verification link, never an upload.
    organization_logo_url: optionalAssetUrlSchema,
    issue_date: optionalDateSchema,
    expiration_date: optionalDateSchema,
    credential_id: textSchema(200).optional().nullable(),
    credential_url: optionalUrlSchema,
    certificate_file_url: optionalAssetUrlSchema,
    description: textSchema(2000).optional().nullable(),
    display_order: displayOrderSchema,
    published: publishedSchema,
  })
  .refine(
    (data) => !data.issue_date || !data.expiration_date || data.expiration_date >= data.issue_date,
    { message: "Expiration date can't be before the issue date", path: ["expiration_date"] },
  );

export type CertificationInput = z.infer<typeof certificationSchema>;

export const certificationFileSchema = fileSchema(STORAGE_BUCKETS.certifications);
