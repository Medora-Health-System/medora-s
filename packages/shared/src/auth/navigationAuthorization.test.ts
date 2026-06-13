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
});
