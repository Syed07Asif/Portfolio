"use client";

import { Terminal } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/admin/ui/alert";
import { Button as AdminButton } from "@/components/admin/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/admin/ui/dialog";
import { Input } from "@/components/admin/ui/input";
import { PreviewTile } from "./PreviewTile";

/**
 * shadcn/ui (components/admin/ui) is for the admin panel and overlays
 * only — not part of the public site. Shown here purely to confirm the
 * theming in styles/globals.css's "shadcn/ui compatibility" block actually
 * took (same tokens, not a stock shadcn look).
 */
export function ShadcnPreview() {
  return (
    <div className="flex flex-col gap-10">
      <PreviewTile label="shadcn/ui Button + Input, themed to the same tokens">
        <div className="flex flex-wrap items-center gap-4">
          <AdminButton>Default</AdminButton>
          <AdminButton variant="secondary">Secondary</AdminButton>
          <AdminButton variant="outline">Outline</AdminButton>
          <AdminButton variant="destructive">Destructive</AdminButton>
          <Input placeholder="Admin form input" className="w-48" />
        </div>
      </PreviewTile>

      <PreviewTile label="shadcn/ui Alert">
        <Alert className="max-w-md">
          <Terminal />
          <AlertTitle>Heads up</AlertTitle>
          <AlertDescription>This is a shadcn Alert, admin-only, themed to our tokens.</AlertDescription>
        </Alert>
      </PreviewTile>

      <PreviewTile label="shadcn/ui Dialog (click to open)">
        <Dialog>
          <DialogTrigger asChild>
            <AdminButton variant="outline">Open dialog</AdminButton>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Example dialog</DialogTitle>
              <DialogDescription>
                Confirms the overlay, backdrop, and content surface all pick up our tokens too.
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </PreviewTile>
    </div>
  );
}
