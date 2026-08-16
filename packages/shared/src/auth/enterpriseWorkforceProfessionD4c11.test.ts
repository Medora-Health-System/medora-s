import { describe, expect, it } from "vitest";
import {
  D4C11_CERTIFICATION_ID,
  resolveRoleCodeFromProfession,
  preferredDepartmentCodeForProfession,
  inferWorkforceProfessionFromRoleAndDepartment,
  ADMIN_PROFESSION_CODES,
} from "./enterpriseWorkforceProfessionD4c11.js";
import { resolveClinicalWorkspaceEntitlement } from "./enterpriseClinicalWorkspaceEntitlementD4c11.js";
import { resolveDentalWorkspaceAccess } from "./enterpriseDentalServiceLineNavigationD5a2.js";
import { resolveFacilityModuleCapabilitiesD4c1 } from "./facilityClinicCareProfileD4c1.js";
import { resolveNavigationProfile } from "./navigationAuthorization.js";

describe("MEDUI.D4C.11 workforce profession + workspace entitlement", () => {
  it("certification id and dental professions in registry", () => {
    expect(D4C11_CERTIFICATION_ID).toBe("MEDUI.D4C.11");
    expect(ADMIN_PROFESSION_CODES).toContain("DENTIST");
    expect(ADMIN_PROFESSION_CODES).toContain("DENTAL_HYGIENIST");
    expect(ADMIN_PROFESSION_CODES).toContain("MEDICINE");
  });

  it("1: MEDICINE + CLINIC => Clinic ALLOW, Dental DENY", () => {
    const clinic = resolveClinicalWorkspaceEntitlement({
      roleCodes: ["PROVIDER"],
      professionCodes: ["MEDICINE"],
      departmentCodes: ["PRIMARY_CARE"],
      workspace: "CLINIC",
      moduleEnabled: true,
    });
    const dental = resolveClinicalWorkspaceEntitlement({
      roleCodes: ["PROVIDER"],
      professionCodes: ["MEDICINE"],
      departmentCodes: ["PRIMARY_CARE"],
      workspace: "DENTAL",
      moduleEnabled: true,
    });
    expect(clinic.allowed).toBe(true);
    expect(dental.allowed).toBe(false);
    expect(
      resolveDentalWorkspaceAccess({
        roleCodes: ["PROVIDER"],
        professionCodes: ["MEDICINE"],
        departmentCodes: ["PRIMARY_CARE"],
        dentalCareEnabled: true,
      }).canAccessDentalShell
    ).toBe(false);
  });

  it("2: DENTIST + DENTAL => Dental ALLOW, Clinic not automatic", () => {
    const dental = resolveClinicalWorkspaceEntitlement({
      roleCodes: ["PROVIDER"],
      professionCodes: ["DENTIST"],
      departmentCodes: ["DENTAL"],
      workspace: "DENTAL",
      moduleEnabled: true,
    });
    const clinic = resolveClinicalWorkspaceEntitlement({
      roleCodes: ["PROVIDER"],
      professionCodes: ["DENTIST"],
      departmentCodes: ["DENTAL"],
      workspace: "CLINIC",
      moduleEnabled: true,
    });
    expect(dental.allowed).toBe(true);
    expect(clinic.allowed).toBe(false);
    expect(resolveRoleCodeFromProfession({ profession: "DENTIST" })).toEqual({
      ok: true,
      roleCode: "PROVIDER",
    });
    expect(preferredDepartmentCodeForProfession("DENTIST")).toBe("DENTAL");
  });

  it("3–5: hygienist / assistant / technician dental profiles", () => {
    const hyg = resolveDentalWorkspaceAccess({
      roleCodes: ["PATIENT_CARE_TECH"],
      professionCodes: ["DENTAL_HYGIENIST"],
      departmentCodes: ["DENTAL"],
      dentalCareEnabled: true,
    });
    expect(hyg.canAccessDentalShell).toBe(true);
    expect(hyg.canEditPeriodontal).toBe(true);
    expect(hyg.canPerformProcedures).toBe(false);
    expect(hyg.canAccessDentalProvider).toBe(false);

    const asst = resolveDentalWorkspaceAccess({
      roleCodes: ["PATIENT_CARE_TECH"],
      professionCodes: ["DENTAL_ASSISTANT"],
      departmentCodes: ["DENTAL"],
      dentalCareEnabled: true,
    });
    expect(asst.canAccessDentalShell).toBe(true);
    expect(asst.canEditOdontogram).toBe(false);
    expect(asst.canAccessDentalProvider).toBe(false);

    const tech = resolveDentalWorkspaceAccess({
      roleCodes: ["PATIENT_CARE_TECH"],
      professionCodes: ["DENTAL_TECHNICIAN"],
      departmentCodes: ["DENTAL"],
      dentalCareEnabled: true,
    });
    expect(tech.canAccessDentalShell).toBe(true);
    expect(tech.canEditPeriodontal).toBe(false);
  });

  it("6: multi-assignment MEDICINE + DENTIST => both", () => {
    const clinic = resolveClinicalWorkspaceEntitlement({
      roleCodes: ["PROVIDER"],
      professionCodes: ["MEDICINE", "DENTIST"],
      departmentCodes: ["PRIMARY_CARE", "DENTAL"],
      workspace: "CLINIC",
      moduleEnabled: true,
    });
    const dental = resolveClinicalWorkspaceEntitlement({
      roleCodes: ["PROVIDER"],
      professionCodes: ["MEDICINE", "DENTIST"],
      departmentCodes: ["PRIMARY_CARE", "DENTAL"],
      workspace: "DENTAL",
      moduleEnabled: true,
    });
    expect(clinic.allowed).toBe(true);
    expect(dental.allowed).toBe(true);
  });

  it("7–8: facility admin allow; platform-only deny", () => {
    expect(
      resolveClinicalWorkspaceEntitlement({
        roleCodes: ["ADMIN"],
        professionCodes: ["ADMINISTRATION"],
        workspace: "DENTAL",
        moduleEnabled: true,
      }).allowed
    ).toBe(true);
    expect(
      resolveClinicalWorkspaceEntitlement({
        roleCodes: ["MEDORA_SUPER_ADMIN"],
        professionCodes: [],
        workspace: "DENTAL",
        moduleEnabled: true,
      }).allowed
    ).toBe(false);
  });

  it("11: dental disabled => deny", () => {
    expect(
      resolveClinicalWorkspaceEntitlement({
        roleCodes: ["PROVIDER"],
        professionCodes: ["DENTIST"],
        workspace: "DENTAL",
        moduleEnabled: false,
      }).allowed
    ).toBe(false);
  });

  it("12: hospital+clinic line keeps clinicCareEnabled for MEDICINE physician", () => {
    const caps = resolveFacilityModuleCapabilitiesD4c1({
      facilityType: "HOSPITAL",
      serviceLines: ["EMERGENCY", "CLINIC", "DENTAL", "OBSERVATION"],
    });
    expect(caps.clinicCareEnabled).toBe(true);
    expect(caps.dentalCareEnabled).toBe(true);

    const nav = resolveNavigationProfile({
      roleCodes: ["PROVIDER"],
      professionCodes: ["MEDICINE"],
      departmentCodes: ["PRIMARY_CARE"],
      prismaDepartmentCode: "PRIMARY_CARE",
      facilityType: "HOSPITAL",
      facilityServiceLines: ["EMERGENCY", "CLINIC", "DENTAL", "OBSERVATION"],
    });
    expect(nav.areas).toContain("CLINIC_CARE");
    expect(nav.areas).not.toContain("DENTAL_CARE");
  });

  it("infers DENTIST from PROVIDER + DENTAL department", () => {
    expect(
      inferWorkforceProfessionFromRoleAndDepartment({
        roleCode: "PROVIDER",
        departmentCode: "DENTAL",
      })
    ).toBe("DENTIST");
    expect(
      inferWorkforceProfessionFromRoleAndDepartment({
        roleCode: "PROVIDER",
        departmentCode: "PRIMARY_CARE",
      })
    ).toBe("PROVIDER_UNSPECIFIED");
  });
});
