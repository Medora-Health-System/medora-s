import { describe, expect, it } from "vitest";
import { buildRevenueCycleQueueCounts, formatRevenueCycleQueueCountLabel } from "@/features/revenue/revenueCycleQueueCounts";
import { REVENUE_CYCLE_QUEUE } from "@medora/shared";

describe("revenueCycleQueueCounts (MEDUI.ADMIN.REVENUE.2)", () => {
  it("renders queue counts from API payload", () => {
    const counts = buildRevenueCycleQueueCounts({
      READY_FOR_BILLING: 3,
      BILLING_DEFICIENCY: 2,
      CODING_REVIEW: 1,
      CLAIM_SUBMITTED: 4,
      CLAIM_PAID: 5,
    });
    expect(counts.CLAIM_PAID).toBe(5);
    expect(formatRevenueCycleQueueCountLabel(REVENUE_CYCLE_QUEUE.READY_FOR_BILLING, 3, "Ready")).toBe(
      "Ready (3)"
    );
  });

  it("defaults missing counts to zero", () => {
    const counts = buildRevenueCycleQueueCounts(null);
    expect(counts.READY_FOR_BILLING).toBe(0);
    expect(counts.CODING_REVIEW).toBe(0);
  });
});
