import { describe, expect, it } from "vitest";
import {
  buildRevenueCycleQueueRowDto,
  computeRevenueCycleQueueCounts,
  filterRevenueCycleQueueRows,
  mapClaimSubmissionStatusesToRevenueClaimStatus,
  mapClaimSubmissionStatusesToRevenuePaymentStatus,
  searchRevenueCycleQueueRows,
} from "./revenueCycleQueue.js";
import { REVENUE_CYCLE_QUEUE } from "./revenueCycleClassification.js";

describe("revenueCycleQueue (MEDUI.ADMIN.REVENUE.2)", () => {
  it("maps accepted claims to paid revenue status", () => {
    expect(mapClaimSubmissionStatusesToRevenueClaimStatus(["ACCEPTED"])).toBe("PAID");
    expect(mapClaimSubmissionStatusesToRevenuePaymentStatus(["ACCEPTED"])).toBe("POSTED");
  });

  it("maps sent claims to submitted revenue status", () => {
    expect(mapClaimSubmissionStatusesToRevenueClaimStatus(["SENT"])).toBe("SUBMITTED");
    expect(mapClaimSubmissionStatusesToRevenuePaymentStatus(["SENT"])).toBe("NOT_POSTED");
  });

  it("builds queue row dto with classification and ledger href", () => {
    const row = buildRevenueCycleQueueRowDto({
      encounterId: "enc-1",
      patientName: "Marie Joseph",
      mrn: "MRN-1",
      dateOfService: "2026-06-01T10:00:00.000Z",
      provider: "Dr. Laurent",
      billingReady: true,
      codingReady: false,
      claimStatus: "NOT_SUBMITTED",
      paymentStatus: "NOT_POSTED",
      manualReviewStatus: "RESOLVED",
    });
    expect(row.queue).toBe(REVENUE_CYCLE_QUEUE.CODING_REVIEW);
    expect(row.ledgerHref).toBe("/app/billing/encounters/enc-1");
  });

  it("filters rows by queue", () => {
    const rows = [
      buildRevenueCycleQueueRowDto({
        encounterId: "enc-1",
        patientName: "A",
        mrn: null,
        dateOfService: null,
        provider: null,
        billingReady: false,
        codingReady: false,
        claimStatus: "NOT_SUBMITTED",
        paymentStatus: "NOT_POSTED",
        manualReviewStatus: "UNRESOLVED",
      }),
      buildRevenueCycleQueueRowDto({
        encounterId: "enc-2",
        patientName: "B",
        mrn: null,
        dateOfService: null,
        provider: null,
        billingReady: true,
        codingReady: true,
        claimStatus: "NOT_SUBMITTED",
        paymentStatus: "NOT_POSTED",
        manualReviewStatus: "RESOLVED",
      }),
    ];
    expect(filterRevenueCycleQueueRows(rows, REVENUE_CYCLE_QUEUE.BILLING_DEFICIENCY)).toHaveLength(1);
    expect(filterRevenueCycleQueueRows(rows, "ALL")).toHaveLength(2);
  });

  it("searches rows by patient, mrn, or encounter id", () => {
    const rows = [
      buildRevenueCycleQueueRowDto({
        encounterId: "enc-search-1",
        patientName: "Jean Paul",
        mrn: "MRN-200",
        dateOfService: null,
        provider: null,
        billingReady: true,
        codingReady: true,
        claimStatus: "NOT_SUBMITTED",
        paymentStatus: "NOT_POSTED",
        manualReviewStatus: "RESOLVED",
      }),
    ];
    expect(searchRevenueCycleQueueRows(rows, "mrn-200")).toHaveLength(1);
    expect(searchRevenueCycleQueueRows(rows, "enc-search")).toHaveLength(1);
    expect(searchRevenueCycleQueueRows(rows, "nobody")).toHaveLength(0);
  });

  it("computes queue counts from projected rows", () => {
    const rows = [
      buildRevenueCycleQueueRowDto({
        encounterId: "enc-1",
        patientName: "A",
        mrn: null,
        dateOfService: null,
        provider: null,
        billingReady: true,
        codingReady: true,
        claimStatus: "NOT_SUBMITTED",
        paymentStatus: "NOT_POSTED",
        manualReviewStatus: "RESOLVED",
      }),
      buildRevenueCycleQueueRowDto({
        encounterId: "enc-2",
        patientName: "B",
        mrn: null,
        dateOfService: null,
        provider: null,
        billingReady: false,
        codingReady: false,
        claimStatus: "NOT_SUBMITTED",
        paymentStatus: "NOT_POSTED",
        manualReviewStatus: "UNRESOLVED",
      }),
    ];
    const counts = computeRevenueCycleQueueCounts(rows);
    expect(counts.READY_FOR_BILLING).toBe(1);
    expect(counts.BILLING_DEFICIENCY).toBe(1);
  });
});
