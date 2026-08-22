"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangleIcon, ExternalLinkIcon } from "lucide-react";
import { useAdminForm } from "@/components/admin/form/useAdminForm";
import { AdminFormShell } from "@/components/admin/form/AdminFormShell";
import {
  DateField,
  NumberField,
  RepeatableGroupField,
  SelectField,
  SlugField,
  SwitchField,
  TagInputField,
  TextField,
  TextareaField,
} from "@/components/admin/form/fields";
import { ImageUploader } from "@/components/admin/upload/ImageUploader";
import { ProjectMediaManager } from "@/components/admin/projects/ProjectMediaManager";
import { Button } from "@/components/admin/ui/button";
import { Alert, AlertDescription } from "@/components/admin/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/admin/ui/tabs";
import { projectFormSchema, type ProjectFormInput } from "@/lib/validation";
import { checkProjectSlugAvailability, createProject, updateProject } from "@/lib/actions/projects";
import type { AdminProjectDetail } from "@/lib/data/projects";

export interface ProjectFormProps {
  /** Omitted for the create form. */
  project?: AdminProjectDetail;
  /** Where a new row lands in the list by default — the caller computes "append at the end" from the current row count. */
  defaultDisplayOrder: number;
  /** Every technology name already used on other projects, for the Technologies tab's autocomplete — see CLAUDE.md's Phase 20 brief ("avoid 'Postgres' and 'PostgreSQL' both existing"). */
  technologySuggestions: string[];
}

const STATUS_OPTIONS = [
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

export function ProjectForm({ project, defaultDisplayOrder, technologySuggestions }: ProjectFormProps) {
  // Every upload (logo, cover image, gallery) lives at
  // projects/{recordId}/... keyed by the project's own row id — never its
  // slug. That's this entity's answer to CLAUDE.md's Phase 20 "handle the
  // slug-change case" requirement: because storage paths never reference
  // the slug at all, renaming a project's slug can never leave media
  // pointing at a dead path, and no migration step is needed. See
  // docs/content-management.md's "Uploads and storage cleanup" section for
  // the {bucket}/{recordId}/{uuid}.{ext} convention this relies on.
  const [newRecordId] = useState(() => crypto.randomUUID());
  const recordId = project?.id ?? newRecordId;

  const defaultValues: ProjectFormInput = {
    slug: project?.slug ?? "",
    name: project?.name ?? "",
    short_description: project?.short_description ?? "",
    description: project?.description ?? "",
    problem_statement: project?.problem_statement ?? "",
    solution: project?.solution ?? "",
    purpose: project?.purpose ?? "",
    logo_url: project?.logo_url ?? null,
    cover_image_url: project?.cover_image_url ?? null,
    github_url: project?.github_url ?? null,
    demo_url: project?.demo_url ?? null,
    video_url: project?.video_url ?? null,
    status: project?.status ?? "planned",
    start_date: project?.start_date ?? null,
    end_date: project?.end_date ?? null,
    featured: project?.featured ?? false,
    display_order: project?.display_order ?? defaultDisplayOrder,
    published: project?.published ?? false,
    technologies: project?.technologies.map((technology) => technology.name) ?? [],
    features: project?.features.map((feature) => ({ title: feature.title, description: feature.description })) ?? [],
    media:
      project?.media.map((item) => ({
        file_url: item.file_url,
        storage_path: item.storage_path,
        media_type: item.media_type,
        title: item.title,
        alt_text: item.alt_text,
        caption: item.caption,
      })) ?? [],
  };

  const { form, isPending, onValid } = useAdminForm({
    schema: projectFormSchema,
    defaultValues,
    onSubmit: (values) => (project ? updateProject(project.id, values) : createProject(recordId, values)),
    successMessage: project ? "Project updated." : "Project created.",
    redirectTo: "/admin/projects",
  });

  // Warn loudly rather than block — a published project's slug is a live,
  // already-shared URL (/projects/<slug>), so changing it isn't invalid,
  // just consequential. Compares against the *saved* slug, not the form's
  // starting value, so the warning tracks live edits within this session.
  const currentSlug = form.watch("slug");
  const slugChanged = Boolean(project?.published && currentSlug !== project.slug);

  return (
    <AdminFormShell
      form={form}
      onValid={onValid}
      isPending={isPending}
      submitLabel={project ? "Save changes" : "Create"}
      cancelHref="/admin/projects"
    >
      {project?.slug ? (
        <div className="flex justify-end">
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/preview/enable?path=/projects/${project.slug}`} target="_blank" rel="noreferrer">
              Preview <ExternalLinkIcon className="size-4" />
            </Link>
          </Button>
        </div>
      ) : null}

      <Tabs defaultValue="basics">
        <TabsList className="flex-wrap">
          <TabsTrigger value="basics">Basics</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="technologies">Technologies</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="links">Links</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
        </TabsList>

        <TabsContent value="basics" className="flex flex-col gap-6 pt-4">
          <ImageUploader
            label="Logo"
            bucket="projects"
            recordId={recordId}
            value={form.watch("logo_url")}
            onChange={(url) => form.setValue("logo_url", url, { shouldDirty: true, shouldValidate: true })}
            disabled={isPending}
          />

          <TextField control={form.control} name="name" label="Name" />

          <SlugField
            control={form.control}
            name="slug"
            sourceName="name"
            checkAvailability={(slug) => checkProjectSlugAvailability(slug, project?.id)}
            disabled={isPending}
          />
          {slugChanged ? (
            <Alert>
              <AlertTriangleIcon />
              <AlertDescription>
                Heads up: this project is published, and its current page is /projects/{project?.slug}. Saving this
                change breaks any link already shared to it.
              </AlertDescription>
            </Alert>
          ) : null}

          <TextareaField
            control={form.control}
            name="short_description"
            label="Short description"
            description="Shown on project cards and lists."
            maxLength={300}
            rows={2}
          />

          <div className="grid gap-6 sm:grid-cols-2">
            <SelectField control={form.control} name="status" label="Status" options={STATUS_OPTIONS} />
            <NumberField control={form.control} name="display_order" label="Display order" min={0} />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <DateField control={form.control} name="start_date" label="Start date" />
            <DateField control={form.control} name="end_date" label="End date" />
          </div>

          <SwitchField
            control={form.control}
            name="featured"
            label="Featured"
            description="Surfaces this project in the homepage's featured section."
          />

          <SwitchField
            control={form.control}
            name="published"
            label="Published"
            description="Requires a name, slug, and short description — everything else on this form can stay filled in later. Save anytime before then; it's kept as a draft."
          />
        </TabsContent>

        <TabsContent value="content" className="flex flex-col gap-6 pt-4">
          <TextareaField
            control={form.control}
            name="description"
            label="Description"
            description="Optional. The full write-up shown on the project's page."
            rows={6}
          />
          <TextareaField control={form.control} name="problem_statement" label="Problem statement" description="Optional." rows={4} />
          <TextareaField control={form.control} name="solution" label="Solution" description="Optional." rows={4} />
          <TextareaField control={form.control} name="purpose" label="Purpose" description="Optional." rows={3} />
        </TabsContent>

        <TabsContent value="technologies" className="flex flex-col gap-4 pt-4">
          <TagInputField
            control={form.control}
            name="technologies"
            label="Technologies"
            description="Press Enter or comma to add. Start typing to see technologies already used on other projects, so naming stays consistent."
            placeholder="e.g. Next.js"
            suggestions={technologySuggestions}
            disabled={isPending}
          />
        </TabsContent>

        <TabsContent value="features" className="flex flex-col gap-4 pt-4">
          <RepeatableGroupField
            control={form.control}
            name="features"
            label="Features"
            addLabel="Add feature"
            emptyRow={{ title: "", description: "" }}
            disabled={isPending}
            renderRow={(index) => (
              <div className="flex flex-col gap-3">
                <TextField control={form.control} name={`features.${index}.title`} label="Title" />
                <TextareaField control={form.control} name={`features.${index}.description`} label="Description" rows={3} />
              </div>
            )}
          />
        </TabsContent>

        <TabsContent value="links" className="flex flex-col gap-6 pt-4">
          <p className="text-small text-foreground-muted">Empty links simply won&apos;t appear on the public page.</p>
          <TextField control={form.control} name="github_url" label="GitHub URL" type="url" />
          <TextField control={form.control} name="demo_url" label="Demo URL" type="url" />
          <TextField control={form.control} name="video_url" label="Video URL" type="url" />
        </TabsContent>

        <TabsContent value="media" className="flex flex-col gap-6 pt-4">
          <ImageUploader
            label="Cover image"
            bucket="projects"
            recordId={recordId}
            value={form.watch("cover_image_url")}
            onChange={(url) => form.setValue("cover_image_url", url, { shouldDirty: true, shouldValidate: true })}
            disabled={isPending}
          />
          <ProjectMediaManager
            value={form.watch("media")}
            onChange={(media) => form.setValue("media", media, { shouldDirty: true, shouldValidate: true })}
            recordId={recordId}
            disabled={isPending}
          />
        </TabsContent>
      </Tabs>
    </AdminFormShell>
  );
}
