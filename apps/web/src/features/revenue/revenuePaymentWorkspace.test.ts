import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  REVENUE_PAYMENT_WORKSPACE_ROUTE,
  REVENUE_PAYMENT_WORKSPACE_FILTERS,
  REVENUE_PAYMENT_WORKSPACE_VIEWS,
  matchesRevenuePaymentFilter,
  revenuePaymentAuditHref,
} from "@/features/revenue/revenuePaymentNavigation";
import { REVENUE_PAYMENT_QUEUE } from "@medora/shared";

const webRoot = join(import.meta.dirname, "../../..");

function readWebFile(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("revenuePaymentWorkspace (MEDUI.ADMIN.REVENUE.5)", () => {
  it("defines six payment workspace views", () => {
    expect(REVENUE_PAYMENT_WORKSPACE_VIEWS).toHaveLength(6);
    expect(REVENUE_PAYMENT_WORKSPACE_VIEWS).toContain(REVENUE_PAYMENT_QUEUE.PAYMENT_PENDING);
    expect(REVENUE_PAYMENT_WORKSPACE_VIEWS).toContain(REVENUE_PAYMENT_QUEUE.DENIED);
  });

  it("defines quick filters including ALL", () => {
    expect(REVENUE_PAYMENT_WORKSPACE_FILTERS[0]).toBe("ALL");
    expect(REVENUE_PAYMENT_WORKSPACE_FILTERS).toHaveLength(7);
  });

  it("matches payment rows against filters", () => {
    expect(matchesRevenuePaymentFilter(REVENUE_PAYMENT_QUEUE.DENIED, "ALL")).toBe(true);
    expect(matchesRevenuePaymentFilter(REVENUE_PAYMENT_QUEUE.DENIED, "DENIED")).toBe(true);
    expect(matchesRevenuePaymentFilter(REVENUE_PAYMENT_QUEUE.DENIED, "UNDERPAID")).toBe(false);
  });

  it("routes workspace under admin revenue cycle payments", () => {
    expect(REVENUE_PAYMENT_WORKSPACE_ROUTE).toBe("/app/admin/revenue-cycle/payments");
    const workspace = readWebFile("src/features/revenue/RevenuePaymentWorkspace.tsx");
    expect(workspace).toContain("revenue-payment-workspace");
    expect(workspace).not.toContain("trackboard");
    expect(workspace).not.toContain("allEncounters");
  });

  it("builds audit href for claim drill-down", () => {
    expect(revenuePaymentAuditHref("claim-xyz")).toContain("claim-xyz");
  });

  it("workspace uses live payment fetch and filters", () => {
    const workspace = readWebFile("src/features/revenue/RevenuePaymentWorkspace.tsx");
    expect(workspace).toContain("fetchRevenuePaymentWorkspace");
    expect(workspace).toContain("revenue-payment-view-nav");
    expect(workspace).toContain("revenue-payment-quick-filters");
  });

  it("admin page links to payment workspace", () => {
    const admin = readWebFile("app/app/admin/page.tsx");
    expect(admin).toContain("/app/admin/revenue-cycle/payments");
    expect(admin).toContain("adminHub.revenuePaymentLink");
  });

  it("does not call payment mutation APIs", () => {
    const workspace = readWebFile("src/features/revenue/RevenuePaymentWorkspace.tsx");
    const api = readWebFile("src/features/revenue/revenuePaymentApi.ts");
    for (const source of [workspace, api]) {
      expect(source).not.toContain("postPayment");
      expect(source).not.toContain('method: "POST"');
      expect(source).not.toContain("writeOff");
    }
  });
});
