/**
 * MEDUI.D4A.4.0W / D4C.11 — Enterprise workforce profession authority (SSoT).
 *
 * Concepts (do not collapse):
 * - PROFESSION — who the employee is
 * - SYSTEM ROLE (RoleCode) — broad authorization family
 * - DEPARTMENT / SERVICE LINE — where they work
 * - SPECIALTY — clinical specialization (not DepartmentCode)
 * - CAPABILITY — what they may perform
 * - CREDENTIAL — license/NPI/attribution (User billing fields today; no parallel identity table)
 *
 * ONE ENTERPRISE WORKFORCE IDENTITY → MANY FACILITY ASSIGNMENTS → PRECISE PROFESSION
 * → DERIVED SYSTEM ROLE → DEPARTMENT ROUTING → CAPABILITY-GATED DOCUMENTATION
 */

import type { AdminAssignableRoleCode } from "../schemas/adminUsers.js";

export const D4A40W_CERTIFICATION_ID = "MEDUI.D4A.4.0W" as const;
export const D4C11_CERTIFICATION_ID = "MEDUI.D4C.11" as const;

/** Profession families for routing / credential UI. */
export const WORKFORCE_PROFESSION_FAMILIES = [
  "ADMINISTRATION",
  "PROVIDER",
  "DENTAL",
  "NURSING",
  "ALLIED",
  "PHARMACY",
  "TECHNICIAN",
  "BILLING",
  "FRONT_DESK",
  "LEGACY",
] as const;

export type WorkforceProfessionFamily = (typeof WORKFORCE_PROFESSION_FAMILIES)[number];

/**
 * Authoritative profession catalog (persisted on UserRole.professionCode as TEXT).
 * Additive — never delete historical codes.
 */
export const WORKFORCE_PROFESSION_CODES = [
  // Administration / ops
  "ADMINISTRATION",
  /** Preferred admin identity label; canonicalizes with ADMINISTRATION. */
  "ADMINISTRATOR",
  "BILLING",
  "FRONT_DESK",
  // Provider family (precise)
  "PHYSICIAN_MD",
  "PHYSICIAN_DO",
  "RESIDENT_PHYSICIAN",
  "PHYSICIAN_ASSISTANT",
  "NURSE_PRACTITIONER",
  /** Broad / legacy medicine — do not invent MD vs DO from RoleCode.PROVIDER. */
  "MEDICINE",
  /** @deprecated Prefer MEDICINE / PHYSICIAN_* — RoleCode-era alias. */
  "PROVIDER",
  /** Legacy PROVIDER without precise subtype (explicit unspecified). */
  "PROVIDER_UNSPECIFIED",
  /** Alias of PROVIDER_UNSPECIFIED — preferred historical label. */
  "LEGACY_PROVIDER",
  // Dental
  "DENTIST",
  "DENTAL_HYGIENIST",
  "DENTAL_ASSISTANT",
  "DENTAL_TECHNICIAN",
  // Nursing
  "REGISTERED_NURSE",
  "LICENSED_PRACTICAL_NURSE",
  "PATIENT_CARE_TECHNICIAN",
  /** Broad / legacy nursing */
  "NURSING",
  /** @deprecated Prefer REGISTERED_NURSE / NURSING */
  "RN",
  // Allied / inpatient readiness
  "SOCIAL_WORKER",
  "PHYSICAL_THERAPIST",
  "OCCUPATIONAL_THERAPIST",
  "SPEECH_LANGUAGE_PATHOLOGIST",
  "RESPIRATORY_THERAPIST",
  "DIETITIAN",
  "CASE_MANAGER",
  // Pharmacy
  "PHARMACIST",
  "PHARMACY_TECHNICIAN",
  /** Broad pharmacy */
  "PHARMACY",
  // Ancillary technicians (lab/rad/care-tech type still selected when TECHNICIAN)
  "TECHNICIAN",
] as const;

export type WorkforceProfessionCode = (typeof WORKFORCE_PROFESSION_CODES)[number];

/**
 * Admin onboarding picker — precise professions first.
 * Excludes deprecated aliases (PROVIDER, RN) from the default selector.
 */
export const ADMIN_PROFESSION_CODES = [
  "ADMINISTRATOR",
  "ADMINISTRATION",
  "PHYSICIAN_MD",
  "PHYSICIAN_DO",
  "RESIDENT_PHYSICIAN",
  "PHYSICIAN_ASSISTANT",
  "NURSE_PRACTITIONER",
  "MEDICINE",
  "PROVIDER_UNSPECIFIED",
  "DENTIST",
  "DENTAL_HYGIENIST",
  "DENTAL_ASSISTANT",
  "DENTAL_TECHNICIAN",
  "REGISTERED_NURSE",
  "LICENSED_PRACTICAL_NURSE",
  "PATIENT_CARE_TECHNICIAN",
  "NURSING",
  "SOCIAL_WORKER",
  "PHYSICAL_THERAPIST",
  "OCCUPATIONAL_THERAPIST",
  "SPEECH_LANGUAGE_PATHOLOGIST",
  "RESPIRATORY_THERAPIST",
  "DIETITIAN",
  "CASE_MANAGER",
  "PHARMACIST",
  "PHARMACY_TECHNICIAN",
  "TECHNICIAN",
  "BILLING",
  "FRONT_DESK",
] as const;

export type AdminProfessionCode = (typeof ADMIN_PROFESSION_CODES)[number];

export const DENTAL_WORKFORCE_PROFESSION_CODES = [
  "DENTIST",
  "DENTAL_HYGIENIST",
  "DENTAL_ASSISTANT",
  "DENTAL_TECHNICIAN",
] as const;

export type DentalWorkforceProfessionCode = (typeof DENTAL_WORKFORCE_PROFESSION_CODES)[number];

/** Provider-family professions that derive RoleCode.PROVIDER (not dental-only assistants). */
export const PROVIDER_FAMILY_PROFESSION_CODES = [
  "PHYSICIAN_MD",
  "PHYSICIAN_DO",
  "RESIDENT_PHYSICIAN",
  "PHYSICIAN_ASSISTANT",
  "NURSE_PRACTITIONER",
  "MEDICINE",
  "PROVIDER",
  "PROVIDER_UNSPECIFIED",
  "LEGACY_PROVIDER",
  "DENTIST",
] as const;

export type ProviderFamilyProfessionCode = (typeof PROVIDER_FAMILY_PROFESSION_CODES)[number];

/** Clinic ambulatory clinical professions (not pure dental support). */
export const CLINIC_WORKFORCE_PROFESSION_CODES = [
  ...PROVIDER_FAMILY_PROFESSION_CODES.filter((c) => c !== "DENTIST"),
  "REGISTERED_NURSE",
  "LICENSED_PRACTICAL_NURSE",
  "NURSING",
  "RN",
  "NURSE_PRACTITIONER",
  "PHYSICIAN_ASSISTANT",
] as const;

export type TechnicianTypeCode = "LAB" | "RADIOLOGY" | "PATIENT_CARE";
export const TECHNICIAN_TYPE_CODES = ["LAB", "RADIOLOGY", "PATIENT_CARE"] as const;

/** Credential UI profile — which existing User fields / future fields apply. */
export type WorkforceCredentialProfile =
  | "NONE"
  | "PROVIDER_BILLING"
  | "NURSING"
  | "DENTAL_PROVIDER"
  | "DENTAL_SUPPORT"
  | "PHARMACY"
  | "ALLIED";

export type WorkforceProfessionDefinition = {
  code: WorkforceProfessionCode;
  family: WorkforceProfessionFamily;
  /** Broad RoleCode — never explode RoleCode per profession. */
  systemRole: AdminAssignableRoleCode | "TECHNICIAN";
  credentialProfile: WorkforceCredentialProfile;
  /** Preferred default department when facility has it. */
  preferredDepartmentCode: string | null;
  /** Valid Prisma DepartmentCode values (routing readiness). */
  validDepartmentCodes: readonly string[];
  /** May author dentist-level dental clinical signatures. */
  dentalSigningAuthority: boolean;
  /** Inpatient assignment/routing readiness (no UI boards in this milestone). */
  inpatientRoutingReady: boolean;
};

const DEPT_AMBULATORY = ["PRIMARY_CARE"] as const;
const DEPT_HOSPITAL = [
  "EMERGENCY",
  "ICU",
  "MEDSURG",
  "OBSERVATION",
  "OBGYN",
  "PEDIATRICS",
  "BEHAVIORAL_HEALTH",
  "TELEMETRY",
  "INPATIENT",
] as const;
const DEPT_PROVIDER = [...DEPT_AMBULATORY, ...DEPT_HOSPITAL] as const;

export const WORKFORCE_PROFESSION_DEFINITIONS: Record<
  WorkforceProfessionCode,
  WorkforceProfessionDefinition
> = {
  ADMINISTRATION: {
    code: "ADMINISTRATION",
    family: "ADMINISTRATION",
    systemRole: "ADMIN",
    credentialProfile: "NONE",
    preferredDepartmentCode: null,
    validDepartmentCodes: [],
    dentalSigningAuthority: false,
    inpatientRoutingReady: true,
  },
  ADMINISTRATOR: {
    code: "ADMINISTRATOR",
    family: "ADMINISTRATION",
    systemRole: "ADMIN",
    credentialProfile: "NONE",
    preferredDepartmentCode: null,
    validDepartmentCodes: [],
    dentalSigningAuthority: false,
    inpatientRoutingReady: true,
  },
  BILLING: {
    code: "BILLING",
    family: "BILLING",
    systemRole: "BILLING",
    credentialProfile: "NONE",
    preferredDepartmentCode: null,
    validDepartmentCodes: [],
    dentalSigningAuthority: false,
    inpatientRoutingReady: false,
  },
  FRONT_DESK: {
    code: "FRONT_DESK",
    family: "FRONT_DESK",
    systemRole: "FRONT_DESK",
    credentialProfile: "NONE",
    preferredDepartmentCode: "PRIMARY_CARE",
    validDepartmentCodes: ["PRIMARY_CARE", "DENTAL", "EMERGENCY"],
    dentalSigningAuthority: false,
    inpatientRoutingReady: false,
  },
  PHYSICIAN_MD: {
    code: "PHYSICIAN_MD",
    family: "PROVIDER",
    systemRole: "PROVIDER",
    credentialProfile: "PROVIDER_BILLING",
    preferredDepartmentCode: "PRIMARY_CARE",
    validDepartmentCodes: DEPT_PROVIDER,
    dentalSigningAuthority: false,
    inpatientRoutingReady: true,
  },
  PHYSICIAN_DO: {
    code: "PHYSICIAN_DO",
    family: "PROVIDER",
    systemRole: "PROVIDER",
    credentialProfile: "PROVIDER_BILLING",
    preferredDepartmentCode: "PRIMARY_CARE",
    validDepartmentCodes: DEPT_PROVIDER,
    dentalSigningAuthority: false,
    inpatientRoutingReady: true,
  },
  RESIDENT_PHYSICIAN: {
    code: "RESIDENT_PHYSICIAN",
    family: "PROVIDER",
    systemRole: "PROVIDER",
    credentialProfile: "PROVIDER_BILLING",
    preferredDepartmentCode: "MEDSURG",
    validDepartmentCodes: DEPT_PROVIDER,
    dentalSigningAuthority: false,
    inpatientRoutingReady: true,
  },
  PHYSICIAN_ASSISTANT: {
    code: "PHYSICIAN_ASSISTANT",
    family: "PROVIDER",
    systemRole: "PROVIDER",
    credentialProfile: "PROVIDER_BILLING",
    preferredDepartmentCode: "PRIMARY_CARE",
    validDepartmentCodes: DEPT_PROVIDER,
    dentalSigningAuthority: false,
    inpatientRoutingReady: true,
  },
  NURSE_PRACTITIONER: {
    code: "NURSE_PRACTITIONER",
    family: "PROVIDER",
    systemRole: "PROVIDER",
    credentialProfile: "PROVIDER_BILLING",
    preferredDepartmentCode: "PRIMARY_CARE",
    validDepartmentCodes: DEPT_PROVIDER,
    dentalSigningAuthority: false,
    inpatientRoutingReady: true,
  },
  MEDICINE: {
    code: "MEDICINE",
    family: "LEGACY",
    systemRole: "PROVIDER",
    credentialProfile: "PROVIDER_BILLING",
    preferredDepartmentCode: "PRIMARY_CARE",
    validDepartmentCodes: DEPT_PROVIDER,
    dentalSigningAuthority: false,
    inpatientRoutingReady: true,
  },
  PROVIDER: {
    code: "PROVIDER",
    family: "LEGACY",
    systemRole: "PROVIDER",
    credentialProfile: "PROVIDER_BILLING",
    preferredDepartmentCode: "PRIMARY_CARE",
    validDepartmentCodes: DEPT_PROVIDER,
    dentalSigningAuthority: false,
    inpatientRoutingReady: true,
  },
  PROVIDER_UNSPECIFIED: {
    code: "PROVIDER_UNSPECIFIED",
    family: "LEGACY",
    systemRole: "PROVIDER",
    credentialProfile: "PROVIDER_BILLING",
    preferredDepartmentCode: "PRIMARY_CARE",
    validDepartmentCodes: DEPT_PROVIDER,
    dentalSigningAuthority: false,
    inpatientRoutingReady: true,
  },
  LEGACY_PROVIDER: {
    code: "LEGACY_PROVIDER",
    family: "LEGACY",
    systemRole: "PROVIDER",
    credentialProfile: "PROVIDER_BILLING",
    preferredDepartmentCode: "PRIMARY_CARE",
    validDepartmentCodes: DEPT_PROVIDER,
    dentalSigningAuthority: false,
    inpatientRoutingReady: true,
  },
  DENTIST: {
    code: "DENTIST",
    family: "DENTAL",
    systemRole: "PROVIDER",
    credentialProfile: "DENTAL_PROVIDER",
    preferredDepartmentCode: "DENTAL",
    validDepartmentCodes: ["DENTAL"],
    dentalSigningAuthority: true,
    inpatientRoutingReady: false,
  },
  DENTAL_HYGIENIST: {
    code: "DENTAL_HYGIENIST",
    family: "DENTAL",
    /**
     * RoleCode gap: no ALLIED_DENTAL / HYGIENIST role.
     * PATIENT_CARE_TECH is the smallest safe broad family that does NOT imply
     * physician/dentist PROVIDER privileges (prescribe, clinic provider board).
     * Dental charting authority comes from profession capabilities, not RoleCode.
     */
    systemRole: "PATIENT_CARE_TECH",
    credentialProfile: "DENTAL_SUPPORT",
    preferredDepartmentCode: "DENTAL",
    validDepartmentCodes: ["DENTAL"],
    dentalSigningAuthority: false,
    inpatientRoutingReady: false,
  },
  DENTAL_ASSISTANT: {
    code: "DENTAL_ASSISTANT",
    family: "DENTAL",
    /**
     * RoleCode gap: must not collapse into FRONT_DESK (registration/ops).
     * Support/clinical-assist capabilities are profession-gated under Dental.
     */
    systemRole: "PATIENT_CARE_TECH",
    credentialProfile: "DENTAL_SUPPORT",
    preferredDepartmentCode: "DENTAL",
    validDepartmentCodes: ["DENTAL"],
    dentalSigningAuthority: false,
    inpatientRoutingReady: false,
  },
  DENTAL_TECHNICIAN: {
    code: "DENTAL_TECHNICIAN",
    family: "DENTAL",
    systemRole: "PATIENT_CARE_TECH",
    credentialProfile: "DENTAL_SUPPORT",
    preferredDepartmentCode: "DENTAL",
    validDepartmentCodes: ["DENTAL"],
    dentalSigningAuthority: false,
    inpatientRoutingReady: false,
  },
  REGISTERED_NURSE: {
    code: "REGISTERED_NURSE",
    family: "NURSING",
    systemRole: "RN",
    credentialProfile: "NURSING",
    preferredDepartmentCode: "PRIMARY_CARE",
    validDepartmentCodes: [...DEPT_PROVIDER, "DENTAL"],
    dentalSigningAuthority: false,
    inpatientRoutingReady: true,
  },
  LICENSED_PRACTICAL_NURSE: {
    code: "LICENSED_PRACTICAL_NURSE",
    family: "NURSING",
    systemRole: "RN",
    credentialProfile: "NURSING",
    preferredDepartmentCode: "MEDSURG",
    validDepartmentCodes: [...DEPT_HOSPITAL, "PRIMARY_CARE"],
    dentalSigningAuthority: false,
    inpatientRoutingReady: true,
  },
  PATIENT_CARE_TECHNICIAN: {
    code: "PATIENT_CARE_TECHNICIAN",
    family: "NURSING",
    systemRole: "PATIENT_CARE_TECH",
    credentialProfile: "NURSING",
    preferredDepartmentCode: "MEDSURG",
    validDepartmentCodes: [...DEPT_HOSPITAL, "PRIMARY_CARE"],
    dentalSigningAuthority: false,
    inpatientRoutingReady: true,
  },
  NURSING: {
    code: "NURSING",
    family: "LEGACY",
    systemRole: "RN",
    credentialProfile: "NURSING",
    preferredDepartmentCode: "PRIMARY_CARE",
    validDepartmentCodes: [...DEPT_PROVIDER, "DENTAL"],
    dentalSigningAuthority: false,
    inpatientRoutingReady: true,
  },
  RN: {
    code: "RN",
    family: "LEGACY",
    systemRole: "RN",
    credentialProfile: "NURSING",
    preferredDepartmentCode: "PRIMARY_CARE",
    validDepartmentCodes: [...DEPT_PROVIDER, "DENTAL"],
    dentalSigningAuthority: false,
    inpatientRoutingReady: true,
  },
  SOCIAL_WORKER: {
    code: "SOCIAL_WORKER",
    family: "ALLIED",
    /** RoleCode gap: no SOCIAL_WORK role — avoid RN (nursing) privileges. */
    systemRole: "PATIENT_CARE_TECH",
    credentialProfile: "ALLIED",
    preferredDepartmentCode: "MEDSURG",
    validDepartmentCodes: [...DEPT_HOSPITAL, "PRIMARY_CARE", "BEHAVIORAL_HEALTH"],
    dentalSigningAuthority: false,
    inpatientRoutingReady: true,
  },
  PHYSICAL_THERAPIST: {
    code: "PHYSICAL_THERAPIST",
    family: "ALLIED",
    systemRole: "PATIENT_CARE_TECH",
    credentialProfile: "ALLIED",
    preferredDepartmentCode: "MEDSURG",
    validDepartmentCodes: [...DEPT_HOSPITAL, "PRIMARY_CARE"],
    dentalSigningAuthority: false,
    inpatientRoutingReady: true,
  },
  OCCUPATIONAL_THERAPIST: {
    code: "OCCUPATIONAL_THERAPIST",
    family: "ALLIED",
    systemRole: "PATIENT_CARE_TECH",
    credentialProfile: "ALLIED",
    preferredDepartmentCode: "MEDSURG",
    validDepartmentCodes: [...DEPT_HOSPITAL, "PRIMARY_CARE"],
    dentalSigningAuthority: false,
    inpatientRoutingReady: true,
  },
  SPEECH_LANGUAGE_PATHOLOGIST: {
    code: "SPEECH_LANGUAGE_PATHOLOGIST",
    family: "ALLIED",
    systemRole: "PATIENT_CARE_TECH",
    credentialProfile: "ALLIED",
    preferredDepartmentCode: "MEDSURG",
    validDepartmentCodes: [...DEPT_HOSPITAL, "PRIMARY_CARE"],
    dentalSigningAuthority: false,
    inpatientRoutingReady: true,
  },
  RESPIRATORY_THERAPIST: {
    code: "RESPIRATORY_THERAPIST",
    family: "ALLIED",
    systemRole: "PATIENT_CARE_TECH",
    credentialProfile: "ALLIED",
    preferredDepartmentCode: "ICU",
    validDepartmentCodes: [...DEPT_HOSPITAL],
    dentalSigningAuthority: false,
    inpatientRoutingReady: true,
  },
  DIETITIAN: {
    code: "DIETITIAN",
    family: "ALLIED",
    systemRole: "PATIENT_CARE_TECH",
    credentialProfile: "ALLIED",
    preferredDepartmentCode: "MEDSURG",
    validDepartmentCodes: [...DEPT_HOSPITAL, "PRIMARY_CARE"],
    dentalSigningAuthority: false,
    inpatientRoutingReady: true,
  },
  CASE_MANAGER: {
    code: "CASE_MANAGER",
    family: "ALLIED",
    /** RoleCode gap: no CASE_MANAGER role — avoid RN (nursing) privileges. */
    systemRole: "PATIENT_CARE_TECH",
    credentialProfile: "ALLIED",
    preferredDepartmentCode: "MEDSURG",
    validDepartmentCodes: [...DEPT_HOSPITAL, "PRIMARY_CARE"],
    dentalSigningAuthority: false,
    inpatientRoutingReady: true,
  },
  PHARMACIST: {
    code: "PHARMACIST",
    family: "PHARMACY",
    systemRole: "PHARMACY",
    credentialProfile: "PHARMACY",
    preferredDepartmentCode: "PHARM",
    validDepartmentCodes: ["PHARM"],
    dentalSigningAuthority: false,
    inpatientRoutingReady: true,
  },
  PHARMACY_TECHNICIAN: {
    code: "PHARMACY_TECHNICIAN",
    family: "PHARMACY",
    systemRole: "PHARMACY",
    credentialProfile: "PHARMACY",
    preferredDepartmentCode: "PHARM",
    validDepartmentCodes: ["PHARM"],
    dentalSigningAuthority: false,
    inpatientRoutingReady: true,
  },
  PHARMACY: {
    code: "PHARMACY",
    family: "LEGACY",
    systemRole: "PHARMACY",
    credentialProfile: "PHARMACY",
    preferredDepartmentCode: "PHARM",
    validDepartmentCodes: ["PHARM"],
    dentalSigningAuthority: false,
    inpatientRoutingReady: true,
  },
  TECHNICIAN: {
    code: "TECHNICIAN",
    family: "TECHNICIAN",
    systemRole: "PATIENT_CARE_TECH",
    credentialProfile: "NONE",
    preferredDepartmentCode: null,
    validDepartmentCodes: ["LAB", "RAD", "LABORATORY", "RADIOLOGY", "EMERGENCY", "ICU", "MEDSURG"],
    dentalSigningAuthority: false,
    inpatientRoutingReady: true,
  },
};

export function getWorkforceProfessionDefinition(
  code: string | null | undefined
): WorkforceProfessionDefinition | null {
  const n = normalizeWorkforceProfessionCode(code);
  if (!n) return null;
  return WORKFORCE_PROFESSION_DEFINITIONS[n] ?? null;
}

export function normalizeWorkforceProfessionCode(
  value: string | null | undefined
): WorkforceProfessionCode | null {
  const code = String(value ?? "")
    .trim()
    .toUpperCase();
  if (!code) return null;
  if ((WORKFORCE_PROFESSION_CODES as readonly string[]).includes(code)) {
    return code as WorkforceProfessionCode;
  }
  return null;
}

export function isDentalWorkforceProfession(
  code: string | null | undefined
): code is DentalWorkforceProfessionCode {
  const n = normalizeWorkforceProfessionCode(code);
  return n != null && (DENTAL_WORKFORCE_PROFESSION_CODES as readonly string[]).includes(n);
}

export function isProviderFamilyProfession(code: string | null | undefined): boolean {
  const n = canonicalizeWorkforceProfession(code);
  return n != null && (PROVIDER_FAMILY_PROFESSION_CODES as readonly string[]).includes(n);
}

export function isClinicClinicalWorkforceProfession(code: string | null | undefined): boolean {
  const n = canonicalizeWorkforceProfession(code);
  if (!n) return false;
  if (isDentalWorkforceProfession(n) && n !== "DENTIST") return false;
  if (n === "DENTIST") return false;
  return (
    isProviderFamilyProfession(n) ||
    n === "REGISTERED_NURSE" ||
    n === "LICENSED_PRACTICAL_NURSE" ||
    n === "NURSING" ||
    n === "RN" ||
    n === "NURSE_PRACTITIONER" ||
    n === "PHYSICIAN_ASSISTANT"
  );
}

/** Collapse deprecated aliases only — never invent MD vs DO. */
export function canonicalizeWorkforceProfession(
  code: string | null | undefined
): WorkforceProfessionCode | null {
  const n = normalizeWorkforceProfessionCode(code);
  if (!n) return null;
  if (n === "PROVIDER") return "PROVIDER_UNSPECIFIED";
  if (n === "LEGACY_PROVIDER") return "PROVIDER_UNSPECIFIED";
  if (n === "ADMINISTRATOR") return "ADMINISTRATION";
  if (n === "RN") return "NURSING";
  return n;
}

export function hasDentalSigningAuthority(code: string | null | undefined): boolean {
  return getWorkforceProfessionDefinition(code)?.dentalSigningAuthority === true;
}

export type ResolveRoleCodeFromProfessionResult =
  | { ok: true; roleCode: AdminAssignableRoleCode }
  | { ok: false; errorKey: "adminUsers.valTechnicianTypeRequired" };

export function resolveRoleCodeFromProfession(input: {
  profession: AdminProfessionCode | WorkforceProfessionCode | string;
  technicianType?: TechnicianTypeCode | null;
}): ResolveRoleCodeFromProfessionResult {
  const raw = String(input.profession ?? "")
    .trim()
    .toUpperCase();
  const profession = canonicalizeWorkforceProfession(raw) ?? raw;

  if (profession === "TECHNICIAN") {
    const type = input.technicianType;
    if (type === "LAB" || type === "RADIOLOGY") return { ok: true, roleCode: type };
    if (type === "PATIENT_CARE") return { ok: true, roleCode: "PATIENT_CARE_TECH" };
    return { ok: false, errorKey: "adminUsers.valTechnicianTypeRequired" };
  }

  const def = getWorkforceProfessionDefinition(profession);
  if (!def) return { ok: false, errorKey: "adminUsers.valTechnicianTypeRequired" };
  if (def.systemRole === "TECHNICIAN") {
    return { ok: false, errorKey: "adminUsers.valTechnicianTypeRequired" };
  }
  return { ok: true, roleCode: def.systemRole };
}

export function preferredDepartmentCodeForProfession(
  profession: string | null | undefined
): string | null {
  return getWorkforceProfessionDefinition(profession)?.preferredDepartmentCode ?? null;
}

/**
 * Filter department options by profession routing ∩ facility department catalog.
 * Does not invent departments that are not provisioned at the facility.
 * Empty validDepartmentCodes (admin/billing) → show all facility departments.
 */
export function filterDepartmentsForProfession<
  T extends { id: string; code: string; name?: string },
>(input: {
  profession: string | null | undefined;
  facilityDepartments: readonly T[];
  facilityServiceLines?: readonly string[] | null;
}): T[] {
  const def = getWorkforceProfessionDefinition(input.profession);
  const lines = new Set(
    (input.facilityServiceLines ?? []).map((l) => String(l).trim().toUpperCase())
  );
  const hasLines = lines.size > 0;
  const dentalEnabled = !hasLines || lines.has("DENTAL");

  return input.facilityDepartments.filter((d) => {
    const code = String(d.code ?? "")
      .trim()
      .toUpperCase();
    if (!def || def.validDepartmentCodes.length === 0) return true;
    if (!def.validDepartmentCodes.includes(code)) return false;
    if (code === "DENTAL" && !dentalEnabled) return false;
    return true;
  });
}

export function inferWorkforceProfessionFromRoleAndDepartment(input: {
  roleCode: string;
  departmentCode?: string | null;
}): WorkforceProfessionCode {
  const role = String(input.roleCode ?? "")
    .trim()
    .toUpperCase();
  const dept = String(input.departmentCode ?? "")
    .trim()
    .toUpperCase();

  if (role === "ADMIN" || role === "MEDORA_SUPER_ADMIN") return "ADMINISTRATION";
  if (role === "PROVIDER") {
    if (dept === "DENTAL") return "DENTIST";
    /** Never guess MD/DO/NP/PA — keep unspecified legacy. */
    return "PROVIDER_UNSPECIFIED";
  }
  if (role === "RN") return "NURSING";
  if (role === "LAB" || role === "RADIOLOGY") return "TECHNICIAN";
  if (role === "PATIENT_CARE_TECH") {
    if (dept === "DENTAL") return "DENTAL_TECHNICIAN";
    return "PATIENT_CARE_TECHNICIAN";
  }
  if (role === "PHARMACY") return "PHARMACY";
  if (role === "BILLING") return "BILLING";
  if (role === "FRONT_DESK") {
    if (dept === "DENTAL") return "DENTAL_ASSISTANT";
    return "FRONT_DESK";
  }
  return "ADMINISTRATION";
}

export function resolveProfessionFromRoleCode(
  roleCode: string,
  departmentCode?: string | null
): {
  profession: AdminProfessionCode;
  technicianType?: TechnicianTypeCode;
} {
  const inferred = inferWorkforceProfessionFromRoleAndDepartment({ roleCode, departmentCode });
  const role = String(roleCode ?? "")
    .trim()
    .toUpperCase();

  if (inferred === "TECHNICIAN" || role === "LAB" || role === "RADIOLOGY") {
    if (role === "LAB") return { profession: "TECHNICIAN", technicianType: "LAB" };
    if (role === "RADIOLOGY") return { profession: "TECHNICIAN", technicianType: "RADIOLOGY" };
  }
  if (inferred === "PATIENT_CARE_TECHNICIAN" || role === "PATIENT_CARE_TECH") {
    if (inferred === "DENTAL_TECHNICIAN") return { profession: "DENTAL_TECHNICIAN" };
    if (role === "PATIENT_CARE_TECH" && inferred === "TECHNICIAN") {
      return { profession: "TECHNICIAN", technicianType: "PATIENT_CARE" };
    }
    if ((ADMIN_PROFESSION_CODES as readonly string[]).includes(inferred)) {
      return { profession: inferred as AdminProfessionCode };
    }
  }

  if ((ADMIN_PROFESSION_CODES as readonly string[]).includes(inferred)) {
    return { profession: inferred as AdminProfessionCode };
  }
  if (inferred === "PROVIDER" || inferred === "LEGACY_PROVIDER") {
    return { profession: "PROVIDER_UNSPECIFIED" };
  }
  if (inferred === "RN") return { profession: "NURSING" };
  return { profession: "ADMINISTRATION" };
}

export function hasDentalProfessionAssignment(
  professionCodes: readonly string[] | null | undefined
): boolean {
  return (professionCodes ?? []).some((c) => isDentalWorkforceProfession(c));
}

export function hasClinicProfessionAssignment(
  professionCodes: readonly string[] | null | undefined
): boolean {
  return (professionCodes ?? []).some((c) => isClinicClinicalWorkforceProfession(c));
}

export function hasProviderFamilyAssignment(
  professionCodes: readonly string[] | null | undefined
): boolean {
  return (professionCodes ?? []).some((c) => isProviderFamilyProfession(c));
}

/**
 * Documented RoleCode gaps (MEDUI.D4C.11A) — do not invent RoleCode-per-profession.
 * Allied / dental support map to PATIENT_CARE_TECH until a dedicated allied RoleCode exists.
 */
export const D4C11A_ROLECODE_GAPS = [
  "No ALLIED_HEALTH / THERAPY RoleCode — PT/OT/SLP/RT/dietitian/SW/CM use PATIENT_CARE_TECH",
  "No DENTAL_HYGIENIST RoleCode — hygienist uses PATIENT_CARE_TECH + profession capabilities",
  "No DENTAL_ASSISTANT RoleCode — assistant uses PATIENT_CARE_TECH (not FRONT_DESK)",
  "PROVIDER means physician/APP/dentist authorization family — not every licensed clinician",
] as const;

/** Existing User credential fields reused for provider-family onboarding (no new table). */
export const EXISTING_PROVIDER_CREDENTIAL_USER_FIELDS = [
  "firstName",
  "lastName",
  "email",
  "billingNpi",
  "billingTaxonomyCode",
  "billingNameOverride",
] as const;

/** Deferred credential fields — not on User today; do not invent schema in this milestone. */
export const DEFERRED_CREDENTIAL_FIELDS = [
  "middleName",
  "credentialDegree",
  "licenseNumber",
  "licenseJurisdiction",
  "licenseExpiration",
  "deaNumber",
  "supervisingProviderUserId",
] as const;

/**
 * Which credential dimensions apply conceptually (existing fields vs deferred).
 * UI shows only EXISTING fields when profile requires billing identity.
 */
export const CREDENTIAL_APPLICABILITY_BY_FAMILY: Record<
  WorkforceCredentialProfile,
  { existing: readonly string[]; deferred: readonly string[] }
> = {
  NONE: { existing: ["firstName", "lastName", "email"], deferred: [] },
  PROVIDER_BILLING: {
    existing: EXISTING_PROVIDER_CREDENTIAL_USER_FIELDS,
    deferred: DEFERRED_CREDENTIAL_FIELDS,
  },
  DENTAL_PROVIDER: {
    existing: EXISTING_PROVIDER_CREDENTIAL_USER_FIELDS,
    deferred: ["credentialDegree", "licenseNumber", "licenseJurisdiction", "licenseExpiration"],
  },
  DENTAL_SUPPORT: {
    existing: ["firstName", "lastName", "email"],
    deferred: ["licenseNumber", "licenseJurisdiction", "licenseExpiration"],
  },
  NURSING: {
    existing: ["firstName", "lastName", "email"],
    deferred: ["licenseNumber", "licenseJurisdiction", "licenseExpiration"],
  },
  PHARMACY: {
    existing: ["firstName", "lastName", "email"],
    deferred: ["licenseNumber", "licenseJurisdiction", "licenseExpiration", "deaNumber"],
  },
  ALLIED: {
    existing: ["firstName", "lastName", "email"],
    deferred: ["licenseNumber", "licenseJurisdiction", "licenseExpiration"],
  },
};

export function credentialProfileForProfession(
  profession: string | null | undefined
): WorkforceCredentialProfile {
  return getWorkforceProfessionDefinition(profession)?.credentialProfile ?? "NONE";
}

export function showsProviderBillingCredentialFields(
  profession: string | null | undefined
): boolean {
  const p = credentialProfileForProfession(profession);
  return p === "PROVIDER_BILLING" || p === "DENTAL_PROVIDER";
}

/**
 * Assignment uniqueness key: one profession may appear once per department at a facility.
 * Null department is treated as a distinct "unassigned" slot (only one per profession).
 */
export function workforceAssignmentConflictKey(input: {
  facilityId: string;
  professionCode?: string | null;
  departmentId?: string | null;
  roleCode?: string;
}): string {
  const profession =
    canonicalizeWorkforceProfession(input.professionCode) ??
    (input.roleCode ? `ROLE:${input.roleCode}` : "UNKNOWN");
  const dept = input.departmentId?.trim() ? input.departmentId.trim() : "__NONE__";
  return `${input.facilityId}::${profession}::${dept}`;
}
