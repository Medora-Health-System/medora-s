import { describe, expect, it } from "vitest";
import {
  canAdjustMarOrderItemSchedule,
  findMedicationDoseInstanceIdForScheduleAdjustment,
  validateMarOrderItemScheduleAdjustment,
} from "./marOrderItemScheduleAdjustment.js";

describe("marOrderItemScheduleAdjustment", () => {
  it("allows NOW/STAT/ONCE fallback order items without dose instances", () => {
    expect(
      canAdjustMarOrderItemSchedule({
        orderItemStatus: "IN_PROGRESS",
        frequencyCode: "STAT",
        hasMedicationDoseInstances: false,
      })
    ).toBe(true);
    expect(
      canAdjustMarOrderItemSchedule({
        orderItemStatus: "IN_PROGRESS",
        frequencyCode: "BID",
        hasMedicationDoseInstances: true,
      })
    ).toBe(false);
  });

  it("finds dose instance by scheduledAt within tolerance", () => {
    const target = "2026-06-11T14:00:00.000Z";
    const resolved = findMedicationDoseInstanceIdForScheduleAdjustment({
      scheduledAt: target,
      doses: [
        {
          id: "dose-a",
          scheduledAt: "2026-06-11T13:00:00.000Z",
          doseStatus: "DUE",
        },
        {
          id: "dose-b",
          scheduledAt: "2026-06-11T14:00:30.000Z",
          doseStatus: "PLANNED",
        },
      ],
    });
    expect(resolved).toBe("dose-b");
  });

  it("validates order-item schedule adjustment payload", () => {
    const result = validateMarOrderItemScheduleAdjustment({
      orderItemStatus: "IN_PROGRESS",
      frequencyCode: "NOW",
      hasMedicationDoseInstances: false,
      originalScheduledAt: "2026-06-11T14:00:00.000Z",
      newScheduledAt: "2026-06-11T15:00:00.000Z",
      reasonCode: "CLINICAL_DELAY",
    });
    expect(result.ok).toBe(true);
  });
});
