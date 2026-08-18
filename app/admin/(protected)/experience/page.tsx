import type { Metadata } from "next";
import { ComingSoon } from "@/components/admin/ComingSoon";

export const metadata: Metadata = { title: "Experience" };

export default function AdminExperiencePage() {
  return <ComingSoon section="Experience" />;
}
