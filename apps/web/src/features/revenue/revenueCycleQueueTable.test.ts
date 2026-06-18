import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { revenueCycleLedgerHref } from "@/features/revenue/revenueCycleNavigation";
import { buildRevenueCyclePlaceholderRows } from "@/features/revenue/revenueCycleWorkspaceModels";

const webRoot = join(import.meta.dirname, "../../..");

function readWebFile(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("revenueCycleQueueTable (MEDUI.ADMIN.REVENUE.1)", () => {
  const rows = buildRevenueCyclePlaceholderRows();

  it("renders required table columns", () => {
    const table = readWebFile("src/features/revenue/RevenueCycleQueueTable.tsx");
    expect(table).toContain("revenueCycle.table.encounter");
    expect(table).toContain("revenueCycle.table.patient");
    expect(table).toContain("revenueCycle.table.mrn");
    expect(table).toContain("revenueCycle.table.dos");
    expect(table).toContain("revenueCycle.table.provider");
    expect(table).toContain("revenueCycle.table.queue");
    expect(table).toContain("revenueCycle.table.billingStatus");
    expect(table).toContain("revenueCycle.table.codingStatus");
    expect(table).toContain("revenueCycle.table.claimStatus");
    expect(table).toContain("revenueCycle.table.actions");
  });

  it("exposes only View Ledger action", () => {
    const table = readWebFile("src/features/revenue/RevenueCycleQueueTable.tsx");
    expect(table).toContain("revenueCycle.actions.viewLedger");
    expect(table).not.toContain("submit");
    expect(table).not.toContain("finalize");
    expect(table).not.toContain("POST");
  });

  it("preserves billing ledger deep links", () => {
    const table = readWebFile("src/features/revenue/RevenueCycleQueueTable.tsx");
    expect(table).toContain("row.ledgerHref");
    expect(table).toContain("revenue-cycle-ledger-");
    expect(rows[0]?.ledgerHref).toBe(revenueCycleLedgerHref(rows[0]!.encounterId));
  });

  it("uses i18n for queue labels", () => {
    const table = readWebFile("src/features/revenue/RevenueCycleQueueTable.tsx");
    expect(table).toContain("REVENUE_WORKSPACE_VIEW_I18N_KEYS");
  });

  it("shows empty state when no rows", () => {
    const table = readWebFile("src/features/revenue/RevenueCycleQueueTable.tsx");
    expect(table).toContain("revenueCycle.table.empty");
  });

  it("is read-only with no coding or billing edit controls", () => {
    const table = readWebFile("src/features/revenue/RevenueCycleQueueTable.tsx");
    expect(table).not.toContain("onSubmit");
    expect(table).not.toContain("onChange");
    expect(table).not.toContain("charge-review");
    expect(table).not.toContain("coding-review");
  });

  it("assigns stable row test ids", () => {
    const table = readWebFile("src/features/revenue/RevenueCycleQueueTable.tsx");
    expect(table).toContain("revenue-cycle-row-");
    expect(table).toContain("revenue-cycle-queue-");
  });
});
