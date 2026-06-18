import type { EdAllEncountersArchiveRow } from "@/features/emergency/edAllEncountersArchive";

export type EdAllEncountersBillingCodingFilter =
  | "ALL"
  | "READY_FOR_BILLING"
  | "BILLING_REVIEW_NEEDED"
  | "CODING_REVIEW_NEEDED";

export const ED_ALL_ENCOUNTERS_BILLING_CODING_FILTERS: readonly EdAllEncountersBillingCodingFilter[] = [
  "ALL",
  "READY_FOR_BILLING",
  "BILLING_REVIEW_NEEDED",
  "CODING_REVIEW_NEEDED",
] as const;

export const ED_ALL_ENCOUNTERS_BILLING_CODING_FILTER_I18N_KEYS: Record<
  EdAllEncountersBillingCodingFilter,
  string
> = {
  ALL: "edLifecycle.allEncounters.billingCodingFilter.all",
  READY_FOR_BILLING: "edLifecycle.allEncounters.billingCodingFilter.readyForBilling",
  BILLING_REVIEW_NEEDED: "edLifecycle.allEncounters.billingCodingFilter.billingReviewNeeded",
  CODING_REVIEW_NEEDED: "edLifecycle.allEncounters.billingCodingFilter.codingReviewNeeded",
};

export function isArchiveRowReadyForBilling(row: EdAllEncountersArchiveRow): boolean {
  return row.billingReady && row.codingReady;
}

export function isArchiveRowBillingReviewNeeded(row: EdAllEncountersArchiveRow): boolean {
  if (row.billingFinalizationStatus === "NOT_READY") return true;
  if (row.billingStatusLabel === "billing_not_ready") return true;
  if (!row.billingReady && row.billingStatusLabel !== "coding_review_needed") return true;
  const snapshot = row.billingReadinessSnapshot;
  if (snapshot && snapshot.isReady === false) return true;
  return false;
}

export function isArchiveRowCodingReviewNeeded(row: EdAllEncountersArchiveRow): boolean {
  if (!row.codingReady) return true;
  if (row.billingStatusLabel === "coding_review_needed") return true;
  return false;
}

export function matchesBillingCodingFilter(
  row: EdAllEncountersArchiveRow,
  filter: EdAllEncountersBillingCodingFilter
): boolean {
  switch (filter) {
    case "ALL":
      return true;
    case "READY_FOR_BILLING":
      return isArchiveRowReadyForBilling(row);
    case "BILLING_REVIEW_NEEDED":
      return isArchiveRowBillingReviewNeeded(row);
    case "CODING_REVIEW_NEEDED":
      return isArchiveRowCodingReviewNeeded(row);
    default:
      return true;
  }
}

export function filterAllEncountersByBillingCodingStatus(
  rows: readonly EdAllEncountersArchiveRow[],
  filter: EdAllEncountersBillingCodingFilter
): EdAllEncountersArchiveRow[] {
  if (filter === "ALL") return [...rows];
  return rows.filter((row) => matchesBillingCodingFilter(row, filter));
}
