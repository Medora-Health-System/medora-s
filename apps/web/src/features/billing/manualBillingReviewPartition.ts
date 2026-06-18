import type { ManualReviewCategoryFilter, ManualReviewRow } from "./manualBillingReviewTypes";

export const MANUAL_REVIEW_CATEGORY_FILTERS: ManualReviewCategoryFilter[] = [
  "ALL",
  "MEDICATION",
  "LAB",
  "IMAGING",
  "CARE",
];

export function isManualReviewApproved(row: ManualReviewRow): boolean {
  return row.latestDecision?.decision === "APPROVED";
}

export function isManualReviewBulkSelectable(row: ManualReviewRow): boolean {
  return row.reviewAnchorType !== "PROCEDURE_DOCUMENTED" && !isManualReviewApproved(row);
}

export function partitionManualReviewRows(rows: ManualReviewRow[]): {
  pending: ManualReviewRow[];
  approved: ManualReviewRow[];
} {
  const pending: ManualReviewRow[] = [];
  const approved: ManualReviewRow[] = [];
  for (const row of rows) {
    if (isManualReviewApproved(row)) {
      approved.push(row);
    } else {
      pending.push(row);
    }
  }
  return { pending, approved };
}

export function filterManualReviewByCategory(
  rows: ManualReviewRow[],
  filter: ManualReviewCategoryFilter
): ManualReviewRow[] {
  if (filter === "ALL") return rows;
  return rows.filter((row) => row.category === filter);
}

export function sortManualReviewRows(rows: ManualReviewRow[]): ManualReviewRow[] {
  const billingStatusOrder: Array<ManualReviewRow["billingStatus"]> = [
    "candidate_only",
    "pending_license",
    "missing",
  ];
  const categoryOrder: Array<ManualReviewRow["category"]> = ["LAB", "IMAGING", "MEDICATION", "CARE"];
  return [...rows].sort((a, b) => {
    const statusDiff =
      billingStatusOrder.indexOf(a.billingStatus) - billingStatusOrder.indexOf(b.billingStatus);
    if (statusDiff !== 0) return statusDiff;
    const categoryDiff = categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);
    if (categoryDiff !== 0) return categoryDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function manualReviewCategoryFilterI18nKey(filter: ManualReviewCategoryFilter): string {
  switch (filter) {
    case "ALL":
      return "billingPage.manualReviewFilterAllPending";
    case "MEDICATION":
      return "billingPage.manualReviewFilterMedication";
    case "LAB":
      return "billingPage.manualReviewFilterLaboratory";
    case "IMAGING":
      return "billingPage.manualReviewFilterImaging";
    case "CARE":
      return "billingPage.manualReviewFilterOrdersProcedures";
    default:
      return "billingPage.manualReviewFilterAllPending";
  }
}
