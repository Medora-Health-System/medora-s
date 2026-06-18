import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  REVENUE_CLAIM_SUBMISSION_WORKSPACE_ROUTE,
  REVENUE_CLAIM_WORKSPACE_FILTERS,
  REVENUE_CLAIM_WORKSPACE_VIEWS,
  matchesRevenueClaimFilter,
  revenueClaimLedgerHref,
  revenueClaimViewHref,
} from "@/features/revenue/revenueClaimSubmissionNavigation";
import { mapRevenueClaimApiRowToWorkspaceRow } from "@/features/revenue/revenueClaimSubmissionWorkspaceModels";
import { CLAIM_SUBMISSION_WORKSPACE_QUEUE } from "@medora/shared";

const webRoot = join(import.meta.dirname, "../../..");

function readWebFile(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("revenueClaimWorkspace (MEDUI.ADMIN.REVENUE.3)", () => {
  it("defines six claim submission workspace views", () => {
    expect(REVENUE_CLAIM_WORKSPACE_VIEWS).toHaveLength(6);
    expect(REVENUE_CLAIM_WORKSPACE_VIEWS).toContain(CLAIM_SUBMISSION_WORKSPACE_QUEUE.READY_TO_SEND);
    expect(REVENUE_CLAIM_WORKSPACE_VIEWS).toContain(CLAIM_SUBMISSION_WORKSPACE_QUEUE.NEEDS_CORRECTION);
  });

  it("defines quick filters including ALL and each queue", () => {
    expect(REVENUE_CLAIM_WORKSPACE_FILTERS[0]).toBe("ALL");
    expect(REVENUE_CLAIM_WORKSPACE_FILTERS).toHaveLength(7);
  });

  it("matches queue rows against quick filters", () => {
    expect(matchesRevenueClaimFilter(CLAIM_SUBMISSION_WORKSPACE_QUEUE.SENT, "ALL")).toBe(true);
    expect(matchesRevenueClaimFilter(CLAIM_SUBMISSION_WORKSPACE_QUEUE.SENT, "SENT")).toBe(true);
    expect(matchesRevenueClaimFilter(CLAIM_SUBMISSION_WORKSPACE_QUEUE.SENT, "REJECTED")).toBe(false);
  });

  it("routes workspace under administration revenue cycle claims", () => {
    expect(REVENUE_CLAIM_SUBMISSION_WORKSPACE_ROUTE).toBe("/app/admin/revenue-cycle/claims");
    const workspace = readWebFile("src/features/revenue/RevenueClaimSubmissionWorkspace.tsx");
    expect(workspace).toContain("revenue-claim-submission-workspace");
    expect(workspace).not.toContain("edLifecycle");
    expect(workspace).not.toContain("trackboard");
  });

  it("maps API row to workspace row with ledger and claim links", () => {
    const row = mapRevenueClaimApiRowToWorkspaceRow({
      encounterId: "enc-1",
      patientName: "Marie Joseph",
      mrn: "MRN-100",
      dateOfService: "2026-06-01T14:00:00.000Z",
      provider: "Dr. Laurent",
      claimId: "claim-abc",
      payer: "Assurance",
      submissionStatus: "SENT",
      submittedAt: "2026-06-02T09:00:00.000Z",
      ackStatus: null,
      lastUpdatedAt: "2026-06-02T10:00:00.000Z",
      queue: "SENT",
      ledgerHref: revenueClaimLedgerHref("enc-1"),
      claimHref: revenueClaimViewHref("enc-1", "claim-abc"),
    });
    expect(row.queue).toBe("SENT");
    expect(row.ledgerHref).toContain("enc-1");
    expect(row.claimHref).toContain("claim-abc");
  });

  it("workspace uses view nav, quick filters, and live fetch", () => {
    const workspace = readWebFile("src/features/revenue/RevenueClaimSubmissionWorkspace.tsx");
    expect(workspace).toContain("revenue-claim-view-nav");
    expect(workspace).toContain("revenue-claim-quick-filters");
    expect(workspace).toContain("fetchRevenueClaimSubmission");
  });

  it("admin page links to claim submission workspace", () => {
    const admin = readWebFile("app/app/admin/page.tsx");
    expect(admin).toContain("/app/admin/revenue-cycle/claims");
    expect(admin).toContain("adminHub.revenueClaimSubmissionLink");
  });

  it("does not call claim mutation APIs from workspace", () => {
    const workspace = readWebFile("src/features/revenue/RevenueClaimSubmissionWorkspace.tsx");
    const api = readWebFile("src/features/revenue/revenueClaimSubmissionApi.ts");
    for (const source of [workspace, api]) {
      expect(source).not.toContain("submitClaim");
      expect(source).not.toContain("retry");
      expect(source).not.toContain('method: "POST"');
    }
    expect(api).toContain("apiFetch");
  });
});
