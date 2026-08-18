"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2Icon, PlusIcon } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import { Textarea } from "@/components/admin/ui/textarea";
import { createSkillsBulk } from "@/lib/actions/skills";

export interface BulkSkillAddProps {
  categoryId: string;
}

/**
 * The brief's "add several skills to a category without a full page reload
 * per skill" requirement — a plain textarea (one name per line) submitted
 * as one array to `createSkillsBulk`, then `router.refresh()` re-fetches
 * the parent Server Component's data in place. No navigation happens at
 * all, unlike the full `SkillForm` (create/[id]/edit), which stays around
 * for the cases that need icon/proficiency/publish at creation time.
 */
export function BulkSkillAdd({ categoryId }: BulkSkillAddProps) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [isPending, startTransition] = useTransition();

  const names = draft
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  function handleSubmit() {
    if (names.length === 0) return;
    startTransition(async () => {
      const result = await createSkillsBulk({ category_id: categoryId, names });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`${result.data.count} skill${result.data.count === 1 ? "" : "s"} added.`);
      setDraft("");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-3">
      <Textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={"Quick-add skills — one name per line, e.g.\nTypeScript\nPostgreSQL\nDocker"}
        rows={3}
        disabled={isPending}
        className="text-small"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-caption text-foreground-muted">
          {names.length > 0
            ? `${names.length} skill${names.length === 1 ? "" : "s"} ready to add`
            : "Added skills start unpublished — publish each from the list below."}
        </p>
        <Button type="button" size="sm" variant="outline" disabled={isPending || names.length === 0} onClick={handleSubmit}>
          {isPending ? <Loader2Icon className="size-4 animate-spin" aria-hidden="true" /> : <PlusIcon className="size-4" />}
          Add {names.length > 0 ? names.length : ""} skill{names.length === 1 ? "" : "s"}
        </Button>
      </div>
    </div>
  );
}
