import { describe, expect, it } from "vitest";
import { analyzeLabRadWorklistOperationalRow } from "@/features/orders/labRadiologyOperationalEscalationUi";
import { pairPassesLabRadOperationalFilters } from "./worklistLabRadOperational";

describe("worklistLabRadOperational", () => {
  it("passes escalation filter when critical delay", () => {
    const row = analyzeLabRadWorklistOperationalRow({
      domain: "LAB",
      order: { id: "o", createdAt: "2026-05-16T02:00:00.000Z", type: "LAB" },
      item: { id: "i", status: "PLACED", createdAt: "2026-05-16T02:05:00.000Z" },
      now: new Date("2026-05-16T14:00:00.000Z"),
    });
    expect(
      pairPassesLabRadOperationalFilters(row, {
        needsReconciliation: false,
        adjustedTime: false,
        delayedWorkflow: false,
        needsEscalation: false,
        criticalDelay: true,
        awaitingResultOrFinalization: false,
        awaitingAcknowledgement: false,
        shiftHandoffReview: false,
        adjustedReconciled: false,
      })
    ).toBe(row.escalation.agingBucket === "CRITICAL_DELAY");
  });
});
