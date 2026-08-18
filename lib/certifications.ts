import { formatMonthYear } from "@/lib/utils";

/**
 * Pure certification helpers — same "pure function in lib/" pattern as
 * lib/projects.ts's selectProjects and lib/media.ts's resolveMediaLabel.
 */

export interface CertificationExpiryStatus {
  label: string;
  expired: boolean;
}

/**
 * `null` -> no status at all (the caller renders nothing — never a printed
 * "No expiry"). Otherwise compares against *today's local calendar date*,
 * not `new Date().toISOString()`'s UTC one, for the same reason
 * lib/utils.ts's date helpers parse "YYYY-MM-DD" strings directly rather
 * than going through `new Date(...)`: a UTC comparison could read a
 * certificate expiring "today" as already expired for anyone east of UTC.
 * A certificate expiring today still reads as valid ("expired" only once
 * the date has genuinely passed).
 */
export function resolveExpiryStatus(expirationDate: string | null): CertificationExpiryStatus | null {
  if (!expirationDate) return null;

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  if (expirationDate < today) {
    return { label: `Expired ${formatMonthYear(expirationDate)}`, expired: true };
  }
  return { label: `Valid until ${formatMonthYear(expirationDate)}`, expired: false };
}
