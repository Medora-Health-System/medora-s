import { describe, expect, it } from "vitest";
import {
  CLINIC_CARE_TRACKBOARD_METRIC_CONTRACTS,
  CLINIC_CARE_TRACKBOARD_METRIC_IDS,
  applyOptionalModulesToServiceLines,
  buildFacilityCareProfileJson,
  getClinicDefaultServiceLines,
  getUrgentCareDefaultServiceLines,
  normalizeFacilityOperationalAddress,
  projectFacilityPrintIdentity,
  resolveClinicCareWorkspaceRoleAccess,
  resolveFacilityCareProfile,
  resolveFacilityModuleCapabilitiesD4c1,
  resolveFacilityNavigation,
} from "./facilityClinicCareProfileD4c1.js";
import { getDefaultServiceLinesForFacilityType } from "./facilityTypeRegistry.js";
import { getVisibleNavigationAreas } from "./navigationAuthorization.js";

describe("MEDUI.D4C.1 facility clinic care profile", () => {
  it("clinic defaults are ambulatory Clinic + Laboratory (not Observation→Hospital)", () => {
    expect(getDefaultServiceLinesForFacilityType("CLINIC")).toEqual(["CLINIC", "LABORATORY"]);
    expect(getClinicDefaultServiceLines()).toEqual(["CLINIC", "LABORATORY"]);
  });

  it("urgent care defaults are ambulatory UC + Lab + Rad", () => {
    expect(getDefaultServiceLinesForFacilityType("URGENT_CARE")).toEqual([
      "URGENT_CARE",
      "LABORATORY",
      "RADIOLOGY",
    ]);
    expect(getUrgentCareDefaultServiceLines()).toEqual(["URGENT_CARE", "LABORATORY", "RADIOLOGY"]);
  });

  it("resolves Clinic / UC / hybrid profiles without converting Hospital", () => {
    expect(resolveFacilityCareProfile({ facilityType: "CLINIC" })).toBe("CLINIC");
    expect(resolveFacilityCareProfile({ facilityType: "URGENT_CARE" })).toBe("URGENT_CARE");
    expect(
      resolveFacilityCareProfile({
        facilityType: "CLINIC",
        serviceLines: ["CLINIC", "URGENT_CARE", "LABORATORY"],
      })
    ).toBe("CLINIC_AND_URGENT_CARE");
    expect(resolveFacilityCareProfile({ facilityType: "HOSPITAL" })).toBe("HOSPITAL");
    expect(resolveFacilityCareProfile({ facilityType: "FREESTANDING_ER" })).toBe("FREESTANDING_ER");
  });

  it("normalizes operational address and projects print identity", () => {
    const address = normalizeFacilityOperationalAddress({
      line1: " 123 Main ",
      city: "Port-au-Prince",
      phone: "",
    });
    expect(address.line1).toBe("123 Main");
    expect(address.phone).toBeNull();

    const print = projectFacilityPrintIdentity({
      facilityName: "Alpha Clinic",
      careProfileJson: buildFacilityCareProfileJson({
        profile: "CLINIC",
        printDisplayName: "Alpha Clinic Letterhead",
        address: { line1: "1 Rue Test", city: "Cap-Haïtien", phone: "509-555-0100" },
      }),
    });
    expect(print.displayName).toBe("Alpha Clinic Letterhead");
    expect(print.address.line1).toBe("1 Rue Test");
    expect(print.address.phone).toBe("509-555-0100");
  });

  it("falls back to billing address when operational address empty", () => {
    const print = projectFacilityPrintIdentity({
      facilityName: "Beta UC",
      careProfileJson: buildFacilityCareProfileJson({ profile: "URGENT_CARE" }),
      billingAddress: { line1: "Billing St", city: "Jacmel", phone: "509-111" },
    });
    expect(print.address.line1).toBe("Billing St");
  });

  it("resolveFacilityNavigation hides ED/Hospital for Clinic and exposes Clinic Care", () => {
    const nav = resolveFacilityNavigation({
      roleCodes: ["RN"],
      prismaDepartmentCode: "PRIMARY_CARE",
      facilityType: "CLINIC",
      facilityServiceLines: null,
    });
    expect(nav.clinicCareVisible).toBe(true);
    expect(nav.edVisible).toBe(false);
    expect(nav.hospitalVisible).toBe(false);
    expect(nav.areas).toContain("CLINIC_CARE");
    expect(nav.areas).toContain("REGISTRATION");
    expect(nav.areas).toContain("LABORATORY");
    expect(nav.areas).not.toContain("EMERGENCY");
    expect(nav.areas).not.toContain("HOSPITAL");
    expect(nav.landingPath).toBe("/app/clinic-care");
  });

  it("urgent care ambulatory hides ED/Hospital unless hybrid EMERGENCY line", () => {
    const ambulatory = resolveFacilityNavigation({
      roleCodes: ["PROVIDER"],
      prismaDepartmentCode: "EMERGENCY",
      facilityType: "URGENT_CARE",
      facilityServiceLines: null,
    });
    expect(ambulatory.edVisible).toBe(false);
    expect(ambulatory.hospitalVisible).toBe(false);
    expect(ambulatory.clinicCareVisible).toBe(true);

    const hybrid = resolveFacilityNavigation({
      roleCodes: ["PROVIDER"],
      prismaDepartmentCode: "EMERGENCY",
      facilityType: "URGENT_CARE",
      facilityServiceLines: ["URGENT_CARE", "EMERGENCY", "OBSERVATION", "LABORATORY"],
    });
    expect(hybrid.edVisible).toBe(true);
    expect(hybrid.hospitalVisible).toBe(true);
  });

  it("optional Lab/Rad/Pharmacy modules adjust service lines", () => {
    const withPharmacy = applyOptionalModulesToServiceLines(["CLINIC", "LABORATORY"], {
      laboratory: true,
      radiology: true,
      pharmacy: true,
      publicHealth: false,
      billing: true,
    });
    expect(withPharmacy).toEqual(expect.arrayContaining(["CLINIC", "LABORATORY", "RADIOLOGY", "PHARMACY"]));
  });

  it("role access separates provider documentation from nursing; authorized tech gets Clinic Care shell", () => {
    const caps = resolveFacilityModuleCapabilitiesD4c1({ facilityType: "CLINIC" });
    const provider = resolveClinicCareWorkspaceRoleAccess({
      professionGroup: "PROVIDER",
      moduleCapabilities: caps,
    });
    const nurse = resolveClinicCareWorkspaceRoleAccess({
      professionGroup: "RN",
      moduleCapabilities: caps,
    });
    const tech = resolveClinicCareWorkspaceRoleAccess({
      professionGroup: "TECHNICIAN",
      moduleCapabilities: caps,
      roleCodes: ["PATIENT_CARE_TECH"],
    });
    const front = resolveClinicCareWorkspaceRoleAccess({
      professionGroup: "FRONT_DESK",
      moduleCapabilities: caps,
    });

    expect(provider.canAccessProviderDocumentation).toBe(true);
    expect(provider.canAccessNursingMa).toBe(false);
    expect(nurse.canAccessNursingMa).toBe(true);
    expect(nurse.canAccessProviderDocumentation).toBe(false);
    expect(tech.canAccessClinicCareShell).toBe(true);
    expect(tech.canAccessTechnicianSafeNursingMaProjection).toBe(true);
    expect(tech.canAccessProviderDocumentation).toBe(false);
    expect(front.canAccessRegistration).toBe(true);
    expect(front.canAccessClinicCareShell).toBe(false);
    expect(front.canAuthorProviderDocumentation).toBe(false);
    expect(front.canAuthorIndependentNursingAssessment).toBe(false);
  });

  it("1. authorized technician sees Clinic Care at Clinic facility", () => {
    const nav = resolveFacilityNavigation({
      roleCodes: ["PATIENT_CARE_TECH"],
      prismaDepartmentCode: "PRIMARY_CARE",
      facilityType: "CLINIC",
      facilityServiceLines: null,
    });
    expect(nav.clinicCareVisible).toBe(true);
    expect(nav.areas).toContain("CLINIC_CARE");
    expect(nav.landingPath).toBe("/app/clinic-care");

    const caps = resolveFacilityModuleCapabilitiesD4c1({ facilityType: "CLINIC" });
    const access = resolveClinicCareWorkspaceRoleAccess({
      professionGroup: "TECHNICIAN",
      moduleCapabilities: caps,
      roleCodes: ["PATIENT_CARE_TECH"],
    });
    expect(access.canAccessClinicCareShell).toBe(true);
    expect(access.canAccessClinicTrackboardProjection).toBe(true);
    expect(access.canAccessTodaysVisitsProjection).toBe(true);
  });

  it("2. technician sees technician-safe Nursing/MA projection", () => {
    const caps = resolveFacilityModuleCapabilitiesD4c1({ facilityType: "CLINIC" });
    const access = resolveClinicCareWorkspaceRoleAccess({
      professionGroup: "TECHNICIAN",
      moduleCapabilities: caps,
      roleCodes: ["PATIENT_CARE_TECH"],
    });
    expect(access.canAccessNursingMa).toBe(true);
    expect(access.canAccessTechnicianSafeNursingMaProjection).toBe(true);
    expect(access.canAccessAssignedTechnicianTasks).toBe(true);
    expect(access.canAuthorIndependentNursingAssessment).toBe(false);
  });

  it("3. technician sees Lab when facility+user allow", () => {
    const caps = resolveFacilityModuleCapabilitiesD4c1({ facilityType: "CLINIC" });
    expect(caps.laboratoryEnabled).toBe(true);
    const labTech = resolveClinicCareWorkspaceRoleAccess({
      professionGroup: "TECHNICIAN",
      moduleCapabilities: caps,
      roleCodes: ["LAB"],
    });
    expect(labTech.canAccessLaboratory).toBe(true);
    expect(labTech.canAccessDiagnosticsWorklists).toBe(true);

    const pct = resolveClinicCareWorkspaceRoleAccess({
      professionGroup: "TECHNICIAN",
      moduleCapabilities: caps,
      roleCodes: ["PATIENT_CARE_TECH"],
    });
    expect(pct.canAccessLaboratory).toBe(false);

    const areas = getVisibleNavigationAreas({
      roleCodes: ["LAB"],
      prismaDepartmentCode: "LAB",
      facilityType: "CLINIC",
      facilityServiceLines: null,
    });
    expect(areas).toContain("CLINIC_CARE");
    expect(areas).toContain("LABORATORY");
  });

  it("4. technician sees Radiology when facility+user allow", () => {
    const caps = resolveFacilityModuleCapabilitiesD4c1({ facilityType: "URGENT_CARE" });
    expect(caps.radiologyEnabled).toBe(true);
    const radTech = resolveClinicCareWorkspaceRoleAccess({
      professionGroup: "TECHNICIAN",
      moduleCapabilities: caps,
      roleCodes: ["RADIOLOGY"],
    });
    expect(radTech.canAccessRadiology).toBe(true);
    expect(radTech.canAccessClinicCareShell).toBe(true);

    const areas = getVisibleNavigationAreas({
      roleCodes: ["RADIOLOGY"],
      prismaDepartmentCode: "RAD",
      facilityType: "URGENT_CARE",
      facilityServiceLines: null,
    });
    expect(areas).toContain("CLINIC_CARE");
    expect(areas).toContain("RADIOLOGY");
  });

  it("5. technician does NOT see Provider Documentation", () => {
    const caps = resolveFacilityModuleCapabilitiesD4c1({ facilityType: "CLINIC" });
    for (const roleCodes of [["LAB"], ["RADIOLOGY"], ["PATIENT_CARE_TECH"]] as const) {
      const access = resolveClinicCareWorkspaceRoleAccess({
        professionGroup: "TECHNICIAN",
        moduleCapabilities: caps,
        roleCodes,
      });
      expect(access.canAccessProviderDocumentation).toBe(false);
      expect(access.canAuthorProviderDocumentation).toBe(false);
    }
  });

  it("6. technician cannot gain provider/nursing authority from shell visibility", () => {
    const caps = resolveFacilityModuleCapabilitiesD4c1({ facilityType: "CLINIC" });
    const access = resolveClinicCareWorkspaceRoleAccess({
      professionGroup: "TECHNICIAN",
      moduleCapabilities: caps,
      roleCodes: ["LAB", "RADIOLOGY", "PATIENT_CARE_TECH"],
    });
    expect(access.canAccessClinicCareShell).toBe(true);
    expect(access.canAccessTechnicianSafeNursingMaProjection).toBe(true);
    expect(access.canAuthorProviderDocumentation).toBe(false);
    expect(access.canMutateDiagnosesOrProblemList).toBe(false);
    expect(access.canIssueProviderOrders).toBe(false);
    expect(access.canPrescribe).toBe(false);
    expect(access.canAuthorIndependentNursingAssessment).toBe(false);
    expect(access.canAdministerMedicationsUnrestricted).toBe(false);
    expect(access.canCompleteDispositionOrEncounter).toBe(false);
    expect(access.canSignAsNurseOrProvider).toBe(false);
  });

  it("7. technician does not see ED/Hospital unless explicit hybrid + separately authorized", () => {
    const ambulatory = resolveFacilityNavigation({
      roleCodes: ["LAB"],
      prismaDepartmentCode: "LAB",
      facilityType: "CLINIC",
      facilityServiceLines: null,
    });
    expect(ambulatory.edVisible).toBe(false);
    expect(ambulatory.hospitalVisible).toBe(false);
    expect(ambulatory.clinicCareVisible).toBe(true);

    const hybrid = resolveFacilityNavigation({
      roleCodes: ["LAB"],
      prismaDepartmentCode: "LAB",
      facilityType: "URGENT_CARE",
      facilityServiceLines: ["URGENT_CARE", "EMERGENCY", "OBSERVATION", "LABORATORY"],
    });
    // Hybrid facility may expose ED/Hospital lines; technician still needs FSER read eligibility.
    expect(hybrid.capabilities.edEnabled).toBe(true);
    expect(hybrid.areas).toContain("CLINIC_CARE");
  });

  it("8. Front Desk still does not gain clinical documentation authority", () => {
    const caps = resolveFacilityModuleCapabilitiesD4c1({ facilityType: "CLINIC" });
    const front = resolveClinicCareWorkspaceRoleAccess({
      professionGroup: "FRONT_DESK",
      moduleCapabilities: caps,
      roleCodes: ["FRONT_DESK"],
    });
    expect(front.canAccessClinicCareShell).toBe(false);
    expect(front.canAccessProviderDocumentation).toBe(false);
    expect(front.canAccessNursingMa).toBe(false);
    expect(front.canAuthorProviderDocumentation).toBe(false);
    expect(front.canAuthorIndependentNursingAssessment).toBe(false);
    expect(front.canMutateDiagnosesOrProblemList).toBe(false);
    expect(front.canPrescribe).toBe(false);
    expect(front.canAccessRegistration).toBe(true);
  });

  it("defines six D4C.2 trackboard metric contracts without hard-coded facility names", () => {
    expect(CLINIC_CARE_TRACKBOARD_METRIC_IDS).toHaveLength(6);
    expect(CLINIC_CARE_TRACKBOARD_METRIC_CONTRACTS.map((c) => c.id)).toEqual([
      "TODAYS_VISITS",
      "WAITING",
      "IN_PROGRESS",
      "RESULTS_PENDING",
      "READY_FOR_DISCHARGE",
      "FOLLOW_UPS_DUE",
    ]);
    const blob = JSON.stringify(CLINIC_CARE_TRACKBOARD_METRIC_CONTRACTS);
    expect(blob.toLowerCase()).not.toContain("rapid city");
    expect(blob.toLowerCase()).not.toContain("wayne");
  });

  it("clinic RN visible areas do not include emergency", () => {
    const areas = getVisibleNavigationAreas({
      roleCodes: ["RN"],
      facilityType: "CLINIC",
      facilityServiceLines: null,
    });
    expect(areas).toContain("CLINIC_CARE");
    expect(areas).not.toContain("EMERGENCY");
  });

  it("never hard-codes facility names in care profile builders", () => {
    const json = buildFacilityCareProfileJson({
      profile: "CLINIC",
      operatingMode: "CLINIC",
      subtype: "PRIMARY_CARE_CLINIC",
    });
    expect(JSON.stringify(json).toLowerCase()).not.toContain("medora demo");
  });
});
