import { describe, expect, it } from "vitest";
import {
  buildMarAnalyticsTimingOverrideProjection,
  buildMarTimingOverrideAnalyticsMetrics,
} from "./marAnalyticsTimingOverride.js";

describe("marTimingOverrideAnalytics", () => {
  const base = {
    facilityId: "fac-1",
    encounterId: "enc-1",
    performedByUserId: "rn-1",
    shiftCode: "DAY",
    unitId: "unit-ed",
    eventAt: "2026-06-03T12:00:00.000Z",
  };

  it("groups early, late, and reschedule overrides by reason", () => {
    const overrides = [
      buildMarAnalyticsTimingOverrideProjection({
        ...base,
        sourceId: "early-1",
        overrideKind: "EARLY_ADMINISTRATION",
        reasonCode: "CLINICAL_CONDITION",
        movedMinutes: 90,
        reviewRecommended: false,
      }),
      buildMarAnalyticsTimingOverrideProjection({
        ...base,
        sourceId: "late-1",
        overrideKind: "LATE_ADMINISTRATION",
        reasonCode: "PATIENT_OFF_UNIT",
        movedMinutes: 150,
        reviewRecommended: true,
      }),
      buildMarAnalyticsTimingOverrideProjection({
        ...base,
        sourceId: "reschedule-1",
        overrideKind: "SCHEDULE_CHANGE",
        reasonCode: "PROCEDURE_SCHEDULE",
        movedMinutes: 120,
        reviewRecommended: true,
      }),
    ];
    const metrics = buildMarTimingOverrideAnalyticsMetrics({ overrides });
    expect(metrics.earlyByReason).toEqual([{ key: "CLINICAL_CONDITION", count: 1 }]);
    expect(metrics.lateByReason).toEqual([{ key: "PATIENT_OFF_UNIT", count: 1 }]);
    expect(metrics.rescheduleByReason).toEqual([{ key: "PROCEDURE_SCHEDULE", count: 1 }]);
    expect(metrics.highRiskOverrides).toBe(2);
    expect(metrics.topOverrideReasons).toHaveLength(3);
  });

  it("breaks down overrides by nurse, shift, facility, and unit", () => {
    const overrides = [
      buildMarAnalyticsTimingOverrideProjection({
        ...base,
        sourceId: "a",
        overrideKind: "EARLY_ADMINISTRATION",
        reasonCode: "WORKFLOW_DELAY",
        movedMinutes: 45,
        reviewRecommended: false,
      }),
      buildMarAnalyticsTimingOverrideProjection({
        ...base,
        sourceId: "b",
        performedByUserId: "rn-2",
        overrideKind: "LATE_ADMINISTRATION",
        reasonCode: "WORKFLOW_DELAY",
        movedMinutes: 60,
        reviewRecommended: false,
      }),
    ];
    const metrics = buildMarTimingOverrideAnalyticsMetrics({ overrides });
    expect(metrics.byNurse).toEqual([
      { key: "rn-1", count: 1 },
      { key: "rn-2", count: 1 },
    ]);
    expect(metrics.byShift).toEqual([{ key: "DAY", count: 2 }]);
    expect(metrics.byFacility).toEqual([{ key: "fac-1", count: 2 }]);
    expect(metrics.byUnit).toEqual([{ key: "unit-ed", count: 2 }]);
  });

  it("canonicalizes legacy reason codes in projections", () => {
    const projection = buildMarAnalyticsTimingOverrideProjection({
      ...base,
      sourceId: "legacy",
      overrideKind: "SCHEDULE_CHANGE",
      reasonCode: "PROCEDURE_TIMING",
      movedMinutes: 30,
      reviewRecommended: false,
    });
    expect(projection.canonicalReasonCode).toBe("PROCEDURE_SCHEDULE");
  });
});
