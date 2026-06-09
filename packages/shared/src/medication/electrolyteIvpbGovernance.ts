/**
 * M1.8B.7E.2B — Approved electrolyte IVPB catalog scope (KCl + Mg perfusion only).
 * Do not use bare isHighAlert; match explicit catalog codes or governed infusion SKUs.
 */

/** Enterprise Wave4 + Haiti seed codes approved for electrolyte IVPB START witness. */
export const APPROVED_ELECTROLYTE_IVPB_CATALOG_CODES = [
  "POTASSIUM_CHLORIDE_20_MEQ_PER_10_ML_INJECTABLE_INTRAVENOUS",
  "POTASSIUM_CHLORIDE_10_MEQ_100_ML_PERFUSION_INTRAVEINEUSE",
  "POTASSIUM_CHLORIDE_40_MEQ_1000_ML_PERFUSION_INTRAVEINEUSE",
  "MAGNESIUM_SULFATE_2_G_50_ML_INJECTABLE_INTRAVEINEUSE",
  "MAGNESIUM_SULFATE_2_G_PER_50_ML_PERFUSION_INTRAVENOUS",
  "MAGNESIUM_SULFATE_4_G_100_ML_PERFUSION_INTRAVEINEUSE",
  "MAGNESIUM_SULFATE_4_G_100_ML_OB_PERFUSION_INTRAVEINEUSE",
  "MAGNESIUM_SULFATE_40_G_1000_ML_OB_PERFUSION_INTRAVEINEUSE",
] as const;

const APPROVED_ELECTROLYTE_IVPB_CATALOG_CODE_SET = new Set<string>(
  APPROVED_ELECTROLYTE_IVPB_CATALOG_CODES
);

function normGeneric(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function isExcludedElectrolyteDosageForm(dosageForm: string | null | undefined): boolean {
  const form = (dosageForm ?? "").toLowerCase();
  if (!form) return false;
  return (
    form.includes("nébul") ||
    form.includes("nebul") ||
    form.includes("inhal") ||
    form.includes("neb ")
  );
}

export function isApprovedElectrolyteIvpbMedication(input: {
  catalogCode?: string | null;
  genericName?: string | null;
  medicationName?: string | null;
  administrationType?: string | null;
  dosageForm?: string | null;
}): boolean {
  const code = (input.catalogCode ?? "").trim().toUpperCase();
  if (code && APPROVED_ELECTROLYTE_IVPB_CATALOG_CODE_SET.has(code)) {
    return true;
  }

  if (isExcludedElectrolyteDosageForm(input.dosageForm)) {
    return false;
  }

  const generic = normGeneric(input.genericName ?? input.medicationName);
  if (generic !== "potassium chloride" && generic !== "magnesium sulfate") {
    return false;
  }

  const admin = (input.administrationType ?? "").trim().toUpperCase();
  if (admin === "INFUSION") {
    return true;
  }

  if (code.includes("POTASSIUM_CHLORIDE") && (code.includes("PERFUSION") || code.includes("20_MEQ"))) {
    return true;
  }
  if (
    code.includes("MAGNESIUM_SULFATE") &&
    (code.includes("PERFUSION") || code.includes("2_G_50") || code.includes("2_G_PER_50"))
  ) {
    return true;
  }

  return false;
}
