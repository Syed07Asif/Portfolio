import type { Metadata } from "next";
import { ComingSoon } from "@/components/admin/ComingSoon";

export const metadata: Metadata = { title: "Projects" };

export default function AdminProjectsPage() {
  return <ComingSoon section="Projects" />;
}
