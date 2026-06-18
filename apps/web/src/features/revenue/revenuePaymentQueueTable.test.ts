import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = join(import.meta.dirname, "../../..");

function readWebFile(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("revenuePaymentQueueTable (MEDUI.ADMIN.REVENUE.5)", () => {
  it("renders required payment columns", () => {
    const table = readWebFile("src/features/revenue/RevenuePaymentQueueTable.tsx");
    expect(table).toContain("revenuePayment.table.patient");
    expect(table).toContain("revenuePayment.table.encounter");
    expect(table).toContain("revenuePayment.table.claim");
    expect(table).toContain("revenuePayment.table.payer");
    expect(table).toContain("revenuePayment.table.expectedAmount");
    expect(table).toContain("revenuePayment.table.paidAmount");
    expect(table).toContain("revenuePayment.table.variance");
    expect(table).toContain("revenuePayment.table.status");
    expect(table).toContain("revenuePayment.table.reconciliation");
  });

  it("shows denial visibility fields read-only", () => {
    const table = readWebFile("src/features/revenue/RevenuePaymentQueueTable.tsx");
    expect(table).toContain("revenuePayment.denial.code");
    expect(table).toContain("revenuePayment.denial.correctionRecommended");
    expect(table).toContain("revenue-payment-denial-");
    expect(table).not.toContain("postPayment");
  });

  it("shows reconciliation indicators", () => {
    const table = readWebFile("src/features/revenue/RevenuePaymentQueueTable.tsx");
    expect(table).toContain("REVENUE_PAYMENT_RECONCILIATION_I18N_KEYS");
    expect(table).toContain("revenue-payment-reconciliation-");
  });

  it("keeps view ledger and view audit actions only", () => {
    const table = readWebFile("src/features/revenue/RevenuePaymentQueueTable.tsx");
    expect(table).toContain("revenuePayment.actions.viewLedger");
    expect(table).toContain("revenuePayment.actions.viewAudit");
    expect(table).not.toContain("postPayment");
    expect(table).not.toContain("writeOff");
  });

  it("uses claim id row test ids", () => {
    const table = readWebFile("src/features/revenue/RevenuePaymentQueueTable.tsx");
    expect(table).toContain("revenue-payment-row-");
    expect(table).toContain("revenue-payment-variance-");
  });
});
