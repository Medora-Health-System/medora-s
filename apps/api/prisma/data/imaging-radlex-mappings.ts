/**
 * Curated imaging identity mappings for Medora imaging catalog rows.
 *
 * Source: LOINC 2.82 LOINC-RSNA Radiology Playbook.
 *
 * These mappings are review/identity metadata only. They are intentionally kept
 * separate from catalog rows, billing mappings, and runtime seeding.
 */
export type ImagingRadlexMapping = {
  medoraCode: string;
  loincCodes: string[];
  rpidCandidates?: string[];
  confidence: "confirmed" | "review";
  notes: string;
};

export const IMAGING_RADLEX_MAPPINGS: ImagingRadlexMapping[] = [
  {
    medoraCode: "CT_HEAD_WO_CONTRAST",
    loincCodes: ["30799-1"],
    rpidCandidates: ["RPID22"],
    confidence: "confirmed",
    notes: "CT Head WO contrast / CT Head wo IV Contrast.",
  },
  {
    medoraCode: "CTA_CHEST",
    loincCodes: ["79077-4"],
    rpidCandidates: ["RPID147"],
    confidence: "confirmed",
    notes: "CTA pulmonary arteries for pulmonary embolus W contrast IV.",
  },
  {
    medoraCode: "CTA_HEAD_NECK",
    loincCodes: ["37498-3"],
    confidence: "confirmed",
    notes: "CTA head vessels and neck vessels W contrast IV.",
  },
  {
    medoraCode: "US_RUQ_GALLBLADDER",
    loincCodes: ["24532-4", "38021-2"],
    confidence: "review",
    notes: "Primary candidate is US Abdomen RUQ; secondary review candidate is US Biliary ducts and Gallbladder. RUQ/gallbladder exact protocol may vary by site.",
  },
  {
    medoraCode: "US_SCROTUM_TESTICULAR",
    loincCodes: ["80877-4", "25002-7"],
    rpidCandidates: ["RPID2249", "RPID1955"],
    confidence: "review",
    notes: "Primary candidate is US Scrotum and testicle for torsion; secondary review candidate is US Scrotum and testicle.",
  },
];
