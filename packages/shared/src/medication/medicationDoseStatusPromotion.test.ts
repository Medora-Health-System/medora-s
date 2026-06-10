import { describe, expect, it } from "vitest";
import {
  resolvePromotedMedicationDoseStatus,
  resolvePromotedMedicationDoseStatusChained,
} from "./medicationDoseStatusPromotion.js";

describe("medicationDoseStatusPromotion (M1.8B.7I.3)", () => {
  const windowStart = new Date("2026-06-10T09:00:00.000Z");
  const windowEnd = new Date("2026-06-10T10:00:00.000Z");

  it("PLANNED before due window remains unchanged", () => {
    expect(
      resolvePromotedMedicationDoseStatus({
        currentStatus: "PLANNED",
        now: new Date("2026-06-10T08:59:59.000Z"),
        dueWindowStartAt: windowStart,
        dueWindowEndAt: windowEnd,
      })
    ).toBeNull();
  });

  it("PLANNED inside due window becomes DUE", () => {
    expect(
      resolvePromotedMedicationDoseStatus({
        currentStatus: "PLANNED",
        now: new Date("2026-06-10T09:30:00.000Z"),
        dueWindowStartAt: windowStart,
        dueWindowEndAt: windowEnd,
      })
    ).toBe("DUE");
  });

  it("DUE past dueWindowEndAt becomes OVERDUE", () => {
    expect(
      resolvePromotedMedicationDoseStatus({
        currentStatus: "DUE",
        now: new Date("2026-06-10T10:00:01.000Z"),
        dueWindowStartAt: windowStart,
        dueWindowEndAt: windowEnd,
      })
    ).toBe("OVERDUE");
  });

  it("DUE at exactly dueWindowEndAt stays DUE", () => {
    expect(
      resolvePromotedMedicationDoseStatus({
        currentStatus: "DUE",
        now: windowEnd,
        dueWindowStartAt: windowStart,
        dueWindowEndAt: windowEnd,
      })
    ).toBeNull();
  });

  it.each(["COMPLETED", "HELD", "CANCELLED", "IN_PROGRESS", "MISSED", "SUPERSEDED"] as const)(
    "%s unchanged",
    (currentStatus) => {
      expect(
        resolvePromotedMedicationDoseStatus({
          currentStatus,
          now: new Date("2026-06-10T12:00:00.000Z"),
          dueWindowStartAt: windowStart,
          dueWindowEndAt: windowEnd,
        })
      ).toBeNull();
    }
  );

  it("PLANNED past window end chains to OVERDUE", () => {
    expect(
      resolvePromotedMedicationDoseStatusChained({
        currentStatus: "PLANNED",
        now: new Date("2026-06-10T11:00:00.000Z"),
        dueWindowStartAt: windowStart,
        dueWindowEndAt: windowEnd,
      })
    ).toBe("OVERDUE");
  });
});
