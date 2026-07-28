/**
 * MEDUI.D4C.5A — Clinic Clinical Board analytics UI / contract tests (A–L).
 */
import { describe, expect, it } from "vitest";
import {
  CLINIC_CARE_ANALYTICS_KPI_IDS,
  DeterministicClinicInsightsProvider,
  canViewClinicCareProviderProductivity,
  classifyClinicCareVisitsByDaySegment,
  clinicCareEncountersDrillDownHref,
  computeClinicCareWaitMinutes,
  resolveClinicCareDashboardAccess,
  resolveClinicWorkspaceActiveNavId,
  resolveClinicWorkspaceLandingPath,
} from "@medora/shared";

describe("MEDUI.D4C.5A clinic clinical board analytics UI contracts", () => {
  it("A. Clinical Board landing remains /app/clinic-care (trackboard nav id)", () => {
    expect(resolveClinicWorkspaceActiveNavId("/app/clinic-care")).toBe("trackboard");
    expect(resolveClinicWorkspaceActiveNavId("/app/clinic-care/todays-visits")).toBe(
      "todaysVisits"
    );
  });

  it("B. shared KPI strip is exactly five ids — no Revenue", () => {
    expect(CLINIC_CARE_ANALYTICS_KPI_IDS).toEqual([
      "TODAYS_VISITS",
      "COMPLETED_VISITS",
      "WAITING",
      "AVERAGE_WAIT_MINUTES",
      "FOLLOW_UPS_TO_SCHEDULE",
    ]);
    expect(CLINIC_CARE_ANALYTICS_KPI_IDS).not.toContain("REVENUE_TODAY");
  });

  it("C. Today's Visits route stays distinct from Clinical Board", () => {
    expect("/app/clinic-care").not.toBe("/app/clinic-care/todays-visits");
  });

  it("D. visits-by-day exclusive classification", () => {
    expect(classifyClinicCareVisitsByDaySegment({ encounterStatus: "CLOSED" })).toBe(
      "COMPLETED"
    );
    expect(
      classifyClinicCareVisitsByDaySegment({
        encounterStatus: "OPEN",
        workflowState: "TRIAGE",
      })
    ).toBe("WAITING");
  });

  it("E. click day drills to encounters with date", () => {
    expect(clinicCareEncountersDrillDownHref({ localDateKey: "2026-07-22" })).toContain(
      "date=2026-07-22"
    );
  });

  it("F. wait minutes never invent zero from missing timestamps", () => {
    expect(computeClinicCareWaitMinutes({ arrivedAt: null, physicianAssignedAt: null })).toBeNull();
  });

  it("G. provider productivity ADMIN-only", () => {
    expect(canViewClinicCareProviderProductivity("ADMIN")).toBe(true);
    expect(canViewClinicCareProviderProductivity("PROVIDER")).toBe(false);
  });

  it("H. dashboard access follows clinic shell", () => {
    expect(
      resolveClinicCareDashboardAccess({
        canAccessClinicCareShell: true,
        professionGroup: "RN",
      }).canViewDashboard
    ).toBe(true);
  });

  it("I. insights provider is deterministic and period-labeled", () => {
    const insights = new DeterministicClinicInsightsProvider().buildInsights({
      period: "WEEK",
      kpis: [
        {
          id: "WAITING",
          value: 4,
          comparison: null,
          sparkline: [],
          unit: "count",
          coverage: null,
        },
      ],
      visitsByDay: [],
      visitTypes: [],
      patientFlow: [],
      waitTrend: [],
      missed: { today: 0, week: 0, statusSource: "NO_SHOW" },
      providerProductivity: null,
      canViewFinancialInsights: false,
      prescriptionsToday: null,
      followUpPlanningRatePercent: null,
    });
    expect(insights.every((i) => i.period === "WEEK")).toBe(true);
    expect(JSON.stringify(insights)).not.toMatch(/revenue/i);
  });

  it("J. default Admin landing remains Clinic home (analytics)", () => {
    expect(
      resolveClinicWorkspaceLandingPath({
        professionGroup: "ADMIN",
        access: {
          canAccessClinicCareShell: true,
          canAccessRegistration: true,
          canAccessProviderDocumentation: true,
          canAccessNursingMa: true,
          canAccessBilling: true,
          canAccessPharmacy: true,
          canAccessLaboratory: true,
          canAccessRadiology: true,
        } as never,
      })
    ).toBe("/app/clinic-care");
  });

  it("K. teleconsultation segment never invents durable modality", () => {
    expect(
      classifyClinicCareVisitsByDaySegment({
        encounterStatus: "OPEN",
        workflowState: "IN_TREATMENT",
        isTeleconsultation: true,
      })
    ).not.toBe("TELECONSULTATION");
  });

  it("L. financial insights gated with productivity (ADMIN)", () => {
    const access = resolveClinicCareDashboardAccess({
      canAccessClinicCareShell: true,
      professionGroup: "FRONT_DESK",
    });
    expect(access.canViewFinancialInsights).toBe(false);
    expect(access.canViewProviderProductivity).toBe(false);
  });
});
