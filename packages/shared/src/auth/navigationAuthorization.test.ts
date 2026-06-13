import { describe, expect, it } from "vitest";
import {
  getLandingRouteForNavigationProfile,
  getVisibleNavigationAreas,
  resolveNavigationAreas,
} from "./navigationAuthorization.js";

describe("navigationAuthorization (MEDUI.NAV.ROLE.1)", () => {
  it("Admin sees all navigation areas", () => {
    expect(resolveNavigationAreas({ professionGroup: "ADMIN", departmentCode: "ICU" })).toEqual([
      "DASHBOARD",
      "EMERGENCY",
      "HOSPITAL",
      "LABORATORY",
      "RADIOLOGY",
      "PHARMACY",
      "BILLING",
      "ADMINISTRATION",
    ]);
  });

  it("Provider + Emergency", () => {
    expect(resolveNavigationAreas({ professionGroup: "PROVIDER", departmentCode: "EMERGENCY" })).toEqual([
      "DASHBOARD",
      "EMERGENCY",
    ]);
  });

  it("RN + Emergency", () => {
    expect(resolveNavigationAreas({ professionGroup: "RN", departmentCode: "EMERGENCY" })).toEqual([
      "DASHBOARD",
      "EMERGENCY",
    ]);
  });

  it("Technician + Emergency", () => {
    expect(resolveNavigationAreas({ professionGroup: "TECHNICIAN", departmentCode: "EMERGENCY" })).toEqual([
      "DASHBOARD",
      "EMERGENCY",
    ]);
  });

  it("Technician + ICU", () => {
    expect(resolveNavigationAreas({ professionGroup: "TECHNICIAN", departmentCode: "ICU" })).toEqual([
      "DASHBOARD",
      "HOSPITAL",
    ]);
  });

  it("Technician + MedSurg", () => {
    expect(resolveNavigationAreas({ professionGroup: "TECHNICIAN", departmentCode: "MEDSURG" })).toEqual([
      "DASHBOARD",
      "HOSPITAL",
    ]);
  });

  it("Technician + OBGYN", () => {
    expect(resolveNavigationAreas({ professionGroup: "TECHNICIAN", departmentCode: "OBGYN" })).toEqual([
      "DASHBOARD",
      "HOSPITAL",
    ]);
  });

  it("Technician + Pediatrics", () => {
    expect(resolveNavigationAreas({ professionGroup: "TECHNICIAN", departmentCode: "PEDIATRICS" })).toEqual([
      "DASHBOARD",
      "HOSPITAL",
    ]);
  });

  it("Technician + Laboratory", () => {
    expect(resolveNavigationAreas({ professionGroup: "TECHNICIAN", departmentCode: "LABORATORY" })).toEqual([
      "DASHBOARD",
      "LABORATORY",
    ]);
  });

  it("Technician + Radiology", () => {
    expect(resolveNavigationAreas({ professionGroup: "TECHNICIAN", departmentCode: "RADIOLOGY" })).toEqual([
      "DASHBOARD",
      "RADIOLOGY",
    ]);
  });

  it("Pharmacy", () => {
    expect(resolveNavigationAreas({ professionGroup: "PHARMACY", departmentCode: null })).toEqual([
      "DASHBOARD",
      "PHARMACY",
    ]);
  });

  it("Billing", () => {
    expect(resolveNavigationAreas({ professionGroup: "BILLING", departmentCode: null })).toEqual([
      "DASHBOARD",
      "BILLING",
    ]);
  });

  it("Unknown", () => {
    expect(resolveNavigationAreas({ professionGroup: "UNKNOWN", departmentCode: null })).toEqual(["DASHBOARD"]);
  });

  it("resolveNavigationProfile from session role codes", () => {
    expect(
      getVisibleNavigationAreas({ roleCodes: ["LAB"], prismaDepartmentCode: "LAB" })
    ).toEqual(["DASHBOARD", "LABORATORY"]);
  });

  it("landing paths follow navigation profile", () => {
    expect(
      getLandingRouteForNavigationProfile({ roleCodes: ["LAB"], prismaDepartmentCode: "LAB" })
    ).toBe("/app/lab-worklist");
    expect(getLandingRouteForNavigationProfile({ roleCodes: ["ADMIN"] })).toBe("/app/trackboard");
    expect(getLandingRouteForNavigationProfile({ roleCodes: ["RN"] })).toBe("/app/emergency/trackboard");
  });

  it("freestanding ER lab tech sees laboratory, emergency, and observation hospital path", () => {
    expect(
      getVisibleNavigationAreas({
        roleCodes: ["LAB"],
        prismaDepartmentCode: "LABORATORY",
        facilityType: "FREESTANDING_ER",
      })
    ).toEqual(["DASHBOARD", "LABORATORY", "EMERGENCY", "HOSPITAL"]);
  });

  it("freestanding ER lab tech with NULL serviceLinesJson resolves defaults via facilityType", () => {
    expect(
      getVisibleNavigationAreas({
        roleCodes: ["LAB"],
        prismaDepartmentCode: "LABORATORY",
        facilityType: "FREESTANDING_ER",
        facilityServiceLines: null,
      })
    ).toEqual(["DASHBOARD", "LABORATORY", "EMERGENCY", "HOSPITAL"]);
  });

  it("freestanding ER rad tech sees radiology, emergency, and observation hospital path", () => {
    expect(
      getVisibleNavigationAreas({
        roleCodes: ["RADIOLOGY"],
        prismaDepartmentCode: "RADIOLOGY",
        facilityType: "FREESTANDING_ER",
      })
    ).toEqual(["DASHBOARD", "RADIOLOGY", "EMERGENCY", "HOSPITAL"]);
  });

  it("freestanding ER ED tech with lab role sees emergency, lab, and observation", () => {
    expect(
      getVisibleNavigationAreas({
        roleCodes: ["LAB"],
        departmentCode: "EMERGENCY",
        facilityType: "FREESTANDING_ER",
      })
    ).toEqual(["DASHBOARD", "EMERGENCY", "HOSPITAL", "LABORATORY"]);
  });

  it("outside laboratory user sees lab only", () => {
    expect(
      getVisibleNavigationAreas({
        roleCodes: ["LAB"],
        prismaDepartmentCode: "LAB",
        facilityType: "OUTSIDE_LABORATORY",
      })
    ).toEqual(["DASHBOARD", "LABORATORY"]);
  });

  it("clinic lab tech does not see emergency when facility lacks ED line", () => {
    expect(
      getVisibleNavigationAreas({
        roleCodes: ["LAB"],
        prismaDepartmentCode: "LAB",
        facilityType: "CLINIC",
      })
    ).toEqual(["DASHBOARD", "LABORATORY"]);
  });

  it("clinic lab tech does not see observation hospital area (MEDUI.OBS.TECH.1)", () => {
    const areas = getVisibleNavigationAreas({
      roleCodes: ["LAB"],
      prismaDepartmentCode: "LABORATORY",
      facilityType: "CLINIC",
    });
    expect(areas).not.toContain("HOSPITAL");
  });

  it("hospital rad tech does not see freestanding observation board nav (MEDUI.OBS.TECH.1)", () => {
    const areas = getVisibleNavigationAreas({
      roleCodes: ["RADIOLOGY"],
      prismaDepartmentCode: "RADIOLOGY",
      facilityType: "HOSPITAL",
      facilityServiceLines: ["RADIOLOGY", "LABORATORY"],
    });
    expect(areas).not.toContain("HOSPITAL");
    expect(areas).not.toContain("EMERGENCY");
  });

  it("admin sees all areas regardless of facility type", () => {
    expect(
      resolveNavigationAreas({
        professionGroup: "ADMIN",
        departmentCode: "ICU",
        facilityType: "OUTSIDE_LABORATORY",
        facilityServiceLines: ["LABORATORY"],
      })
    ).toEqual([
      "DASHBOARD",
      "EMERGENCY",
      "HOSPITAL",
      "LABORATORY",
      "RADIOLOGY",
      "PHARMACY",
      "BILLING",
      "ADMINISTRATION",
    ]);
  });
});
