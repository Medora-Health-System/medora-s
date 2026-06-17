import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  evaluateDoseGatedMarEligibility,
  evaluateIvpbDoseSessionEligibility,
  isDoseAdministrableNow,
  isMarShiftTimelineItemActionable,
  isMarShiftTimelineTerminalClinicalAction,
  resolveMarShiftTimelineClinicalAction,
  validateMarDoseScheduleAdjustment,
  validateMarDoseScheduleAdjustmentGovernance,
  validateMarScheduleTimingGovernance,
  evaluateMarScheduleTimingGovernance,
} from "@medora/shared";

const webSrcRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

describe("marUniversalActionabilityGovernance (MEDUI.ED.MAR.H9)", () => {
  const drawerSrc = readSrc("components/encounters/FacilityMarShiftTimelineDrawer.tsx");
  const actionsSrc = readSrc("features/mar/marShiftTimelineActions.ts");

  it("active scheduled med actionable even outside due window", () => {
    expect(
      isDoseAdministrableNow({
        doseStatus: "PLANNED",
        now: new Date("2026-06-10T06:00:00.000Z"),
        dueWindowStartAt: new Date("2026-06-10T09:00:00.000Z"),
        dueWindowEndAt: new Date("2026-06-10T10:00:00.000Z"),
      })
    ).toBe(true);
    expect(
      evaluateDoseGatedMarEligibility({
        featureFlags: {
          MEDICATION_SCHEDULING_V1: true,
          MEDICATION_DOSE_INSTANCES: true,
          MEDICATION_DOSE_GATED_MAR: true,
        },
        scheduleClassification: "RECURRING",
        scheduleStatus: "ACTIVE",
        doseKind: "FIXED_ADMINISTRATION",
        doseStatus: "PLANNED",
        doseOrderItemId: "oi-1",
        requestOrderItemId: "oi-1",
        doseEncounterId: "enc-1",
        requestEncounterId: "enc-1",
        doseFacilityId: "fac-1",
        requestFacilityId: "fac-1",
        now: new Date("2026-06-10T06:00:00.000Z"),
        dueWindowStartAt: new Date("2026-06-10T09:00:00.000Z"),
        dueWindowEndAt: new Date("2026-06-10T10:00:00.000Z"),
        frequencyCode: "Q8H",
      }).eligible
    ).toBe(true);
  });

  it("active IVPB START actionable outside exact due window", () => {
    const start = evaluateIvpbDoseSessionEligibility({
      doseKind: "IVPB_SESSION",
      doseStatus: "PLANNED",
      scheduleClassification: "RECURRING_IVPB",
      action: "START",
    }) as { eligible: boolean };
    expect(start.eligible).toBe(true);
    expect(resolveMarShiftTimelineClinicalAction("IVPB_SESSION", "PLANNED")).toBe("START_INFUSION");
  });

  it("canceled med not actionable", () => {
    expect(
      isMarShiftTimelineItemActionable({
        doseStatus: "CANCELLED",
        clinicalAction: "VIEW_CANCELED",
      })
    ).toBe(false);
    expect(isMarShiftTimelineTerminalClinicalAction("VIEW_CANCELED")).toBe(true);
  });

  it("terminal dose not actionable", () => {
    expect(
      isMarShiftTimelineItemActionable({
        doseStatus: "COMPLETED",
        clinicalAction: "VIEW_ADMINISTRATION",
      })
    ).toBe(false);
  });

  it("administered dose not actionable", () => {
    expect(
      isMarShiftTimelineItemActionable({
        doseStatus: "COMPLETED",
        clinicalAction: "VIEW_ADMINISTRATION",
        secondaryText: "DONE",
      })
    ).toBe(false);
  });

  it("PRN interval safety preserved in tab source", () => {
    const tabSrc = readSrc("components/encounters/MedicationAdministrationTab.tsx");
    expect(tabSrc).toContain("validatePrnAdministrationForMarCreate");
    expect(tabSrc).toContain("isPrnAdministrationBeforeNextEligible");
  });

  it("reason required for early/late administration", () => {
    const timing = evaluateMarScheduleTimingGovernance({
      administeredAt: new Date("2026-06-10T08:00:00.000Z"),
      scheduledAt: new Date("2026-06-10T09:30:00.000Z"),
      dueWindowStartAt: new Date("2026-06-10T09:00:00.000Z"),
      dueWindowEndAt: new Date("2026-06-10T10:00:00.000Z"),
      facilityTimeZone: "UTC",
    });
    expect(timing.requiresReason).toBe(true);
    expect(
      validateMarScheduleTimingGovernance({
        timing,
        reasonCode: "PATIENT_CONDITION",
      }).ok
    ).toBe(true);
  });

  it("reason required for schedule time change", () => {
    expect(validateMarDoseScheduleAdjustmentGovernance({ reasonCode: null }).ok).toBe(false);
    expect(
      validateMarDoseScheduleAdjustmentGovernance({ reasonCode: "PROVIDER_INSTRUCTION" }).ok
    ).toBe(true);
  });

  it("original scheduled time preserved on schedule adjustment validation", () => {
    const result = validateMarDoseScheduleAdjustment({
      doseStatus: "PLANNED",
      originalScheduledAt: "2026-06-17T00:36:00.000Z",
      newScheduledAt: "2026-06-16T23:40:00.000Z",
      reasonCode: "PROVIDER_INSTRUCTION",
    });
    expect(result.ok).toBe(true);
  });

  it("drawer exposes change scheduled time action", () => {
    expect(drawerSrc).toContain("CHANGE_SCHEDULED_TIME");
    expect(drawerSrc).toContain("MedicationDoseScheduleAdjustmentModal");
    expect(actionsSrc).toContain("onRequestScheduleAdjustment");
  });
});
