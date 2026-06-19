import { describe, expect, it } from "vitest";
import {
  resolveMarMedicationTimingAdvisory,
  validateMedicationAdministrationEffectiveTime,
} from "@medora/shared";

describe("marOneHourRuleNoReason (MEDUI.ED.MAR.HOTFIX.TIME.2)", () => {
  const scheduled = new Date("2026-06-03T18:00:00.000Z");

  it("scheduled 2 PM, 1 PM on time (NONE advisory)", () => {
    expect(
      resolveMarMedicationTimingAdvisory({
        scheduledAt: scheduled,
        clinicalEventAt: new Date(scheduled.getTime() - 60 * 60_000),
      }).severity
    ).toBe("NONE");
  });

  it("scheduled 2 PM, 3 PM on time (NONE advisory)", () => {
    expect(
      resolveMarMedicationTimingAdvisory({
        scheduledAt: scheduled,
        clinicalEventAt: new Date(scheduled.getTime() + 60 * 60_000),
      }).severity
    ).toBe("NONE");
  });

  it("12:59 PM advisory only (STANDARD_WINDOW), never blocks API validation", () => {
    expect(
      resolveMarMedicationTimingAdvisory({
        scheduledAt: scheduled,
        clinicalEventAt: new Date(scheduled.getTime() - 61 * 60_000),
      }).severity
    ).toBe("STANDARD_WINDOW");

    const result = validateMedicationAdministrationEffectiveTime({
      effectiveAdministeredTime: new Date(scheduled.getTime() - 61 * 60_000),
      now: new Date("2026-06-03T20:00:00.000Z"),
      encounterAnchorAt: new Date("2026-06-03T08:00:00.000Z"),
      originalAdministeredAt: new Date("2026-06-03T20:00:00.000Z"),
      systemDocumentedAt: new Date("2026-06-03T20:00:00.000Z"),
      orderCreatedAt: new Date("2026-06-03T10:00:00.000Z"),
      orderItemCreatedAt: new Date("2026-06-03T10:05:00.000Z"),
      orderCancelledAt: null,
      adjustmentVersion: 0,
      reason: "",
      controlledMedication: false,
      marActionAdministered: true,
    });
    expect(result.ok).toBe(true);
  });

  it("3:01 PM advisory only, never blocks", () => {
    expect(
      resolveMarMedicationTimingAdvisory({
        scheduledAt: scheduled,
        clinicalEventAt: new Date(scheduled.getTime() + 61 * 60_000),
      }).severity
    ).toBe("STANDARD_WINDOW");

    const result = validateMedicationAdministrationEffectiveTime({
      effectiveAdministeredTime: new Date(scheduled.getTime() + 61 * 60_000),
      now: new Date("2026-06-03T20:00:00.000Z"),
      encounterAnchorAt: new Date("2026-06-03T08:00:00.000Z"),
      originalAdministeredAt: new Date("2026-06-03T20:00:00.000Z"),
      systemDocumentedAt: new Date("2026-06-03T20:00:00.000Z"),
      orderCreatedAt: new Date("2026-06-03T10:00:00.000Z"),
      orderItemCreatedAt: new Date("2026-06-03T10:05:00.000Z"),
      orderCancelledAt: null,
      adjustmentVersion: 0,
      reason: "",
      controlledMedication: false,
      marActionAdministered: true,
    });
    expect(result.ok).toBe(true);
  });
});
