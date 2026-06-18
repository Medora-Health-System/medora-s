import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = join(import.meta.dirname, "../../..");
const apiRoot = join(import.meta.dirname, "../../../../api/src");
const sharedRoot = join(import.meta.dirname, "../../../../../packages/shared/src");

function readFile(relativePath: string, root = webRoot): string {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("revenuePaymentReadOnly (MEDUI.ADMIN.REVENUE.5)", () => {
  it("API controller exposes only GET payments", () => {
    const controller = readFile("billing/revenue-cycle-payments.controller.ts", apiRoot);
    expect(controller).toContain('@Get("billing/revenue-cycle/payments")');
    expect(controller).not.toContain("@Post");
    expect(controller).not.toContain("@Patch");
    expect(controller).not.toContain("postPayment");
  });

  it("payments service has no mutation paths", () => {
    const service = readFile("billing/revenue-cycle-payments.service.ts", apiRoot);
    expect(service).not.toContain(".create(");
    expect(service).not.toContain(".update(");
    expect(service).not.toContain(".delete(");
    expect(service).toContain("facilityId");
    expect(service).not.toContain("BillingService");
  });

  it("web fetch helper is read-only", () => {
    const api = readFile("src/features/revenue/revenuePaymentApi.ts");
    expect(api).not.toContain('method: "POST"');
    expect(api).not.toContain("ERA ingest");
    expect(api).not.toContain("writeOff");
  });

  it("workspace has no payment posting controls", () => {
    const workspace = readFile("src/features/revenue/RevenuePaymentWorkspace.tsx");
    expect(workspace).not.toContain("postPayment");
    expect(workspace).not.toContain("applyPayment");
    expect(workspace).toContain("revenue-payment-read-only-notice");
  });

  it("does not touch ED lifecycle modules", () => {
    const workspace = readFile("src/features/revenue/RevenuePaymentWorkspace.tsx");
    expect(workspace).not.toContain("edLifecycle");
    expect(workspace).not.toContain("trackboard");
    expect(workspace).not.toContain("incompleteCharts");
  });

  it("shared payment model is pure", () => {
    const shared = readFile("billing/revenuePaymentWorkspace.ts", sharedRoot);
    expect(shared).toContain("resolveRevenuePaymentQueue");
    expect(shared).toContain("buildRevenuePaymentProjection");
    expect(shared).not.toContain("fetch(");
    expect(shared).not.toContain("prisma");
  });

  it("EN and FR payment i18n keys exist", () => {
    const en = readFile("src/i18n/messages/en.ts");
    const fr = readFile("src/i18n/messages/fr.ts");
    expect(en).toContain("revenuePayment:");
    expect(fr).toContain("revenuePayment:");
    for (const key of ["paymentPending", "denied", "underpaid", "reconciliationRequired"]) {
      expect(en).toContain(`${key}:`);
      expect(fr).toContain(`${key}:`);
    }
  });

  it("reconciliation statuses are display-only", () => {
    const table = readFile("src/features/revenue/RevenuePaymentQueueTable.tsx");
    const navigation = readFile("src/features/revenue/revenuePaymentNavigation.ts");
    expect(table).toContain("REVENUE_PAYMENT_RECONCILIATION_I18N_KEYS");
    expect(navigation).toContain("BALANCED");
    expect(navigation).toContain("VARIANCE_FOUND");
    expect(navigation).toContain("NEEDS_REVIEW");
    expect(table).not.toContain("postReconciliation");
  });
});
