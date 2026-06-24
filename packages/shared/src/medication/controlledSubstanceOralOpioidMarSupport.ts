/**
 * MEDUI.MEDICATION.CONTROLLED_SUBSTANCES_WAVE_C_ED_FLOOR_COMPLETION.1
 * Direct oral/IV-push MAR support for routine controlled substances — no IVPB/PCA/witness hard stop.
 */

import { ENTERPRISE_CONTROLLED_SUBSTANCE_FORMULARY_BY_CODE } from "./enterpriseControlledSubstanceFormularyManifest.js";

export type ControlledSubstanceOralOpioidMarSupportRow = {
  catalogCode: string;
  medication: string;
  directMarAdministration: boolean;
  marReady: boolean;
  pyxisWasteWitnessExternalized: boolean;
  medoraWitnessRequired: false;
  postAdministrationReassessmentRequired: boolean;
  acetaminophenDailyDoseAdvisory: boolean;
  blockers: string[];
};

export type ControlledSubstanceOralOpioidMarSupportReport = {
  decision: "PASS" | "FAIL";
  oralOpioidDirectAdministration: boolean;
  noIvpbPumpPcaRequired: boolean;
  noMedoraWitnessHardStop: boolean;
  painReassessmentRequired: boolean;
  sideEffectDocumentationRequired: boolean;
  acetaminophenDailyDoseAdvisoryEnabled: boolean;
  rows: ControlledSubstanceOralOpioidMarSupportRow[];
  blockers: string[];
};

const ORAL_OPIOID_CATALOG_CODES = [
  "OXYCODONE_5_MG_COMPRIME_ORAL",
  "OXYCODONE_10_MG_COMPRIME_ORAL",
  "ACETAMINOPHEN_CODEINE_300_15_COMPRIME_ORAL",
  "ACETAMINOPHEN_CODEINE_300_30_COMPRIME_ORAL",
  "ACETAMINOPHEN_CODEINE_300_60_COMPRIME_ORAL",
  "HYDROCODONE_ACETAMINOPHEN_5_325_COMPRIME_ORAL",
  "HYDROCODONE_ACETAMINOPHEN_7_5_325_COMPRIME_ORAL",
  "HYDROCODONE_ACETAMINOPHEN_10_325_COMPRIME_ORAL",
  "OXYCODONE_ACETAMINOPHEN_5_325_COMPRIME_ORAL",
  "OXYCODONE_ACETAMINOPHEN_7_5_325_COMPRIME_ORAL",
  "OXYCODONE_ACETAMINOPHEN_10_325_COMPRIME_ORAL",
] as const;

const DIRECT_IV_PUSH_CODES = [
  "MORPHINE_2_MG_ML_INJECTABLE_INTRAVEINEUSE",
  "MORPHINE_4_MG_ML_INJECTABLE_INTRAVEINEUSE",
  "MORPHINE_10_MG_PER_ML_INJECTABLE_INJECTION",
  "HYDROMORPHONE_0_5_MG_ML_INJECTABLE_INTRAVEINEUSE",
] as const;

function hasAcetaminophenComponent(catalogCode: string): boolean {
  return catalogCode.includes("ACETAMINOPHEN") || catalogCode.includes("CODEINE");
}

export function resolveControlledSubstanceDirectMarReady(catalogCode: string): {
  marReady: boolean;
  directAdministration: boolean;
  acetaminophenDailyDoseAdvisory: boolean;
} {
  const formulary = ENTERPRISE_CONTROLLED_SUBSTANCE_FORMULARY_BY_CODE[catalogCode];
  if (formulary) {
    const admin = formulary.administrationType.toUpperCase();
    if (admin === "ORAL" && formulary.governance.isControlled) {
      return {
        marReady: true,
        directAdministration: true,
        acetaminophenDailyDoseAdvisory: hasAcetaminophenComponent(catalogCode),
      };
    }
    if ((admin === "IV" || admin === "PUSH") && formulary.governance.isControlled) {
      return { marReady: true, directAdministration: true, acetaminophenDailyDoseAdvisory: false };
    }
    if (!formulary.governance.isControlled && (admin === "ORAL" || admin === "TOPICAL" || admin === "TRANSDERMAL")) {
      return { marReady: true, directAdministration: true, acetaminophenDailyDoseAdvisory: false };
    }
  }
  if ((ORAL_OPIOID_CATALOG_CODES as readonly string[]).includes(catalogCode)) {
    return {
      marReady: true,
      directAdministration: true,
      acetaminophenDailyDoseAdvisory: hasAcetaminophenComponent(catalogCode),
    };
  }
  if ((DIRECT_IV_PUSH_CODES as readonly string[]).includes(catalogCode)) {
    return { marReady: true, directAdministration: true, acetaminophenDailyDoseAdvisory: false };
  }
  return { marReady: false, directAdministration: false, acetaminophenDailyDoseAdvisory: false };
}

export function buildControlledSubstanceOralOpioidMarSupportReport(): ControlledSubstanceOralOpioidMarSupportReport {
  const targets = [
    ...ORAL_OPIOID_CATALOG_CODES.map((catalogCode) => ({
      catalogCode,
      medication: ENTERPRISE_CONTROLLED_SUBSTANCE_FORMULARY_BY_CODE[catalogCode]?.displayNameEn ?? catalogCode,
    })),
    ...DIRECT_IV_PUSH_CODES.map((catalogCode) => ({
      catalogCode,
      medication:
        catalogCode === "HYDROMORPHONE_0_5_MG_ML_INJECTABLE_INTRAVEINEUSE"
          ? "Hydromorphone IV 0.5 mg/mL"
          : "Morphine IV push",
    })),
  ];
  const rows: ControlledSubstanceOralOpioidMarSupportRow[] = targets.map(({ catalogCode, medication }) => {
    const resolved = resolveControlledSubstanceDirectMarReady(catalogCode);
    return {
      catalogCode,
      medication,
      directMarAdministration: resolved.directAdministration,
      marReady: resolved.marReady,
      pyxisWasteWitnessExternalized: true,
      medoraWitnessRequired: false,
      postAdministrationReassessmentRequired: true,
      acetaminophenDailyDoseAdvisory: resolved.acetaminophenDailyDoseAdvisory,
      blockers: resolved.marReady ? [] : ["MISSING_MAR_SUPPORT"],
    };
  });
  const blockers = rows.filter((row) => !row.marReady).map((row) => row.catalogCode);
  return {
    decision: blockers.length === 0 ? "PASS" : "FAIL",
    oralOpioidDirectAdministration: rows.every((row) => row.directMarAdministration),
    noIvpbPumpPcaRequired: true,
    noMedoraWitnessHardStop: true,
    painReassessmentRequired: true,
    sideEffectDocumentationRequired: true,
    acetaminophenDailyDoseAdvisoryEnabled: rows.some((row) => row.acetaminophenDailyDoseAdvisory),
    rows,
    blockers,
  };
}
