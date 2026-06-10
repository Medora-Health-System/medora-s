/**
 * M1.8B.7E.2C.3 — Canonical vasopressor/inotrope catalog alignment (Haiti + Enterprise Wave4).
 * Classification helpers only — no MAR witness enforcement.
 *
 * Milrinone: temporarily grouped under HIGH_ALERT_VASOPRESSOR manifest rows until
 * HIGH_ALERT_INOTROPE exists (future migration).
 */

/** Haiti + Enterprise Wave4 dopamine catalog codes. */
export const VASOPRESSOR_DOPAMINE_CATALOG_CODES = [
  "DOPAMINE_400MG_250ML_IV",
  "DOPAMINE_400_MG_250_ML_PERFUSION_INTRAVEINEUSE",
  "DOPAMINE_800_MG_250_ML_PERFUSION_INTRAVEINEUSE",
] as const;

/** Haiti + Enterprise Wave4 dobutamine catalog codes. */
export const VASOPRESSOR_DOBUTAMINE_CATALOG_CODES = [
  "DOBUTAMINE_250MG_20ML_IV",
  "DOBUTAMINE_250_MG_20_ML_INJECTABLE_INTRAVEINEUSE",
  "DOBUTAMINE_500_MG_250_ML_PERFUSION_INTRAVEINEUSE",
] as const;

/** Haiti + Enterprise Wave4 norepinephrine catalog codes. */
export const VASOPRESSOR_NOREPINEPHRINE_CATALOG_CODES = [
  "NOREPINEPHRINE_4MG_4ML_IV",
  "NOREPINEPHRINE_4_MG_4_ML_INJECTABLE_INTRAVEINEUSE",
  "NOREPINEPHRINE_8_MG_250_ML_PERFUSION_INTRAVEINEUSE",
  "NOREPINEPHRINE_16_MG_250_ML_PERFUSION_INTRAVEINEUSE",
] as const;

/** Haiti + Enterprise Wave4 phenylephrine catalog codes. */
export const VASOPRESSOR_PHENYLEPHRINE_CATALOG_CODES = [
  "PHENYLEPHRINE_10MG_ML_IV",
  "PHENYLEPHRINE_10_MG_ML_INJECTABLE_INTRAVEINEUSE",
  "PHENYLEPHRINE_50_MG_250_ML_PERFUSION_INTRAVEINEUSE",
] as const;

/** Haiti + Enterprise Wave4 vasopressin catalog codes. */
export const VASOPRESSOR_VASOPRESSIN_CATALOG_CODES = [
  "VASOPRESSIN_20UI_ML_IV",
  "VASOPRESSIN_20_UNITS_ML_INJECTABLE_INTRAVEINEUSE",
  "VASOPRESSIN_40_UNITS_100_ML_PERFUSION_INTRAVEINEUSE",
] as const;

/** Epinephrine push (ACLS / anaphylaxis) — Haiti Adrenaline + enterprise push SKU. */
export const VASOPRESSOR_EPINEPHRINE_PUSH_CATALOG_CODES = [
  "ADRENALINE_1_MG_PER_ML_INJECTABLE_INJECTION",
] as const;

/** Epinephrine infusion drips (enterprise; no Haiti drip SKU today). */
export const VASOPRESSOR_EPINEPHRINE_INFUSION_CATALOG_CODES = [
  "EPINEPHRINE_0_1_MG_ML_PERFUSION_INTRAVEINEUSE",
  "EPINEPHRINE_4_MG_250_ML_PERFUSION_INTRAVEINEUSE",
  "EPINEPHRINE_16_MG_250_ML_PERFUSION_INTRAVEINEUSE",
] as const;

/** Milrinone infusion (enterprise only; HIGH_ALERT_VASOPRESSOR until INOTROPE class exists). */
export const VASOPRESSOR_MILRINONE_CATALOG_CODES = [
  "MILRINONE_1_MG_ML_INJECTABLE_INTRAVEINEUSE",
  "MILRINONE_40_MG_200_ML_PERFUSION_INTRAVEINEUSE",
] as const;

export const VASOPRESSOR_GOVERNANCE_CATALOG_CODES = [
  ...VASOPRESSOR_DOPAMINE_CATALOG_CODES,
  ...VASOPRESSOR_DOBUTAMINE_CATALOG_CODES,
  ...VASOPRESSOR_NOREPINEPHRINE_CATALOG_CODES,
  ...VASOPRESSOR_PHENYLEPHRINE_CATALOG_CODES,
  ...VASOPRESSOR_VASOPRESSIN_CATALOG_CODES,
  ...VASOPRESSOR_EPINEPHRINE_PUSH_CATALOG_CODES,
  ...VASOPRESSOR_EPINEPHRINE_INFUSION_CATALOG_CODES,
  ...VASOPRESSOR_MILRINONE_CATALOG_CODES,
] as const;

/** Infusion / drip SKUs (excludes epinephrine push and phenylephrine concentrate vial). */
export const VASOPRESSOR_INFUSION_GOVERNANCE_CATALOG_CODES = [
  "DOPAMINE_400MG_250ML_IV",
  "DOPAMINE_400_MG_250_ML_PERFUSION_INTRAVEINEUSE",
  "DOPAMINE_800_MG_250_ML_PERFUSION_INTRAVEINEUSE",
  "DOBUTAMINE_250MG_20ML_IV",
  "DOBUTAMINE_250_MG_20_ML_INJECTABLE_INTRAVEINEUSE",
  "DOBUTAMINE_500_MG_250_ML_PERFUSION_INTRAVEINEUSE",
  "NOREPINEPHRINE_4MG_4ML_IV",
  "NOREPINEPHRINE_4_MG_4_ML_INJECTABLE_INTRAVEINEUSE",
  "NOREPINEPHRINE_8_MG_250_ML_PERFUSION_INTRAVEINEUSE",
  "NOREPINEPHRINE_16_MG_250_ML_PERFUSION_INTRAVEINEUSE",
  "PHENYLEPHRINE_50_MG_250_ML_PERFUSION_INTRAVEINEUSE",
  "VASOPRESSIN_20UI_ML_IV",
  "VASOPRESSIN_20_UNITS_ML_INJECTABLE_INTRAVEINEUSE",
  "VASOPRESSIN_40_UNITS_100_ML_PERFUSION_INTRAVEINEUSE",
  ...VASOPRESSOR_EPINEPHRINE_INFUSION_CATALOG_CODES,
  ...VASOPRESSOR_MILRINONE_CATALOG_CODES,
] as const;

const VASOPRESSOR_GOVERNANCE_CODE_SET = new Set<string>(VASOPRESSOR_GOVERNANCE_CATALOG_CODES);
const VASOPRESSOR_INFUSION_GOVERNANCE_CODE_SET = new Set<string>(
  VASOPRESSOR_INFUSION_GOVERNANCE_CATALOG_CODES
);

const VASOPRESSOR_GENERIC_NAMES = new Set([
  "dopamine",
  "dobutamine",
  "norepinephrine",
  "phenylephrine",
  "vasopressin",
  "epinephrine",
  "adrenaline",
  "milrinone",
]);

function normGeneric(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

/** True when catalog code is in the M1.8B.7E.2C.3 vasopressor governance map. */
export function isApprovedVasopressorMedication(input: {
  catalogCode?: string | null;
  genericName?: string | null;
  medicationName?: string | null;
}): boolean {
  const code = (input.catalogCode ?? "").trim().toUpperCase();
  if (code && VASOPRESSOR_GOVERNANCE_CODE_SET.has(code)) {
    return true;
  }

  const generic = normGeneric(input.genericName ?? input.medicationName);
  return VASOPRESSOR_GENERIC_NAMES.has(generic);
}

/** True for vasopressor/inotrope drip SKUs (excludes epinephrine push and phenylephrine vial). */
export function isApprovedVasopressorInfusionMedication(input: {
  catalogCode?: string | null;
  genericName?: string | null;
  medicationName?: string | null;
  administrationType?: string | null;
}): boolean {
  const code = (input.catalogCode ?? "").trim().toUpperCase();
  if (code && VASOPRESSOR_INFUSION_GOVERNANCE_CODE_SET.has(code)) {
    return true;
  }

  if (!isApprovedVasopressorMedication(input)) {
    return false;
  }

  const admin = (input.administrationType ?? "").trim().toUpperCase();
  if (admin === "INFUSION") {
    const generic = normGeneric(input.genericName ?? input.medicationName);
    if (generic === "epinephrine" || generic === "adrenaline") {
      return false;
    }
    return true;
  }

  return false;
}
