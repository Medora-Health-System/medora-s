import { describe, expect, it } from "vitest";
import {
  MAX_MANUAL_REVIEW_BULK_APPROVAL_COUNT,
  validateManualBillingReviewBulkApproval,
} from "./manualBillingReviewBulkGovernance.js";

describe("manualBillingReviewBulkGovernance (MEDUI.BILLING.MANUAL_REVIEW.1)", () => {
  it("rejects empty bulk approval", () => {
    expect(validateManualBillingReviewBulkApproval({ itemIds: [], decision: "APPROVED" }).ok).toBe(
      false
    );
  });

  it("rejects over max item count", () => {
    const itemIds = Array.from({ length: MAX_MANUAL_REVIEW_BULK_APPROVAL_COUNT + 1 }, (_, i) =>
      String(i)
    );
    const result = validateManualBillingReviewBulkApproval({ itemIds, decision: "APPROVED" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("BULK_LIMIT_EXCEEDED");
  });

  it("rejects duplicate ids", () => {
    const result = validateManualBillingReviewBulkApproval({
      itemIds: ["a", "a"],
      decision: "APPROVED",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("DUPLICATE_ITEM_IDS");
  });

  it("allows APPROVED only", () => {
    const approved = validateManualBillingReviewBulkApproval({
      itemIds: ["item-1"],
      decision: "APPROVED",
    });
    expect(approved.ok).toBe(true);

    const denied = validateManualBillingReviewBulkApproval({
      itemIds: ["item-1"],
      decision: "DO_NOT_BILL",
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.code).toBe("BULK_DECISION_NOT_ALLOWED");

    const needsInfo = validateManualBillingReviewBulkApproval({
      itemIds: ["item-1"],
      decision: "NEEDS_INFO",
    });
    expect(needsInfo.ok).toBe(false);
  });

  it("trims and deduplicates valid ids", () => {
    const result = validateManualBillingReviewBulkApproval({
      itemIds: [" item-1 ", "item-2"],
      decision: "approved",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.itemIds).toEqual(["item-1", "item-2"]);
      expect(result.decision).toBe("APPROVED");
    }
  });
});
