import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = join(import.meta.dirname, "../../..");
const apiRoot = join(import.meta.dirname, "../../../../api/src");
const sharedRoot = join(import.meta.dirname, "../../../../../packages/shared/src");

function readFile(relativePath: string, root = webRoot): string {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("manualBillingReviewBulkUi (MEDUI.BILLING.MANUAL_REVIEW.1)", () => {
  it("workspace posts bulk approval endpoint", () => {
    const workspace = readFile("src/features/billing/ManualBillingReviewWorkspace.tsx");
    expect(workspace).toContain("/billing/manual-review/bulk-decision");
    expect(workspace).toContain('decision: "APPROVED"');
    expect(workspace).toContain("bulkConfirmOpen");
    expect(workspace).toContain("manualReviewBulkConfirmBody");
  });

  it("bulk confirm modal requires explicit approve action", () => {
    const workspace = readFile("src/features/billing/ManualBillingReviewWorkspace.tsx");
    expect(workspace).toContain("manualReviewBulkConfirmApprove");
    expect(workspace).toContain("bulkApproveSelected");
    expect(workspace).not.toContain("autoApprove");
  });

  it("select all visible and individual selection are implemented", () => {
    const workspace = readFile("src/features/billing/ManualBillingReviewWorkspace.tsx");
    expect(workspace).toContain("manualReviewSelectAll");
    expect(workspace).toContain("toggleAllVisible");
    expect(workspace).toContain("toggleRow");
    expect(workspace).toContain("selectedIds");
  });

  it("clears selection after bulk success", () => {
    const workspace = readFile("src/features/billing/ManualBillingReviewWorkspace.tsx");
    expect(workspace).toContain("setSelectedIds(new Set())");
    expect(workspace).toContain("manualReviewBulkSuccessSummary");
  });

  it("does not submit claims or post billing", () => {
    const workspace = readFile("src/features/billing/ManualBillingReviewWorkspace.tsx");
    expect(workspace).not.toContain("claim-submission");
    expect(workspace).not.toContain("submitClaim");
    expect(workspace).not.toContain("postPayment");
    expect(workspace).not.toContain("billing/ledger");
  });

  it("shared governance caps bulk count", () => {
    const governance = readFile("billing/manualBillingReviewBulkGovernance.ts", sharedRoot);
    expect(governance).toContain("MAX_MANUAL_REVIEW_BULK_APPROVAL_COUNT = 100");
    expect(governance).toContain("validateManualBillingReviewBulkApproval");
  });

  it("EN and FR bulk i18n keys exist", () => {
    const en = readFile("src/i18n/messages/en.ts");
    const fr = readFile("src/i18n/messages/fr.ts");
    for (const key of [
      "manualReviewApproveSelected",
      "manualReviewBulkConfirmBody",
      "manualReviewPendingSection",
      "manualReviewApprovedSection",
    ]) {
      expect(en).toContain(key);
      expect(fr).toContain(key);
    }
  });
});
