import { describe, expect, it } from "vitest";
import {
  optionalAssetUrlSchema,
  optionalUrlSchema,
  slugSchema,
  fileSchema,
  optionalDateSchema,
} from "@/lib/validation/shared";
import { projectSchema, projectFormSchema } from "@/lib/validation/project";
import { contactLinkSchema } from "@/lib/validation/contactLink";

/**
 * Edge cases, not happy paths. Each block below corresponds to a rule that
 * either has bitten this project before (and is recorded in
 * docs/progress.md's "Recurring lessons") or encodes a decision that would be
 * easy to undo by accident.
 */

describe("slugSchema", () => {
  it.each(["a", "hello", "hello-world", "a1-b2-c3", "2024-review"])("accepts %s", (value) => {
    expect(slugSchema.safeParse(value).success).toBe(true);
  });

  it.each([
    ["", "empty"],
    ["-leading", "leading hyphen"],
    ["trailing-", "trailing hyphen"],
    ["double--hyphen", "consecutive hyphens"],
    ["Upper-Case", "uppercase"],
    ["has space", "space"],
    ["under_score", "underscore"],
    ["accented-é", "non-ascii"],
  ])("rejects %s (%s)", (value) => {
    expect(slugSchema.safeParse(value).success).toBe(false);
  });
});

describe("optionalUrlSchema vs optionalAssetUrlSchema", () => {
  // This distinction is the single most repeatedly-hit bug in this codebase:
  // supabase/seed.sql seeds every asset column with a root-relative
  // placeholder, and the strict URL schema rejects those — so editing an
  // untouched seeded entity failed validation on a field nobody had touched.
  const seededPlaceholder = "/images/avatar.jpg";

  it("strict schema rejects a root-relative asset path", () => {
    expect(optionalUrlSchema.safeParse(seededPlaceholder).success).toBe(false);
  });

  it("asset schema accepts a root-relative asset path", () => {
    expect(optionalAssetUrlSchema.safeParse(seededPlaceholder).success).toBe(true);
  });

  it("asset schema still rejects a scheme-relative URL (off-site)", () => {
    expect(optionalAssetUrlSchema.safeParse("//evil.com/x.png").success).toBe(false);
  });

  it("both normalise empty string to null", () => {
    expect(optionalUrlSchema.parse("")).toBeNull();
    expect(optionalAssetUrlSchema.parse("")).toBeNull();
    expect(optionalUrlSchema.parse(undefined)).toBeNull();
  });

  it("both accept a real absolute URL", () => {
    expect(optionalUrlSchema.safeParse("https://example.com/a.png").success).toBe(true);
    expect(optionalAssetUrlSchema.safeParse("https://example.com/a.png").success).toBe(true);
  });
});

describe("optionalDateSchema", () => {
  it("accepts an ISO date and normalises empty to null", () => {
    expect(optionalDateSchema.safeParse("2026-01-31").success).toBe(true);
    expect(optionalDateSchema.parse("")).toBeNull();
  });

  it.each(["31-01-2026", "2026-13-01", "not a date"])("rejects %s", (value) => {
    expect(optionalDateSchema.safeParse(value).success).toBe(false);
  });
});

describe("projectSchema publish gate", () => {
  const draft = { name: "", slug: "", published: false };

  it("saves an almost-empty draft", () => {
    // Phase 20's explicit requirement: a project must be creatable and
    // saveable incomplete. Only *publishing* enforces the full field set.
    expect(projectSchema.safeParse(draft).success).toBe(true);
  });

  it("blocks publishing without name, slug and short_description", () => {
    const result = projectSchema.safeParse({ ...draft, published: true });
    expect(result.success).toBe(false);
    const paths = result.success ? [] : result.error.issues.map((i) => i.path.join("."));
    expect(paths).toEqual(expect.arrayContaining(["name", "slug", "short_description"]));
  });

  it("allows publishing once all three are present", () => {
    const result = projectSchema.safeParse({
      name: "Churn", slug: "churn", short_description: "Predicting churn", published: true,
    });
    expect(result.success).toBe(true);
  });

  it("treats whitespace-only values as missing when publishing", () => {
    const result = projectSchema.safeParse({
      name: "   ", slug: "churn", short_description: "  ", published: true,
    });
    expect(result.success).toBe(false);
  });

  it("still validates slug *format* on a draft when non-empty", () => {
    expect(projectSchema.safeParse({ ...draft, slug: "Not A Slug" }).success).toBe(false);
  });
});

describe("projectSchema date ordering", () => {
  it("rejects an end date before the start date", () => {
    const result = projectSchema.safeParse({
      name: "x", slug: "", published: false, start_date: "2026-06-01", end_date: "2026-05-31",
    });
    expect(result.success).toBe(false);
  });

  it("accepts equal start and end dates", () => {
    expect(projectSchema.safeParse({
      name: "x", slug: "", published: false, start_date: "2026-06-01", end_date: "2026-06-01",
    }).success).toBe(true);
  });

  it("accepts an end date with no start date", () => {
    expect(projectSchema.safeParse({
      name: "x", slug: "", published: false, end_date: "2026-06-01",
    }).success).toBe(true);
  });
});

describe("projectFormSchema child arrays", () => {
  it("defaults the three child arrays to empty", () => {
    const parsed = projectFormSchema.parse({ name: "x", slug: "", published: false });
    expect(parsed).toMatchObject({ technologies: [], features: [], media: [] });
  });

  it("requires an absolute file_url on a media row (uploads always produce one)", () => {
    const result = projectFormSchema.safeParse({
      name: "x", slug: "", published: false,
      media: [{ file_url: "/images/local.png", media_type: "image" }],
    });
    expect(result.success).toBe(false);
  });
});

describe("contactLinkSchema", () => {
  const base = { label: "Email", display_order: 0, published: true };

  it("requires a valid email for type=email", () => {
    expect(contactLinkSchema.safeParse({ ...base, type: "email", value: "nope" }).success).toBe(false);
    expect(contactLinkSchema.safeParse({ ...base, type: "email", value: "a@b.com" }).success).toBe(true);
  });

  it.each(["(555) 123-4567", "+1 555 123 4567", "+44 20 7946 0958", "5551234567"])(
    "accepts punctuated WhatsApp number %s",
    (value) => {
      // Phase 21 shipped a regex here that rejected "(555) 123-4567" because
      // the character after the optional "+" had to be a digit. The rule is
      // digit *count*, matching how resolveContactHref actually consumes it.
      expect(contactLinkSchema.safeParse({ ...base, type: "whatsapp", value }).success).toBe(true);
    },
  );

  it.each(["123456", "12345678901234567", "not-a-number"])("rejects WhatsApp value %s", (value) => {
    expect(contactLinkSchema.safeParse({ ...base, type: "whatsapp", value }).success).toBe(false);
  });
});

describe("fileSchema", () => {
  const schema = fileSchema({ maxSizeBytes: 1024, allowedMimeTypes: ["image/png"] });
  const makeFile = (bytes: number, type: string) =>
    new File([new Uint8Array(bytes)], "f", { type });

  it("accepts a file at exactly the size limit", () => {
    expect(schema.safeParse(makeFile(1024, "image/png")).success).toBe(true);
  });

  it("rejects a file one byte over the limit", () => {
    expect(schema.safeParse(makeFile(1025, "image/png")).success).toBe(false);
  });

  it("rejects a disallowed MIME type", () => {
    expect(schema.safeParse(makeFile(10, "image/gif")).success).toBe(false);
  });
});
