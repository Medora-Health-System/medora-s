/**
 * D4A.0 — Governed admitting service + requested level of care vocabularies.
 * Facility configuration may filter availability; do not invent parallel enums per screen.
 */

export const HOSPITAL_ADMITTING_SERVICES = [
  "HOSPITAL_MEDICINE",
  "INTERNAL_MEDICINE",
  "FAMILY_MEDICINE",
  "GENERAL_SURGERY",
  "ORTHOPEDIC_SURGERY",
  "CARDIOLOGY",
  "PULMONOLOGY",
  "NEUROLOGY",
  "NEPHROLOGY",
  "GASTROENTEROLOGY",
  "PEDIATRICS",
  "OBSTETRICS",
  "CRITICAL_CARE",
  "OTHER",
] as const;

export type HospitalAdmittingService = (typeof HOSPITAL_ADMITTING_SERVICES)[number];

export function isHospitalAdmittingService(raw: unknown): raw is HospitalAdmittingService {
  return (
    typeof raw === "string" &&
    (HOSPITAL_ADMITTING_SERVICES as readonly string[]).includes(raw.trim().toUpperCase())
  );
}

export const HOSPITAL_REQUESTED_LEVELS_OF_CARE = [
  "MEDICAL_SURGICAL",
  "TELEMETRY",
  "STEPDOWN",
  "INTERMEDIATE_CARE",
  "INTENSIVE_CARE",
  "POSTOPERATIVE",
  "PEDIATRIC_ACUTE_CARE",
  "LABOR_AND_DELIVERY",
  "POSTPARTUM",
] as const;

export type HospitalRequestedLevelOfCare =
  (typeof HOSPITAL_REQUESTED_LEVELS_OF_CARE)[number];

export function isHospitalRequestedLevelOfCare(
  raw: unknown
): raw is HospitalRequestedLevelOfCare {
  return (
    typeof raw === "string" &&
    (HOSPITAL_REQUESTED_LEVELS_OF_CARE as readonly string[]).includes(raw.trim().toUpperCase())
  );
}

/** Compatible default levels by unit code (pilot). */
export const UNIT_COMPATIBLE_LEVELS_OF_CARE: Record<string, readonly HospitalRequestedLevelOfCare[]> =
  {
    MS: ["MEDICAL_SURGICAL", "TELEMETRY", "STEPDOWN", "INTERMEDIATE_CARE", "POSTOPERATIVE"],
    ICU: ["INTENSIVE_CARE", "STEPDOWN"],
    OBS: ["MEDICAL_SURGICAL", "TELEMETRY", "INTERMEDIATE_CARE"],
    PED: ["PEDIATRIC_ACUTE_CARE", "MEDICAL_SURGICAL"],
    PEDS: ["PEDIATRIC_ACUTE_CARE", "MEDICAL_SURGICAL"],
    LD: ["LABOR_AND_DELIVERY", "POSTPARTUM"],
    LND: ["LABOR_AND_DELIVERY", "POSTPARTUM"],
    SURGERY: ["POSTOPERATIVE", "MEDICAL_SURGICAL"],
    PACU: ["POSTOPERATIVE"],
  };

export function levelsOfCareForUnit(unitCode: string | null | undefined): readonly HospitalRequestedLevelOfCare[] {
  const key = String(unitCode ?? "").trim().toUpperCase();
  if (!key) return HOSPITAL_REQUESTED_LEVELS_OF_CARE;
  return UNIT_COMPATIBLE_LEVELS_OF_CARE[key] ?? HOSPITAL_REQUESTED_LEVELS_OF_CARE;
}

export function isLevelOfCareCompatibleWithUnit(
  level: string | null | undefined,
  unitCode: string | null | undefined
): boolean {
  const lvl = String(level ?? "").trim().toUpperCase();
  if (!lvl || !isHospitalRequestedLevelOfCare(lvl)) return false;
  const allowed = levelsOfCareForUnit(unitCode);
  return (allowed as readonly string[]).includes(lvl);
}
