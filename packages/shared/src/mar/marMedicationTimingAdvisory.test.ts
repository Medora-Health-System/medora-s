import { describe, expect, it } from "vitest";
import {
  MAR_SIGNIFICANT_DIFFERENCE_MINUTES,
  MAR_STANDARD_WINDOW_MINUTES,
  marMedicationTimingAdvisoryIsBlocking,
  resolveMarMedicationTimingAdvisory,
} from "./marMedicationTimingAdvisory.js";
import {
  validateMarInfusionClinicalTimeOverride,
} from "../medication/marInfusionTimingOverrideGovernance.js";
import {
  assessMarMedicationTimingOverrideRequirement,
  validateMarMedicationTimingOverride,
} from "./marMedicationTimingOverrideGovernance.js";
import { validateMarScheduleTimingGovernance } from "./marAdministrationSafetyGovernance.js";
import { validateMarUniversalClinicalTime } from "./marUniversalClinicalTimeGovernance.js";

const scheduled = "2026-06-03T18:00:00.000Z";

function clinicalAtMinutesDelta(delta: number): string {
  return new Date(new Date(scheduled).getTime() + delta * 60_000).toISOString();
}

describe("marMedicationTimingAdvisory (MEDUI.ED.MAR.TIME.CERTIFICATION.1)", () => {
  it("1 — 0 min delta = NONE", () => {
    expect(
      resolveMarMedicationTimingAdvisory({
        scheduledAt: scheduled,
        clinicalEventAt: scheduled,
        documentedAt: scheduled,
      }).severity
    ).toBe("NONE");
  });

  it("2 — 59 min delta = NONE", () => {
    expect(
      resolveMarMedicationTimingAdvisory({
        scheduledAt: scheduled,
        clinicalEventAt: clinicalAtMinutesDelta(59),
      }).severity
    ).toBe("NONE");
  });

  it("3 — 60 min delta = NONE", () => {
    expect(
      resolveMarMedicationTimingAdvisory({
        scheduledAt: scheduled,
        clinicalEventAt: clinicalAtMinutesDelta(60),
      }).severity
    ).toBe("NONE");
  });

  it("4 — 61 min delta = STANDARD_WINDOW", () => {
    const advisory = resolveMarMedicationTimingAdvisory({
      scheduledAt: scheduled,
      clinicalEventAt: clinicalAtMinutesDelta(61),
    });
    expect(advisory.severity).toBe("STANDARD_WINDOW");
    expect(advisory.messageKey).toBe("marScheduleTiming.outsideWindowAdvisory");
  });

  it("5 — 120 min delta = STANDARD_WINDOW", () => {
    expect(
      resolveMarMedicationTimingAdvisory({
        scheduledAt: scheduled,
        clinicalEventAt: clinicalAtMinutesDelta(120),
      }).severity
    ).toBe("STANDARD_WINDOW");
  });

  it("6 — 121 min delta remains advisory only", () => {
    const advisory = resolveMarMedicationTimingAdvisory({
      scheduledAt: scheduled,
      clinicalEventAt: clinicalAtMinutesDelta(121),
    });
    expect(advisory.severity).toBe("STANDARD_WINDOW");
    expect(marMedicationTimingAdvisoryIsBlocking(advisory)).toBe(false);
  });

  it("7 — >4 hours = SIGNIFICANT_DIFFERENCE", () => {
    const advisory = resolveMarMedicationTimingAdvisory({
      scheduledAt: scheduled,
      clinicalEventAt: clinicalAtMinutesDelta(MAR_SIGNIFICANT_DIFFERENCE_MINUTES + 1),
    });
    expect(advisory.severity).toBe("SIGNIFICANT_DIFFERENCE");
    expect(advisory.messageKey).toBe("marScheduleTiming.significantDifferenceAdvisory");
  });

  it("8 — significant warning does not block", () => {
    const advisory = resolveMarMedicationTimingAdvisory({
      scheduledAt: scheduled,
      clinicalEventAt: clinicalAtMinutesDelta(300),
      documentedAt: scheduled,
    });
    expect(marMedicationTimingAdvisoryIsBlocking(advisory)).toBe(false);
  });

  it("9 — PRN scheduled-window advisory suppressed", () => {
    expect(
      resolveMarMedicationTimingAdvisory({
        scheduledAt: scheduled,
        clinicalEventAt: clinicalAtMinutesDelta(90),
        isPrn: true,
      }).severity
    ).toBe("NONE");
  });

  it("10 — PRN >4 hour documented difference can warn", () => {
    const documented = scheduled;
    const clinical = clinicalAtMinutesDelta(MAR_SIGNIFICANT_DIFFERENCE_MINUTES + 30);
    expect(
      resolveMarMedicationTimingAdvisory({
        scheduledAt: scheduled,
        clinicalEventAt: clinical,
        documentedAt: documented,
        isPrn: true,
      }).severity
    ).toBe("SIGNIFICANT_DIFFERENCE");
  });

  it("11 — no timing reason required for STANDARD_WINDOW", () => {
    const requirement = assessMarMedicationTimingOverrideRequirement({
      overrideKind: "LATE_ADMINISTRATION",
      movedMinutes: 90,
      scheduledAt: scheduled,
      clinicalEventAt: clinicalAtMinutesDelta(90),
    });
    expect(requirement.reasonRequired).toBe(false);
    expect(requirement.advisory?.severity).toBe("STANDARD_WINDOW");
  });

  it("12 — no timing reason required for SIGNIFICANT_DIFFERENCE", () => {
    const validation = validateMarMedicationTimingOverride({
      overrideKind: "LATE_ADMINISTRATION",
      movedMinutes: 300,
      scheduledAt: scheduled,
      clinicalEventAt: clinicalAtMinutesDelta(300),
      reasonCode: null,
    });
    expect(validation.ok).toBe(true);
    if (validation.ok) {
      expect(validation.advisory?.severity).toBe("SIGNIFICANT_DIFFERENCE");
    }
  });

  it("13 — validateMarUniversalClinicalTime returns advisory metadata", () => {
    const validation = validateMarUniversalClinicalTime({
      actionType: "ADMINISTER",
      clinicalTime: clinicalAtMinutesDelta(75),
      documentedAt: scheduled,
      scheduledTime: scheduled,
      currentScheduledTime: scheduled,
    });
    expect(validation.ok).toBe(true);
    if (validation.ok) {
      expect(validation.advisory?.severity).toBe("STANDARD_WINDOW");
      expect(validation.advisory?.deltaMinutes).toBe(75);
    }
  });

  it("14 — validateMarUniversalClinicalTime does not block timing variance", () => {
    const validation = validateMarUniversalClinicalTime({
      actionType: "ADMINISTER",
      clinicalTime: clinicalAtMinutesDelta(300),
      documentedAt: scheduled,
      scheduledTime: scheduled,
      currentScheduledTime: scheduled,
    });
    expect(validation.ok).toBe(true);
  });

  it("28 — infusion start/stop advisory is non-blocking", () => {
    const validation = validateMarInfusionClinicalTimeOverride({
      clinicalAt: clinicalAtMinutesDelta(90),
      saveAt: new Date(scheduled),
      scheduledAt: scheduled,
    });
    expect(validation.ok).toBe(true);
    expect(validation.advisory?.severity).toBe("STANDARD_WINDOW");
  });

  it("29 — bolus clinical time advisory is non-blocking", () => {
    const validation = validateMarInfusionClinicalTimeOverride({
      clinicalAt: clinicalAtMinutesDelta(300),
      saveAt: new Date(scheduled),
      scheduledAt: scheduled,
    });
    expect(validation.ok).toBe(true);
    expect(validation.advisory?.severity).toBe("SIGNIFICANT_DIFFERENCE");
  });

  it("30 — no MAR save blocker from timing advisory", () => {
    const validation = validateMarScheduleTimingGovernance({
      timing: { kind: "late", requiresReason: false, minutesDelta: 90 },
      administeredAt: clinicalAtMinutesDelta(90),
      scheduledAt: scheduled,
      documentedAt: scheduled,
    });
    expect(validation.ok).toBe(true);
    expect(validation.advisory?.severity).toBe("STANDARD_WINDOW");
    expect(MAR_STANDARD_WINDOW_MINUTES).toBe(60);
  });
});
