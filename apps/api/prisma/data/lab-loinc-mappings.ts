/**
 * Curated Medora lab catalog -> LOINC mappings.
 *
 * Source baseline: Loinc_2.82 local file
 * ~/medora-data/raw/loinc/2026-03/Loinc_2.82/LoincTable/Loinc.csv
 *
 * Keep this separate from CatalogLabTest ordering rows. These mappings support
 * future interoperability/export review only and must not change order entry.
 */
export type LabLoincMappingConfidence = "confirmed" | "review";

export type LabLoincMapping = {
  /** Stable Medora CatalogLabTest.code. */
  medoraCode: string;
  /** One Medora order can map to a panel plus component LOINCs. */
  loincCodes: string[];
  confidence: LabLoincMappingConfidence;
  notes: string;
};

const CBC_LOINC_CODES = [
  "57021-8", // CBC panel
  "6690-2", // WBC
  "789-8", // RBC
  "718-7", // Hemoglobin
];

const TROPONIN_I_LOINC_CODES = [
  "10839-9", // Troponin I cardiac mass/volume Serum/Plasma
  "42757-5", // Troponin I cardiac Blood
  "106906-1", // Troponin I cardiac high sensitivity Serum/Plasma/Blood
];

export const LAB_LOINC_MAPPINGS: LabLoincMapping[] = [
  {
    medoraCode: "ER_CBC",
    loincCodes: CBC_LOINC_CODES,
    confidence: "confirmed",
    notes: "CBC panel plus core CBC components. Excludes differential, deprecated, interpretation, timing, calculated, and workflow-only LOINCs.",
  },
  {
    medoraCode: "CBC",
    loincCodes: CBC_LOINC_CODES,
    confidence: "confirmed",
    notes: "Canonical Haiti CBC row uses the same confirmed CBC panel/component set as ER_CBC.",
  },
  {
    medoraCode: "ER_TROP",
    loincCodes: TROPONIN_I_LOINC_CODES,
    confidence: "confirmed",
    notes: "Troponin I cardiac options confirmed for serum/plasma, blood, and high-sensitivity serum/plasma/blood contexts.",
  },
  {
    medoraCode: "TROPONIN",
    loincCodes: TROPONIN_I_LOINC_CODES,
    confidence: "confirmed",
    notes: "Canonical troponin row uses the same confirmed Troponin I cardiac mapping set as ER_TROP.",
  },
  {
    medoraCode: "TROP",
    loincCodes: TROPONIN_I_LOINC_CODES,
    confidence: "confirmed",
    notes: "Legacy Haiti troponin code uses the same confirmed Troponin I cardiac mapping set as ER_TROP.",
  },
  {
    medoraCode: "ER_BMP",
    loincCodes: ["51990-0"],
    confidence: "confirmed",
    notes: "Basic metabolic panel - Blood. Excludes dialysis-specific, timing, delta, and calculated workflow LOINCs.",
  },
  {
    medoraCode: "BMP",
    loincCodes: ["51990-0"],
    confidence: "confirmed",
    notes: "Canonical Haiti BMP row uses the confirmed basic metabolic panel - Blood mapping.",
  },
  {
    medoraCode: "ER_CMP",
    loincCodes: ["24323-8"],
    confidence: "confirmed",
    notes: "Comprehensive metabolic panel. Excludes deprecated, interpretation, and workflow-only LOINCs.",
  },
  {
    medoraCode: "CMP",
    loincCodes: ["24323-8"],
    confidence: "confirmed",
    notes: "Canonical Haiti CMP row uses the confirmed comprehensive metabolic panel mapping.",
  },
  {
    medoraCode: "ER_LAC",
    loincCodes: ["2524-7"],
    confidence: "confirmed",
    notes: "Lactate [Moles/volume] in Serum or Plasma. Excludes delta, timing, interpretation, sequencing, research, and deprecated LOINCs.",
  },
  {
    medoraCode: "ER_DDM",
    loincCodes: [
      "48065-7", // D-Dimer FEU
      "22457-8", // D-Dimer DDU
    ],
    confidence: "confirmed",
    notes: "D-Dimer FEU and DDU mappings. Keep both because reporting convention can vary by site.",
  },
  {
    medoraCode: "ER_PT_INR",
    loincCodes: [
      "5902-2", // Prothrombin time
      "6301-6", // INR
    ],
    confidence: "confirmed",
    notes: "PT/INR includes clinically useful PT and INR component LOINCs.",
  },
  {
    medoraCode: "ER_APTT",
    loincCodes: ["3173-2"],
    confidence: "confirmed",
    notes: "Activated partial thromboplastin time. Excludes interpretation and workflow-only LOINCs.",
  },
  {
    medoraCode: "ER_UA",
    loincCodes: ["24356-8"],
    confidence: "confirmed",
    notes: "Urinalysis complete panel. Prefer panel LOINC over individual components for this order row.",
  },
  {
    medoraCode: "ER_BC",
    loincCodes: ["600-7"],
    confidence: "confirmed",
    notes: "Bacteria identified in Blood by Culture. Excludes sequencing and research LOINCs.",
  },
  {
    medoraCode: "ER_BNP",
    loincCodes: ["30934-4"],
    confidence: "confirmed",
    notes: "BNP mapping. Excludes NT-proBNP variants until explicitly confirmed for the local performed assay.",
  },
  {
    medoraCode: "ER_CRP",
    loincCodes: ["1988-5"],
    confidence: "confirmed",
    notes: "C-reactive protein. Excludes high-sensitivity and interpretation-only variants.",
  },
  {
    medoraCode: "ER_LIP",
    loincCodes: ["3040-3"],
    confidence: "confirmed",
    notes: "Lipase mapping. Excludes timing, delta, and interpretation-only LOINCs.",
  },
  {
    medoraCode: "ER_AMY",
    loincCodes: ["1798-8"],
    confidence: "confirmed",
    notes: "Amylase mapping. Excludes isoenzyme, timing, and interpretation-only LOINCs.",
  },
  {
    medoraCode: "ER_GLU_POC",
    loincCodes: ["2339-0"],
    confidence: "confirmed",
    notes: "Glucose Blood mapping for POC/order-row interoperability. Excludes calculated and challenge/timing variants.",
  },
  {
    medoraCode: "ER_ABG",
    loincCodes: ["24336-0"],
    confidence: "confirmed",
    notes: "Arterial blood gas panel. Prefer panel LOINC over individual gas components for this order row.",
  },
  {
    medoraCode: "ER_VBG",
    loincCodes: ["24338-6"],
    confidence: "confirmed",
    notes: "Venous blood gas panel. Prefer panel LOINC over individual gas components for this order row.",
  },
  {
    medoraCode: "ER_APAP",
    loincCodes: ["3559-9"],
    confidence: "confirmed",
    notes: "Acetaminophen level. Excludes timing, interpretation, and toxicology-screen workflow LOINCs.",
  },
  {
    medoraCode: "ER_SAL",
    loincCodes: ["4024-6"],
    confidence: "confirmed",
    notes: "Salicylate level. Excludes timing, interpretation, and toxicology-screen workflow LOINCs.",
  },
];
