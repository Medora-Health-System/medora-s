export const MEDORA_STAFF_PERSONA_CODES = [
  "IMPLEMENTATION",
  "SUPPORT",
  "BILLING_OPERATIONS",
  "COMPLIANCE_SECURITY",
  "PLATFORM_OPERATIONS",
] as const;

export type MedoraStaffPersonaCode = (typeof MEDORA_STAFF_PERSONA_CODES)[number];

export const MEDORA_STAFF_PERSONA_OPTIONS: ReadonlyArray<{
  value: MedoraStaffPersonaCode;
  labelKey: `persona.${MedoraStaffPersonaCode}`;
}> = MEDORA_STAFF_PERSONA_CODES.map((value) => ({ value, labelKey: `persona.${value}` }));

export function parseMedoraStaffPersonaCode(value: unknown): MedoraStaffPersonaCode {
  if (typeof value === "string" && MEDORA_STAFF_PERSONA_CODES.some((code) => code === value)) {
    return value as MedoraStaffPersonaCode;
  }
  throw new TypeError("Invalid Medora staff persona code");
}
