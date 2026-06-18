import { describe, expect, it } from "vitest";
import {
  REVENUE_CLAIM_AUDIT_STATUS,
  buildRevenueClaimAudit,
  resolveRevenueClaimAuditSeverity,
  resolveRevenueClaimAuditStatus,
  resolveRevenueClaimCorrectionGuidance,
  sortRevenueClaimAuditTimelineNewestFirst,
} from "./revenueClaimAudit.js";

const baseInput = {
  claimId: "claim-1",
  encounterId: "enc-1",
  claimType: "PROFESSIONAL_837P",
  submissionStatus: "SENT",
  claimAmount: 1500,
  submittedAt: "2026-06-02T09:00:00.000Z",
  createdAt: "2026-06-01T10:00:00.000Z",
  updatedAt: "2026-06-02T10:00:00.000Z",
  externalReference: null,
  patientId: "pat-1",
  patientName: "Marie Joseph",
  mrn: "MRN-100",
  providerId: "prov-1",
  providerName: "Dr. Laurent",
  payerName: "Assurance Nationale",
  memberId: "MEM-1",
  statusTransitions: [
    { at: "2026-06-01T11:00:00.000Z", statusAfter: "GENERATED", message: null },
    { at: "2026-06-01T12:00:00.000Z", statusAfter: "READY_TO_SEND", message: null },
    { at: "2026-06-02T09:00:00.000Z", statusAfter: "SENT", message: null },
  ],
  attempts: [
    {
      attemptId: "att-1",
      transport: "MANUAL",
      ok: true,
      failureCode: null,
      errorMessage: null,
      retryEligible: false,
      createdAt: "2026-06-02T09:00:00.000Z",
    },
  ],
  acknowledgments: [],
  rejections: [],
  facilitySummary: {
    accepted: 1,
    rejected: 2,
    needsCorrection: 1,
    pendingAck: 3,
  },
};

describe("revenueClaimAudit (MEDUI.ADMIN.REVENUE.4)", () => {
  it("maps accepted submission status to ACCEPTED audit status", () => {
    expect(resolveRevenueClaimAuditStatus("ACCEPTED")).toBe(
      REVENUE_CLAIM_AUDIT_STATUS.ACCEPTED
    );
  });

  it("maps sent and ack pending to PENDING_ACK", () => {
    expect(resolveRevenueClaimAuditStatus("SENT")).toBe(
      REVENUE_CLAIM_AUDIT_STATUS.PENDING_ACK
    );
    expect(resolveRevenueClaimAuditStatus("ACK_PENDING")).toBe(
      REVENUE_CLAIM_AUDIT_STATUS.PENDING_ACK
    );
  });

  it("maps rejected to REVIEW_REQUIRED and needs correction to READY_FOR_RESUBMISSION", () => {
    expect(resolveRevenueClaimAuditStatus("REJECTED")).toBe(
      REVENUE_CLAIM_AUDIT_STATUS.REVIEW_REQUIRED
    );
    expect(resolveRevenueClaimAuditStatus("NEEDS_CORRECTION")).toBe(
      REVENUE_CLAIM_AUDIT_STATUS.READY_FOR_RESUBMISSION
    );
  });

  it("maps pre-submission statuses to INFO_ONLY", () => {
    expect(resolveRevenueClaimAuditStatus("READY_TO_SEND")).toBe(
      REVENUE_CLAIM_AUDIT_STATUS.INFO_ONLY
    );
    expect(resolveRevenueClaimAuditStatus("DRAFT")).toBe(
      REVENUE_CLAIM_AUDIT_STATUS.INFO_ONLY
    );
  });

  it("resolves severity from audit status", () => {
    expect(resolveRevenueClaimAuditSeverity(REVENUE_CLAIM_AUDIT_STATUS.ACCEPTED)).toBe(
      "success"
    );
    expect(resolveRevenueClaimAuditSeverity(REVENUE_CLAIM_AUDIT_STATUS.REVIEW_REQUIRED)).toBe(
      "critical"
    );
    expect(resolveRevenueClaimAuditSeverity(REVENUE_CLAIM_AUDIT_STATUS.PENDING_ACK)).toBe(
      "warning"
    );
    expect(resolveRevenueClaimAuditSeverity(REVENUE_CLAIM_AUDIT_STATUS.INFO_ONLY)).toBe("info");
  });

  it("provides correction guidance for known rejection codes", () => {
    expect(resolveRevenueClaimCorrectionGuidance("MISSING_DIAGNOSIS")).toContain("diagnosis");
    expect(resolveRevenueClaimCorrectionGuidance("SUBSCRIBER_MISMATCH")).toContain("subscriber");
    expect(resolveRevenueClaimCorrectionGuidance("INVALID_PAYER_ID")).toContain("payer");
  });

  it("builds audit DTO with computed status and links", () => {
    const audit = buildRevenueClaimAudit(baseInput);
    expect(audit.auditStatus).toBe(REVENUE_CLAIM_AUDIT_STATUS.PENDING_ACK);
    expect(audit.claim.claimId).toBe("claim-1");
    expect(audit.ledgerHref).toContain("enc-1");
    expect(audit.facilitySummary.pendingAck).toBe(3);
  });

  it("flags correction needed for rejected and needs correction claims", () => {
    expect(buildRevenueClaimAudit({ ...baseInput, submissionStatus: "REJECTED" }).correctionNeeded).toBe(
      true
    );
    expect(
      buildRevenueClaimAudit({ ...baseInput, submissionStatus: "NEEDS_CORRECTION" }).correctionNeeded
    ).toBe(true);
    expect(buildRevenueClaimAudit(baseInput).correctionNeeded).toBe(false);
  });

  it("sorts timeline newest first", () => {
    const audit = buildRevenueClaimAudit(baseInput);
    const sorted = sortRevenueClaimAuditTimelineNewestFirst(audit.timeline);
    expect(sorted[0]!.at >= sorted[sorted.length - 1]!.at).toBe(true);
  });

  it("includes attempt and acknowledgment timeline entries", () => {
    const audit = buildRevenueClaimAudit({
      ...baseInput,
      acknowledgments: [
        {
          ackId: "ack-1",
          kind: "277CA",
          statusCode: "CLAIM_REJECTED",
          message: "Subscriber mismatch",
          warningCode: null,
          receivedAt: "2026-06-02T11:00:00.000Z",
          lifecycleReason: "SUBSCRIBER_MISMATCH",
        },
      ],
      rejections: [
        {
          code: "CLAIM_REJECTED",
          description: "Subscriber mismatch",
          clearinghouseMessage: "Subscriber mismatch",
          correctionGuidance: "Verify subscriber",
          occurredAt: "2026-06-02T11:00:00.000Z",
        },
      ],
    });
    expect(audit.attemptHistory).toHaveLength(1);
    expect(audit.acknowledgmentHistory).toHaveLength(1);
    expect(audit.rejectionHistory).toHaveLength(1);
    expect(audit.timeline.some((entry) => entry.source === "acknowledgment")).toBe(true);
  });

  it("handles multiple submission attempts in attempt history", () => {
    const audit = buildRevenueClaimAudit({
      ...baseInput,
      attempts: [
        {
          attemptId: "att-2",
          transport: "MANUAL",
          ok: false,
          failureCode: "TRANSPORT_FAILED",
          errorMessage: "Timeout",
          retryEligible: true,
          createdAt: "2026-06-02T08:00:00.000Z",
        },
        ...baseInput.attempts,
      ],
    });
    expect(audit.attemptHistory).toHaveLength(2);
    expect(audit.attemptHistory[0]!.attemptId).toBe("att-1");
  });
});
