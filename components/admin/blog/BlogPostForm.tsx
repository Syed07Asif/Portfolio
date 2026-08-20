"use client";

import { useState } from "react";
import { useAdminForm } from "@/components/admin/form/useAdminForm";
import { AdminFormShell } from "@/components/admin/form/AdminFormShell";
import {
  NumberField,
  SelectField,
  SlugField,
  TagInputField,
  TextField,
  TextareaField,
} from "@/components/admin/form/fields";
import { ImageUploader } from "@/components/admin/upload/ImageUploader";
import { blogPostSchema, type BlogPostInput } from "@/lib/validation";
import { checkBlogSlugAvailability, createBlogPost, updateBlogPost } from "@/lib/actions/blogPosts";
import type { AdminBlogPost } from "@/lib/data/blogPosts";

export interface BlogPostFormProps {
  /** Omitted for the create form. */
  post?: AdminBlogPost;
  /** Where a new row lands in the list by default — the caller computes "append at the end" from the current row count. */
  defaultDisplayOrder: number;
}

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
];

/**
 * Minimal by design, per CLAUDE.md's Phase 21 brief ("build only a minimal
 * list and form; the public blog stays off... proves the architecture
 * supports it later without becoming scope creep now") — every field the
 * schema has, but no gallery/repeatable-features complexity Projects needed.
 */
export function BlogPostForm({ post, defaultDisplayOrder }: BlogPostFormProps) {
  const [newRecordId] = useState(() => crypto.randomUUID());
  const recordId = post?.id ?? newRecordId;

  const defaultValues: BlogPostInput = {
    title: post?.title ?? "",
    slug: post?.slug ?? "",
    excerpt: post?.excerpt ?? "",
    content: post?.content ?? "",
    cover_image_url: post?.cover_image_url ?? null,
    category: post?.category ?? "",
    tags: post?.tags ?? [],
    author: post?.author ?? "",
    reading_time: post?.reading_time ?? null,
    status: post?.status ?? "draft",
    display_order: post?.display_order ?? defaultDisplayOrder,
  };

  const { form, isPending, onValid } = useAdminForm({
    schema: blogPostSchema,
    defaultValues,
    onSubmit: (values) => (post ? updateBlogPost(post.id, values) : createBlogPost(values)),
    successMessage: post ? "Post updated." : "Post created.",
    redirectTo: "/admin/blog",
  });

  return (
    <AdminFormShell
      form={form}
      onValid={onValid}
      isPending={isPending}
      submitLabel={post ? "Save changes" : "Create"}
      cancelHref="/admin/blog"
    >
      <ImageUploader
        label="Cover image"
        bucket="blog"
        recordId={recordId}
        value={form.watch("cover_image_url")}
        onChange={(url) => form.setValue("cover_image_url", url, { shouldDirty: true, shouldValidate: true })}
        disabled={isPending}
      />

      <TextField control={form.control} name="title" label="Title" />

      <SlugField
        control={form.control}
        name="slug"
        sourceName="title"
        checkAvailability={(slug) => checkBlogSlugAvailability(slug, post?.id)}
        disabled={isPending}
      />

      <TextareaField control={form.control} name="excerpt" label="Excerpt" description="List/preview summary." maxLength={500} rows={2} />

      <TextareaField control={form.control} name="content" label="Content" markdown rows={12} />

      <div className="grid gap-6 sm:grid-cols-2">
        <TextField control={form.control} name="category" label="Category" />
        <TextField control={form.control} name="author" label="Author" />
      </div>

      <TagInputField control={form.control} name="tags" label="Tags" placeholder="Press Enter to add" disabled={isPending} />

      <div className="grid gap-6 sm:grid-cols-2">
        <NumberField control={form.control} name="reading_time" label="Reading time (minutes)" min={0} allowEmpty />
        <NumberField control={form.control} name="display_order" label="Display order" min={0} />
      </div>

      <SelectField
        control={form.control}
        name="status"
        label="Status"
        options={STATUS_OPTIONS}
        description="The public blog is off regardless of this — see Settings' Blog enabled flag."
      />
    </AdminFormShell>
  );
}
