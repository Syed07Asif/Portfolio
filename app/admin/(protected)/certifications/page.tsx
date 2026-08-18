import type { Metadata } from "next";
import { ComingSoon } from "@/components/admin/ComingSoon";

export const metadata: Metadata = { title: "Certifications" };

export default function AdminCertificationsPage() {
  return <ComingSoon section="Certifications" />;
}
