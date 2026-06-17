import { describe, expect, it } from "vitest";
import {
  assessMarAdministrationVariance,
  classifyMarAdministrationVariance,
  formatMarAdministrationVarianceMinutesLabel,
  resolveEffectiveVarianceScheduledTime,
  resolveMarAdministrationVarianceHistoryEventType,
  resolveMarAdministrationVarianceLabelKey,
} from "./marAdministrationVarianceGovernance.js";

describe("marAdministrationVarianceGovernance", () => {
  it("classifies on-time within 30 minutes", () => {
    const result = assessMarAdministrationVariance({
      actualAdministrationTime: "2026-06-03T21:05:00.000Z",
      effectiveScheduledTime: "2026-06-03T21:00:00.000Z",
    });
    expect(result.classification).toBe("ON_TIME_ADMINISTRATION");
    expect(result.varianceMinutes).toBe(5);
    expect(result.reviewRecommended).toBe(false);
  });

  it("classifies early administration beyond 30 minutes", () => {
    const result = assessMarAdministrationVariance({
      actualAdministrationTime: "2026-06-03T20:59:00.000Z",
      effectiveScheduledTime: "2026-06-03T23:00:00.000Z",
    });
    expect(result.classification).toBe("EARLY_ADMINISTRATION");
    expect(result.varianceMinutes).toBe(-121);
    expect(result.severity).toBe("HIGH");
    expect(result.reviewRecommended).toBe(true);
  });

  it("classifies late administration beyond 30 minutes", () => {
    const result = assessMarAdministrationVariance({
      actualAdministrationTime: "2026-06-03T12:45:00.000Z",
      effectiveScheduledTime: "2026-06-03T10:00:00.000Z",
    });
    expect(result.classification).toBe("LATE_ADMINISTRATION");
    expect(result.varianceMinutes).toBe(165);
    expect(result.severity).toBe("HIGH");
  });

  it("uses effective scheduled time not original after reschedule", () => {
    const effective = resolveEffectiveVarianceScheduledTime({
      scheduledAt: "2026-06-03T21:00:00.000Z",
      orderedDoseSnapshotJson: {
        _marScheduleAdjustmentHistory: [
          {
            originalScheduledAt: "2026-06-03T23:00:00.000Z",
            previousScheduledAt: "2026-06-03T23:00:00.000Z",
            newScheduledAt: "2026-06-03T21:00:00.000Z",
          },
        ],
      },
    });
    expect(effective).toBe("2026-06-03T21:00:00.000Z");
    const result = assessMarAdministrationVariance({
      actualAdministrationTime: "2026-06-03T21:05:00.000Z",
      effectiveScheduledTime: effective,
    });
    expect(result.classification).toBe("ON_TIME_ADMINISTRATION");
    expect(result.varianceMinutes).toBe(5);
  });

  it("maps classifications to history event types", () => {
    expect(
      resolveMarAdministrationVarianceHistoryEventType("EARLY_ADMINISTRATION", false)
    ).toBe("EARLY_ADMINISTRATION");
    expect(resolveMarAdministrationVarianceHistoryEventType("LATE_ADMINISTRATION", false)).toBe(
      "LATE_ADMINISTRATION"
    );
    expect(resolveMarAdministrationVarianceHistoryEventType("ON_TIME_ADMINISTRATION", false)).toBe(
      "ADMINISTERED"
    );
    expect(resolveMarAdministrationVarianceHistoryEventType("EARLY_ADMINISTRATION", true)).toBe(
      "PRN_ADMINISTERED"
    );
  });

  it("formats variance minutes with sign", () => {
    expect(formatMarAdministrationVarianceMinutesLabel(-120)).toBe("-120 min");
    expect(formatMarAdministrationVarianceMinutesLabel(165)).toBe("+165 min");
  });

  it("exposes EN/FR classification labels via keys", () => {
    expect(classifyMarAdministrationVariance(5)).toBe("ON_TIME_ADMINISTRATION");
    expect(resolveMarAdministrationVarianceLabelKey("EARLY_ADMINISTRATION")).toBe(
      "marAdministrationVariance.classification.EARLY_ADMINISTRATION"
    );
  });
});
