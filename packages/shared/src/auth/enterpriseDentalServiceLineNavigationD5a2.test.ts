/**
 * MEDUI.D5A.2 — Enterprise Dental service line and navigation tests.
 */

import { describe, expect, it } from "vitest";
import {
  assertNoForbiddenDentalAuthoritiesInD5a2,
  D5A2_DENTAL_CAPABILITIES,
  D5A2_DENTAL_DASHBOARD_SECTIONS,
  D5A2_DENTAL_NAV_REGISTRY,
  D5A2_DENTAL_SERVICE_LINE,
  D5A2_DENTAL_SPECIALTIES,
  D5A2_DENTAL_WORKSPACE_TABS,
  d5a2SpecialtyCoversD5a1Proposals,
  ENTERPRISE_DENTAL_SERVICE_LINE_NAVIGATION_CERTIFICATION_ID,
  facilityHasDentalServiceLine,
  isFacilityCareSettingPathAllowed,
  normalizeServiceLineToken,
  parseDentalSpecialtiesConfig,
  projectDentalDashboardShellPlaceholders,
  resolveDentalCapabilityCodes,
  resolveDentalWorkspaceAccess,
  resolveFacilityModuleCapabilitiesD4c1,
  resolveFacilityNavigation,
  resolveVisibleDentalNavItems,
} from "../index.js";

describe("MEDUI.D5A.2 dental service line and navigation", () => {
  it("registers certification id and DENTAL service-line token", () => {
    expect(ENTERPRISE_DENTAL_SERVICE_LINE_NAVIGATION_CERTIFICATION_ID).toBe("MEDUI.D5A.2");
    expect(D5A2_DENTAL_SERVICE_LINE).toBe("DENTAL");
    expect(normalizeServiceLineToken("DENTAL")).toBe("DENTAL");
    expect(normalizeServiceLineToken("DENTAL_CARE")).toBe("DENTAL");
    expect(normalizeServiceLineToken("SOINS_DENTAIRES")).toBe("DENTAL");
  });

  it("registers capabilities and specialties without RoleCode forks", () => {
    expect(D5A2_DENTAL_CAPABILITIES).toContain("DENTAL_VIEW");
    expect(D5A2_DENTAL_CAPABILITIES).toContain("DENTAL_PROVIDER");
    expect(D5A2_DENTAL_CAPABILITIES).toContain("DENTAL_ADMIN");
    expect(D5A2_DENTAL_CAPABILITIES).toContain("ORTHODONTICS_VIEW");
    expect(D5A2_DENTAL_CAPABILITIES).toContain("ODONTOGRAM_EDIT");
    expect(D5A2_DENTAL_SPECIALTIES).toContain("GENERAL_DENTISTRY");
    expect(D5A2_DENTAL_SPECIALTIES).toContain("ORTHODONTICS");
    expect(D5A2_DENTAL_SPECIALTIES).toContain("PEDIATRIC_DENTISTRY");
    expect(d5a2SpecialtyCoversD5a1Proposals()).toBe(true);
  });

  it("parses dental specialty configuration", () => {
    expect(parseDentalSpecialtiesConfig(["general_dentistry", "ORTHODONTICS", "ORTHODONTICS"])).toEqual([
      "GENERAL_DENTISTRY",
      "ORTHODONTICS",
    ]);
    expect(parseDentalSpecialtiesConfig(["NOT_A_SPECIALTY"])).toEqual([]);
  });

  it("enables dentalCareEnabled from DENTAL service line on any facility type", () => {
    const clinic = resolveFacilityModuleCapabilitiesD4c1({
      facilityType: "CLINIC",
      serviceLines: ["CLINIC", "DENTAL", "LABORATORY"],
    });
    expect(clinic.dentalCareEnabled).toBe(true);
    expect(clinic.clinicCareEnabled).toBe(true);

    const hospital = resolveFacilityModuleCapabilitiesD4c1({
      facilityType: "HOSPITAL",
      serviceLines: ["EMERGENCY", "DENTAL"],
    });
    expect(hospital.dentalCareEnabled).toBe(true);

    const noDental = resolveFacilityModuleCapabilitiesD4c1({
      facilityType: "CLINIC",
      serviceLines: ["CLINIC"],
    });
    expect(noDental.dentalCareEnabled).toBe(false);
  });

  it("exposes DENTAL_CARE navigation when dental is enabled", () => {
    const nav = resolveFacilityNavigation({
      roleCodes: ["PROVIDER"], professionCodes: ["DENTIST"], departmentCodes: ["DENTAL"],
      facilityType: "CLINIC",
      facilityServiceLines: ["CLINIC", "DENTAL"],
    });
    expect(nav.dentalCareVisible).toBe(true);
    expect(nav.areas).toContain("DENTAL_CARE");
    expect(nav.capabilities.dentalCareEnabled).toBe(true);
  });

  it("hides DENTAL_CARE when service line is absent (Admin cannot restore)", () => {
    const nav = resolveFacilityNavigation({
      roleCodes: ["ADMIN"],
      facilityType: "CLINIC",
      facilityServiceLines: ["CLINIC"],
    });
    expect(nav.capabilities.dentalCareEnabled).toBe(false);
    expect(nav.dentalCareVisible).toBe(false);
    expect(nav.areas).not.toContain("DENTAL_CARE");
  });

  it("gates /app/dental routes by dentalCareEnabled", () => {
    expect(
      isFacilityCareSettingPathAllowed("/app/dental", {
        roleCodes: ["PROVIDER"], professionCodes: ["DENTIST"], departmentCodes: ["DENTAL"],
        facilityType: "CLINIC",
        facilityServiceLines: ["CLINIC", "DENTAL"],
      })
    ).toBe(true);
    expect(
      isFacilityCareSettingPathAllowed("/app/dental/provider", {
        roleCodes: ["PROVIDER"], professionCodes: ["DENTIST"], departmentCodes: ["DENTAL"],
        facilityType: "CLINIC",
        facilityServiceLines: ["CLINIC"],
      })
    ).toBe(false);
  });

  it("resolves capability-first workspace access", () => {
    const provider = resolveDentalWorkspaceAccess({
      roleCodes: ["PROVIDER"], professionCodes: ["DENTIST"], departmentCodes: ["DENTAL"],
      dentalCareEnabled: true,
      specialties: ["ORTHODONTICS", "PERIODONTICS"],
    });
    expect(provider.canAccessDentalShell).toBe(true);
    expect(provider.canAccessDentalProvider).toBe(true);
    expect(provider.canEditOdontogram).toBe(true);
    expect(provider.canEditPeriodontal).toBe(true);
    expect(provider.canEditTreatmentPlan).toBe(true);
    expect(provider.canPerformProcedures).toBe(true);
    expect(provider.canEditOrthodontics).toBe(true);
    expect(provider.capabilities).toContain("PERIODONTAL_CHART_EDIT");

    // MEDUI.D5A.5A — ADMIN+PROVIDER must retain clinical authoring (profession winner is ADMIN).
    const adminProvider = resolveDentalWorkspaceAccess({
      roleCodes: ["ADMIN", "PROVIDER"],
      dentalCareEnabled: true,
      specialties: ["GENERAL_DENTISTRY"],
    });
    expect(adminProvider.canAccessDentalAdmin).toBe(true);
    expect(adminProvider.canEditPeriodontal).toBe(true);
    expect(adminProvider.canEditTreatmentPlan).toBe(true);
    expect(adminProvider.canPerformProcedures).toBe(true);
    expect(adminProvider.canEditOdontogram).toBe(true);

    // MEDUI.D5A.5C — Facility ADMIN alone authors clinical board by default.
    const adminOnly = resolveDentalWorkspaceAccess({
      roleCodes: ["ADMIN"],
      dentalCareEnabled: true,
    });
    expect(adminOnly.canEditPeriodontal).toBe(true);
    expect(adminOnly.canEditTreatmentPlan).toBe(true);
    expect(adminOnly.canPerformProcedures).toBe(true);

    // Platform operator alone does not inherit clinical write.
    const platformOnly = resolveDentalWorkspaceAccess({
      roleCodes: ["MEDORA_SUPER_ADMIN"],
      dentalCareEnabled: true,
    });
    expect(platformOnly.canEditPeriodontal).toBe(false);
    expect(platformOnly.canEditTreatmentPlan).toBe(false);
    expect(platformOnly.canPerformProcedures).toBe(false);

    const billing = resolveDentalCapabilityCodes({
      roleCodes: ["BILLING"],
      dentalCareEnabled: true,
    });
    expect(billing).toContain("DENTAL_VIEW");
    expect(billing).toContain("DENTAL_BILLING_VIEW");
    expect(billing).not.toContain("DENTAL_PROVIDER");

    const denied = resolveDentalWorkspaceAccess({
      roleCodes: ["PROVIDER"], professionCodes: ["DENTIST"], departmentCodes: ["DENTAL"],
      dentalCareEnabled: false,
    });
    expect(denied.canAccessDentalShell).toBe(false);
  });

  it("filters navigation registry by capability", () => {
    const access = resolveDentalWorkspaceAccess({
      roleCodes: ["FRONT_DESK"],
      dentalCareEnabled: true,
    });
    const items = resolveVisibleDentalNavItems(access);
    expect(items.some((i) => i.id === "dashboard")).toBe(true);
    expect(items.some((i) => i.id === "admin")).toBe(false);
    expect(items.some((i) => i.id === "provider")).toBe(false);
  });

  it("defines dashboard and workspace shells without clinical engines", () => {
    expect(D5A2_DENTAL_DASHBOARD_SECTIONS).toContain("todaysAppointments");
    expect(D5A2_DENTAL_DASHBOARD_SECTIONS).toContain("orthodonticCases");
    expect(D5A2_DENTAL_WORKSPACE_TABS).toContain("odontogram");
    expect(D5A2_DENTAL_WORKSPACE_TABS).toContain("periodontal");
    expect(D5A2_DENTAL_NAV_REGISTRY.some((n) => n.href === "/app/dental")).toBe(true);
    const placeholders = projectDentalDashboardShellPlaceholders();
    expect(placeholders.todaysAppointments.status).toBe("placeholder");
  });

  it("forbids DentalPatient and duplicate authorities", () => {
    expect(assertNoForbiddenDentalAuthoritiesInD5a2(["Patient", "Encounter"]).ok).toBe(true);
    expect(assertNoForbiddenDentalAuthoritiesInD5a2(["DentalPatient"]).ok).toBe(false);
    expect(facilityHasDentalServiceLine(["CLINIC", "DENTAL"])).toBe(true);
  });
});
