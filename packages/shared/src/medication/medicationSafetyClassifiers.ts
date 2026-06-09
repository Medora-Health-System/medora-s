import { z } from "zod";

/** TermClassifier.domain values for medication safety governance (M1.3B). */
export const MEDICATION_SAFETY_CLASSIFIER_DOMAINS = [
  "CONTROLLED_SUBSTANCE",
  "HIGH_ALERT",
  "SAFETY_REQUIREMENT",
  "LASA",
] as const;

export type MedicationSafetyClassifierDomain = (typeof MEDICATION_SAFETY_CLASSIFIER_DOMAINS)[number];

export const medicationSafetyClassifierDomainSchema = z.enum(MEDICATION_SAFETY_CLASSIFIER_DOMAINS);

/** Controlled substance classifiers (M1.3A). */
export const CONTROLLED_SUBSTANCE_CLASSES = [
  "CONTROLLED_NONE",
  "CONTROLLED_SCHEDULE_II",
  "CONTROLLED_SCHEDULE_III",
  "CONTROLLED_SCHEDULE_IV",
  "CONTROLLED_SCHEDULE_V",
  "CONTROLLED_OTHER",
] as const;

export type ControlledSubstanceClass = (typeof CONTROLLED_SUBSTANCE_CLASSES)[number];

export const controlledSubstanceClassSchema = z.enum(CONTROLLED_SUBSTANCE_CLASSES);

/** High-alert medication classifiers (M1.3A). */
export const HIGH_ALERT_CLASSES = [
  "HIGH_ALERT_NONE",
  "HIGH_ALERT_INSULIN",
  "HIGH_ALERT_ANTICOAGULANT",
  "HIGH_ALERT_ELECTROLYTE",
  "HIGH_ALERT_OPIOID",
  "HIGH_ALERT_BENZODIAZEPINE",
  "HIGH_ALERT_SEDATIVE",
  "HIGH_ALERT_PARALYTIC",
  "HIGH_ALERT_VASOPRESSOR",
  "HIGH_ALERT_ANTIARRHYTHMIC",
  "HIGH_ALERT_THROMBOLYTIC",
  "HIGH_ALERT_CHEMOTHERAPY",
  "HIGH_ALERT_OTHER",
] as const;

export type HighAlertClass = (typeof HIGH_ALERT_CLASSES)[number];

export const highAlertClassSchema = z.enum(HIGH_ALERT_CLASSES);

/** Workflow safety requirement flags (reference vocabulary — not assigned to meds in M1.3B). */
export const SAFETY_REQUIREMENT_CODES = [
  "REQUIRES_DUAL_VERIFICATION",
  "REQUIRES_INDEPENDENT_DOUBLE_CHECK",
  "REQUIRES_WITNESS",
  "REQUIRES_WASTE_DOCUMENTATION",
  "REQUIRES_SHIFT_COUNT",
  "REQUIRES_PHARMACY_VERIFICATION",
  "REQUIRES_MAR_VERIFICATION",
  "REQUIRES_OVERRIDE_REASON",
  "REQUIRES_COSIGN",
  "REQUIRES_INVENTORY_TRACKING",
  "REQUIRES_RECONCILIATION_REVIEW",
] as const;

export type SafetyRequirementCode = (typeof SAFETY_REQUIREMENT_CODES)[number];

export const safetyRequirementCodeSchema = z.enum(SAFETY_REQUIREMENT_CODES);

/** LASA risk level classifiers (M1.3A). */
export const LASA_RISK_LEVELS = ["LASA_NONE", "LASA_LOW", "LASA_MEDIUM", "LASA_HIGH"] as const;

export type LasaRiskLevel = (typeof LASA_RISK_LEVELS)[number];

export const lasaRiskLevelSchema = z.enum(LASA_RISK_LEVELS);

/** Expected TermClassifier row counts per domain after foundation seed. */
export const MEDICATION_SAFETY_CLASSIFIER_DOMAIN_COUNTS: Record<MedicationSafetyClassifierDomain, number> = {
  CONTROLLED_SUBSTANCE: CONTROLLED_SUBSTANCE_CLASSES.length,
  HIGH_ALERT: HIGH_ALERT_CLASSES.length,
  SAFETY_REQUIREMENT: SAFETY_REQUIREMENT_CODES.length,
  LASA: LASA_RISK_LEVELS.length,
};

export const MEDICATION_SAFETY_CLASSIFIER_TOTAL_COUNT = Object.values(
  MEDICATION_SAFETY_CLASSIFIER_DOMAIN_COUNTS
).reduce((sum, n) => sum + n, 0);

const DOMAIN_CODE_SETS: Record<MedicationSafetyClassifierDomain, readonly string[]> = {
  CONTROLLED_SUBSTANCE: CONTROLLED_SUBSTANCE_CLASSES,
  HIGH_ALERT: HIGH_ALERT_CLASSES,
  SAFETY_REQUIREMENT: SAFETY_REQUIREMENT_CODES,
  LASA: LASA_RISK_LEVELS,
};

export function isMedicationSafetyClassifierDomain(raw: string): raw is MedicationSafetyClassifierDomain {
  return medicationSafetyClassifierDomainSchema.safeParse(raw).success;
}

export function parseControlledSubstanceClass(
  raw: string | null | undefined
): ControlledSubstanceClass | null {
  if (raw == null || typeof raw !== "string") return null;
  const t = raw.trim().toUpperCase();
  if (!t) return null;
  const r = controlledSubstanceClassSchema.safeParse(t);
  return r.success ? r.data : null;
}

export function parseHighAlertClass(raw: string | null | undefined): HighAlertClass | null {
  if (raw == null || typeof raw !== "string") return null;
  const t = raw.trim().toUpperCase();
  if (!t) return null;
  const r = highAlertClassSchema.safeParse(t);
  return r.success ? r.data : null;
}

export function parseSafetyRequirementCode(raw: string | null | undefined): SafetyRequirementCode | null {
  if (raw == null || typeof raw !== "string") return null;
  const t = raw.trim().toUpperCase();
  if (!t) return null;
  const r = safetyRequirementCodeSchema.safeParse(t);
  return r.success ? r.data : null;
}

export function parseLasaRiskLevel(raw: string | null | undefined): LasaRiskLevel | null {
  if (raw == null || typeof raw !== "string") return null;
  const t = raw.trim().toUpperCase();
  if (!t) return null;
  const r = lasaRiskLevelSchema.safeParse(t);
  return r.success ? r.data : null;
}

/** Validate (domain, code) against the M1.3B classifier vocabulary. */
export function validateMedicationSafetyClassifierCode(
  domain: string,
  code: string
): { ok: true; domain: MedicationSafetyClassifierDomain; code: string } | { ok: false; error: string } {
  const domainParsed = medicationSafetyClassifierDomainSchema.safeParse(domain?.trim());
  if (!domainParsed.success) {
    return { ok: false, error: `invalid domain: ${domain}` };
  }
  const normalizedCode = code?.trim().toUpperCase();
  if (!normalizedCode) {
    return { ok: false, error: "code is required" };
  }
  const allowed = DOMAIN_CODE_SETS[domainParsed.data];
  if (!(allowed as readonly string[]).includes(normalizedCode)) {
    return { ok: false, error: `invalid code ${normalizedCode} for domain ${domainParsed.data}` };
  }
  return { ok: true, domain: domainParsed.data, code: normalizedCode };
}

/** Map legacy DEA schedule strings to controlled substance class (validation helper only). */
export function controlledScheduleToClass(
  schedule: string | null | undefined,
  isControlled?: boolean | null
): ControlledSubstanceClass {
  if (isControlled !== true) return "CONTROLLED_NONE";
  const s = (schedule ?? "").trim().toUpperCase();
  if (s === "II" || s === "2" || s === "C-II") return "CONTROLLED_SCHEDULE_II";
  if (s === "III" || s === "3" || s === "C-III") return "CONTROLLED_SCHEDULE_III";
  if (s === "IV" || s === "4" || s === "C-IV") return "CONTROLLED_SCHEDULE_IV";
  if (s === "V" || s === "5" || s === "C-V") return "CONTROLLED_SCHEDULE_V";
  if (!s) return "CONTROLLED_OTHER";
  return "CONTROLLED_OTHER";
}
