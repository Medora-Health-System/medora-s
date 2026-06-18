import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  REVENUE_CYCLE_WORKSPACE_ROUTE,
  REVENUE_WORKSPACE_FILTERS,
  REVENUE_WORKSPACE_VIEWS,
  matchesRevenueCycleFilter,
  revenueCycleLedgerHref,
} from "@/features/revenue/revenueCycleNavigation";
import {
  buildRevenueCyclePlaceholderRows,
  projectRevenueCycleRowFromBillingQueueSource,
} from "@/features/revenue/revenueCycleWorkspaceModels";
import { REVENUE_CYCLE_QUEUE } from "@medora/shared";

const webRoot = join(import.meta.dirname, "../../..");

function readWebFile(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("revenueCycleWorkspace (MEDUI.ADMIN.REVENUE.1)", () => {
  it("defines five revenue workspace views", () => {
    expect(REVENUE_WORKSPACE_VIEWS).toHaveLength(5);
    expect(REVENUE_WORKSPACE_VIEWS).toContain(REVENUE_CYCLE_QUEUE.READY_FOR_BILLING);
    expect(REVENUE_WORKSPACE_VIEWS).toContain(REVENUE_CYCLE_QUEUE.CLAIM_PAID);
  });

  it("defines quick filters including ALL and each queue", () => {
    expect(REVENUE_WORKSPACE_FILTERS[0]).toBe("ALL");
    expect(REVENUE_WORKSPACE_FILTERS).toHaveLength(6);
  });

  it("matches queue rows against quick filters", () => {
    expect(matchesRevenueCycleFilter(REVENUE_CYCLE_QUEUE.BILLING_DEFICIENCY, "ALL")).toBe(true);
    expect(
      matchesRevenueCycleFilter(REVENUE_CYCLE_QUEUE.BILLING_DEFICIENCY, REVENUE_CYCLE_QUEUE.BILLING_DEFICIENCY)
    ).toBe(true);
    expect(
      matchesRevenueCycleFilter(REVENUE_CYCLE_QUEUE.BILLING_DEFICIENCY, REVENUE_CYCLE_QUEUE.CLAIM_PAID)
    ).toBe(false);
  });

  it("routes workspace under administration, not ED lifecycle", () => {
    expect(REVENUE_CYCLE_WORKSPACE_ROUTE).toBe("/app/admin/revenue-cycle");
    const workspace = readWebFile("src/features/revenue/RevenueCycleWorkspace.tsx");
    expect(workspace).toContain("revenue-cycle-workspace");
    expect(workspace).not.toContain("edLifecycle");
    expect(workspace).not.toContain("allEncounters");
  });

  it("projects billing queue source into revenue row with ledger link", () => {
    const row = projectRevenueCycleRowFromBillingQueueSource({
      id: "enc-proj-1",
      createdAt: "2026-06-01T10:00:00.000Z",
      billingReadiness: { isReady: false },
      diagnosisCount: 0,
      patient: { firstName: "A", lastName: "B", mrn: "MRN-1" },
    });
    expect(row.queue).toBe(REVENUE_CYCLE_QUEUE.BILLING_DEFICIENCY);
    expect(row.ledgerHref).toBe(revenueCycleLedgerHref("enc-proj-1"));
  });

  it("placeholder rows cover each revenue queue", () => {
    const rows = buildRevenueCyclePlaceholderRows();
    const queues = new Set(rows.map((row) => row.queue));
    for (const view of REVENUE_WORKSPACE_VIEWS) {
      expect(queues.has(view)).toBe(true);
    }
  });

  it("workspace shell uses view nav and quick filters", () => {
    const workspace = readWebFile("src/features/revenue/RevenueCycleWorkspace.tsx");
    expect(workspace).toContain("revenue-cycle-view-nav");
    expect(workspace).toContain("revenue-cycle-quick-filters");
    expect(workspace).toContain("buildRevenueCyclePlaceholderRows");
  });

  it("admin page links to revenue cycle workspace", () => {
    const admin = readWebFile("app/app/admin/page.tsx");
    expect(admin).toContain("/app/admin/revenue-cycle");
    expect(admin).toContain("adminHub.revenueCycleLink");
  });

  it("does not call billing mutation APIs from workspace shell", () => {
    const workspace = readWebFile("src/features/revenue/RevenueCycleWorkspace.tsx");
    const models = readWebFile("src/features/revenue/revenueCycleWorkspaceModels.ts");
    for (const source of [workspace, models]) {
      expect(source).not.toContain("finalize");
      expect(source).not.toContain("submitClaim");
      expect(source).not.toContain('method: "POST"');
      expect(source).not.toContain("apiFetch");
    }
  });

  it("does not mutate encounters from revenue workspace", () => {
    const workspace = readWebFile("src/features/revenue/RevenueCycleWorkspace.tsx");
    expect(workspace).not.toContain("PATCH");
    expect(workspace).not.toContain("DELETE");
    expect(workspace).not.toContain("/encounters/");
  });
});
