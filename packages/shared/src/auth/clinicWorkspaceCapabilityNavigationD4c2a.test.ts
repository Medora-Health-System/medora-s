/**
 * MEDUI.D4C.2A — capability-based Clinic workspace navigation tests.
 */

import { describe, expect, it } from "vitest";
import {
  CLINIC_WORKSPACE_NAV_REGISTRY,
  documentHybridFacilityCapabilityMapping,
  isClinicWorkspacePathAllowed,
  isFacilityCareSettingPathAllowed,
  resolveCapabilityAwareNavigationAreas,
  resolveClinicWorkspaceAccess,
  resolveClinicWorkspaceActiveNavId,
  resolveClinicWorkspaceLandingPath,
  resolveFacilityAwareLandingPath,
  resolveVisibleClinicSideNav,
  resolveVisibleClinicTopTabs,
} from "./clinicWorkspaceCapabilityNavigationD4c2a.js";

describe("MEDUI.D4C.2A capability-based navigation", () => {
  it("A — Admin on Clinic-only facility does not see ED/Hospital areas", () => {
    const areas = resolveCapabilityAwareNavigationAreas({
      roleCodes: ["ADMIN"],
      facilityType: "CLINIC",
      facilityServiceLines: null,
    });
    expect(areas).toContain("CLINIC_CARE");
    expect(areas).not.toContain("EMERGENCY");
    expect(areas).not.toContain("HOSPITAL");
  });

  it("B — Clinic top tabs stay nested under /app/clinic-care (no global bounce hrefs)", () => {
    const top = CLINIC_WORKSPACE_NAV_REGISTRY.filter((i) => i.topTab);
    expect(top.length).toBeGreaterThanOrEqual(8);
    for (const item of top) {
      expect(item.href.startsWith("/app/clinic-care")).toBe(true);
      expect(item.href.startsWith("/app/nursing")).toBe(false);
      expect(item.href.startsWith("/app/provider")).toBe(false);
      expect(item.href.startsWith("/app/patients")).toBe(false);
      expect(item.href.startsWith("/app/billing")).toBe(false);
    }
  });

  it("C — role landings: Front Desk → Registration, Provider → Provider, Admin → Trackboard", () => {
    const clinic = resolveClinicWorkspaceAccess({
      roleCodes: ["ADMIN"],
      facilityType: "CLINIC",
    });
    expect(
      resolveClinicWorkspaceLandingPath({
        professionGroup: clinic.professionGroup,
        access: clinic.access,
      })
    ).toBe("/app/clinic-care");

    const front = resolveClinicWorkspaceAccess({
      roleCodes: ["FRONT_DESK"],
      facilityType: "CLINIC",
    });
    expect(
      resolveClinicWorkspaceLandingPath({
        professionGroup: front.professionGroup,
        access: front.access,
      })
    ).toBe("/app/clinic-care/registration");

    const provider = resolveClinicWorkspaceAccess({
      roleCodes: ["PROVIDER"],
      facilityType: "CLINIC",
    });
    expect(
      resolveClinicWorkspaceLandingPath({
        professionGroup: provider.professionGroup,
        access: provider.access,
      })
    ).toBe("/app/clinic-care/provider");

    const rn = resolveClinicWorkspaceAccess({
      roleCodes: ["RN"],
      facilityType: "CLINIC",
    });
    expect(
      resolveClinicWorkspaceLandingPath({
        professionGroup: rn.professionGroup,
        access: rn.access,
      })
    ).toBe("/app/clinic-care/nursing");
  });

  it("D — direct URL: ED/Hospital blocked on Clinic-only even for Admin", () => {
    const profile = {
      roleCodes: ["ADMIN"],
      facilityType: "CLINIC" as const,
      facilityServiceLines: null,
    };
    expect(isFacilityCareSettingPathAllowed("/app/emergency/trackboard", profile)).toBe(false);
    expect(isFacilityCareSettingPathAllowed("/app/hospitalisation", profile)).toBe(false);
    expect(isFacilityCareSettingPathAllowed("/app/clinic-care", profile)).toBe(true);
    expect(isFacilityCareSettingPathAllowed("/app/clinic-care/registration", profile)).toBe(true);
  });

  it("E — hybrid UC+ED shows ED when EMERGENCY line present; does not infer Hospital from Lab", () => {
    const hybrid = resolveCapabilityAwareNavigationAreas({
      roleCodes: ["ADMIN"],
      facilityType: "URGENT_CARE",
      facilityServiceLines: ["URGENT_CARE", "EMERGENCY", "LABORATORY"],
    });
    expect(hybrid).toContain("EMERGENCY");
    expect(hybrid).toContain("CLINIC_CARE");
    // Observation/inpatient not present → no Hospital from Lab alone
    expect(hybrid).not.toContain("HOSPITAL");

    const mapping = documentHybridFacilityCapabilityMapping();
    expect(mapping.neverInferHospitalFrom).toContain("LABORATORY");
    expect(mapping.neverInferHospitalFrom).toContain("PHARMACY");
  });

  it("F — Clinic nested path role filter: Front Desk cannot open Provider tab path", () => {
    const front = resolveClinicWorkspaceAccess({
      roleCodes: ["FRONT_DESK"],
      facilityType: "CLINIC",
    });
    expect(isClinicWorkspacePathAllowed("/app/clinic-care/registration", front.access)).toBe(true);
    expect(isClinicWorkspacePathAllowed("/app/clinic-care/provider", front.access)).toBe(false);
    expect(isClinicWorkspacePathAllowed("/app/clinic-care/nursing", front.access)).toBe(false);

    const provider = resolveClinicWorkspaceAccess({
      roleCodes: ["PROVIDER"],
      facilityType: "CLINIC",
    });
    expect(isClinicWorkspacePathAllowed("/app/clinic-care/provider", provider.access)).toBe(true);
    expect(isClinicWorkspacePathAllowed("/app/clinic-care/nursing", provider.access)).toBe(false);
  });

  it("G — active-state resolution is route-backed", () => {
    expect(resolveClinicWorkspaceActiveNavId("/app/clinic-care")).toBe("trackboard");
    expect(resolveClinicWorkspaceActiveNavId("/app/clinic-care/todays-visits")).toBe("todaysVisits");
    expect(resolveClinicWorkspaceActiveNavId("/app/clinic-care/registration")).toBe("registration");
    expect(resolveClinicWorkspaceActiveNavId("/app/clinic-care/public-health/vaccinations")).toBe(
      "publicHealth"
    );
  });

  it("facility-aware landing prefers Clinic role landing on ambulatory", () => {
    expect(
      resolveFacilityAwareLandingPath({
        roleCodes: ["FRONT_DESK"],
        facilityType: "CLINIC",
      })
    ).toBe("/app/clinic-care/registration");
    expect(
      resolveFacilityAwareLandingPath({
        roleCodes: ["ADMIN"],
        facilityType: "HOSPITAL",
        facilityServiceLines: ["EMERGENCY", "MEDSURG", "OBSERVATION"],
      })
    ).not.toBe("/app/clinic-care/registration");
  });

  it("side nav exposes lab/pharmacy only when role ∩ capability allow", () => {
    const capsOff = resolveClinicWorkspaceAccess({
      roleCodes: ["ADMIN"],
      facilityType: "CLINIC",
      careProfileJson: {
        schemaVersion: 1,
        optionalModules: {
          laboratory: false,
          radiology: false,
          pharmacy: false,
          publicHealth: false,
          billing: true,
        },
      },
      facilityServiceLines: ["CLINIC"],
    });
    const side = resolveVisibleClinicSideNav(capsOff.access);
    expect(side.some((i) => i.id === "laboratory")).toBe(false);
    expect(side.some((i) => i.id === "pharmacy")).toBe(false);
    expect(side.some((i) => i.id === "billing")).toBe(true);

    const top = resolveVisibleClinicTopTabs(capsOff.access);
    expect(top.some((i) => i.id === "trackboard")).toBe(true);
    expect(top.some((i) => i.id === "billing")).toBe(true);
  });

  it("registry has unique ids and stable count", () => {
    const ids = CLINIC_WORKSPACE_NAV_REGISTRY.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(14);
  });
});
