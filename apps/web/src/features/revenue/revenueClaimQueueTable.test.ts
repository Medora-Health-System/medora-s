import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = join(import.meta.dirname, "../../..");

function readWebFile(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("revenueClaimQueueTable (MEDUI.ADMIN.REVENUE.3)", () => {
  it("renders required columns", () => {
    const table = readWebFile("src/features/revenue/RevenueClaimQueueTable.tsx");
    expect(table).toContain("revenueClaimSubmission.table.patient");
    expect(table).toContain("revenueClaimSubmission.table.mrn");
    expect(table).toContain("revenueClaimSubmission.table.dos");
    expect(table).toContain("revenueClaimSubmission.table.provider");
    expect(table).toContain("revenueClaimSubmission.table.payer");
    expect(table).toContain("revenueClaimSubmission.table.claimId");
    expect(table).toContain("revenueClaimSubmission.table.submissionStatus");
    expect(table).toContain("revenueClaimSubmission.table.lastUpdated");
  });

  it("exposes View Ledger and View Claim actions only", () => {
    const table = readWebFile("src/features/revenue/RevenueClaimQueueTable.tsx");
    expect(table).toContain("revenueClaimSubmission.actions.viewLedger");
    expect(table).toContain("revenueClaimSubmission.actions.viewClaim");
    expect(table).not.toContain("submit");
    expect(table).not.toContain("retry");
    expect(table).not.toContain("resend");
  });

  it("uses claim id as row key and test ids", () => {
    const table = readWebFile("src/features/revenue/RevenueClaimQueueTable.tsx");
    expect(table).toContain("revenue-claim-row-");
    expect(table).toContain("revenue-claim-ledger-");
    expect(table).toContain("revenue-claim-view-");
  });

  it("wraps table in test id container", () => {
    const table = readWebFile("src/features/revenue/RevenueClaimQueueTable.tsx");
    expect(table).toContain('data-testid="revenue-claim-queue-table"');
  });

  it("formats submission status via i18n keys", () => {
    const table = readWebFile("src/features/revenue/RevenueClaimQueueTable.tsx");
    expect(table).toContain("revenueClaimSubmission.submissionStatus.");
  });
});
