export const MAX_MANUAL_REVIEW_BULK_APPROVAL_COUNT = 100;

export type ManualBillingReviewBulkDecision = "APPROVED";

export type ManualBillingReviewBulkApprovalInput = {
  itemIds: readonly string[];
  decision: string;
};

export type ManualBillingReviewBulkApprovalValidation =
  | { ok: true; itemIds: string[]; decision: ManualBillingReviewBulkDecision }
  | { ok: false; code: string; message: string };

export function validateManualBillingReviewBulkApproval(
  input: ManualBillingReviewBulkApprovalInput
): ManualBillingReviewBulkApprovalValidation {
  if (!Array.isArray(input.itemIds) || input.itemIds.length === 0) {
    return { ok: false, code: "EMPTY_ITEM_IDS", message: "At least one item id is required." };
  }

  const normalizedIds = input.itemIds
    .map((id) => (typeof id === "string" ? id.trim() : ""))
    .filter(Boolean);

  if (normalizedIds.length === 0) {
    return { ok: false, code: "EMPTY_ITEM_IDS", message: "At least one item id is required." };
  }

  const uniqueIds = [...new Set(normalizedIds)];
  if (uniqueIds.length !== normalizedIds.length) {
    return { ok: false, code: "DUPLICATE_ITEM_IDS", message: "Item ids must be unique." };
  }

  if (uniqueIds.length > MAX_MANUAL_REVIEW_BULK_APPROVAL_COUNT) {
    return {
      ok: false,
      code: "BULK_LIMIT_EXCEEDED",
      message: `Bulk approval is limited to ${MAX_MANUAL_REVIEW_BULK_APPROVAL_COUNT} items.`,
    };
  }

  const decision = (input.decision ?? "").trim().toUpperCase();
  if (decision !== "APPROVED") {
    return {
      ok: false,
      code: "BULK_DECISION_NOT_ALLOWED",
      message: "Bulk manual review supports APPROVED only in this phase.",
    };
  }

  return { ok: true, itemIds: uniqueIds, decision: "APPROVED" };
}
