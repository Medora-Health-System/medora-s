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
];
