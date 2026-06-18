import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assessMarAdministrationVariance,
  administrationVarianceMinutesToOverrideKind,
  assessMarMedicationTimingOverrideRequirement,
  evaluateMarScheduleAdministrationTiming,
  validateMarUniversalClinicalTime,
} from "@medora/shared";

const webSrcRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

describe("marPrnTimingReasonStability (H9J.1)", () => {
  it("legacy timing reason block suppressed — outside-window advisory only", () => {
    const tab = readSrc("components/encounters/MedicationAdministrationTab.tsx");
    expect(tab).toContain("canAdjustAdminTime");
    expect(tab).toContain("resolveMarMedicationTimingAdvisory");
    expect(tab).toContain("mar-outside-window-advisory");
    expect(tab).not.toContain('t("marScheduleTiming.reasonRequired")');
  });

  it("PRN clinical time validation does not use scheduledAt as due time", () => {
    const tab = readSrc("components/encounters/MedicationAdministrationTab.tsx");
    expect(tab).toContain("scheduledTime: modalItem.isPrn ? null : modalItem.scheduledAt");
  });

  it("scheduled med late outside 1-hour window is advisory only", () => {
    const administeredAt = new Date("2026-06-12T10:30:00.000Z");
    const scheduledAt = "2026-06-12T09:00:00.000Z";
    const timing = evaluateMarScheduleAdministrationTiming({
      administeredAt,
      scheduledAt,
      dueWindowStartAt: scheduledAt,
      dueWindowEndAt: scheduledAt,
      facilityTimeZone: "UTC",
      locale: "en-US",
    });
    expect(timing.kind).toBe("late");
    const variance = assessMarAdministrationVariance({
      actualAdministrationTime: administeredAt,
      effectiveScheduledTime: scheduledAt,
    });
    const kind = administrationVarianceMinutesToOverrideKind(variance.varianceMinutes);
    const requirement = assessMarMedicationTimingOverrideRequirement({
      overrideKind: kind,
      movedMinutes: Math.abs(variance.varianceMinutes),
    });
    expect(requirement.reasonRequired).toBe(false);
  });

  it("NOW/STAT not falsely late when no scheduled anchor", () => {
    const validation = validateMarUniversalClinicalTime({
      actionType: "ADMINISTER",
      clinicalTime: new Date().toISOString(),
      documentedAt: new Date().toISOString(),
      scheduledTime: null,
      currentScheduledTime: null,
    });
    expect(validation.ok).toBe(true);
  });

  it("IVPB start not falsely late without scheduled comparison", () => {
    const validation = validateMarUniversalClinicalTime({
      actionType: "IVPB_START",
      clinicalTime: new Date().toISOString(),
      documentedAt: new Date().toISOString(),
      scheduledTime: null,
      currentScheduledTime: null,
    });
    expect(validation.ok).toBe(true);
  });

  it("bolus complete uses clinical complete time without scheduled late block", () => {
    const validation = validateMarUniversalClinicalTime({
      actionType: "BOLUS_COMPLETE",
      clinicalTime: "2026-06-12T11:30:00.000Z",
      documentedAt: "2026-06-12T11:30:00.000Z",
      scheduledTime: "2026-06-12T09:00:00.000Z",
      currentScheduledTime: "2026-06-12T09:00:00.000Z",
    });
    expect(validation.ok).toBe(true);
  });

  it("no universal clinical time regression — documented-on-time administer passes", () => {
    const now = new Date().toISOString();
    const validation = validateMarUniversalClinicalTime({
      actionType: "ADMINISTER",
      clinicalTime: now,
      documentedAt: now,
      scheduledTime: "2026-06-12T09:00:00.000Z",
      currentScheduledTime: "2026-06-12T09:00:00.000Z",
    });
    expect(validation.ok).toBe(true);
  });

  it("MedicationClinicalDateTimeField hides timing override reason by default", () => {
    const field = readSrc("components/mar/MedicationClinicalDateTimeField.tsx");
    expect(field).toContain("showReasonWhenRequired = false");
    expect(field).toContain("MAR_MEDICATION_TIMING_OVERRIDE_REASON_CODES");
  });
});
