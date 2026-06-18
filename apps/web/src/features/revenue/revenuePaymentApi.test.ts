import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { fetchRevenuePaymentWorkspace } from "@/features/revenue/revenuePaymentApi";

const webRoot = join(import.meta.dirname, "../../..");

function readWebFile(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("revenuePaymentApi (MEDUI.ADMIN.REVENUE.5)", () => {
  it("fetch helper targets read-only payments endpoint", () => {
    const api = readWebFile("src/features/revenue/revenuePaymentApi.ts");
    expect(api).toContain("/billing/revenue-cycle/payments");
    expect(api).not.toContain('method: "POST"');
    expect(api).not.toContain("postPayment");
  });

  it("exports fetchRevenuePaymentWorkspace using apiFetch", () => {
    expect(typeof fetchRevenuePaymentWorkspace).toBe("function");
    const api = readWebFile("src/features/revenue/revenuePaymentApi.ts");
    expect(api).toContain("apiFetch");
  });

  it("supports queue and search query params", () => {
    const api = readWebFile("src/features/revenue/revenuePaymentApi.ts");
    expect(api).toContain('query.set("queue"');
    expect(api).toContain("search");
    expect(api).toContain("limit");
  });

  it("payment page route exists under admin", () => {
    const route = readWebFile("app/app/admin/revenue-cycle/payments/page.tsx");
    expect(route).toContain("RevenuePaymentWorkspace");
    expect(route).toContain("revenue-payment-access-denied");
  });

  it("maps API rows with claim label", () => {
    const api = readWebFile("src/features/revenue/revenuePaymentApi.ts");
    expect(api).toContain("claimLabel");
    expect(api).toContain("slice(0, 8)");
  });
});
