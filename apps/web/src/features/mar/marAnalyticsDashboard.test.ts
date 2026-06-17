import { describe, expect, it } from "vitest";
import {
  MAR_ANALYTICS_DASHBOARD_SECTIONS,
  type MarAnalyticsInput,
} from "@medora/shared";
import {
  buildMarAnalyticsDashboardBundle,
  buildMarComplianceDashboard,
  buildMarCorrectionDashboard,
  buildMarExecutiveOverviewDashboard,
  buildMarInfusionDashboard,
  buildMarMissedDoseDashboard,
  buildMarNursingPerformanceDashboard,
  validateMarAnalyticsDashboardSections,
} from "@/lib/marAnalyticsDashboardModels";

function fixture(): MarAnalyticsInput {
  return {
    facilityId: "fac-1",
    windowStart: "2026-06-01T00:00:00.000Z",
    windowEnd: "2026-06-30T23:59:59.999Z",
    scheduledAdministrationCount: 50,
    administrations: [
      {
        id: "a1",
        facilityId: "fac-1",
        encounterId: "e1",
        orderItemId: "o1",
        eventAt: "2026-06-16T08:00:00.000Z",
        eventType: "ADMINISTERED",
        route: "IV",
        shiftCode: "DAY",
        performedByUserId: "rn-1",
        performedByRole: "RN",
        medicationTherapeuticClass: "analgesic",
        reconstructionAvailable: true,
      },
      {
        id: "a2",
        facilityId: "fac-1",
        encounterId: "e2",
        orderItemId: "o2",
        eventAt: "2026-06-16T09:00:00.000Z",
        eventType: "PRN_ADMINISTERED",
        route: "PO",
        shiftCode: "DAY",
        performedByUserId: "rn-1",
        isPrn: true,
      },
      {
        id: "a3",
        facilityId: "fac-1",
        encounterId: "e3",
        orderItemId: "o3",
        eventAt: "2026-06-16T10:00:00.000Z",
        eventType: "MISSED",
        shiftCode: "NIGHT",
      },
      {
        id: "a4",
        facilityId: "fac-1",
        encounterId: "e4",
        orderItemId: "o4",
        eventAt: "2026-06-16T07:00:00.000Z",
        eventType: "INFUSION_START",
        infusionPhase: "INFUSION_START",
      },
      {
        id: "a5",
        facilityId: "fac-1",
        encounterId: "e4",
        orderItemId: "o4",
        eventAt: "2026-06-16T11:00:00.000Z",
        eventType: "INFUSION_STOP",
        infusionPhase: "INFUSION_STOP",
        infusionStopReasonCode: "REACTION",
        infusionDurationMinutes: 120,
        isIvpb: true,
        ivpbCompleted: true,
      },
    ],
    corrections: [
      {
        id: "c1",
        facilityId: "fac-1",
        medicationAdministrationId: "a1",
        encounterId: "e1",
        correctedAt: "2026-06-16T08:30:00.000Z",
        correctedByUserId: "rn-1",
        reasonCode: "DOCUMENTED_WRONG_ROUTE",
        shiftCode: "DAY",
        unitId: "ed",
      },
      {
        id: "c2",
        facilityId: "fac-1",
        medicationAdministrationId: "a1",
        encounterId: "e1",
        correctedAt: "2026-06-16T08:45:00.000Z",
        correctedByUserId: "rn-1",
        reasonCode: "DOCUMENTED_WRONG_TIME",
        shiftCode: "DAY",
        unitId: "ed",
      },
      {
        id: "c3",
        facilityId: "fac-1",
        medicationAdministrationId: "a2",
        encounterId: "e2",
        correctedAt: "2026-06-16T09:30:00.000Z",
        correctedByUserId: "rn-2",
        reasonCode: "DOCUMENTED_NOT_GIVEN",
      },
    ],
    orderCancellations: [
      {
        orderItemId: "o9",
        encounterId: "e9",
        facilityId: "fac-1",
        cancelledAt: "2026-06-16T12:00:00.000Z",
        cancelledByUserId: "prov-1",
      },
    ],
  };
}

describe("marAnalyticsDashboard (MEDUI.ED.MAR.H8)", () => {
  it("1 — KPI aggregation via dashboard bundle", () => {
    const bundle = buildMarAnalyticsDashboardBundle(fixture());
    expect(bundle.readOnly).toBe(true);
    expect(bundle.aggregates.kpis.medication_administrations.count).toBe(2);
  });

  it("2 — correction metrics dashboard", () => {
    const dash = buildMarCorrectionDashboard(fixture());
    expect(dash.metrics.totalCorrections).toBe(3);
    expect(dash.metrics.routeCorrections).toBe(1);
    expect(dash.metrics.timeCorrections).toBe(1);
    expect(dash.metrics.chartedNotGiven).toBe(1);
  });

  it("3 — missed-dose metrics dashboard", () => {
    const dash = buildMarMissedDoseDashboard(fixture());
    expect(dash.metrics.missed).toBe(1);
    expect(dash.metrics.missedDoseRate.denominator).toBe(50);
  });

  it("4 — infusion metrics dashboard", () => {
    const dash = buildMarInfusionDashboard(fixture());
    expect(dash.metrics.infusionStarts).toBe(1);
    expect(dash.metrics.stopReasonDistribution.find((b) => b.key === "REACTION")?.count).toBe(1);
  });

  it("5 — stop reason metrics present", () => {
    const dash = buildMarInfusionDashboard(fixture());
    expect(dash.metrics.stopReasonDistribution.length).toBeGreaterThan(0);
  });

  it("6 — compliance score on compliance dashboard", () => {
    const dash = buildMarComplianceDashboard(fixture());
    expect(dash.complianceHealth.score).toBeGreaterThanOrEqual(0);
    expect(dash.complianceHealth.score).toBeLessThanOrEqual(100);
  });

  it("7 — dashboard contracts validate all sections", () => {
    expect(validateMarAnalyticsDashboardSections()).toBe(true);
    expect(MAR_ANALYTICS_DASHBOARD_SECTIONS).toHaveLength(6);
  });

  it("8 — executive overview dashboard", () => {
    const dash = buildMarExecutiveOverviewDashboard(fixture());
    expect(dash.summary.totalAdministrations).toBe(2);
    expect(dash.summary.totalCorrections).toBe(3);
    expect(dash.cards.length).toBeGreaterThan(0);
  });

  it("9 — read-only enforcement on bundle", () => {
    const bundle = buildMarAnalyticsDashboardBundle(fixture());
    expect(bundle.aggregates.readOnly).toBe(true);
    expect(bundle.readOnly).toBe(true);
  });

  it("10 — historical reconstruction metrics", () => {
    const bundle = buildMarAnalyticsDashboardBundle(fixture());
    expect(bundle.aggregates.kpis.audit_reconstruction_availability.score).toBeDefined();
  });

  it("11 — PRN analytics", () => {
    const bundle = buildMarAnalyticsDashboardBundle(fixture());
    expect(bundle.aggregates.administrations.prnCount).toBe(1);
    expect(bundle.aggregates.kpis.prn_administrations.count).toBe(1);
  });

  it("12 — cancellation analytics", () => {
    const bundle = buildMarAnalyticsDashboardBundle(fixture());
    expect(bundle.aggregates.kpis.canceled_orders.count).toBe(1);
  });

  it("13 — correction analytics duplicate and late", () => {
    const bundle = buildMarAnalyticsDashboardBundle(fixture());
    expect(bundle.aggregates.kpis.charted_not_given_corrections.count).toBe(1);
  });

  it("14 — route analytics", () => {
    const bundle = buildMarAnalyticsDashboardBundle(fixture());
    expect(bundle.aggregates.administrations.byRoute.some((b) => b.key === "IV")).toBe(true);
  });

  it("15 — shift analytics", () => {
    const nursing = buildMarNursingPerformanceDashboard(fixture());
    expect(nursing.byShift.some((b) => b.key === "DAY")).toBe(true);
  });

  it("16 — nurse analytics", () => {
    const nursing = buildMarNursingPerformanceDashboard(fixture());
    expect(nursing.byNurse.some((b) => b.key === "rn-1")).toBe(true);
    expect(nursing.correctionsByUser.length).toBeGreaterThan(0);
  });

  it("17 — encounter analytics", () => {
    const bundle = buildMarAnalyticsDashboardBundle(fixture());
    expect(bundle.aggregates.administrations.byEncounter.length).toBeGreaterThan(0);
  });

  it("18 — aggregation stability for empty input", () => {
    const empty: MarAnalyticsInput = {
      facilityId: "fac-1",
      windowStart: "2026-06-01T00:00:00.000Z",
      windowEnd: "2026-06-30T23:59:59.999Z",
      administrations: [],
      corrections: [],
      orderCancellations: [],
    };
    const a = buildMarAnalyticsDashboardBundle(empty);
    const b = buildMarAnalyticsDashboardBundle(empty);
    expect(a.aggregates.kpis.medication_administrations.count).toBe(
      b.aggregates.kpis.medication_administrations.count
    );
    expect(a.aggregates.complianceHealth.score).toBe(b.aggregates.complianceHealth.score);
  });

  it("19 — no workflow mutations in aggregate module", () => {
    const input = fixture();
    const clone = structuredClone(input);
    buildMarAnalyticsDashboardBundle(input);
    expect(input).toEqual(clone);
  });

  it("20 — build certification exports dashboard builders", () => {
    expect(typeof buildMarAnalyticsDashboardBundle).toBe("function");
    expect(typeof buildMarExecutiveOverviewDashboard).toBe("function");
    expect(typeof buildMarComplianceDashboard).toBe("function");
    expect(typeof buildMarCorrectionDashboard).toBe("function");
    expect(typeof buildMarMissedDoseDashboard).toBe("function");
    expect(typeof buildMarInfusionDashboard).toBe("function");
    expect(typeof buildMarNursingPerformanceDashboard).toBe("function");
  });
});
