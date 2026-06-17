import { describe, expect, it } from "vitest";
import {
  buildMarAnalyticsAggregates,
  buildMarComplianceHealth,
  buildMarCorrectionMetrics,
  buildMarInfusionMetrics,
  buildMarMissedDoseMetrics,
  projectMarAnalyticsInputFromSnapshots,
} from "./marAnalyticsAggregates.js";
import type { MarAnalyticsInput } from "./marAnalyticsProjection.js";
import { MAR_ANALYTICS_READ_ONLY } from "./marAnalyticsProjection.js";

function sampleInput(): MarAnalyticsInput {
  return {
    facilityId: "fac-1",
    windowStart: "2026-06-01T00:00:00.000Z",
    windowEnd: "2026-06-30T23:59:59.999Z",
    scheduledAdministrationCount: 100,
    activeInfusionCount: 2,
    administrations: [
      {
        id: "mar-1",
        facilityId: "fac-1",
        encounterId: "enc-1",
        orderItemId: "oi-1",
        eventAt: "2026-06-16T09:00:00.000Z",
        eventType: "ADMINISTERED",
        route: "IV",
        shiftCode: "DAY",
        performedByUserId: "rn-1",
        performedByRole: "RN",
        medicationTherapeuticClass: "analgesic",
        reconstructionAvailable: true,
      },
      {
        id: "mar-2",
        facilityId: "fac-1",
        encounterId: "enc-2",
        orderItemId: "oi-2",
        eventAt: "2026-06-16T10:00:00.000Z",
        eventType: "PRN_ADMINISTERED",
        route: "PO",
        shiftCode: "DAY",
        performedByUserId: "rn-1",
        isPrn: true,
        reconstructionAvailable: true,
      },
      {
        id: "mar-3",
        facilityId: "fac-1",
        encounterId: "enc-3",
        orderItemId: "oi-3",
        eventAt: "2026-06-16T11:00:00.000Z",
        eventType: "MISSED",
        shiftCode: "NIGHT",
        medicationTherapeuticClass: "antibiotic",
      },
      {
        id: "mar-4",
        facilityId: "fac-1",
        encounterId: "enc-4",
        orderItemId: "oi-4",
        eventAt: "2026-06-16T08:00:00.000Z",
        eventType: "INFUSION_START",
        infusionPhase: "INFUSION_START",
        isIvpb: true,
      },
      {
        id: "mar-5",
        facilityId: "fac-1",
        encounterId: "enc-4",
        orderItemId: "oi-4",
        eventAt: "2026-06-16T12:00:00.000Z",
        eventType: "INFUSION_STOP",
        infusionPhase: "INFUSION_STOP",
        infusionStopReasonCode: "COMPLETED",
        infusionDurationMinutes: 240,
        isIvpb: true,
        ivpbCompleted: true,
      },
      {
        id: "mar-6",
        facilityId: "fac-1",
        encounterId: "enc-5",
        orderItemId: "oi-5",
        eventAt: "2026-06-16T13:00:00.000Z",
        eventType: "REFUSED",
        shiftCode: "DAY",
        performedByUserId: "rn-2",
      },
    ],
    corrections: [
      {
        id: "corr-1",
        facilityId: "fac-1",
        medicationAdministrationId: "mar-1",
        encounterId: "enc-1",
        correctedAt: "2026-06-16T09:30:00.000Z",
        correctedByUserId: "rn-1",
        reasonCode: "DOCUMENTED_WRONG_DOSE",
        shiftCode: "DAY",
      },
      {
        id: "corr-2",
        facilityId: "fac-1",
        medicationAdministrationId: "mar-2",
        encounterId: "enc-2",
        correctedAt: "2026-06-16T10:30:00.000Z",
        correctedByUserId: "rn-1",
        reasonCode: "DUPLICATE_ENTRY",
        shiftCode: "DAY",
      },
    ],
    orderCancellations: [
      {
        orderItemId: "oi-9",
        encounterId: "enc-9",
        facilityId: "fac-1",
        cancelledAt: "2026-06-16T14:00:00.000Z",
        cancelledByUserId: "prov-1",
      },
    ],
  };
}

describe("marAnalyticsAggregates (MEDUI.ED.MAR.H8)", () => {
  it("aggregates KPI counts", () => {
    const agg = buildMarAnalyticsAggregates(sampleInput());
    expect(agg.readOnly).toBe(MAR_ANALYTICS_READ_ONLY);
    expect(agg.kpis.medication_administrations.count).toBe(2);
    expect(agg.kpis.prn_administrations.count).toBe(1);
    expect(agg.kpis.corrections.count).toBe(2);
    expect(agg.kpis.missed_doses.count).toBe(1);
    expect(agg.kpis.canceled_orders.count).toBe(1);
  });

  it("computes correction metrics by reason", () => {
    const metrics = buildMarCorrectionMetrics(sampleInput());
    expect(metrics.doseCorrections).toBe(1);
    expect(metrics.duplicateDocumentation).toBe(1);
    expect(metrics.correctionRate.numerator).toBe(2);
  });

  it("computes missed-dose metrics and rates", () => {
    const metrics = buildMarMissedDoseMetrics(sampleInput());
    expect(metrics.missed).toBe(1);
    expect(metrics.refused).toBe(1);
    expect(metrics.missedDoseRate.denominator).toBe(100);
  });

  it("computes infusion metrics and stop reasons", () => {
    const metrics = buildMarInfusionMetrics(sampleInput());
    expect(metrics.infusionStarts).toBe(1);
    expect(metrics.infusionStops).toBe(1);
    expect(metrics.stopReasonDistribution.find((b) => b.key === "COMPLETED")?.count).toBe(1);
    expect(metrics.averageDurationMinutes).toBe(240);
    expect(metrics.ivpbCompletionRate.numerator).toBe(1);
  });

  it("computes compliance health score", () => {
    const health = buildMarComplianceHealth(sampleInput());
    expect(health.score).toBeGreaterThanOrEqual(0);
    expect(health.score).toBeLessThanOrEqual(100);
    expect(health.auditCompleteness).toBeGreaterThan(0);
  });

  it("projection helper does not mutate source arrays", () => {
    const administrations = sampleInput().administrations;
    const corrections = sampleInput().corrections;
    const projected = projectMarAnalyticsInputFromSnapshots({
      facilityId: "fac-1",
      windowStart: "2026-06-01T00:00:00.000Z",
      windowEnd: "2026-06-30T23:59:59.999Z",
      administrations,
      corrections,
      orderCancellations: [],
    });
    projected.administrations.push({
      id: "mut",
      facilityId: "fac-1",
      encounterId: "enc-m",
      orderItemId: null,
      eventAt: "2026-06-16T15:00:00.000Z",
      eventType: "ADMINISTERED",
    });
    expect(administrations).toHaveLength(6);
  });
});
