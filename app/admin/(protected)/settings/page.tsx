import type { Metadata } from "next";
import { ComingSoon } from "@/components/admin/ComingSoon";

export const metadata: Metadata = { title: "Settings" };

export default function AdminSettingsPage() {
  return <ComingSoon section="Settings" />;
}
