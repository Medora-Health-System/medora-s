import { describe, expect, it } from "vitest";
import {
  CLAIM_SUBMISSION_WORKSPACE_QUEUE,
  buildRevenueClaimSubmissionRowDto,
  computeRevenueClaimSubmissionCounts,
  filterRevenueClaimSubmissionRows,
  resolveClaimSubmissionWorkspaceQueue,
  searchRevenueClaimSubmissionRows,
} from "./revenueClaimSubmission.js";

const baseRowInput = {
  encounterId: "enc-1",
  patientName: "Marie Joseph",
  mrn: "MRN-100",
  dateOfService: "2026-06-01T14:00:00.000Z",
  provider: "Dr. Laurent",
  claimId: "claim-abc-123",
  payer: "Assurance Nationale",
  submittedAt: null as string | null,
  ackStatus: null as string | null,
  lastUpdatedAt: "2026-06-02T10:00:00.000Z",
};

describe("revenueClaimSubmission (MEDUI.ADMIN.REVENUE.3)", () => {
  it("maps operational submission statuses to workspace queues", () => {
    for (const status of Object.values(CLAIM_SUBMISSION_WORKSPACE_QUEUE)) {
      expect(resolveClaimSubmissionWorkspaceQueue(status)).toBe(status);
    }
  });

  it("excludes DRAFT, GENERATED, and CANCELLED from workspace", () => {
    expect(resolveClaimSubmissionWorkspaceQueue("DRAFT")).toBeNull();
    expect(resolveClaimSubmissionWorkspaceQueue("GENERATED")).toBeNull();
    expect(resolveClaimSubmissionWorkspaceQueue("CANCELLED")).toBeNull();
  });

  it("normalizes status casing before resolving", () => {
    expect(resolveClaimSubmissionWorkspaceQueue("sent")).toBe("SENT");
    expect(resolveClaimSubmissionWorkspaceQueue(" Ack_Pending ")).toBe("ACK_PENDING");
  });

  it("returns null for unknown statuses", () => {
    expect(resolveClaimSubmissionWorkspaceQueue("UNKNOWN")).toBeNull();
    expect(resolveClaimSubmissionWorkspaceQueue("")).toBeNull();
  });

  it("builds row DTO with ledger and claim hrefs for workspace statuses", () => {
    const row = buildRevenueClaimSubmissionRowDto({
      ...baseRowInput,
      submissionStatus: "READY_TO_SEND",
    });
    expect(row).not.toBeNull();
    expect(row!.queue).toBe("READY_TO_SEND");
    expect(row!.ledgerHref).toBe("/app/billing/encounters/enc-1");
    expect(row!.claimHref).toContain("claimSubmission=claim-abc-123");
  });

  it("returns null when building row for excluded status", () => {
    expect(
      buildRevenueClaimSubmissionRowDto({ ...baseRowInput, submissionStatus: "DRAFT" })
    ).toBeNull();
  });

  it("computes counts per workspace queue", () => {
    const rows = [
      buildRevenueClaimSubmissionRowDto({ ...baseRowInput, submissionStatus: "SENT" })!,
      buildRevenueClaimSubmissionRowDto({
        ...baseRowInput,
        claimId: "claim-2",
        submissionStatus: "SENT",
      })!,
      buildRevenueClaimSubmissionRowDto({
        ...baseRowInput,
        claimId: "claim-3",
        submissionStatus: "REJECTED",
      })!,
    ];
    const counts = computeRevenueClaimSubmissionCounts(rows);
    expect(counts.SENT).toBe(2);
    expect(counts.REJECTED).toBe(1);
    expect(counts.READY_TO_SEND).toBe(0);
  });

  it("filters rows by queue", () => {
    const rows = [
      buildRevenueClaimSubmissionRowDto({ ...baseRowInput, submissionStatus: "SENT" })!,
      buildRevenueClaimSubmissionRowDto({
        ...baseRowInput,
        claimId: "claim-2",
        submissionStatus: "ACCEPTED",
      })!,
    ];
    const filtered = filterRevenueClaimSubmissionRows(rows, "SENT");
    expect(filtered).toHaveLength(1);
    expect(filtered[0]!.queue).toBe("SENT");
  });

  it("returns all rows when filter is ALL", () => {
    const rows = [
      buildRevenueClaimSubmissionRowDto({ ...baseRowInput, submissionStatus: "SENT" })!,
      buildRevenueClaimSubmissionRowDto({
        ...baseRowInput,
        claimId: "claim-2",
        submissionStatus: "ACCEPTED",
      })!,
    ];
    expect(filterRevenueClaimSubmissionRows(rows, "ALL")).toHaveLength(2);
  });

  it("searches by patient name", () => {
    const rows = [
      buildRevenueClaimSubmissionRowDto({ ...baseRowInput, submissionStatus: "SENT" })!,
      buildRevenueClaimSubmissionRowDto({
        ...baseRowInput,
        patientName: "Jean Paul",
        claimId: "claim-2",
        submissionStatus: "SENT",
      })!,
    ];
    const found = searchRevenueClaimSubmissionRows(rows, "jean");
    expect(found).toHaveLength(1);
    expect(found[0]!.patientName).toBe("Jean Paul");
  });

  it("searches by MRN and claim ID", () => {
    const row = buildRevenueClaimSubmissionRowDto({
      ...baseRowInput,
      submissionStatus: "ACK_PENDING",
    })!;
    expect(searchRevenueClaimSubmissionRows([row], "mrn-100")).toHaveLength(1);
    expect(searchRevenueClaimSubmissionRows([row], "claim-abc")).toHaveLength(1);
    expect(searchRevenueClaimSubmissionRows([row], "no-match")).toHaveLength(0);
  });

  it("search with empty needle returns all rows", () => {
    const row = buildRevenueClaimSubmissionRowDto({
      ...baseRowInput,
      submissionStatus: "NEEDS_CORRECTION",
    })!;
    expect(searchRevenueClaimSubmissionRows([row], "   ")).toHaveLength(1);
  });
});
