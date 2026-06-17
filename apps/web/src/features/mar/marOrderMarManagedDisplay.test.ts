import { describe, expect, it } from "vitest";
import { shouldSkipOrderLineCompletionForMar } from "@medora/shared";
import { resolveMedicationOrderMarStatusLabel } from "@/features/emergency/medicationOrderMarExecutionPolicy";
import { isOrderItemPendingNurseMedication } from "@/lib/nurseMedicationWorkload";

const tr = (key: string) => key;

describe("marOrderMarManagedDisplay (H9J.1)", () => {
  it("recurring active order displays MAR-managed label", () => {
    expect(
      resolveMedicationOrderMarStatusLabel(
        "ACKNOWLEDGED",
        { active: null, lastCompleted: null },
        tr
      )
    ).toBe("erEmergencyOrders.marStatusMarManaged");
    expect(
      resolveMedicationOrderMarStatusLabel(
        "IN_PROGRESS",
        { active: null, lastCompleted: null },
        tr
      )
    ).toBe("erEmergencyOrders.marStatusActiveMarManaged");
  });

  it("one-time completed order can move to completed on MAR", () => {
    expect(
      resolveMedicationOrderMarStatusLabel(
        "COMPLETED",
        { active: null, lastCompleted: null },
        tr
      )
    ).toBe("erEmergencyOrders.marStatusCompletedOnMar");
    expect(
      shouldSkipOrderLineCompletionForMar({
        frequencyCode: "ONCE",
        directionsSig: "once now",
        orderRoute: "IV",
        doseGatedMarPathUsed: false,
      })
    ).toBe(false);
  });

  it("PRN order remains active after administration in workload", () => {
    expect(
      shouldSkipOrderLineCompletionForMar({
        frequencyCode: "Q6H",
        directionsSig: "q6h PRN pain",
        orderRoute: "PO",
        doseGatedMarPathUsed: false,
      })
    ).toBe(true);
    expect(
      isOrderItemPendingNurseMedication({
        status: "IN_PROGRESS",
        frequencyCode: "Q6H",
        notes: "q6h PRN pain",
        route: "PO",
        medicationFulfillmentIntent: "ADMINISTER_CHART",
        catalogItemType: "MEDICATION",
      })
    ).toBe(true);
  });

  it("no PRN completion regression for interval PRN", () => {
    expect(
      shouldSkipOrderLineCompletionForMar({
        frequencyCode: "Q4H",
        directionsSig: "every 4 hours as needed",
        orderRoute: "PO",
        doseGatedMarPathUsed: false,
      })
    ).toBe(true);
  });
});
