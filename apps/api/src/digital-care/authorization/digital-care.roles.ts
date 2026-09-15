export const DIGITAL_CARE_ROLES = [
  "PATIENT",
  "PROVIDER",
  "NURSE",
  "FACILITY_ADMIN",
  "BILLING",
  "QA",
  "SUPER_ADMIN",
  "FAMILY_PROXY",
  "INTERPRETER",
  "CARE_COORDINATOR",
] as const;

export type DigitalCareRole = (typeof DIGITAL_CARE_ROLES)[number];

/**
 * Digital Care actor categories are authorization-contract concepts only.
 * Existing Medora authentication and central role resolution remain authoritative.
 * Mapping concrete central role codes to these categories is an integration concern,
 * not a second authentication or role store.
 */
export interface DigitalCareRoleResolution {
  readonly role: DigitalCareRole;
  readonly centralRoleCodes: readonly string[];
}
