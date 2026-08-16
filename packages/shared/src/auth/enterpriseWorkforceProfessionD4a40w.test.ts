import { describe, expect, it } from "vitest";
import {
  D4A40W_CERTIFICATION_ID,
  ADMIN_PROFESSION_CODES,
  resolveRoleCodeFromProfession,
  preferredDepartmentCodeForProfession,
  filterDepartmentsForProfession,
  hasDentalSigningAuthority,
  isProviderFamilyProfession,
  showsProviderBillingCredentialFields,
  getWorkforceProfessionDefinition,
  EXISTING_PROVIDER_CREDENTIAL_USER_FIELDS,
  DEFERRED_CREDENTIAL_FIELDS,
} from "./enterpriseWorkforceProfessionD4c11.js";
import { resolveClinicalWorkspaceEntitlement } from "./enterpriseClinicalWorkspaceEntitlementD4c11.js";
import { resolveDentalWorkspaceAccess } from "./enterpriseDentalServiceLineNavigationD5a2.js";

describe("MEDUI.D4A.4.0W enterprise workforce profession authority", () => {
  it("certification id and provider-family catalog", () => {
    expect(D4A40W_CERTIFICATION_ID).toBe("MEDUI.D4A.4.0W");
    for (const code of [
      "PHYSICIAN_MD",
      "PHYSICIAN_DO",
      "RESIDENT_PHYSICIAN",
      "PHYSICIAN_ASSISTANT",
      "NURSE_PRACTITIONER",
      "DENTIST",
      "RESPIRATORY_THERAPIST",
      "PHYSICAL_THERAPIST",
      "SOCIAL_WORKER",
      "CASE_MANAGER",
      "PHARMACIST",
    ] as const) {
      expect(ADMIN_PROFESSION_CODES).toContain(code);
    }
  });

  it("A: MD + CLINIC => PROVIDER, Clinic allow, Dental deny", () => {
    expect(resolveRoleCodeFromProfession({ profession: "PHYSICIAN_MD" })).toEqual({
      ok: true,
      roleCode: "PROVIDER",
    });
    expect(
      resolveClinicalWorkspaceEntitlement({
        roleCodes: ["PROVIDER"],
        professionCodes: ["PHYSICIAN_MD"],
        departmentCodes: ["PRIMARY_CARE"],
        workspace: "CLINIC",
        moduleEnabled: true,
      }).allowed
    ).toBe(true);
    expect(
      resolveClinicalWorkspaceEntitlement({
        roleCodes: ["PROVIDER"],
        professionCodes: ["PHYSICIAN_MD"],
        departmentCodes: ["PRIMARY_CARE"],
        workspace: "DENTAL",
        moduleEnabled: true,
      }).allowed
    ).toBe(false);
  });

  it("B–E: DO / Resident / PA / NP => PROVIDER baseline", () => {
    for (const profession of [
      "PHYSICIAN_DO",
      "RESIDENT_PHYSICIAN",
      "PHYSICIAN_ASSISTANT",
      "NURSE_PRACTITIONER",
    ] as const) {
      expect(resolveRoleCodeFromProfession({ profession })).toEqual({
        ok: true,
        roleCode: "PROVIDER",
      });
      expect(isProviderFamilyProfession(profession)).toBe(true);
      expect(
        resolveClinicalWorkspaceEntitlement({
          roleCodes: ["PROVIDER"],
          professionCodes: [profession],
          departmentCodes: profession === "RESIDENT_PHYSICIAN" ? ["MEDSURG"] : ["PRIMARY_CARE"],
          workspace: "CLINIC",
          moduleEnabled: true,
        }).allowed
      ).toBe(true);
    }
    expect(preferredDepartmentCodeForProfession("RESIDENT_PHYSICIAN")).toBe("MEDSURG");
  });

  it("F: Dentist + DENTAL => Dental workspace + signing", () => {
    const dental = resolveDentalWorkspaceAccess({
      roleCodes: ["PROVIDER"],
      professionCodes: ["DENTIST"],
      departmentCodes: ["DENTAL"],
      dentalCareEnabled: true,
    });
    expect(dental.canAccessDentalShell).toBe(true);
    expect(dental.canPerformProcedures).toBe(true);
    expect(hasDentalSigningAuthority("DENTIST")).toBe(true);
  });

  it("G–H: Hygienist / Assistant — Dental shell, no dentist sign", () => {
    expect(hasDentalSigningAuthority("DENTAL_HYGIENIST")).toBe(false);
    expect(hasDentalSigningAuthority("DENTAL_ASSISTANT")).toBe(false);
    const hyg = resolveDentalWorkspaceAccess({
      roleCodes: ["PATIENT_CARE_TECH"],
      professionCodes: ["DENTAL_HYGIENIST"],
      departmentCodes: ["DENTAL"],
      dentalCareEnabled: true,
    });
    expect(hyg.canAccessDentalShell).toBe(true);
    expect(hyg.canPerformProcedures).toBe(false);
    const asst = resolveDentalWorkspaceAccess({
      roleCodes: ["PATIENT_CARE_TECH"],
      professionCodes: ["DENTAL_ASSISTANT"],
      departmentCodes: ["DENTAL"],
      dentalCareEnabled: true,
    });
    expect(asst.canAccessDentalShell).toBe(true);
    expect(asst.canPerformProcedures).toBe(false);
  });

  it("I–K: RT / PT / SW inpatient routing readiness (no physician docs)", () => {
    for (const profession of [
      "RESPIRATORY_THERAPIST",
      "PHYSICAL_THERAPIST",
      "OCCUPATIONAL_THERAPIST",
      "SPEECH_LANGUAGE_PATHOLOGIST",
      "SOCIAL_WORKER",
      "CASE_MANAGER",
    ] as const) {
      const def = getWorkforceProfessionDefinition(profession);
      expect(def?.inpatientRoutingReady).toBe(true);
      expect(def?.dentalSigningAuthority).toBe(false);
      expect(isProviderFamilyProfession(profession)).toBe(false);
    }
    expect(preferredDepartmentCodeForProfession("RESPIRATORY_THERAPIST")).toBe("ICU");
    expect(preferredDepartmentCodeForProfession("PHYSICAL_THERAPIST")).toBe("MEDSURG");
  });

  it("L–M: facility ADMIN allow; platform-only deny", () => {
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
        workspace: "CLINIC",
        moduleEnabled: true,
      }).allowed
    ).toBe(false);
  });

  it("O–P: Legacy MEDICINE clinic preserved; nursing / pharmacy roles map", () => {
    expect(
      resolveClinicalWorkspaceEntitlement({
        roleCodes: ["PROVIDER"],
        professionCodes: ["MEDICINE"],
        departmentCodes: ["PRIMARY_CARE"],
        workspace: "CLINIC",
        moduleEnabled: true,
      }).allowed
    ).toBe(true);
    expect(resolveRoleCodeFromProfession({ profession: "NURSING" })).toEqual({
      ok: true,
      roleCode: "RN",
    });
    expect(resolveRoleCodeFromProfession({ profession: "PHARMACIST" })).toEqual({
      ok: true,
      roleCode: "PHARMACY",
    });
    expect(resolveRoleCodeFromProfession({ profession: "BILLING" })).toEqual({
      ok: true,
      roleCode: "BILLING",
    });
    expect(resolveRoleCodeFromProfession({ profession: "FRONT_DESK" })).toEqual({
      ok: true,
      roleCode: "FRONT_DESK",
    });
  });

  it("department filter: Dentist only DENTAL; MD not DENTAL alone", () => {
    const depts = [
      { id: "1", code: "PRIMARY_CARE", name: "Clinic" },
      { id: "2", code: "DENTAL", name: "Dental" },
      { id: "3", code: "MEDSURG", name: "MedSurg" },
    ];
    expect(
      filterDepartmentsForProfession({
        profession: "DENTIST",
        facilityDepartments: depts,
        facilityServiceLines: ["DENTAL", "CLINIC"],
      }).map((d) => d.code)
    ).toEqual(["DENTAL"]);
    expect(
      filterDepartmentsForProfession({
        profession: "PHYSICIAN_MD",
        facilityDepartments: depts,
        facilityServiceLines: ["CLINIC", "INPATIENT"],
      }).map((d) => d.code)
    ).toEqual(["PRIMARY_CARE", "MEDSURG"]);
  });

  it("credential profile reuses User NPI fields; deferred license columns documented", () => {
    expect(showsProviderBillingCredentialFields("PHYSICIAN_MD")).toBe(true);
    expect(showsProviderBillingCredentialFields("DENTIST")).toBe(true);
    expect(showsProviderBillingCredentialFields("DENTAL_HYGIENIST")).toBe(false);
    expect(showsProviderBillingCredentialFields("REGISTERED_NURSE")).toBe(false);
    expect(EXISTING_PROVIDER_CREDENTIAL_USER_FIELDS).toContain("billingNpi");
    expect(DEFERRED_CREDENTIAL_FIELDS).toContain("licenseNumber");
  });
});
