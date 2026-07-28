/**
 * MEDUI.D4C.6 — shared ambulatory orders & results contracts (tests A–L).
 */

import { describe, expect, it } from "vitest";
import {
  CLINIC_CARE_AMBULATORY_ORDER_CATEGORIES,
  CLINIC_CARE_AMBULATORY_ORDERS_RESULTS_CERTIFICATION_ID,
  CLINIC_CARE_AMBULATORY_RESULT_INBOX_GROUPS,
  classifyClinicCareAmbulatoryResult,
  clinicCareAmbulatoryOrderDetailPath,
  clinicCareAmbulatoryOrderMatchesFilters,
  clinicCareAmbulatoryOrdersChartPath,
  clinicCareAmbulatoryOrdersEncounterTypes,
  clinicCareAmbulatoryOrdersResultsInsightSafe,
  clinicCareAmbulatoryResultsChartPath,
  clinicCareAmbulatoryResultMatchesGroup,
  isClinicCareAmbulatoryOrdersNavVisible,
  isClinicCareAmbulatoryResultsNavVisible,
  projectClinicCareAmbulatoryOrderCategory,
  projectClinicCareVisitOrderResultBadges,
  resolveClinicCareAmbulatoryOrdersBoardAccess,
  resolveClinicCareAmbulatoryResultsInboxAccess,
  resolveClinicCareWorkspaceRoleAccess,
  resolveClinicWorkspaceActiveNavId,
  resolveFacilityModuleCapabilitiesD4c1,
  resolveVisibleClinicTopTabs,
  type ClinicCareWorkspaceRoleAccess,
} from "../index.js";

function accessFor(
  profession: "PROVIDER" | "RN" | "TECHNICIAN" | "FRONT_DESK" | "BILLING" | "PHARMACY" | "ADMIN",
  roleCodes?: string[]
): { access: ClinicCareWorkspaceRoleAccess; profession: typeof profession } {
  const caps = resolveFacilityModuleCapabilitiesD4c1({
    facilityType: "CLINIC",
    careProfileJson:
      profession === "PHARMACY"
        ? { schemaVersion: 1, optionalModules: { pharmacy: true, laboratory: true } }
        : { schemaVersion: 1, optionalModules: { laboratory: true, radiology: true } },
  });
  const access = resolveClinicCareWorkspaceRoleAccess({
    professionGroup: profession === "ADMIN" ? "ADMIN" : profession,
    moduleCapabilities: caps,
    roleCodes: roleCodes ?? [
      profession === "TECHNICIAN" ? "PATIENT_CARE_TECH" : profession === "ADMIN" ? "ADMIN" : profession,
    ],
  });
  return { access, profession };
}

describe("MEDUI.D4C.6 clinicCareAmbulatoryOrdersResultsD4c6", () => {
  /** A — certification + ambulatory types + REFERENCE_VIRTUAL types */
  it("A. certification id and ambulatory encounter types only", () => {
    expect(CLINIC_CARE_AMBULATORY_ORDERS_RESULTS_CERTIFICATION_ID).toBe("MEDUI.D4C.6");
    expect(clinicCareAmbulatoryOrdersEncounterTypes()).toEqual(["OUTPATIENT", "URGENT_CARE"]);
  });

  /** B — order category projection from enterprise types */
  it("B. projects enterprise order categories without ClinicOrder status", () => {
    expect(projectClinicCareAmbulatoryOrderCategory("LAB")).toBe("LAB");
    expect(projectClinicCareAmbulatoryOrderCategory("IMAGING")).toBe("IMAGING");
    expect(projectClinicCareAmbulatoryOrderCategory("MEDICATION")).toBe("MEDICATION");
    expect(projectClinicCareAmbulatoryOrderCategory("CARE")).toBe("CARE");
    expect(CLINIC_CARE_AMBULATORY_ORDER_CATEGORIES).toContain("ALL");
  });

  /** C — order board filters */
  it("C. filters orders by category and active status", () => {
    expect(
      clinicCareAmbulatoryOrderMatchesFilters({
        orderType: "LAB",
        status: "PLACED",
        category: "LAB",
        statusFilter: "ACTIVE",
      })
    ).toBe(true);
    expect(
      clinicCareAmbulatoryOrderMatchesFilters({
        orderType: "LAB",
        status: "CANCELLED",
        category: "ALL",
        statusFilter: "ACTIVE",
      })
    ).toBe(false);
    expect(
      clinicCareAmbulatoryOrderMatchesFilters({
        orderType: "IMAGING",
        status: "RESULTED",
        category: "MEDICATION",
        statusFilter: "ALL",
      })
    ).toBe(false);
  });

  /** D — result classification groups */
  it("D. classifies critical / abnormal / preliminary / final / acknowledged", () => {
    const critical = classifyClinicCareAmbulatoryResult({
      status: "RESULTED",
      criticalValue: true,
      resultText: "K 7.2 CRITICAL",
    });
    expect(critical.primaryGroup).toBe("CRITICAL");
    expect(critical.groups).toContain("CRITICAL");
    expect(clinicCareAmbulatoryResultMatchesGroup(critical, "CRITICAL")).toBe(true);

    const abnormal = classifyClinicCareAmbulatoryResult({
      status: "RESULTED",
      criticalValue: false,
      resultText: "HGB LOW *",
    });
    expect(abnormal.primaryGroup).toBe("ABNORMAL");

    const prelim = classifyClinicCareAmbulatoryResult({
      status: "IN_PROGRESS",
      resultText: "pending",
    });
    expect(prelim.preliminary).toBe(true);
    expect(prelim.primaryGroup).toBe("PRELIMINARY");

    const acked = classifyClinicCareAmbulatoryResult({
      status: "VERIFIED",
      verifiedAt: "2026-07-28T12:00:00.000Z",
      acknowledgedByProviderAt: "2026-07-28T13:00:00.000Z",
    });
    expect(acked.primaryGroup).toBe("ACKNOWLEDGED");
    expect(CLINIC_CARE_AMBULATORY_RESULT_INBOX_GROUPS).toHaveLength(6);
  });

  /** E — chart deep links (orders / results + ambulatory workspace) */
  it("E. builds canonical ambulatory chart paths for orders and results", () => {
    expect(clinicCareAmbulatoryOrdersChartPath("enc-1")).toBe(
      "/app/encounters/enc-1?workspace=ambulatory&section=orders"
    );
    expect(clinicCareAmbulatoryResultsChartPath("enc-2")).toBe(
      "/app/encounters/enc-2?workspace=ambulatory&section=results"
    );
    expect(clinicCareAmbulatoryOrderDetailPath({ encounterId: "e", orderId: "o1" })).toContain(
      "orderId=o1"
    );
  });

  /** F — provider / RN / admin order board access */
  it("F. provider places; RN views; front desk denied orders board", () => {
    const provider = accessFor("PROVIDER");
    expect(
      resolveClinicCareAmbulatoryOrdersBoardAccess({
        professionGroup: provider.profession,
        access: provider.access,
      })
    ).toMatchObject({ canViewBoard: true, canPlaceOrders: true, techSafeOnly: false });

    const rn = accessFor("RN");
    expect(
      resolveClinicCareAmbulatoryOrdersBoardAccess({
        professionGroup: rn.profession,
        access: rn.access,
      })
    ).toMatchObject({ canViewBoard: true, canPlaceOrders: false });

    const desk = accessFor("FRONT_DESK");
    expect(
      resolveClinicCareAmbulatoryOrdersBoardAccess({
        professionGroup: desk.profession,
        access: desk.access,
      })
    ).toMatchObject({ canViewBoard: false, canPlaceOrders: false });
  });

  /** G — results inbox ack authority */
  it("G. provider/RN may ack; technician tech-safe without ack; front desk denied", () => {
    const provider = accessFor("PROVIDER");
    expect(
      resolveClinicCareAmbulatoryResultsInboxAccess({
        professionGroup: provider.profession,
        access: provider.access,
        roleCodes: ["PROVIDER"],
      }).canAcknowledgeResults
    ).toBe(true);

    const tech = accessFor("TECHNICIAN", ["PATIENT_CARE_TECH"]);
    const techInbox = resolveClinicCareAmbulatoryResultsInboxAccess({
      professionGroup: tech.profession,
      access: tech.access,
      roleCodes: ["PATIENT_CARE_TECH"],
    });
    expect(techInbox.canViewInbox).toBe(true);
    expect(techInbox.canAcknowledgeResults).toBe(false);
    expect(techInbox.techSafeOnly).toBe(true);

    const desk = accessFor("FRONT_DESK");
    expect(
      resolveClinicCareAmbulatoryResultsInboxAccess({
        professionGroup: desk.profession,
        access: desk.access,
      }).canViewInbox
    ).toBe(false);
  });

  /** H — nav visibility + active nav ids */
  it("H. clinic top tabs include orders/results; front desk cannot escalate via nav", () => {
    const provider = accessFor("PROVIDER");
    expect(isClinicCareAmbulatoryOrdersNavVisible(provider.access)).toBe(true);
    expect(isClinicCareAmbulatoryResultsNavVisible(provider.access)).toBe(true);
    const tabs = resolveVisibleClinicTopTabs(provider.access).map((t) => t.id);
    expect(tabs).toContain("orders");
    expect(tabs).toContain("results");

    const desk = accessFor("FRONT_DESK");
    expect(isClinicCareAmbulatoryOrdersNavVisible(desk.access)).toBe(false);
    expect(isClinicCareAmbulatoryResultsNavVisible(desk.access)).toBe(false);
    expect(resolveClinicWorkspaceActiveNavId("/app/clinic-care/orders")).toBe("orders");
    expect(resolveClinicWorkspaceActiveNavId("/app/clinic-care/results")).toBe("results");
  });

  /** I — Today's Visits compact badges */
  it("I. projects compact visit order/result badges", () => {
    expect(
      projectClinicCareVisitOrderResultBadges({
        openOrderCount: 2,
        resultsPendingCount: 1,
        criticalResultUnacknowledged: true,
      })
    ).toEqual({ openOrders: 2, resultsPending: 1, criticalUnacked: true });
  });

  /** J — Clinical Board / AI insight safety (no PHI names) */
  it("J. grounded insights use counts only (no patient names)", () => {
    expect(
      clinicCareAmbulatoryOrdersResultsInsightSafe({
        openOrderCount: 0,
        resultsPendingCount: 0,
        criticalUnackedCount: 3,
      })
    ).toEqual({
      messageKey: "clinicCareD4c6.insights.criticalUnacked",
      params: { count: 3 },
    });
    expect(
      clinicCareAmbulatoryOrdersResultsInsightSafe({
        openOrderCount: 0,
        resultsPendingCount: 0,
        criticalUnackedCount: 0,
      })
    ).toBeNull();
  });

  /** K — pharmacy may view orders when module on; not results inbox */
  it("K. pharmacy views orders board only; not clinical results inbox", () => {
    const pharm = accessFor("PHARMACY");
    expect(
      resolveClinicCareAmbulatoryOrdersBoardAccess({
        professionGroup: pharm.profession,
        access: pharm.access,
      }).canViewBoard
    ).toBe(true);
    expect(
      resolveClinicCareAmbulatoryResultsInboxAccess({
        professionGroup: pharm.profession,
        access: pharm.access,
      }).canViewInbox
    ).toBe(false);
  });

  /** L — no ClinicOrder / ClinicResult authority tokens in contracts */
  it("L. contracts declare enterprise reuse (no ClinicOrder/ClinicResult SOT)", () => {
    const newFinal = classifyClinicCareAmbulatoryResult({
      status: "VERIFIED",
      verifiedAt: "2026-07-28T10:00:00.000Z",
      resultText: "normal",
    });
    expect(newFinal.primaryGroup).toBe("NEW_FINAL");
    expect(newFinal.groups).not.toContain("CLINIC_RESULT" as never);
    expect(clinicCareAmbulatoryOrdersChartPath("x")).not.toContain("clinic-order");
  });
});
