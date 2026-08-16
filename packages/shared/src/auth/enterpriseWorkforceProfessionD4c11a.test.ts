import { describe, expect, it } from "vitest";
import {
  D4A40W_CERTIFICATION_ID,
  D4C11A_ROLECODE_GAPS,
  ADMIN_PROFESSION_CODES,
  resolveRoleCodeFromProfession,
  preferredDepartmentCodeForProfession,
  workforceAssignmentConflictKey,
  hasDentalSigningAuthority,
  isProviderFamilyProfession,
  inferWorkforceProfessionFromRoleAndDepartment,
  CREDENTIAL_APPLICABILITY_BY_FAMILY,
  DEFERRED_CREDENTIAL_FIELDS,
  EXISTING_PROVIDER_CREDENTIAL_USER_FIELDS,
} from "./enterpriseWorkforceProfessionD4c11.js";
import { findDuplicateProfessionAssignmentConflict } from "./adminUserAssignment.js";
import { resolveClinicalWorkspaceEntitlement } from "./enterpriseClinicalWorkspaceEntitlementD4c11.js";
import { resolveDentalWorkspaceAccess } from "./enterpriseDentalServiceLineNavigationD5a2.js";
import { resolveEnterpriseDentalEncounterAuthoring } from "./enterpriseDentalEncounterAuthoringD5a5b.js";

describe("MEDUI.D4C.11A workforce profession authority hardening", () => {
  it("registry completeness — required professions selectable", () => {
    expect(D4A40W_CERTIFICATION_ID).toBe("MEDUI.D4A.4.0W");
    expect(D4C11A_ROLECODE_GAPS.length).toBeGreaterThan(0);
    for (const code of [
      "PHYSICIAN_MD",
      "PHYSICIAN_DO",
      "RESIDENT_PHYSICIAN",
      "PHYSICIAN_ASSISTANT",
      "NURSE_PRACTITIONER",
      "DENTIST",
      "DENTAL_HYGIENIST",
      "DENTAL_ASSISTANT",
      "DENTAL_TECHNICIAN",
      "REGISTERED_NURSE",
      "LICENSED_PRACTICAL_NURSE",
      "PATIENT_CARE_TECHNICIAN",
      "RESPIRATORY_THERAPIST",
      "PHYSICAL_THERAPIST",
      "OCCUPATIONAL_THERAPIST",
      "SPEECH_LANGUAGE_PATHOLOGIST",
      "SOCIAL_WORKER",
      "CASE_MANAGER",
      "DIETITIAN",
      "PHARMACIST",
      "PHARMACY_TECHNICIAN",
      "ADMINISTRATOR",
      "BILLING",
      "FRONT_DESK",
    ] as const) {
      expect(ADMIN_PROFESSION_CODES).toContain(code);
    }
  });

  it("provider subtypes retain professionCode and derive PROVIDER", () => {
    const cases = [
      ["PHYSICIAN_MD", "PRIMARY_CARE"],
      ["PHYSICIAN_DO", "PRIMARY_CARE"],
      ["RESIDENT_PHYSICIAN", "MEDSURG"],
      ["PHYSICIAN_ASSISTANT", "MEDSURG"],
      ["NURSE_PRACTITIONER", "PRIMARY_CARE"],
    ] as const;
    for (const [profession, dept] of cases) {
      expect(resolveRoleCodeFromProfession({ profession })).toEqual({
        ok: true,
        roleCode: "PROVIDER",
      });
      expect(isProviderFamilyProfession(profession)).toBe(true);
      expect(
        resolveClinicalWorkspaceEntitlement({
          roleCodes: ["PROVIDER"],
          professionCodes: [profession],
          departmentCodes: [dept],
          workspace: "CLINIC",
          moduleEnabled: true,
        }).allowed
      ).toBe(true);
    }
  });

  it("dental roles do not inherit PROVIDER RoleCode", () => {
    expect(resolveRoleCodeFromProfession({ profession: "DENTAL_HYGIENIST" })).toEqual({
      ok: true,
      roleCode: "PATIENT_CARE_TECH",
    });
    expect(resolveRoleCodeFromProfession({ profession: "DENTAL_ASSISTANT" })).toEqual({
      ok: true,
      roleCode: "PATIENT_CARE_TECH",
    });
    expect(resolveRoleCodeFromProfession({ profession: "DENTAL_TECHNICIAN" })).toEqual({
      ok: true,
      roleCode: "PATIENT_CARE_TECH",
    });
    expect(isProviderFamilyProfession("DENTAL_HYGIENIST")).toBe(false);
  });

  it("dentist vs hygienist: prescribe/sign gated", () => {
    const dentist = resolveEnterpriseDentalEncounterAuthoring({
      roleCodes: ["PROVIDER"],
      professionCodes: ["DENTIST"],
      departmentCodes: ["DENTAL"],
      dentalCareEnabled: true,
      encounterStatus: "OPEN",
      serviceLine: "DENTAL",
    });
    expect(dentist.canPrescribe).toBe(true);
    expect(dentist.canSign).toBe(true);
    expect(dentist.canEditPeriodontal).toBe(true);

    const hyg = resolveEnterpriseDentalEncounterAuthoring({
      roleCodes: ["PATIENT_CARE_TECH"],
      professionCodes: ["DENTAL_HYGIENIST"],
      departmentCodes: ["DENTAL"],
      dentalCareEnabled: true,
      encounterStatus: "OPEN",
      serviceLine: "DENTAL",
    });
    expect(hyg.canEditPeriodontal).toBe(true);
    expect(hyg.canPrescribe).toBe(false);
    expect(hyg.canSign).toBe(false);
    expect(hyg.canDocumentProcedure).toBe(false);
    expect(hasDentalSigningAuthority("DENTAL_HYGIENIST")).toBe(false);
  });

  it("MD Clinic does not get Dental; Dentist gets Dental", () => {
    expect(
      resolveClinicalWorkspaceEntitlement({
        roleCodes: ["PROVIDER"],
        professionCodes: ["PHYSICIAN_MD"],
        departmentCodes: ["PRIMARY_CARE"],
        workspace: "DENTAL",
        moduleEnabled: true,
      }).allowed
    ).toBe(false);
    expect(
      resolveDentalWorkspaceAccess({
        roleCodes: ["PROVIDER"],
        professionCodes: ["DENTIST"],
        departmentCodes: ["DENTAL"],
        dentalCareEnabled: true,
      }).canAccessDentalShell
    ).toBe(true);
  });

  it("multi-department same profession allowed; same dept conflicts", () => {
    const ok = findDuplicateProfessionAssignmentConflict([
      {
        facilityId: "f1",
        roleCode: "PROVIDER",
        professionCode: "PHYSICIAN_MD",
        departmentId: "dept-clinic",
      },
      {
        facilityId: "f1",
        roleCode: "PROVIDER",
        professionCode: "PHYSICIAN_MD",
        departmentId: "dept-ed",
      },
      {
        facilityId: "f1",
        roleCode: "PROVIDER",
        professionCode: "PHYSICIAN_MD",
        departmentId: "dept-medsurg",
      },
    ]);
    expect(ok).toBeNull();
    expect(
      findDuplicateProfessionAssignmentConflict([
        {
          facilityId: "f1",
          roleCode: "PROVIDER",
          professionCode: "PHYSICIAN_MD",
          departmentId: "dept-clinic",
        },
        {
          facilityId: "f1",
          roleCode: "PROVIDER",
          professionCode: "PHYSICIAN_MD",
          departmentId: "dept-clinic",
        },
      ])
    ).toBe("PHYSICIAN_MD");
    expect(
      workforceAssignmentConflictKey({
        facilityId: "f1",
        professionCode: "PHYSICIAN_MD",
        departmentId: "a",
      })
    ).not.toBe(
      workforceAssignmentConflictKey({
        facilityId: "f1",
        professionCode: "PHYSICIAN_MD",
        departmentId: "b",
      })
    );
  });

  it("historical backfill never invents MD vs DO", () => {
    expect(
      inferWorkforceProfessionFromRoleAndDepartment({
        roleCode: "PROVIDER",
        departmentCode: "PRIMARY_CARE",
      })
    ).toBe("PROVIDER_UNSPECIFIED");
    expect(
      inferWorkforceProfessionFromRoleAndDepartment({
        roleCode: "PROVIDER",
        departmentCode: "DENTAL",
      })
    ).toBe("DENTIST");
  });

  it("legacy provider + clinic preserved; facility admin; platform deny", () => {
    expect(
      resolveClinicalWorkspaceEntitlement({
        roleCodes: ["PROVIDER"],
        professionCodes: ["PROVIDER_UNSPECIFIED"],
        departmentCodes: ["PRIMARY_CARE"],
        workspace: "CLINIC",
        moduleEnabled: true,
      }).allowed
    ).toBe(true);
    expect(
      resolveClinicalWorkspaceEntitlement({
        roleCodes: ["PROVIDER"],
        professionCodes: ["MEDICINE"],
        departmentCodes: ["PRIMARY_CARE"],
        workspace: "CLINIC",
        moduleEnabled: true,
      }).allowed
    ).toBe(true);
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

  it("inpatient / allied / pharmacy role mappings (no RoleCode explosion)", () => {
    expect(resolveRoleCodeFromProfession({ profession: "REGISTERED_NURSE" })).toEqual({
      ok: true,
      roleCode: "RN",
    });
    expect(resolveRoleCodeFromProfession({ profession: "LICENSED_PRACTICAL_NURSE" })).toEqual({
      ok: true,
      roleCode: "RN",
    });
    expect(resolveRoleCodeFromProfession({ profession: "PATIENT_CARE_TECHNICIAN" })).toEqual({
      ok: true,
      roleCode: "PATIENT_CARE_TECH",
    });
    for (const p of [
      "RESPIRATORY_THERAPIST",
      "PHYSICAL_THERAPIST",
      "OCCUPATIONAL_THERAPIST",
      "SPEECH_LANGUAGE_PATHOLOGIST",
      "SOCIAL_WORKER",
      "CASE_MANAGER",
      "DIETITIAN",
    ] as const) {
      expect(resolveRoleCodeFromProfession({ profession: p })).toEqual({
        ok: true,
        roleCode: "PATIENT_CARE_TECH",
      });
      expect(preferredDepartmentCodeForProfession(p)).toBeTruthy();
    }
    expect(resolveRoleCodeFromProfession({ profession: "PHARMACIST" })).toEqual({
      ok: true,
      roleCode: "PHARMACY",
    });
    expect(resolveRoleCodeFromProfession({ profession: "PHARMACY_TECHNICIAN" })).toEqual({
      ok: true,
      roleCode: "PHARMACY",
    });
  });

  it("credential model: existing NPI fields; license deferred", () => {
    expect(EXISTING_PROVIDER_CREDENTIAL_USER_FIELDS).toContain("billingNpi");
    expect(DEFERRED_CREDENTIAL_FIELDS).toContain("licenseNumber");
    expect(CREDENTIAL_APPLICABILITY_BY_FAMILY.PROVIDER_BILLING.existing).toContain("billingNpi");
    expect(CREDENTIAL_APPLICABILITY_BY_FAMILY.DENTAL_SUPPORT.deferred).toContain("licenseNumber");
  });
});
