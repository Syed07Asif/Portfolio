import type { Metadata } from "next";
import { ComingSoon } from "@/components/admin/ComingSoon";

export const metadata: Metadata = { title: "Achievements" };

export default function AdminAchievementsPage() {
  return <ComingSoon section="Achievements" />;
}
