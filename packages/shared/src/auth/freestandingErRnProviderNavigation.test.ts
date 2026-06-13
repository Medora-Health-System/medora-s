import { describe, expect, it } from "vitest";
import {
  filterHrefListForFreestandingErRnProviderSidebar,
  FREESTANDING_ER_RN_PROVIDER_SIDEBAR_HREFS,
  resolveEnterpriseProcedureIdFromCareQuickKey,
  shouldApplyFreestandingErRnProviderSidebarAllowlist,
} from "./freestandingErRnProviderNavigation.js";

describe("freestandingErRnProviderNavigation (MEDUI.ED.PROCEDURE.TECH.1A)", () => {
  it("maps ekg_workflow quick key to ekg_ecg catalog id", () => {
    expect(resolveEnterpriseProcedureIdFromCareQuickKey("ekg_workflow")).toBe("ekg_ecg");
  });

  it("applies FSER sidebar allowlist for RN at freestanding ER", () => {
    expect(
      shouldApplyFreestandingErRnProviderSidebarAllowlist({
        roleCodes: ["RN"],
        facilityType: "FREESTANDING_ER",
      })
    ).toBe(true);
  });

  it("does not apply FSER sidebar allowlist for hospital RN", () => {
    expect(
      shouldApplyFreestandingErRnProviderSidebarAllowlist({
        roleCodes: ["RN"],
        facilityType: "HOSPITAL",
      })
    ).toBe(false);
  });

  it("filters hospital clutter from FSER RN sidebar", () => {
    const items = [
      { href: "/app/emergency/trackboard" },
      { href: "/app/emergency/triage" },
      { href: "/app/registration" },
      { href: "/app/lab-worklist" },
      { href: "/app/hospitalisation" },
      { href: "/app/trackboard" },
      { href: "/app/nursing" },
      { href: "/app/provider" },
      { href: "/app/patients" },
    ];
    const filtered = filterHrefListForFreestandingErRnProviderSidebar(items, {
      roleCodes: ["RN"],
      facilityType: "FREESTANDING_ER",
    });
    expect(filtered.map((item) => item.href)).toEqual([
      "/app/emergency/trackboard",
      "/app/emergency/triage",
      "/app/registration",
      "/app/lab-worklist",
      "/app/hospitalisation",
    ]);
    expect(FREESTANDING_ER_RN_PROVIDER_SIDEBAR_HREFS).toHaveLength(5);
  });

  it("does not add radiology worklist for RN without RADIOLOGY role", () => {
    const filtered = filterHrefListForFreestandingErRnProviderSidebar(
      [{ href: "/app/rad-worklist" }, { href: "/app/lab-worklist" }],
      { roleCodes: ["RN"], facilityType: "FREESTANDING_ER" }
    );
    expect(filtered.map((item) => item.href)).toEqual(["/app/lab-worklist"]);
  });

  it("keeps hospital RN sidebar unchanged", () => {
    const items = [{ href: "/app/nursing" }, { href: "/app/trackboard" }];
    const filtered = filterHrefListForFreestandingErRnProviderSidebar(items, {
      roleCodes: ["RN"],
      facilityType: "HOSPITAL",
    });
    expect(filtered).toEqual(items);
  });
});
