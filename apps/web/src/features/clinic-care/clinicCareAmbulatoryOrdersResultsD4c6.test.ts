/**
 * MEDUI.D4C.6 — web ambulatory orders & results presentation (tests A–L).
 */

import { describe, expect, it } from "vitest";
import {
  CLINIC_CARE_AMBULATORY_ORDER_CATEGORIES,
  CLINIC_CARE_AMBULATORY_RESULT_INBOX_GROUPS,
  classifyClinicCareAmbulatoryResult,
  clinicCareAmbulatoryOrderMatchesFilters,
  clinicCareAmbulatoryOrdersChartPath,
  clinicCareAmbulatoryResultsChartPath,
  isClinicCareAmbulatoryOrdersNavVisible,
  isClinicCareAmbulatoryResultsNavVisible,
  resolveClinicCareAmbulatoryOrdersBoardAccess,
  resolveClinicCareAmbulatoryResultsInboxAccess,
  resolveClinicCareWorkspaceRoleAccess,
  resolveClinicWorkspaceActiveNavId,
  resolveFacilityModuleCapabilitiesD4c1,
  resolveVisibleClinicTopTabs,
} from "@medora/shared";
import {
  CLINIC_CARE_ORDERS,
  CLINIC_CARE_RESULTS,
} from "./clinicCarePaths";

function clinicAccess(profession: "PROVIDER" | "RN" | "FRONT_DESK" | "TECHNICIAN") {
  const caps = resolveFacilityModuleCapabilitiesD4c1({
    facilityType: "CLINIC",
    careProfileJson: { schemaVersion: 1, optionalModules: { laboratory: true } },
  });
  return resolveClinicCareWorkspaceRoleAccess({
    professionGroup: profession,
    moduleCapabilities: caps,
    roleCodes: [profession === "TECHNICIAN" ? "PATIENT_CARE_TECH" : profession],
  });
}

describe("MEDUI.D4C.6 clinicCareAmbulatoryOrdersResults web", () => {
  it("A. clinic paths for orders and results boards", () => {
    expect(CLINIC_CARE_ORDERS).toBe("/app/clinic-care/orders");
    expect(CLINIC_CARE_RESULTS).toBe("/app/clinic-care/results");
  });

  it("B. active nav resolves orders/results segments", () => {
    expect(resolveClinicWorkspaceActiveNavId("/app/clinic-care/orders")).toBe("orders");
    expect(resolveClinicWorkspaceActiveNavId("/app/clinic-care/results")).toBe("results");
  });

  it("C. provider top tabs include orders and results (no second sidebar)", () => {
    const access = clinicAccess("PROVIDER");
    const ids = resolveVisibleClinicTopTabs(access).map((t) => t.id);
    expect(ids).toContain("orders");
    expect(ids).toContain("results");
    expect(ids).not.toContain("sideNav" as never);
  });

  it("D. front desk cannot see orders/results tabs (no URL escalation)", () => {
    const access = clinicAccess("FRONT_DESK");
    expect(isClinicCareAmbulatoryOrdersNavVisible(access)).toBe(false);
    expect(isClinicCareAmbulatoryResultsNavVisible(access)).toBe(false);
  });

  it("E. chart deep links use enterprise encounter + ambulatory workspace", () => {
    expect(clinicCareAmbulatoryOrdersChartPath("abc")).toContain("tab=orders");
    expect(clinicCareAmbulatoryOrdersChartPath("abc")).toContain("workspace=ambulatory");
    expect(clinicCareAmbulatoryResultsChartPath("abc")).toContain("tab=results");
  });

  it("F. order filters reuse enterprise categories", () => {
    expect(CLINIC_CARE_AMBULATORY_ORDER_CATEGORIES).toEqual([
      "ALL",
      "LAB",
      "IMAGING",
      "MEDICATION",
      "CARE",
    ]);
    expect(
      clinicCareAmbulatoryOrderMatchesFilters({
        orderType: "MEDICATION",
        status: "SIGNED",
        category: "MEDICATION",
        statusFilter: "SIGNED",
      })
    ).toBe(true);
  });

  it("G. result inbox groups cover critical through all", () => {
    expect(CLINIC_CARE_AMBULATORY_RESULT_INBOX_GROUPS).toEqual([
      "CRITICAL",
      "ABNORMAL",
      "NEW_FINAL",
      "PRELIMINARY",
      "ACKNOWLEDGED",
      "ALL",
    ]);
  });

  it("H. critical and abnormal are not color-only (text flags in classification)", () => {
    const c = classifyClinicCareAmbulatoryResult({
      status: "RESULTED",
      criticalValue: true,
      resultText: "troponin CRITICAL",
    });
    expect(c.critical).toBe(true);
    expect(c.primaryGroup).toBe("CRITICAL");
    const a = classifyClinicCareAmbulatoryResult({
      status: "RESULTED",
      resultText: "WBC HIGH",
    });
    expect(a.abnormal).toBe(true);
  });

  it("I. provider can place; RN nursing-authorized views without place", () => {
    const provider = resolveClinicCareAmbulatoryOrdersBoardAccess({
      professionGroup: "PROVIDER",
      access: clinicAccess("PROVIDER"),
    });
    expect(provider.canPlaceOrders).toBe(true);
    const rn = resolveClinicCareAmbulatoryOrdersBoardAccess({
      professionGroup: "RN",
      access: clinicAccess("RN"),
    });
    expect(rn.canViewBoard).toBe(true);
    expect(rn.canPlaceOrders).toBe(false);
  });

  it("J. acknowledgement authority matches enterprise clinician roles", () => {
    const rn = resolveClinicCareAmbulatoryResultsInboxAccess({
      professionGroup: "RN",
      access: clinicAccess("RN"),
      roleCodes: ["RN"],
    });
    expect(rn.canAcknowledgeResults).toBe(true);
    const tech = resolveClinicCareAmbulatoryResultsInboxAccess({
      professionGroup: "TECHNICIAN",
      access: clinicAccess("TECHNICIAN"),
      roleCodes: ["PATIENT_CARE_TECH"],
    });
    expect(tech.techSafeOnly).toBe(true);
    expect(tech.canAcknowledgeResults).toBe(false);
  });

  it("K. placement path is chart orders tab (no Clinic composer route)", () => {
    const path = clinicCareAmbulatoryOrdersChartPath("enc");
    expect(path.startsWith("/app/encounters/")).toBe(true);
    expect(path).not.toContain("/clinic-care/compose");
    expect(path).not.toContain("ClinicOrder");
  });

  it("L. results detail path reuses enterprise results tab", () => {
    const path = clinicCareAmbulatoryResultsChartPath("enc");
    expect(path).toContain("/app/encounters/");
    expect(path).toContain("tab=results");
    expect(path).not.toContain("ClinicResult");
  });
});
