import { describe, expect, it } from "vitest";
import {
  assessMarMedicationTimingOverrideRequirement,
  resolveMarMedicationTimingAdvisory,
  validateMarInfusionClinicalTimeOverride,
  validateMarMedicationTimingOverride,
  validateMarScheduleTimingGovernance,
  validateMarUniversalClinicalTime,
} from "@medora/shared";

describe("marTimingNoHardBlock (MEDUI.ED.MAR.HOTFIX.TIME.2)", () => {
  const scheduled = new Date("2026-06-03T18:00:00.000Z");

  it("early outside window advisory does not block", () => {
    const advisory = resolveMarMedicationTimingAdvisory({
      scheduledAt: scheduled,
      clinicalEventAt: new Date(scheduled.getTime() - 90 * 60_000),
    });
    expect(advisory.severity).toBe("STANDARD_WINDOW");
    const validation = validateMarUniversalClinicalTime({
      actionType: "ADMINISTER",
      scheduledTime: scheduled.toISOString(),
      clinicalTime: new Date(scheduled.getTime() - 90 * 60_000).toISOString(),
      documentedAt: new Date().toISOString(),
    });
    expect(validation.ok).toBe(true);
  });

  it("late outside window advisory does not block", () => {
    const validation = validateMarScheduleTimingGovernance({
      timing: { kind: "late", requiresReason: false, minutesDelta: 90 },
      administeredAt: new Date(scheduled.getTime() + 90 * 60_000),
      scheduledAt: scheduled,
      documentedAt: new Date(),
    });
    expect(validation.ok).toBe(true);
  });

  it("PRN administration does not require timing reason", () => {
    const requirement = assessMarMedicationTimingOverrideRequirement({
      overrideKind: "LATE_ADMINISTRATION",
      movedMinutes: 90,
      isPrn: true,
      clinicalEventAt: new Date(scheduled.getTime() + 90 * 60_000),
      scheduledAt: scheduled,
    });
    expect(requirement.reasonRequired).toBe(false);
  });

  it("infusion start does not require timing reason", () => {
    const result = validateMarInfusionClinicalTimeOverride({
      clinicalAt: "2026-06-03T09:00:00.000Z",
      saveAt: new Date("2026-06-03T14:00:00.000Z"),
    });
    expect(result.ok).toBe(true);
  });

  it("infusion stop does not require timing reason", () => {
    const result = validateMarInfusionClinicalTimeOverride({
      clinicalAt: "2026-06-03T16:00:00.000Z",
      saveAt: new Date("2026-06-03T14:00:00.000Z"),
    });
    expect(result.ok).toBe(true);
  });

  it("bolus does not require timing reason", () => {
    const result = validateMarMedicationTimingOverride({
      overrideKind: "EARLY_ADMINISTRATION",
      movedMinutes: 45,
      clinicalEventAt: "2026-06-03T09:00:00.000Z",
      documentedAt: "2026-06-03T14:00:00.000Z",
    });
    expect(result.ok).toBe(true);
  });
});
