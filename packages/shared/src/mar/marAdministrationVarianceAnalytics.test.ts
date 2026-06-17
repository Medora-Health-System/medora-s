import { describe, expect, it } from "vitest";
import {
  buildMarAdministrationVarianceAnalyticsMetrics,
  buildMarAnalyticsAdministrationVarianceProjection,
} from "./marAnalyticsAdministrationVariance.js";

describe("marAdministrationVarianceAnalytics", () => {
  it("projects variance metrics by classification", () => {
    const rows = [
      buildMarAnalyticsAdministrationVarianceProjection({
        facilityId: "fac-1",
        encounterId: "enc-1",
        medicationAdministrationId: "mar-1",
        medicationDoseInstanceId: "dose-1",
        orderItemId: "oi-1",
        administeredAt: "2026-06-03T21:00:00.000Z",
        effectiveScheduledAt: "2026-06-03T23:00:00.000Z",
        classification: "EARLY_ADMINISTRATION",
        varianceMinutes: -120,
        severity: "HIGH",
        reviewRecommended: true,
        performedByUserId: "rn-1",
        shiftCode: "NIGHT",
      }),
      buildMarAnalyticsAdministrationVarianceProjection({
        facilityId: "fac-1",
        encounterId: "enc-2",
        medicationAdministrationId: "mar-2",
        medicationDoseInstanceId: "dose-2",
        orderItemId: "oi-2",
        administeredAt: "2026-06-03T12:45:00.000Z",
        effectiveScheduledAt: "2026-06-03T10:00:00.000Z",
        classification: "LATE_ADMINISTRATION",
        varianceMinutes: 165,
        severity: "HIGH",
        reviewRecommended: true,
        performedByUserId: "rn-2",
        shiftCode: "DAY",
      }),
      buildMarAnalyticsAdministrationVarianceProjection({
        facilityId: "fac-1",
        encounterId: "enc-3",
        medicationAdministrationId: "mar-3",
        medicationDoseInstanceId: "dose-3",
        orderItemId: "oi-3",
        administeredAt: "2026-06-03T21:05:00.000Z",
        effectiveScheduledAt: "2026-06-03T21:00:00.000Z",
        classification: "ON_TIME_ADMINISTRATION",
        varianceMinutes: 5,
        severity: "LOW",
        reviewRecommended: false,
        performedByUserId: "rn-1",
      }),
    ];
    const metrics = buildMarAdministrationVarianceAnalyticsMetrics({
      variances: rows,
      scheduledAdministrationCount: 10,
    });
    expect(metrics.onTimeAdministrationCount).toBe(1);
    expect(metrics.earlyAdministrationCount).toBe(1);
    expect(metrics.lateAdministrationCount).toBe(1);
    expect(metrics.highVarianceCount).toBe(2);
    expect(metrics.byNurse.find((b) => b.key === "rn-1")?.count).toBe(2);
    expect(metrics.byShift.find((b) => b.key === "DAY")?.count).toBe(1);
    expect(metrics.onTimeRate.numerator).toBe(1);
    expect(metrics.earlyRate.numerator).toBe(1);
    expect(metrics.lateRate.numerator).toBe(1);
  });
});
