import { describe, expect, it } from "vitest";
import {
  MAR_SHIFT_TIMELINE_STATUS_COLORS,
  resolveMarShiftTimelineStatusColorKey,
} from "./marPrnTimeline.js";
import {
  buildMarMissedDoseDocumentation,
  buildMarScheduleTimingDocumentation,
  evaluateMarScheduleTimingGovernance,
  isEnterpriseControlledSubstanceMedication,
  isMarMissedDoseMarCreate,
  parseMarMissedDoseReasonFromNotes,
  parseMarScheduleTimingReasonFromNotes,
  resolveMarControlledSubstanceVerifierReadiness,
  validateMarMissedDoseGovernance,
  validateMarScheduleTimingGovernance,
} from "./marAdministrationSafetyGovernance.js";
import { wallClockToUtc } from "../clinical/clinicalTimeZone.js";
import { resolveMarShiftTimelineOrderItemPlacementInstant } from "../medication/marShiftTimelineOrderItemFallback.js";

describe("marAdministrationSafetyGovernance (K.10B.9)", () => {
  const haiti = "America/Port-au-Prince";

  it("detects early administration with minutes delta", () => {
    const scheduled = wallClockToUtc(2026, 6, 12, 13, 0, haiti);
    const early = wallClockToUtc(2026, 6, 12, 9, 0, haiti);
    const result = evaluateMarScheduleTimingGovernance({
      administeredAt: early,
      scheduledAt: scheduled,
      dueWindowStartAt: scheduled,
      dueWindowEndAt: new Date(scheduled.getTime() + 60 * 60_000),
      facilityTimeZone: haiti,
      locale: "en-US",
    });
    expect(result.kind).toBe("early");
    expect(result.minutesDelta).toBe(240);
    expect(result.requiresReason).toBe(true);
    expect(result.actualTimeDisplay).toContain("9");
  });

  it("detects late administration with minutes delta", () => {
    const scheduled = wallClockToUtc(2026, 6, 12, 8, 0, haiti);
    const late = wallClockToUtc(2026, 6, 12, 11, 15, haiti);
    const dueEnd = new Date(scheduled.getTime() + 60 * 60_000);
    const result = evaluateMarScheduleTimingGovernance({
      administeredAt: late,
      scheduledAt: scheduled,
      dueWindowStartAt: scheduled,
      dueWindowEndAt: dueEnd,
      facilityTimeZone: haiti,
      locale: "en-US",
    });
    expect(result.kind).toBe("late");
    expect(result.minutesDelta).toBeGreaterThanOrEqual(135);
    expect(result.requiresReason).toBe(true);
  });

  it("requires structured reason for early/late and persists documentation prefix", () => {
    expect(
      validateMarScheduleTimingGovernance({
        timing: { kind: "early", requiresReason: true },
        reasonCode: "",
      }).ok
    ).toBe(false);
    expect(
      validateMarScheduleTimingGovernance({
        timing: { kind: "late", requiresReason: true },
        reasonCode: "PROCEDURE",
      }).ok
    ).toBe(true);
    const doc = buildMarScheduleTimingDocumentation({
      kind: "early",
      reasonCode: "PAIN_CRISIS",
      minutesDelta: 45,
    });
    expect(doc).toContain("MAR_SCHEDULE_TIMING:");
    expect(doc).toContain("EARLY 45m");
  });

  it("completed placement uses administeredAt hour (actual-time authority)", () => {
    const createdAt = wallClockToUtc(2026, 6, 12, 13, 0, haiti);
    const administeredAt = wallClockToUtc(2026, 6, 12, 9, 0, haiti);
    const placement = resolveMarShiftTimelineOrderItemPlacementInstant({
      createdAt,
      intendedAdministrationAt: createdAt,
      frequencyCode: "NOW",
      notes: null,
      administeredAt,
      useAdministeredPlacement: true,
    });
    expect(placement.toISOString()).toBe(administeredAt.toISOString());
  });

  it("missed dose governance requires reason and builds notes", () => {
    expect(validateMarMissedDoseGovernance({ reasonCode: "TRANSFERRED" }).ok).toBe(true);
    expect(buildMarMissedDoseDocumentation("CLINICAL_HOLD")).toBe("Missed: CLINICAL_HOLD");
  });

  it("parses schedule timing and missed reason from note prefixes (K.10B.9A)", () => {
    const timingDoc = buildMarScheduleTimingDocumentation({
      kind: "early",
      reasonCode: "PAIN_CRISIS",
      minutesDelta: 30,
    });
    expect(parseMarScheduleTimingReasonFromNotes(timingDoc)).toEqual({
      reasonCode: "PAIN_CRISIS",
      otherText: null,
    });

    const missedDoc = buildMarMissedDoseDocumentation("TRANSFERRED");
    expect(parseMarMissedDoseReasonFromNotes(missedDoc)).toEqual({
      reasonCode: "TRANSFERRED",
      otherText: null,
    });
    expect(
      isMarMissedDoseMarCreate({ marAction: "not_available", notes: missedDoc })
    ).toBe(true);
    expect(
      isMarMissedDoseMarCreate({ marAction: "not_available", notes: "Refused: PATIENT_REFUSED" })
    ).toBe(false);
  });

  it("enterprise controlled substance readiness without forcing dual-sign", () => {
    expect(isEnterpriseControlledSubstanceMedication({ genericName: "Morphine" })).toBe(true);
    const readiness = resolveMarControlledSubstanceVerifierReadiness({
      genericName: "Morphine",
      isControlled: true,
      requiresDoubleSign: true,
    });
    expect(readiness.enterpriseControlled).toBe(true);
    expect(readiness.verificationRequired).toBe(true);
    expect(readiness.verifierUserId).toBeNull();
  });

  it("status colors: MISSED and OVERDUE are red; DUE remains green", () => {
    expect(resolveMarShiftTimelineStatusColorKey({ doseStatus: "MISSED" })).toBe("missed");
    expect(resolveMarShiftTimelineStatusColorKey({ doseStatus: "OVERDUE" })).toBe("overdue");
    expect(resolveMarShiftTimelineStatusColorKey({ doseStatus: "DUE" })).toBe("active");
    expect(MAR_SHIFT_TIMELINE_STATUS_COLORS.missed.backgroundColor).toBe("#FEE2E2");
    expect(MAR_SHIFT_TIMELINE_STATUS_COLORS.overdue.backgroundColor).toBe("#FEE2E2");
  });
});
