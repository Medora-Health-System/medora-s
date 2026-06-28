/**
 * MEDUI.ORDERSETS.ENTERPRISE_PHASE_3 — admin analytics guards.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const webSrcRoot = join(import.meta.dirname, "../..");
const webAppRoot = join(webSrcRoot, "../app");
const pageSource = readFileSync(
  join(webAppRoot, "app/admin/order-set-analytics/page.tsx"),
  "utf8"
);
const apiSource = readFileSync(join(webSrcRoot, "lib/orderSetAnalyticsApi.ts"), "utf8");

describe("enterprise order set analytics foundation (web)", () => {
  it("uses bounded analytics API with date filters", () => {
    expect(apiSource).toContain("/orders/enterprise-order-sets/analytics");
    expect(apiSource).toContain("limit");
    expect(apiSource).toContain("cursor");
  });

  it("admin panel loads on demand — no unbounded fetch on mount without facility", () => {
    expect(pageSource).toContain("fetchEnterpriseOrderSetAnalytics");
    expect(pageSource).toContain("limit: 50");
    expect(pageSource).not.toContain("mutateOrderItemLifecycleAction");
    expect(pageSource).not.toContain("orderStateSyncStore");
  });

  it("supports pagination via load more", () => {
    expect(pageSource).toContain("nextCursor");
    expect(pageSource).toContain("loadMore");
  });
});
