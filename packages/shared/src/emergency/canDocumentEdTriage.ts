/** Roles always allowed to document triage/vitals (any encounter type). */
export const ED_TRIAGE_CLINICAL_ROLE_CODES = [
  "ADMIN",
  "MEDORA_SUPER_ADMIN",
  "RN",
  "PROVIDER",
] as const;

/** Department tech roles — triage only in ED/emergency encounter context. */
export const ED_TRIAGE_TECH_ROLE_CODES = ["LAB", "RADIOLOGY"] as const;

export type CanDocumentEdTriageInput = {
  roleCodes: string[];
  encounterType?: string | null;
  departmentCode?: string | null;
  facilityUnit?: string | null;
};

function normalizeRoleCodes(roleCodes: readonly string[]): string[] {
  return roleCodes.map((code) => code.trim().toUpperCase()).filter(Boolean);
}

/** True when the encounter is an ED / emergency clinical context (not floor/inpatient). */
export function isEdEncounterClinicalContext(input: {
  encounterType?: string | null;
  departmentCode?: string | null;
  facilityUnit?: string | null;
}): boolean {
  const encounterType = input.encounterType?.trim().toUpperCase() ?? "";
  if (encounterType === "EMERGENCY") return true;

  const departmentCode = input.departmentCode?.trim().toUpperCase() ?? "";
  const facilityUnit = input.facilityUnit?.trim().toUpperCase() ?? "";
  return (
    departmentCode === "ED" ||
    departmentCode === "EMERGENCY" ||
    facilityUnit === "ED" ||
    facilityUnit === "EMERGENCY"
  );
}

/**
 * Department-scoped triage/vitals documentation (MEDUI.ED.ROLE.1A).
 * ED lab/radiology technicians may document triage in ED only — not facility-wide RN.
 */
export function canDocumentEdTriage(input: CanDocumentEdTriageInput): boolean {
  const roles = normalizeRoleCodes(input.roleCodes);
  if (
    roles.some((code) =>
      (ED_TRIAGE_CLINICAL_ROLE_CODES as readonly string[]).includes(code)
    )
  ) {
    return true;
  }

  const isEdTech = roles.some((code) =>
    (ED_TRIAGE_TECH_ROLE_CODES as readonly string[]).includes(code)
  );
  if (isEdTech && isEdEncounterClinicalContext(input)) {
    return true;
  }

  return false;
}
