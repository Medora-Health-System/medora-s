/**
 * Phase 4.8 — Additional BillingCatalog rows not generated from other seeds.
 * - Imaging: map CatalogImagingStudy.code → representative CPT (illustrative U.S. ED).
 * - Meds: map CatalogMedication.code (from derive) → HCPCS J-codes (common U.S. hospital examples).
 * - PROCEDURE: manual care-order labels.
 * Primary lab coverage is built in seed-billing-catalog.ts from `US_ER_LAB_CATALOG.billingCodeDefault`
 * and a compact Haiti-lab table below.
 *
 * Replace with licensed payer/facility code sets when available.
 */
export type BillingCatalogSeedRow = {
  code: string;
  system: "CPT" | "HCPCS";
  description: string;
  triggerSource: "LAB" | "IMAGING" | "MEDICATION" | "PROCEDURE" | "SUPPLY";
  externalCode: string;
  billClass: "professional" | "facility" | "both";
};

/** Key Haiti / regional lab `CatalogLabTest.code` values → CPT (facility). */
export const HAITI_LAB_TO_CPT: Record<string, { cpt: string; description: string }> = {
  CBC: { cpt: "85025", description: "Complete blood count (CBC) with diff" },
  TROP: { cpt: "84484", description: "Troponin, quantitative" },
  NFS_DIFF: { cpt: "85025", description: "CBC with white cell differential" },
  BMP: { cpt: "80048", description: "Basic metabolic panel" },
  CREAT: { cpt: "82565", description: "Creatinine, blood" },
  GLU: { cpt: "82947", description: "Glucose, blood" },
  UREA: { cpt: "84520", description: "BUN / urea nitrogen" },
  NA: { cpt: "82435", description: "Sodium, serum" },
  K: { cpt: "82435", description: "Potassium, serum" },
  HB: { cpt: "85018", description: "Hemoglobin" },
  AST: { cpt: "84450", description: "AST (SGOT)" },
  ALT: { cpt: "84460", description: "ALT (SGPT)" },
  CRP: { cpt: "86140", description: "C-reactive protein" },
  ESR: { cpt: "85651", description: "ESR" },
  TSH: { cpt: "84443", description: "TSH" },
  INR: { cpt: "85610", description: "Prothrombin time / INR" },
  HBA1C: { cpt: "83036", description: "Hemoglobin A1c" },
  LACTATE: { cpt: "83605", description: "Lactate" },
  LIPID: { cpt: "80061", description: "Lipid panel" },
  BILI: { cpt: "82247", description: "Bilirubin, total" },
  HCG_BETA: { cpt: "84702", description: "hCG, quantitative" },
  HCG_URINE: { cpt: "81025", description: "Pregnancy test, urine" },
  TP_INR: { cpt: "85610", description: "PT/INR" },
  TCA: { cpt: "85730", description: "aPTT" },
  DDIMER: { cpt: "85379", description: "D-dimer" },
  UA: { cpt: "81000", description: "Urinalysis" },
  PROCALCITONIN: { cpt: "84145", description: "Procalcitonin" },
};

export const IMAGING_CODE_TO_CPT: Record<string, { cpt: string; description: string; billClass: "facility" | "professional" }> = {
  XR_CHEST: { cpt: "71045", description: "Radiologic examination, chest; single view", billClass: "facility" },
  XR_CHEST_2V: { cpt: "71046", description: "Radiologic exam, chest; 2 views", billClass: "facility" },
  XR_KNEE: { cpt: "73560", description: "Radiologic exam, knee; 1–2 views", billClass: "facility" },
  CT_ABD: { cpt: "74177", description: "CT abd/pelvis w contrast (example)", billClass: "facility" },
  CT_HEAD: { cpt: "70450", description: "CT head w/o contrast (example)", billClass: "facility" },
  CT_CHEST: { cpt: "71250", description: "CT thorax w/o contrast (example)", billClass: "facility" },
  CT_SPINE_LUMBAR: { cpt: "72131", description: "CT lumbar spine w/o contrast (example)", billClass: "facility" },
  US_ABD: { cpt: "76700", description: "US exam, abdomen, complete (example)", billClass: "facility" },
  US_OB: { cpt: "76815", description: "US pregnant uterus, limited (example)", billClass: "facility" },
  US_RENAL: { cpt: "76770", description: "US retroperitoneal (example)", billClass: "facility" },
  DOPPLER_VEIN: { cpt: "93971", description: "Duplex scan, venous, extremity (example)", billClass: "facility" },
  XR_PELVIS: { cpt: "72170", description: "Radiographic exam, pelvis", billClass: "facility" },
  XR_WRIST: { cpt: "73100", description: "Radiologic exam, wrist; 2+ views (example)", billClass: "facility" },
  XR_ANKLE: { cpt: "73600", description: "Radiologic exam, ankle; 2+ views (example)", billClass: "facility" },
  XR_SHOULDER: { cpt: "73030", description: "Radiologic exam, shoulder, complete (example)", billClass: "facility" },
  XR_FOOT: { cpt: "73620", description: "Radiologic exam, foot, 2+ views (example)", billClass: "facility" },
  XR_ABD_AP: { cpt: "74018", description: "Radiograph, abdomen, 1 view (example)", billClass: "facility" },
};

/**
 * CatalogMedication.code (derived or explicit) → drug administration HCPCS (J-code).
 * Only where a stable drug-level code is used in practice; otherwise remain UNMAPPED in product.
 */
export const MED_CODE_TO_HCPCS: Record<string, { hcpcs: string; description: string }> = {
  CEFTRIAXONE_1_G_INJECTABLE_INJECTION: { hcpcs: "J0696", description: "Ceftriaxone sodium (per 250 mg)" },
  CEFTRIAXONE_2_G_INJECTABLE_INJECTION: { hcpcs: "J0696", description: "Ceftriaxone sodium (per 250 mg)" },
  ONDANSETRON_4_MG_PER_2_ML_INJECTABLE_INJECTION: { hcpcs: "J2405", description: "Ondansetron 1 mg injection" },
  MORPHINE_10_MG_PER_ML_INJECTABLE_INJECTION: { hcpcs: "J2270", description: "Morphine 10 mg inj (per 10 mg)" },
};

export const BILLING_CATALOG_PROCEDURE_EXAMPLES: BillingCatalogSeedRow[] = [
  {
    triggerSource: "PROCEDURE",
    externalCode: "EKG",
    code: "93000",
    system: "CPT",
    description: "EKG, routine, with interpretation and report (example)",
    billClass: "both",
  },
  {
    triggerSource: "PROCEDURE",
    externalCode: "ECG",
    code: "93000",
    system: "CPT",
    description: "EKG, routine, with interpretation and report (example)",
    billClass: "both",
  },
];
