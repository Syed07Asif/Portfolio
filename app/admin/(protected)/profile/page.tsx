import type { Metadata } from "next";
import { ComingSoon } from "@/components/admin/ComingSoon";

export const metadata: Metadata = { title: "Profile" };

export default function AdminProfilePage() {
  return <ComingSoon section="Profile" />;
}
