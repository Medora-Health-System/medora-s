import { describe, expect, it } from "vitest";
import {
  BILLING_AUTO_MAPPING_QUEUE,
  buildBillingAutoMappingWorkspaceRow,
  computeBillingAutoMappingCounts,
  filterBillingAutoMappingWorkspaceRows,
  partitionBillingAutoMappingRows,
  resolveBillingAutoMappingQueue,
  readBillingAutoMappingAppliedMetadata,
} from "./billingAutoMappingWorkspace.js";

describe("billingAutoMappingWorkspace", () => {
  const baseRow = {
    ledgerRowId: "be-1",
    encounterId: "e1",
    patientName: "Jean Dupont",
    patientMrn: "MRN-1",
    sourceType: "LAB" as const,
    description: "CBC",
    suggestedCode: "85025",
    confidence: "HIGH" as const,
    decision: "APPLY" as const,
    manuallyEdited: false,
    doNotBill: false,
  };

  it("resolveBillingAutoMappingQueue maps APPLY to APPLY_READY", () => {
    expect(resolveBillingAutoMappingQueue({ decision: "APPLY" })).toBe(BILLING_AUTO_MAPPING_QUEUE.APPLY_READY);
  });

  it("resolveBillingAutoMappingQueue maps REVIEW to REVIEW_REQUIRED", () => {
    expect(resolveBillingAutoMappingQueue({ decision: "REVIEW" })).toBe(
      BILLING_AUTO_MAPPING_QUEUE.REVIEW_REQUIRED
    );
  });

  it("resolveBillingAutoMappingQueue maps SKIP to SKIPPED", () => {
    expect(resolveBillingAutoMappingQueue({ decision: "SKIP" })).toBe(BILLING_AUTO_MAPPING_QUEUE.SKIPPED);
  });

  it("resolveBillingAutoMappingQueue maps applied metadata to MAPPED", () => {
    expect(
      resolveBillingAutoMappingQueue({
        decision: "APPLY",
        metadata: { autoMappingApplied: { at: "2026-01-01T00:00:00.000Z" } },
      })
    ).toBe(BILLING_AUTO_MAPPING_QUEUE.MAPPED);
  });

  it("partitionBillingAutoMappingRows groups by queue", () => {
    const rows = [
      buildBillingAutoMappingWorkspaceRow(baseRow),
      buildBillingAutoMappingWorkspaceRow({ ...baseRow, ledgerRowId: "be-2", decision: "REVIEW" }),
      buildBillingAutoMappingWorkspaceRow({
        ...baseRow,
        ledgerRowId: "be-3",
        metadata: { autoMappingApplied: { newCode: "85025" } },
      }),
    ];
    const partitioned = partitionBillingAutoMappingRows(rows);
    expect(partitioned.APPLY_READY).toHaveLength(1);
    expect(partitioned.REVIEW_REQUIRED).toHaveLength(1);
    expect(partitioned.MAPPED).toHaveLength(1);
  });

  it("computeBillingAutoMappingCounts returns totals", () => {
    const rows = [
      buildBillingAutoMappingWorkspaceRow(baseRow),
      buildBillingAutoMappingWorkspaceRow({ ...baseRow, ledgerRowId: "be-2", decision: "SKIP" }),
    ];
    expect(computeBillingAutoMappingCounts(rows)).toEqual({
      applyReady: 1,
      reviewRequired: 0,
      skipped: 1,
      mapped: 0,
      total: 2,
    });
  });

  it("filterBillingAutoMappingWorkspaceRows searches patient and code", () => {
    const rows = [
      buildBillingAutoMappingWorkspaceRow(baseRow),
      buildBillingAutoMappingWorkspaceRow({
        ...baseRow,
        ledgerRowId: "be-2",
        patientName: "Marie Louis",
        suggestedCode: "80053",
      }),
    ];
    expect(filterBillingAutoMappingWorkspaceRows(rows, "85025")).toHaveLength(1);
    expect(filterBillingAutoMappingWorkspaceRows(rows, "marie")).toHaveLength(1);
  });

  it("readBillingAutoMappingAppliedMetadata extracts applied block", () => {
    const meta = readBillingAutoMappingAppliedMetadata({
      autoMappingApplied: { at: "2026-01-01", newCode: "85025", confidence: "HIGH" },
    });
    expect(meta?.newCode).toBe("85025");
  });
});
