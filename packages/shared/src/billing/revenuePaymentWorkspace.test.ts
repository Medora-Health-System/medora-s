import { describe, expect, it } from "vitest";
import {
  REVENUE_PAYMENT_QUEUE,
  buildRevenuePaymentProjection,
  computeRevenuePaymentCounts,
  filterRevenuePaymentRows,
  resolveRevenuePaymentCorrectionGuidance,
  resolveRevenuePaymentQueue,
  resolveRevenuePaymentReconciliationStatus,
  searchRevenuePaymentRows,
} from "./revenuePaymentWorkspace.js";

const baseInput = {
  encounterId: "enc-1",
  patientName: "Marie Joseph",
  mrn: "MRN-100",
  claimId: "claim-1",
  payer: "Assurance",
  expectedAmount: 200,
  paidAmountHint: null as number | null,
  denialCode: null as string | null,
  denialDescription: null as string | null,
};

describe("revenuePaymentWorkspace (MEDUI.ADMIN.REVENUE.5)", () => {
  it("maps pending submission statuses to PAYMENT_PENDING", () => {
    expect(
      resolveRevenuePaymentQueue({
        submissionStatus: "SENT",
        expectedAmount: 200,
        paidAmount: null,
      })
    ).toBe(REVENUE_PAYMENT_QUEUE.PAYMENT_PENDING);
    expect(
      resolveRevenuePaymentQueue({
        submissionStatus: "ACK_PENDING",
        expectedAmount: 200,
        paidAmount: null,
      })
    ).toBe(REVENUE_PAYMENT_QUEUE.PAYMENT_PENDING);
  });

  it("maps rejected claims to DENIED", () => {
    expect(
      resolveRevenuePaymentQueue({
        submissionStatus: "REJECTED",
        expectedAmount: 200,
        paidAmount: 0,
      })
    ).toBe(REVENUE_PAYMENT_QUEUE.DENIED);
  });

  it("maps needs correction to RECONCILIATION_REQUIRED", () => {
    expect(
      resolveRevenuePaymentQueue({
        submissionStatus: "NEEDS_CORRECTION",
        expectedAmount: 200,
        paidAmount: 0,
      })
    ).toBe(REVENUE_PAYMENT_QUEUE.RECONCILIATION_REQUIRED);
  });

  it("maps accepted full payment to PAYMENT_RECEIVED", () => {
    expect(
      resolveRevenuePaymentQueue({
        submissionStatus: "ACCEPTED",
        expectedAmount: 200,
        paidAmount: 200,
      })
    ).toBe(REVENUE_PAYMENT_QUEUE.PAYMENT_RECEIVED);
  });

  it("maps accepted partial payment to UNDERPAID", () => {
    expect(
      resolveRevenuePaymentQueue({
        submissionStatus: "ACCEPTED",
        expectedAmount: 200,
        paidAmount: 120,
      })
    ).toBe(REVENUE_PAYMENT_QUEUE.UNDERPAID);
  });

  it("maps accepted payment without charges to UNAPPLIED_PAYMENT", () => {
    expect(
      resolveRevenuePaymentQueue({
        submissionStatus: "ACCEPTED",
        expectedAmount: 0,
        paidAmount: 50,
      })
    ).toBe(REVENUE_PAYMENT_QUEUE.UNAPPLIED_PAYMENT);
  });

  it("excludes pre-payment submission statuses", () => {
    expect(
      resolveRevenuePaymentQueue({
        submissionStatus: "READY_TO_SEND",
        expectedAmount: 200,
        paidAmount: null,
      })
    ).toBeNull();
  });

  it("builds payment projection with variance and links", () => {
    const row = buildRevenuePaymentProjection({
      ...baseInput,
      submissionStatus: "ACCEPTED",
    });
    expect(row).not.toBeNull();
    expect(row!.paidAmount).toBe(200);
    expect(row!.variance).toBe(0);
    expect(row!.queue).toBe(REVENUE_PAYMENT_QUEUE.PAYMENT_RECEIVED);
    expect(row!.auditHref).toContain("claim-1");
  });

  it("builds denial projection with correction guidance", () => {
    const row = buildRevenuePaymentProjection({
      ...baseInput,
      submissionStatus: "REJECTED",
      denialCode: "SUBSCRIBER_MISMATCH",
      denialDescription: "Subscriber mismatch",
    });
    expect(row!.queue).toBe(REVENUE_PAYMENT_QUEUE.DENIED);
    expect(row!.correctionRecommended).toContain("subscriber");
    expect(row!.reconciliationStatus).toBe("NEEDS_REVIEW");
  });

  it("resolves reconciliation status for variance", () => {
    expect(
      resolveRevenuePaymentReconciliationStatus({
        submissionStatus: "ACCEPTED",
        expectedAmount: 200,
        variance: 25,
      })
    ).toBe("VARIANCE_FOUND");
    expect(
      resolveRevenuePaymentReconciliationStatus({
        submissionStatus: "ACCEPTED",
        expectedAmount: 200,
        variance: 0,
      })
    ).toBe("BALANCED");
  });

  it("computes queue counts", () => {
    const rows = [
      buildRevenuePaymentProjection({ ...baseInput, submissionStatus: "SENT" })!,
      buildRevenuePaymentProjection({
        ...baseInput,
        claimId: "claim-2",
        submissionStatus: "ACCEPTED",
      })!,
    ];
    const counts = computeRevenuePaymentCounts(rows);
    expect(counts.PAYMENT_PENDING).toBe(1);
    expect(counts.PAYMENT_RECEIVED).toBe(1);
  });

  it("filters and searches payment rows", () => {
    const rows = [
      buildRevenuePaymentProjection({ ...baseInput, submissionStatus: "SENT" })!,
      buildRevenuePaymentProjection({
        ...baseInput,
        patientName: "Jean Paul",
        claimId: "claim-2",
        submissionStatus: "REJECTED",
        denialCode: "CLAIM_REJECTED",
      })!,
    ];
    expect(filterRevenuePaymentRows(rows, "DENIED")).toHaveLength(1);
    expect(searchRevenuePaymentRows(rows, "jean")).toHaveLength(1);
    expect(searchRevenuePaymentRows(rows, "claim-1")).toHaveLength(1);
  });

  it("provides correction guidance for known denial codes", () => {
    expect(resolveRevenuePaymentCorrectionGuidance("INVALID_PAYER_ID")).toContain("payer");
    expect(resolveRevenuePaymentCorrectionGuidance("MISSING_DIAGNOSIS")).toContain("diagnosis");
  });
});
