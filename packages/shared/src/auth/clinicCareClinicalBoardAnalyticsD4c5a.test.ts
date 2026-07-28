/**
 * MEDUI.D4C.5A — shared analytics contract tests (A–L coverage helpers).
 */
import { describe, expect, it } from "vitest";
import {
  DeterministicClinicInsightsProvider,
  averageNullable,
  bucketClinicCareVisitType,
  buildClinicCareMissedAppointments,
  buildClinicCarePatientFlow,
  buildClinicCareVisitTypeSlices,
  buildClinicCareVisitsByDaySeries,
  canViewClinicCareFinancialInsights,
  canViewClinicCareProviderProductivity,
  classifyClinicCareVisitsByDaySegment,
  clinicCareEncountersDrillDownHref,
  computeClinicCareWaitMinutes,
  facilityLocalPeriodUtcBounds,
  percentChange,
  projectClinicCarePatientFlowStage,
  resolveClinicCareDashboardAccess,
} from "./clinicCareClinicalBoardAnalyticsD4c5a.js";

describe("MEDUI.D4C.5A clinic clinical board analytics", () => {
  it("A. classifies visits-by-day segments without double-count / teleconsult invent", () => {
    expect(
      classifyClinicCareVisitsByDaySegment({ encounterStatus: "CANCELLED" })
    ).toBe("CANCELLED");
    expect(classifyClinicCareVisitsByDaySegment({ encounterStatus: "CLOSED" })).toBe(
      "COMPLETED"
    );
    expect(
      classifyClinicCareVisitsByDaySegment({
        encounterStatus: "OPEN",
        workflowState: "ARRIVED",
        isTeleconsultation: true,
      })
    ).toBe("WAITING");
    expect(
      classifyClinicCareVisitsByDaySegment({
        encounterStatus: "OPEN",
        workflowState: "IN_TREATMENT",
      })
    ).toBe("NEW");
  });

  it("B. wait minutes exclude missing sides (not zero)", () => {
    expect(
      computeClinicCareWaitMinutes({
        arrivedAt: "2026-07-27T14:00:00.000Z",
        physicianAssignedAt: null,
      })
    ).toBeNull();
    expect(
      computeClinicCareWaitMinutes({
        arrivedAt: "2026-07-27T14:00:00.000Z",
        physicianAssignedAt: "2026-07-27T14:18:00.000Z",
      })
    ).toBe(18);
    expect(averageNullable([18, null, 12]).average).toBe(15);
    expect(averageNullable([18, null, 12]).included).toBe(2);
    expect(averageNullable([null, null]).average).toBeNull();
  });

  it("C. missed appointments count NO_SHOW only", () => {
    const summary = buildClinicCareMissedAppointments({
      appointments: [
        { status: "NO_SHOW", scheduledStartAt: "2026-07-27T15:00:00.000Z" },
        { status: "CANCELLED", scheduledStartAt: "2026-07-27T16:00:00.000Z" },
        { status: "NO_SHOW", scheduledStartAt: "2026-07-21T15:00:00.000Z" },
      ],
      facilityTimeZone: "America/Port-au-Prince",
      todayKey: "2026-07-27",
      weekDayKeys: [
        "2026-07-21",
        "2026-07-22",
        "2026-07-23",
        "2026-07-24",
        "2026-07-25",
        "2026-07-26",
        "2026-07-27",
      ],
    });
    expect(summary.statusSource).toBe("NO_SHOW");
    expect(summary.today).toBe(1);
    expect(summary.week).toBe(2);
  });

  it("D. provider productivity / financial gated to ADMIN only", () => {
    expect(canViewClinicCareProviderProductivity("ADMIN")).toBe(true);
    expect(canViewClinicCareProviderProductivity("PROVIDER")).toBe(false);
    expect(canViewClinicCareFinancialInsights("RN")).toBe(false);
    expect(
      resolveClinicCareDashboardAccess({
        canAccessClinicCareShell: true,
        professionGroup: "PROVIDER",
      }).canViewProviderProductivity
    ).toBe(false);
  });

  it("E. patient flow projects arrived / nursing / provider / completed", () => {
    expect(
      projectClinicCarePatientFlowStage({
        encounterStatus: "OPEN",
        workflowState: "ARRIVED",
      })
    ).toBe("ARRIVED");
    expect(
      projectClinicCarePatientFlowStage({
        encounterStatus: "OPEN",
        workflowState: "TRIAGE",
      })
    ).toBe("NURSING_MA");
    expect(
      projectClinicCarePatientFlowStage({
        encounterStatus: "OPEN",
        workflowState: "IN_TREATMENT",
      })
    ).toBe("WITH_PROVIDER");
    expect(
      projectClinicCarePatientFlowStage({
        encounterStatus: "CLOSED",
        workflowState: "CLOSED",
      })
    ).toBe("COMPLETED");
    const flow = buildClinicCarePatientFlow([
      { status: "OPEN", workflowState: "ARRIVED" },
      { status: "CLOSED", workflowState: "CLOSED" },
    ]);
    expect(flow.find((s) => s.stage === "ARRIVED")?.count).toBe(1);
    expect(flow.find((s) => s.stage === "COMPLETED")?.count).toBe(1);
  });

  it("F. visit types bucket from origin / type without inventing teleconsult", () => {
    expect(bucketClinicCareVisitType({ visitOrigin: "FOLLOW_UP" })).toBe("FOLLOW_UP");
    expect(bucketClinicCareVisitType({ encounterType: "URGENT_CARE" })).toBe("URGENT_CARE");
    expect(bucketClinicCareVisitType({ visitOrigin: "WALK_IN" })).toBe("WALK_IN");
    const slices = buildClinicCareVisitTypeSlices([
      { visitOrigin: "SCHEDULED", encounterType: "OUTPATIENT" },
      { visitOrigin: "WALK_IN", encounterType: "OUTPATIENT" },
    ]);
    expect(slices.find((s) => s.bucket === "CONSULTATION")?.count).toBe(1);
    expect(slices.find((s) => s.bucket === "WALK_IN")?.count).toBe(1);
  });

  it("G. period bounds use facility timezone day keys", () => {
    const week = facilityLocalPeriodUtcBounds(
      new Date("2026-07-27T18:00:00.000Z"),
      "America/Port-au-Prince",
      "WEEK"
    );
    expect(week.dayKeys).toHaveLength(7);
    expect(week.dayKeys[week.dayKeys.length - 1]).toBe(week.localDateKey);
    expect(week.startUtc.getTime()).toBeLessThan(week.endExclusiveUtc.getTime());
  });

  it("H. visits-by-day series stacks exclusive segments", () => {
    const series = buildClinicCareVisitsByDaySeries({
      dayKeys: ["2026-07-27"],
      facilityTimeZone: "UTC",
      encounters: [
        { createdAt: "2026-07-27T10:00:00.000Z", status: "CLOSED" },
        { createdAt: "2026-07-27T11:00:00.000Z", status: "OPEN", workflowState: "ARRIVED" },
        { createdAt: "2026-07-27T12:00:00.000Z", status: "CANCELLED" },
      ],
    });
    expect(series[0]?.completed).toBe(1);
    expect(series[0]?.waiting).toBe(1);
    expect(series[0]?.cancelled).toBe(1);
    expect(series[0]?.teleconsultations).toBe(0);
    expect(series[0]?.total).toBe(3);
  });

  it("I. percent change omits unreliable zero-baseline inflation", () => {
    expect(percentChange(10, 0)).toBeNull();
    expect(percentChange(12, 10)).toEqual({ delta: 20, direction: "up" });
    expect(percentChange(8, 10)?.direction).toBe("down");
  });

  it("J. deterministic insights never invent revenue or patient names", () => {
    const provider = new DeterministicClinicInsightsProvider();
    const insights = provider.buildInsights({
      period: "TODAY",
      kpis: [
        {
          id: "TODAYS_VISITS",
          value: 32,
          comparison: {
            delta: 12,
            direction: "up",
            priorValue: 28,
            labelKey: "vsYesterday",
          },
          sparkline: [20, 24, 28, 32],
          unit: "count",
          coverage: null,
        },
        {
          id: "FOLLOW_UPS_TO_SCHEDULE",
          value: 6,
          comparison: null,
          sparkline: [],
          unit: "patients",
          coverage: null,
        },
      ],
      visitsByDay: [],
      visitTypes: [],
      patientFlow: [],
      waitTrend: [],
      missed: { today: 2, week: 8, statusSource: "NO_SHOW" },
      providerProductivity: [
        {
          providerUserId: "u1",
          providerDisplayName: "Dr. Pierre",
          completedVisitCount: 16,
        },
      ],
      canViewFinancialInsights: true,
      prescriptionsToday: 22,
      followUpPlanningRatePercent: 91,
    });
    expect(insights.some((i) => i.id === "visits-delta")).toBe(true);
    expect(insights.some((i) => i.messageKey.includes("revenue"))).toBe(false);
    const serialized = JSON.stringify(insights);
    expect(serialized).not.toMatch(/patientName|mrn|dob/i);
    expect(insights.every((i) => i.period === "TODAY")).toBe(true);
  });

  it("K. drill-down href carries date filters to encounters", () => {
    expect(
      clinicCareEncountersDrillDownHref({ localDateKey: "2026-07-22" })
    ).toBe("/app/clinic-care/encounters?date=2026-07-22");
    expect(
      clinicCareEncountersDrillDownHref({
        localDateKey: "2026-07-22",
        flowStage: "WITH_PROVIDER",
      })
    ).toContain("flow=WITH_PROVIDER");
  });

  it("L. dashboard access requires clinic shell; revenue never on shared KPI list", () => {
    const access = resolveClinicCareDashboardAccess({
      canAccessClinicCareShell: false,
      professionGroup: "ADMIN",
    });
    expect(access.canViewDashboard).toBe(false);
    expect(access.canViewFinancialInsights).toBe(true);
  });
});
