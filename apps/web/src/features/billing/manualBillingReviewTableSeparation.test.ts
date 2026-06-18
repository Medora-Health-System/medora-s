import { describe, expect, it } from "vitest";
import {
  filterManualReviewByCategory,
  isManualReviewApproved,
  partitionManualReviewRows,
} from "./manualBillingReviewPartition";
import type { ManualReviewRow } from "./manualBillingReviewTypes";

function row(partial: Partial<ManualReviewRow> & Pick<ManualReviewRow, "orderItemId">): ManualReviewRow {
  return {
    encounterId: "e1",
    patientId: "p1",
    patientName: "Test Patient",
    medoraCode: "CODE",
    category: "MEDICATION",
    displayName: "Med",
    billingStatus: "candidate_only",
    reason: "review",
    createdAt: "2026-06-01T12:00:00.000Z",
    latestDecision: null,
    decisionAuditTrail: [],
    ...partial,
  };
}

describe("manualBillingReviewTableSeparation (MEDUI.BILLING.MANUAL_REVIEW.1)", () => {
  it("pending table shows unapproved only", () => {
    const rows = [
      row({ orderItemId: "oi-1" }),
      row({
        orderItemId: "oi-2",
        latestDecision: {
          id: "d1",
          orderItemId: "oi-2",
          decision: "APPROVED",
          notes: null,
          reviewerId: "u1",
          reviewerName: "Reviewer",
          reviewedAt: "2026-06-02T12:00:00.000Z",
          billingEventId: null,
          createdAt: "2026-06-02T12:00:00.000Z",
          updatedAt: "2026-06-02T12:00:00.000Z",
        },
      }),
      row({
        orderItemId: "oi-3",
        latestDecision: {
          id: "d2",
          orderItemId: "oi-3",
          decision: "NEEDS_INFO",
          notes: "more info",
          reviewerId: "u1",
          reviewerName: "Reviewer",
          reviewedAt: "2026-06-02T12:00:00.000Z",
          billingEventId: null,
          createdAt: "2026-06-02T12:00:00.000Z",
          updatedAt: "2026-06-02T12:00:00.000Z",
        },
      }),
    ];
    const { pending, approved } = partitionManualReviewRows(rows);
    expect(pending.map((r) => r.orderItemId)).toEqual(["oi-1", "oi-3"]);
    expect(approved.map((r) => r.orderItemId)).toEqual(["oi-2"]);
  });

  it("approved table shows approved only", () => {
    const approvedRow = row({
      orderItemId: "oi-approved",
      latestDecision: {
        id: "d1",
        orderItemId: "oi-approved",
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
    expect(isManualReviewApproved(approvedRow)).toBe(true);
    const { approved } = partitionManualReviewRows([approvedRow, row({ orderItemId: "oi-pending" })]);
    expect(approved).toHaveLength(1);
    expect(approved[0]?.orderItemId).toBe("oi-approved");
  });

  it("category filter supports medication, lab, imaging, and care", () => {
    const rows = [
      row({ orderItemId: "m1", category: "MEDICATION" }),
      row({ orderItemId: "l1", category: "LAB" }),
      row({ orderItemId: "i1", category: "IMAGING" }),
      row({ orderItemId: "c1", category: "CARE" }),
    ];
    expect(filterManualReviewByCategory(rows, "MEDICATION").map((r) => r.orderItemId)).toEqual(["m1"]);
    expect(filterManualReviewByCategory(rows, "LAB").map((r) => r.orderItemId)).toEqual(["l1"]);
    expect(filterManualReviewByCategory(rows, "IMAGING").map((r) => r.orderItemId)).toEqual(["i1"]);
    expect(filterManualReviewByCategory(rows, "CARE").map((r) => r.orderItemId)).toEqual(["c1"]);
    expect(filterManualReviewByCategory(rows, "ALL")).toHaveLength(4);
  });
});
