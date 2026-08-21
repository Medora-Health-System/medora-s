/**
 * MEDUI.LAB.REF.1/2 — foundation seed: canonical analytes, aliases, CBC/BMP/CMP panels.
 *
 * CatalogLabTest.code remains the orderable identity — these are result-component authorities.
 * LOINC only where established (Mayo CBC 9109 / BMAMA 113630 / component catalogs).
 * BILI → TOTAL_BILIRUBIN verified against Haiti CatalogLabTest displayNameEn "Total bilirubin".
 * UREA and BUN remain SEPARATE.
 */

export type LabRefAnalyteSeed = {
  code: string;
  displayNameEn: string;
  displayNameFr: string;
  description?: string;
  /** Only when established — never guessed. */
  defaultLoincCode?: string;
  aliases: Array<{ aliasCode: string; notes?: string }>;
};

export type LabRefPanelSeed = {
  code: "CBC" | "BMP" | "CMP";
  displayNameEn: string;
  displayNameFr: string;
  members: Array<{ analyteCode: string; sortOrder: number; unitHint?: string }>;
};

export const LAB_REF_CANONICAL_ANALYTES: LabRefAnalyteSeed[] = [
  {
    code: "WBC",
    displayNameEn: "White Blood Cell Count",
    displayNameFr: "Leucocytes",
    defaultLoincCode: "6690-2",
    aliases: [
      { aliasCode: "WBC", notes: "Self-alias" },
      { aliasCode: "GB", notes: "French / Haiti catalog leukocyte alias" },
      { aliasCode: "LEUCOCYTES", notes: "French label alias" },
    ],
  },
  {
    code: "RBC",
    displayNameEn: "Red Blood Cell Count",
    displayNameFr: "Érythrocytes",
    defaultLoincCode: "789-8",
    aliases: [
      { aliasCode: "RBC", notes: "Self-alias" },
      { aliasCode: "GR", notes: "French / Haiti catalog erythrocyte alias" },
      { aliasCode: "ERYTHROCYTES", notes: "French label alias" },
    ],
  },
  {
    code: "HEMOGLOBIN",
    displayNameEn: "Hemoglobin",
    displayNameFr: "Hémoglobine",
    defaultLoincCode: "718-7",
    aliases: [
      { aliasCode: "HEMOGLOBIN", notes: "Self-alias" },
      { aliasCode: "HGB", notes: "US scaffold / Mayo result id" },
      { aliasCode: "HB", notes: "Haiti catalog / European abbreviation — same analyte" },
    ],
  },
  {
    code: "HEMATOCRIT",
    displayNameEn: "Hematocrit",
    displayNameFr: "Hématocrite",
    defaultLoincCode: "4544-3",
    aliases: [
      { aliasCode: "HEMATOCRIT", notes: "Self-alias" },
      { aliasCode: "HCT", notes: "Mayo result id / common abbreviation" },
      { aliasCode: "HT", notes: "Haiti catalog abbreviation" },
    ],
  },
  {
    code: "PLATELET",
    displayNameEn: "Platelet Count",
    displayNameFr: "Plaquettes",
    defaultLoincCode: "777-3",
    aliases: [
      { aliasCode: "PLATELET", notes: "Self-alias" },
      { aliasCode: "PLT", notes: "Common abbreviation" },
      { aliasCode: "PLTC", notes: "Mayo result id" },
      { aliasCode: "PLAQUETTES", notes: "French label alias" },
    ],
  },
  {
    code: "MCV",
    displayNameEn: "Mean Corpuscular Volume",
    displayNameFr: "VGM",
    defaultLoincCode: "787-2",
    aliases: [
      { aliasCode: "MCV", notes: "Self-alias" },
      { aliasCode: "VGM", notes: "French abbreviation" },
    ],
  },
  {
    code: "MCH",
    displayNameEn: "Mean Corpuscular Hemoglobin",
    displayNameFr: "TCMH",
    description: "Mayo CBC 9109 does not publish MCH reference intervals — intervals remain unresolved.",
    aliases: [{ aliasCode: "MCH", notes: "Self-alias" }],
  },
  {
    code: "MCHC",
    displayNameEn: "Mean Corpuscular Hemoglobin Concentration",
    displayNameFr: "CCMH",
    description: "Mayo CBC 9109 does not publish MCHC reference intervals — intervals remain unresolved.",
    aliases: [{ aliasCode: "MCHC", notes: "Self-alias" }],
  },
  {
    code: "RDW",
    displayNameEn: "Red Cell Distribution Width",
    displayNameFr: "IDR",
    defaultLoincCode: "788-0",
    aliases: [{ aliasCode: "RDW", notes: "Self-alias" }],
  },
  {
    code: "NEUTROPHILS_ABS",
    displayNameEn: "Neutrophils Absolute",
    displayNameFr: "Neutrophiles absolus",
    defaultLoincCode: "751-8",
    aliases: [
      { aliasCode: "NEUTROPHILS_ABS", notes: "Self-alias" },
      { aliasCode: "NEUAA", notes: "Mayo result id" },
      { aliasCode: "NEUT_ABS", notes: "Common abbreviation" },
    ],
  },
  {
    code: "LYMPHOCYTES_ABS",
    displayNameEn: "Lymphocytes Absolute",
    displayNameFr: "Lymphocytes absolus",
    defaultLoincCode: "731-0",
    aliases: [
      { aliasCode: "LYMPHOCYTES_ABS", notes: "Self-alias" },
      { aliasCode: "LYMAA", notes: "Mayo result id" },
      { aliasCode: "LYMPH_ABS", notes: "Common abbreviation" },
    ],
  },
  {
    code: "MONOCYTES_ABS",
    displayNameEn: "Monocytes Absolute",
    displayNameFr: "Monocytes absolus",
    defaultLoincCode: "742-7",
    aliases: [
      { aliasCode: "MONOCYTES_ABS", notes: "Self-alias" },
      { aliasCode: "MONAA", notes: "Mayo result id" },
      { aliasCode: "MONO_ABS", notes: "Common abbreviation" },
    ],
  },
  {
    code: "EOSINOPHILS_ABS",
    displayNameEn: "Eosinophils Absolute",
    displayNameFr: "Éosinophiles absolus",
    defaultLoincCode: "711-2",
    aliases: [
      { aliasCode: "EOSINOPHILS_ABS", notes: "Self-alias" },
      { aliasCode: "EOSAA", notes: "Mayo result id" },
      { aliasCode: "EOS_ABS", notes: "Common abbreviation" },
    ],
  },
  {
    code: "BASOPHILS_ABS",
    displayNameEn: "Basophils Absolute",
    displayNameFr: "Basophiles absolus",
    defaultLoincCode: "704-7",
    aliases: [
      { aliasCode: "BASOPHILS_ABS", notes: "Self-alias" },
      { aliasCode: "BASAA", notes: "Mayo result id" },
      { aliasCode: "BASO_ABS", notes: "Common abbreviation" },
    ],
  },
  {
    code: "GLUCOSE",
    displayNameEn: "Glucose",
    displayNameFr: "Glucose",
    defaultLoincCode: "2345-7",
    aliases: [
      { aliasCode: "GLUCOSE", notes: "Self-alias" },
      { aliasCode: "GLU", notes: "Scaffold abbreviation" },
      { aliasCode: "GLURA", notes: "Mayo BMAMA result id" },
      { aliasCode: "GLYC", notes: "Haiti catalog abbreviation" },
    ],
  },
  {
    code: "BUN",
    displayNameEn: "Blood Urea Nitrogen",
    displayNameFr: "Azote uréique (BUN)",
    defaultLoincCode: "3094-0",
    description:
      "US BUN reporting identity. NOT equivalent to UREA without explicit unit/chemistry conversion — kept separate.",
    aliases: [
      { aliasCode: "BUN", notes: "Self-alias / Mayo BMAMA" },
      { aliasCode: "BLOOD_UREA_NITROGEN", notes: "Expanded name" },
    ],
  },
  {
    code: "UREA",
    displayNameEn: "Urea",
    displayNameFr: "Urée",
    description:
      "Urea analyte as reported (often mmol/L). Distinct from BUN — do not auto-convert or merge. No Mayo BMAMA interval.",
    aliases: [
      { aliasCode: "UREA", notes: "Self-alias / Haiti catalog" },
      { aliasCode: "UREE", notes: "French spelling without accent" },
    ],
  },
  {
    code: "CREATININE",
    displayNameEn: "Creatinine",
    displayNameFr: "Créatinine",
    defaultLoincCode: "2160-0",
    aliases: [
      { aliasCode: "CREATININE", notes: "Self-alias" },
      { aliasCode: "CREAT", notes: "Scaffold abbreviation" },
      { aliasCode: "CRTSA", notes: "Mayo BMAMA result id" },
      { aliasCode: "CR", notes: "Haiti catalog abbreviation" },
    ],
  },
  {
    code: "EGFR",
    displayNameEn: "Estimated GFR",
    displayNameFr: "DFGe",
    defaultLoincCode: "98979-8",
    description: "Mayo BMAMA eGFR (2021 CKD-EPI); not calculated under 18 years.",
    aliases: [
      { aliasCode: "EGFR", notes: "Self-alias" },
      { aliasCode: "EGFR1", notes: "Mayo BMAMA result id" },
      { aliasCode: "EGF", notes: "Common abbreviation" },
    ],
  },
  {
    code: "SODIUM",
    displayNameEn: "Sodium",
    displayNameFr: "Sodium",
    defaultLoincCode: "2951-2",
    aliases: [
      { aliasCode: "SODIUM", notes: "Self-alias" },
      { aliasCode: "NA", notes: "Scaffold / chemical symbol" },
      { aliasCode: "NAS", notes: "Mayo BMAMA result id" },
    ],
  },
  {
    code: "POTASSIUM",
    displayNameEn: "Potassium",
    displayNameFr: "Potassium",
    defaultLoincCode: "2823-3",
    aliases: [
      { aliasCode: "POTASSIUM", notes: "Self-alias" },
      { aliasCode: "K", notes: "Scaffold / chemical symbol" },
      { aliasCode: "KS", notes: "Mayo BMAMA result id" },
    ],
  },
  {
    code: "CHLORIDE",
    displayNameEn: "Chloride",
    displayNameFr: "Chlorure",
    defaultLoincCode: "2075-0",
    aliases: [
      { aliasCode: "CHLORIDE", notes: "Self-alias" },
      { aliasCode: "CL", notes: "Scaffold / Mayo BMAMA" },
    ],
  },
  {
    code: "CO2_BICARBONATE",
    displayNameEn: "Carbon Dioxide / Bicarbonate",
    displayNameFr: "CO2 / Bicarbonates",
    defaultLoincCode: "1963-8",
    description: "Serum/plasma CO2 as reported on BMP/CMP. Not arterial/venous blood-gas pCO2.",
    aliases: [
      { aliasCode: "CO2_BICARBONATE", notes: "Self-alias" },
      { aliasCode: "CO2", notes: "Scaffold abbreviation — metabolic panel context only" },
      { aliasCode: "HCO3", notes: "Mayo BMAMA result id" },
      { aliasCode: "BICARB", notes: "Common abbreviation" },
    ],
  },
  {
    code: "CALCIUM",
    displayNameEn: "Calcium",
    displayNameFr: "Calcium",
    defaultLoincCode: "17861-6",
    aliases: [
      { aliasCode: "CALCIUM", notes: "Self-alias" },
      { aliasCode: "CA", notes: "Scaffold / Mayo BMAMA" },
    ],
  },
  {
    code: "TOTAL_PROTEIN",
    displayNameEn: "Total Protein",
    displayNameFr: "Protéines totales",
    defaultLoincCode: "2885-2",
    aliases: [
      { aliasCode: "TOTAL_PROTEIN", notes: "Self-alias" },
      { aliasCode: "TP", notes: "Scaffold / Mayo CMAMA" },
      { aliasCode: "PROT", notes: "Haiti catalog abbreviation" },
    ],
  },
  {
    code: "ALBUMIN",
    displayNameEn: "Albumin",
    displayNameFr: "Albumine",
    defaultLoincCode: "1751-7",
    aliases: [
      { aliasCode: "ALBUMIN", notes: "Self-alias" },
      { aliasCode: "ALB", notes: "Scaffold / Mayo CMAMA" },
    ],
  },
  {
    code: "TOTAL_BILIRUBIN",
    displayNameEn: "Total Bilirubin",
    displayNameFr: "Bilirubine totale",
    defaultLoincCode: "1975-2",
    description:
      "BILI alias verified: Haiti CatalogLabTest.code BILI has displayNameEn Total bilirubin. Not direct bilirubin.",
    aliases: [
      { aliasCode: "TOTAL_BILIRUBIN", notes: "Self-alias" },
      { aliasCode: "TBILI", notes: "US scaffold abbreviation" },
      {
        aliasCode: "BILI",
        notes:
          "Verified Haiti orderable alias for total bilirubin only — NOT direct bilirubin",
      },
      { aliasCode: "BILIT", notes: "Mayo CMAMA result id" },
      { aliasCode: "BILIRUBIN_TOTAL", notes: "Expanded synonym" },
    ],
  },
  {
    code: "ALP",
    displayNameEn: "Alkaline Phosphatase",
    displayNameFr: "Phosphatase alcaline",
    defaultLoincCode: "6768-6",
    aliases: [
      { aliasCode: "ALP", notes: "Self-alias / Mayo" },
      { aliasCode: "PAL", notes: "French abbreviation" },
    ],
  },
  {
    code: "AST",
    displayNameEn: "Aspartate Aminotransferase",
    displayNameFr: "ASAT / AST",
    defaultLoincCode: "30239-8",
    aliases: [
      { aliasCode: "AST", notes: "Self-alias / Mayo" },
      { aliasCode: "ASAT", notes: "French / European abbreviation" },
      { aliasCode: "SGOT", notes: "Legacy synonym" },
    ],
  },
  {
    code: "ALT",
    displayNameEn: "Alanine Aminotransferase",
    displayNameFr: "ALAT / ALT",
    defaultLoincCode: "1743-4",
    aliases: [
      { aliasCode: "ALT", notes: "Self-alias / Mayo" },
      { aliasCode: "ALAT", notes: "French / European abbreviation" },
      { aliasCode: "SGPT", notes: "Legacy synonym" },
    ],
  },
];

/** Shared panel membership — one CanonicalLabAnalyte across BMP and CMP. */
export const LAB_REF_PANEL_DEFINITIONS: LabRefPanelSeed[] = [
  {
    code: "CBC",
    displayNameEn: "Complete Blood Count",
    displayNameFr: "NFS / Hémogramme",
    members: [
      { analyteCode: "WBC", sortOrder: 10, unitHint: "10^9/L" },
      { analyteCode: "RBC", sortOrder: 20, unitHint: "10^12/L" },
      { analyteCode: "HEMOGLOBIN", sortOrder: 30, unitHint: "g/dL" },
      { analyteCode: "HEMATOCRIT", sortOrder: 40, unitHint: "%" },
      { analyteCode: "PLATELET", sortOrder: 50, unitHint: "10^9/L" },
      { analyteCode: "MCV", sortOrder: 60, unitHint: "fL" },
      { analyteCode: "MCH", sortOrder: 70, unitHint: "pg" },
      { analyteCode: "MCHC", sortOrder: 80, unitHint: "g/dL" },
      { analyteCode: "RDW", sortOrder: 90, unitHint: "%" },
      { analyteCode: "NEUTROPHILS_ABS", sortOrder: 100, unitHint: "10^9/L" },
      { analyteCode: "LYMPHOCYTES_ABS", sortOrder: 110, unitHint: "10^9/L" },
      { analyteCode: "MONOCYTES_ABS", sortOrder: 120, unitHint: "10^9/L" },
      { analyteCode: "EOSINOPHILS_ABS", sortOrder: 130, unitHint: "10^9/L" },
      { analyteCode: "BASOPHILS_ABS", sortOrder: 140, unitHint: "10^9/L" },
    ],
  },
  {
    code: "BMP",
    displayNameEn: "Basic Metabolic Panel",
    displayNameFr: "Bilan métabolique de base",
    members: [
      { analyteCode: "GLUCOSE", sortOrder: 10, unitHint: "mg/dL" },
      { analyteCode: "BUN", sortOrder: 20, unitHint: "mg/dL" },
      { analyteCode: "CREATININE", sortOrder: 30, unitHint: "mg/dL" },
      { analyteCode: "EGFR", sortOrder: 35, unitHint: "mL/min/BSA" },
      { analyteCode: "SODIUM", sortOrder: 40, unitHint: "mmol/L" },
      { analyteCode: "POTASSIUM", sortOrder: 50, unitHint: "mmol/L" },
      { analyteCode: "CHLORIDE", sortOrder: 60, unitHint: "mmol/L" },
      { analyteCode: "CO2_BICARBONATE", sortOrder: 70, unitHint: "mmol/L" },
      { analyteCode: "CALCIUM", sortOrder: 80, unitHint: "mg/dL" },
    ],
  },
  {
    code: "CMP",
    displayNameEn: "Comprehensive Metabolic Panel",
    displayNameFr: "Bilan métabolique complet",
    members: [
      { analyteCode: "GLUCOSE", sortOrder: 10, unitHint: "mg/dL" },
      { analyteCode: "BUN", sortOrder: 20, unitHint: "mg/dL" },
      { analyteCode: "CREATININE", sortOrder: 30, unitHint: "mg/dL" },
      { analyteCode: "EGFR", sortOrder: 35, unitHint: "mL/min/BSA" },
      { analyteCode: "SODIUM", sortOrder: 40, unitHint: "mmol/L" },
      { analyteCode: "POTASSIUM", sortOrder: 50, unitHint: "mmol/L" },
      { analyteCode: "CHLORIDE", sortOrder: 60, unitHint: "mmol/L" },
      { analyteCode: "CO2_BICARBONATE", sortOrder: 70, unitHint: "mmol/L" },
      { analyteCode: "CALCIUM", sortOrder: 80, unitHint: "mg/dL" },
      { analyteCode: "TOTAL_PROTEIN", sortOrder: 90, unitHint: "g/dL" },
      { analyteCode: "ALBUMIN", sortOrder: 100, unitHint: "g/dL" },
      { analyteCode: "TOTAL_BILIRUBIN", sortOrder: 110, unitHint: "mg/dL" },
      { analyteCode: "ALP", sortOrder: 120, unitHint: "U/L" },
      { analyteCode: "AST", sortOrder: 130, unitHint: "U/L" },
      { analyteCode: "ALT", sortOrder: 140, unitHint: "U/L" },
    ],
  },
];

export const LAB_REF_EXPLICIT_NON_EQUIVALENCES = [
  "High-sensitivity troponin vs conventional troponin",
  "D-dimer FEU vs DDU",
  "Serum vs urine assays",
  "Quantitative vs qualitative hCG",
  "Arterial vs venous blood gas",
  "BUN vs UREA without unit/chemistry conversion",
  "Serum CO2/bicarbonate vs blood-gas pCO2",
  "Absolute vs percentage differential counts",
] as const;
