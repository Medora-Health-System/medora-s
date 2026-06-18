import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isManualReviewBulkSelectable } from "./manualBillingReviewPartition";
import type { ManualReviewRow } from "./manualBillingReviewTypes";

const webRoot = join(import.meta.dirname, "../../..");

function readFile(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

function baseRow(overrides: Partial<ManualReviewRow> = {}): ManualReviewRow {
  return {
    encounterId: "e1",
    patientId: "p1",
    patientName: "Patient",
    orderItemId: "oi-1",
    medoraCode: "CODE",
    category: "MEDICATION",
    displayName: "Med",
    billingStatus: "candidate_only",
    reason: "review",
    createdAt: "2026-06-01T12:00:00.000Z",
    latestDecision: null,
    decisionAuditTrail: [],
    ...overrides,
  };
}

describe("manualBillingReviewReadOnlyApproved (MEDUI.BILLING.MANUAL_REVIEW.1)", () => {
  it("approved rows are not bulk selectable", () => {
    const approved = baseRow({
      latestDecision: {
        id: "d1",
        orderItemId: "oi-1",
        decision: "APPROVED",
        notes: null,
        reviewerId: "u1",
        reviewerName: "Reviewer",
        reviewedAt: "2026-06-02T12:00:00.000Z",
        billingEventId: null,
        createdAt: "2026-06-02T12:00:00.000Z",
        updatedAt: "2026-06-02T12:00:00.000Z",
      },
    });
    expect(isManualReviewBulkSelectable(approved)).toBe(false);
  });

  it("approved table mode is read-only without action buttons", () => {
    const workspace = readFile("src/features/billing/ManualBillingReviewWorkspace.tsx");
    const tableComponent = workspace.slice(
      workspace.indexOf("function ManualReviewRowTable"),
      workspace.indexOf("export function ManualBillingReviewWorkspace")
    );
    const approvedActionsBranch = tableComponent.slice(
      tableComponent.indexOf("<ManualReviewAuditTrail row={row}")
    );
    expect(approvedActionsBranch).toContain("ManualReviewAuditTrail");
    expect(approvedActionsBranch).not.toContain('t("billingPage.manualReviewApprove")');
    expect(approvedActionsBranch).not.toContain('onApprove?.(row)');
  });

  it("pending table keeps individual approve, needs info, and do not bill actions", () => {
    const workspace = readFile("src/features/billing/ManualBillingReviewWorkspace.tsx");
    const tableComponent = workspace.slice(
      workspace.indexOf("function ManualReviewRowTable"),
      workspace.indexOf("export function ManualBillingReviewWorkspace")
    );
    const pendingBranch = tableComponent.slice(tableComponent.indexOf('mode === "pending"'));
    expect(pendingBranch).toContain('t("billingPage.manualReviewApprove")');
    expect(pendingBranch).toContain('t("billingPage.manualReviewNeedsInfo")');
    expect(pendingBranch).toContain('t("billingPage.manualReviewDoNotBill")');
  });

  it("audit history remains visible for approved rows", () => {
    const workspace = readFile("src/features/billing/ManualBillingReviewWorkspace.tsx");
    expect(workspace).toContain("manualReviewAuditTrail");
    expect(workspace).toContain("manualReviewAuditBulkApproval");
    expect(workspace).toContain('entry.source === "BULK_APPROVAL"');
  });

  it("approved section is collapsible", () => {
    const workspace = readFile("src/features/billing/ManualBillingReviewWorkspace.tsx");
    expect(workspace).toContain("manualReviewApprovedSection");
    expect(workspace).toContain("<details");
    expect(workspace).toContain("approvedSectionOpen");
  });

  it("no claim submission or ledger mutation in workspace", () => {
    const workspace = readFile("src/features/billing/ManualBillingReviewWorkspace.tsx");
    expect(workspace).not.toContain("submitClaim");
    expect(workspace).not.toContain("ClaimSubmission");
    expect(workspace).not.toContain("/billing/ledger");
    expect(workspace).not.toContain("postPayment");
  });

  it("no ED lifecycle regression hooks", () => {
    const workspace = readFile("src/features/billing/ManualBillingReviewWorkspace.tsx");
    expect(workspace).not.toContain("edLifecycle");
    expect(workspace).not.toContain("trackboard");
  });
});
