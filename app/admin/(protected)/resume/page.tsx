import type { Metadata } from "next";
import { ComingSoon } from "@/components/admin/ComingSoon";

export const metadata: Metadata = { title: "Resume" };

export default function AdminResumePage() {
  return <ComingSoon section="Resume" />;
}
