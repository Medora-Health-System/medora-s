import { normalizeNdc } from "../ndcNormalize.js";

export type MedicationBillingNdcEntry = {
  ndc11: string;
  ndcDisplay: string;
  confidence: "confirmed" | "review";
};

/** Product-level NDC evidence keyed by Haiti-derived CatalogMedication.code (M1.4B). */
const NDC_PRODUCT_BY_CATALOG_CODE: Record<
  string,
  { productNdc: string; confidence: "confirmed" | "review" }
> = {
  ROCURONIUM_10_MG_PER_ML_INJECTABLE_INTRAVENOUS: {
    productNdc: "71872-7349-01",
    confidence: "confirmed",
  },
  ETOMIDATE_2_MG_PER_ML_INJECTABLE_INTRAVENOUS: { productNdc: "65145-127-01", confidence: "confirmed" },
  KETAMINE_50_MG_PER_ML_INJECTABLE_INJECTION: { productNdc: "65219-188-01", confidence: "confirmed" },
  NOREPINEPHRINE_4_MG_PER_4_ML_INJECTABLE_INTRAVENOUS: {
    productNdc: "72603-180-01",
    confidence: "confirmed",
  },
  "PIPERACILLINTAZOBACTAM_4.5_G_INJECTABLE_INTRAVENOUS": {
    productNdc: "72572-418-01",
    confidence: "confirmed",
  },
  METOPROLOL_5_MG_PER_5_ML_INJECTABLE_INTRAVENOUS: { productNdc: "36000-033-01", confidence: "confirmed" },
  MORPHINE_10_MG_PER_ML_INJECTABLE_INJECTION: { productNdc: "0641-6127-01", confidence: "confirmed" },
  CEFTRIAXONE_1_G_INJECTABLE_INJECTION: { productNdc: "25021-106-01", confidence: "confirmed" },
  CEFTRIAXONE_2_G_INJECTABLE_INJECTION: { productNdc: "25021-107-01", confidence: "confirmed" },
  PROPOFOL_10_MG_PER_ML_INJECTABLE_INTRAVENOUS: { productNdc: "16714-528-01", confidence: "confirmed" },
  SUCCINYLCHOLINE_20_MG_PER_ML_INJECTABLE_INTRAVENOUS: {
    productNdc: "71872-7241-01",
    confidence: "confirmed",
  },
  FENTANYL_50_MCG_PER_ML_INJECTABLE_INJECTION: { productNdc: "0409-9093-01", confidence: "confirmed" },
  MIDAZOLAM_5_MG_PER_ML_INJECTABLE_INJECTION: { productNdc: "0641-6190-01", confidence: "confirmed" },
  HYDROMORPHONE_2_MG_PER_ML_INJECTABLE_INJECTION: { productNdc: "76045-010-01", confidence: "confirmed" },
  PHENYLEPHRINE_10_MG_PER_ML_INJECTABLE_INTRAVENOUS: {
    productNdc: "51662-1249-01",
    confidence: "confirmed",
  },
  VASOPRESSIN_20_UI_PER_ML_INJECTABLE_INTRAVENOUS: { productNdc: "70121-1642-01", confidence: "confirmed" },
  DOPAMINE_400_MG_PER_250_ML_PERFUSION_INTRAVENOUS: { productNdc: "84549-007-01", confidence: "review" },
  DOBUTAMINE_250_MG_PER_20_ML_PERFUSION_INTRAVENOUS: { productNdc: "70436-203-01", confidence: "confirmed" },
  "SODIUM_BICARBONATE_8.4_INJECTABLE_INTRAVENOUS": { productNdc: "80830-2305-01", confidence: "confirmed" },
  ADENOSINE_6_MG_PER_2_ML_INJECTABLE_INTRAVENOUS: { productNdc: "67457-856-01", confidence: "review" },
  AMIODARONE_150_MG_PER_3_ML_INJECTABLE_INTRAVENOUS: { productNdc: "55150-180-01", confidence: "confirmed" },
  ZIPRASIDONE_20_MG_GELULE_ORAL: { productNdc: "60505-2528-06", confidence: "review" },
  POVIDONE_IODINE_10_SOLUTION_TOPICAL: { productNdc: "0363-3736-10", confidence: "review" },
};

function buildNdcEntry(productNdc: string, confidence: "confirmed" | "review"): MedicationBillingNdcEntry | null {
  const normalized = normalizeNdc(productNdc);
  if (!normalized.ok) return null;
  return { ndc11: normalized.ndc11, ndcDisplay: normalized.ndcDisplay, confidence };
}

export const MEDICATION_BILLING_NDC_BY_CATALOG_CODE: Record<string, MedicationBillingNdcEntry> =
  Object.fromEntries(
    Object.entries(NDC_PRODUCT_BY_CATALOG_CODE).flatMap(([catalogCode, row]) => {
      const built = buildNdcEntry(row.productNdc, row.confidence);
      return built ? [[catalogCode, built] as const] : [];
    })
  );

export const MEDICATION_BILLING_NDC_CATALOG_CODES = Object.keys(MEDICATION_BILLING_NDC_BY_CATALOG_CODE);
