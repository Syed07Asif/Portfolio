import type { Metadata } from "next";
import { ComingSoon } from "@/components/admin/ComingSoon";

export const metadata: Metadata = { title: "Skills" };

export default function AdminSkillsPage() {
  return <ComingSoon section="Skills" />;
}
