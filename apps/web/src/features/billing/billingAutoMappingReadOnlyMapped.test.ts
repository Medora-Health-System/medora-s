import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BILLING_AUTO_MAPPING_QUEUE,
  buildBillingAutoMappingWorkspaceRow,
  resolveBillingAutoMappingQueue,
} from "@medora/shared";

describe("billingAutoMappingReadOnlyMapped (MEDUI.BILLING.AUTO_MAPPING.1A)", () => {
  it("mapped queue is read-only in workspace component", () => {
    const workspace = readFileSync(
      join(import.meta.dirname, "BillingAutoMappingWorkspace.tsx"),
      "utf8"
    );
    expect(workspace).toContain("BILLING_AUTO_MAPPING_QUEUE.MAPPED");
    expect(workspace).not.toContain("activeTab === BILLING_AUTO_MAPPING_QUEUE.MAPPED && canBulkApplyAutoMapping");
    expect(workspace).toContain("autoMappingWorkspaceColAppliedCode");
  });

  it("applied rows resolve to MAPPED queue", () => {
    const row = buildBillingAutoMappingWorkspaceRow({
      ledgerRowId: "be-1",
      encounterId: "e1",
      patientName: "Jean Dupont",
      patientMrn: "MRN-1",
      sourceType: "LAB",
      description: "CBC",
      suggestedCode: "85025",
      confidence: "HIGH",
      decision: "APPLY",
      manuallyEdited: false,
      doNotBill: false,
      metadata: {
        autoMappingApplied: {
          at: "2026-06-01T12:00:00.000Z",
          newCode: "85025",
          userId: "u1",
          source: "BULK_AUTO_MAPPING",
        },
      },
    });
    expect(row.queue).toBe(BILLING_AUTO_MAPPING_QUEUE.MAPPED);
    expect(row.appliedCode).toBe("85025");
  });

  it("workspace page route exists", () => {
    const page = readFileSync(
      join(import.meta.dirname, "../../../app/app/billing/auto-mapping/page.tsx"),
      "utf8"
    );
    expect(page).toContain("BillingAutoMappingWorkspace");
  });

  it("billing dashboard links to workspace", () => {
    const billingPage = readFileSync(
      join(import.meta.dirname, "../../../app/app/billing/page.tsx"),
      "utf8"
    );
    expect(billingPage).toContain("/app/billing/auto-mapping");
  });

  it("resolveBillingAutoMappingQueue never maps review to apply-ready", () => {
    expect(resolveBillingAutoMappingQueue({ decision: "REVIEW" })).toBe(
      BILLING_AUTO_MAPPING_QUEUE.REVIEW_REQUIRED
    );
  });
});

describe("billingAutoMappingWorkspace UI integration", () => {
  it("workspace exposes select all and bulk confirm modal", () => {
    const workspace = readFileSync(
      join(import.meta.dirname, "BillingAutoMappingWorkspace.tsx"),
      "utf8"
    );
    expect(workspace).toContain('data-testid="auto-mapping-select-all"');
    expect(workspace).toContain('data-testid="auto-mapping-bulk-confirm-modal"');
    expect(workspace).toContain("autoMappingWorkspaceBulkConfirmBody");
  });

  it("workspace API client calls bulk-apply endpoint", () => {
    const api = readFileSync(join(import.meta.dirname, "../../lib/billingAutoMappingApi.ts"), "utf8");
    expect(api).toContain("/billing/auto-mapping/workspace");
    expect(api).toContain("/billing/auto-mapping/bulk-apply");
  });

  it("charge review links to workspace", () => {
    const chargeReview = readFileSync(
      join(import.meta.dirname, "../../../app/app/billing/charge-review/page.tsx"),
      "utf8"
    );
    expect(chargeReview).toContain("charge-review-auto-mapping-workspace");
  });

  it("ledger links to workspace", () => {
    const ledger = readFileSync(
      join(import.meta.dirname, "../../../app/app/billing/encounters/[encounterId]/page.tsx"),
      "utf8"
    );
    expect(ledger).toContain("billing-ledger-auto-mapping-workspace");
  });
});
