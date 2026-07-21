/**
 * D3E.6B — Canonical clinical unit type vocabulary.
 * Unit types are supported configuration vocabulary; facility units are
 * configured records with display names. Floors are never clinical hierarchy.
 */

export const UNIT_BASED_HOSPITAL_NAVIGATION_CERTIFICATION_ID =
  "MEDUI.UNIT_BASED_HOSPITAL_NAVIGATION.D3E6B" as const;

/** Canonical unit type codes (configuration vocabulary). */
export const HOSPITAL_CLINICAL_UNIT_TYPES = [
  // General inpatient
  "MEDICAL_SURGICAL",
  "MEDICAL",
  "SURGICAL",
  "GENERAL_MEDICINE",
  "HOSPITALIST",
  "SHORT_STAY_INPATIENT",
  "EXTENDED_RECOVERY",
  // Critical care
  "ICU_GENERAL",
  "ICU_MEDICAL",
  "ICU_SURGICAL",
  "ICU_CARDIAC",
  "ICU_CARDIOVASCULAR",
  "ICU_NEURO",
  "ICU_TRAUMA",
  "ICU_BURN",
  "ICU_PEDIATRIC",
  "ICU_NEONATAL",
  "ICU_CARDIOTHORACIC",
  // Intermediate
  "PROGRESSIVE_CARE",
  "STEP_DOWN",
  "INTERMEDIATE_CARE",
  "TELEMETRY",
  "CARDIAC_TELEMETRY",
  // Pediatrics
  "PEDIATRIC_MEDICAL",
  "PEDIATRIC_SURGICAL",
  "PEDIATRIC_OBSERVATION",
  "NEWBORN_NURSERY",
  // Women's health
  "LABOR_DELIVERY",
  "ANTEPARTUM",
  "POSTPARTUM",
  "MOTHER_BABY",
  "GYNECOLOGY",
  "HIGH_RISK_OBSTETRICS",
  // Surgical / procedural
  "PREOPERATIVE",
  "OPERATING_ROOM",
  "PACU",
  "SURGICAL_RECOVERY",
  "AMBULATORY_SURGERY",
  "SAME_DAY_SURGERY",
  "ENDOSCOPY",
  "INTERVENTIONAL_RADIOLOGY_RECOVERY",
  "CATH_LAB_RECOVERY",
  // Specialty medical
  "CARDIOLOGY",
  "NEUROLOGY",
  "NEUROSURGERY",
  "STROKE",
  "PULMONOLOGY",
  "GASTROENTEROLOGY",
  "NEPHROLOGY",
  "DIALYSIS",
  "ONCOLOGY",
  "HEMATOLOGY",
  "BONE_MARROW_TRANSPLANT",
  "INFECTIOUS_DISEASE",
  "ORTHOPEDICS",
  "SPINE",
  "TRAUMA",
  "BURN",
  "TRANSPLANT",
  // Behavioral
  "BEHAVIORAL_HEALTH_ADULT",
  "BEHAVIORAL_HEALTH_GERIATRIC",
  "BEHAVIORAL_HEALTH_ADOLESCENT",
  "MEDICAL_PSYCHIATRY",
  "DETOXIFICATION",
  // Rehab
  "INPATIENT_REHABILITATION",
  "PHYSICAL_REHABILITATION",
  "NEURO_REHABILITATION",
  "CARDIAC_REHABILITATION",
  // Other clinical
  "OBSERVATION",
  "CLINICAL_DECISION",
  "ED_BOARDING",
  "INFUSION",
  "PALLIATIVE",
  "HOSPICE",
  "SKILLED_NURSING",
  "LTAC",
  "RESPIRATORY_CARE",
  "ISOLATION",
  "OTHER",
] as const;

export type HospitalClinicalUnitType = (typeof HOSPITAL_CLINICAL_UNIT_TYPES)[number];

export type HospitalUnitLevelOfCare =
  | "GENERAL"
  | "INTERMEDIATE"
  | "CRITICAL"
  | "OBSERVATION"
  | "PROCEDURAL"
  | "SPECIALTY"
  | "OTHER";

export function isHospitalClinicalUnitType(raw: unknown): raw is HospitalClinicalUnitType {
  return (
    typeof raw === "string" &&
    (HOSPITAL_CLINICAL_UNIT_TYPES as readonly string[]).includes(raw.trim().toUpperCase())
  );
}

export function normalizeHospitalClinicalUnitType(raw: unknown): HospitalClinicalUnitType | null {
  if (typeof raw !== "string") return null;
  const token = raw.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (!token) return null;
  if (isHospitalClinicalUnitType(token)) return token;
  // Common aliases → canonical types
  if (token === "MS" || token === "MED_SURG" || token === "MEDSURG") return "MEDICAL_SURGICAL";
  if (token === "ICU" || token === "INTENSIVE_CARE") return "ICU_GENERAL";
  if (token === "OBS" || token === "OBSERVATION_UNIT") return "OBSERVATION";
  if (token === "PCU" || token === "STEPDOWN") return "PROGRESSIVE_CARE";
  if (token === "PEDS" || token === "PEDIATRICS") return "PEDIATRIC_MEDICAL";
  if (token === "SURG" || token === "SURGERY") return "SURGICAL";
  if (token === "LD" || token === "L_AND_D") return "LABOR_DELIVERY";
  return null;
}

export function levelOfCareForUnitType(unitType: HospitalClinicalUnitType): HospitalUnitLevelOfCare {
  if (unitType === "OBSERVATION" || unitType === "CLINICAL_DECISION" || unitType === "ED_BOARDING") {
    return "OBSERVATION";
  }
  if (unitType.startsWith("ICU_") || unitType === "ICU_GENERAL") return "CRITICAL";
  if (
    unitType === "PROGRESSIVE_CARE" ||
    unitType === "STEP_DOWN" ||
    unitType === "INTERMEDIATE_CARE" ||
    unitType === "TELEMETRY" ||
    unitType === "CARDIAC_TELEMETRY"
  ) {
    return "INTERMEDIATE";
  }
  if (
    unitType === "OPERATING_ROOM" ||
    unitType === "PACU" ||
    unitType === "PREOPERATIVE" ||
    unitType === "ENDOSCOPY" ||
    unitType.includes("SURGERY") ||
    unitType.includes("RECOVERY")
  ) {
    return "PROCEDURAL";
  }
  if (
    unitType.startsWith("BEHAVIORAL_") ||
    unitType.includes("ONCOLOGY") ||
    unitType.includes("TRANSPLANT") ||
    unitType === "STROKE" ||
    unitType === "TRAUMA" ||
    unitType === "BURN"
  ) {
    return "SPECIALTY";
  }
  if (
    unitType === "MEDICAL_SURGICAL" ||
    unitType === "MEDICAL" ||
    unitType === "SURGICAL" ||
    unitType === "GENERAL_MEDICINE" ||
    unitType === "HOSPITALIST" ||
    unitType === "SHORT_STAY_INPATIENT" ||
    unitType === "EXTENDED_RECOVERY" ||
    unitType.startsWith("PEDIATRIC_") ||
    unitType === "LABOR_DELIVERY" ||
    unitType === "ANTEPARTUM" ||
    unitType === "POSTPARTUM" ||
    unitType === "MOTHER_BABY"
  ) {
    return "GENERAL";
  }
  return "OTHER";
}

/** Support departments — never clinical inpatient tree nodes. */
export const HOSPITAL_SUPPORT_AREA_CODES = [
  "LABORATORY",
  "RADIOLOGY",
  "PHARMACY",
  "RESPIRATORY_THERAPY",
  "PHYSICAL_THERAPY",
  "OCCUPATIONAL_THERAPY",
  "SPEECH_THERAPY",
  "CASE_MANAGEMENT",
  "SOCIAL_WORK",
  "DIETARY",
  "CENTRAL_SUPPLY",
  "ENVIRONMENTAL_SERVICES",
] as const;

export function isHospitalSupportArea(code: string): boolean {
  return (HOSPITAL_SUPPORT_AREA_CODES as readonly string[]).includes(
    code.trim().toUpperCase().replace(/[\s-]+/g, "_")
  );
}
