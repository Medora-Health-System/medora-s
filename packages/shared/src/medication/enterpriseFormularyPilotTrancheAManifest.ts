/**
 * M1.6F — Enterprise formulary Tranche A pilot manifest (12 low-risk chronic oral meds).
 */

import { ENTERPRISE_WAVE1_FORMULARY_BY_CODE } from "./enterpriseWave1FormularyManifest.js";
import type { EnterpriseFormularyPilotTrancheEntry } from "./enterpriseFormularyPilotTypes.js";
import { ENTERPRISE_PILOT_TRANCHE_A } from "./enterpriseFormularyPilotTypes.js";

export const ENTERPRISE_FORMULARY_PILOT_VERSION = "M1.6F" as const;

/** Explicit Tranche A catalog codes (Wave 1 only; 10–15 target). */
export const ENTERPRISE_FORMULARY_PILOT_TRANCHE_A_CATALOG_CODES = [
  "AMLODIPINE_5_MG_COMPRIME_ORAL",
  "LOSARTAN_50",
  "LISINOPRIL_10",
  "METFORMIN_500",
  "OMEPRAZOLE_20",
  "PANTOPRAZOLE_40_MG_COMPRIME_ORAL",
  "SIMVASTATIN_20_MG_COMPRIME_ORAL",
  "HYDROCHLOROTHIAZIDE_25",
  "ATORVASTATIN_20_MG_COMPRIME_ORAL",
  "FAMOTIDINE_20_MG_COMPRIME_ORAL",
  "FINASTERIDE_5_MG_COMPRIME_ORAL",
  "TAMSULOSIN_0.4_MG_COMPRIME_ORAL",
] as const;

export type EnterpriseFormularyPilotTrancheACatalogCode =
  (typeof ENTERPRISE_FORMULARY_PILOT_TRANCHE_A_CATALOG_CODES)[number];

const EXCLUDED_PSYCH_GENERIC = new Set([
  "sertraline",
  "escitalopram",
  "fluoxetine",
  "bupropion",
  "haloperidol",
]);

function classifyTrancheAEntry(catalogCode: string): EnterpriseFormularyPilotTrancheEntry {
  const wave1 = ENTERPRISE_WAVE1_FORMULARY_BY_CODE[catalogCode];
  const displayName = wave1?.displayNameEn || wave1?.genericName || catalogCode;
  const genericName = wave1?.genericName ?? catalogCode;
  const base = {
    catalogCode,
    genericName,
    displayName,
    tranche: ENTERPRISE_PILOT_TRANCHE_A,
    wave: "WAVE1" as const,
    administrationType: wave1?.administrationType ?? "ORAL",
  };

  if (!wave1) {
    return {
      ...base,
      pilotStatus: "PILOT_EXCLUDED_NOT_ENTERPRISE",
      pilotEligible: false,
      pilotRationale: "Not in Enterprise Wave 1 manifest",
    };
  }

  const gov = wave1.governance;
  const route = (wave1.route ?? "").toLowerCase();
  const form = (wave1.dosageForm ?? "").toLowerCase();
  const admin = (wave1.administrationType ?? "ORAL").toUpperCase();

  if (gov.isControlled) {
    return { ...base, pilotStatus: "PILOT_EXCLUDED_CONTROLLED", pilotEligible: false, pilotRationale: "Controlled substance" };
  }
  if (gov.isHighAlert) {
    return { ...base, pilotStatus: "PILOT_EXCLUDED_HIGH_ALERT", pilotEligible: false, pilotRationale: "High-alert medication" };
  }
  if (gov.lasaGroupId?.trim()) {
    return { ...base, pilotStatus: "PILOT_EXCLUDED_LASA", pilotEligible: false, pilotRationale: "LASA medication" };
  }
  if (EXCLUDED_PSYCH_GENERIC.has(genericName.toLowerCase())) {
    return { ...base, pilotStatus: "PILOT_EXCLUDED_PSYCHOTROPIC", pilotEligible: false, pilotRationale: "Psychotropic" };
  }
  if (
    admin !== "ORAL" ||
    form.includes("injectable") ||
    route.includes("inject") ||
    route.includes("intravein") ||
    route.includes("sous-cutan")
  ) {
    return { ...base, pilotStatus: "PILOT_EXCLUDED_INJECTABLE", pilotEligible: false, pilotRationale: "Non-oral route" };
  }
  if (wave1.bucket === "ANTICOAGULATION") {
    return { ...base, pilotStatus: "PILOT_EXCLUDED_ER_CRITICAL", pilotEligible: false, pilotRationale: "Anticoagulation category" };
  }

  return {
    ...base,
    pilotStatus: "PILOT_ELIGIBLE",
    pilotEligible: true,
    pilotRationale: "M1.6F Tranche A — low-risk chronic oral Wave 1 enterprise row",
  };
}

export const ENTERPRISE_FORMULARY_PILOT_TRANCHE_A_MANIFEST: EnterpriseFormularyPilotTrancheEntry[] =
  ENTERPRISE_FORMULARY_PILOT_TRANCHE_A_CATALOG_CODES.map(classifyTrancheAEntry);

export const ENTERPRISE_FORMULARY_PILOT_TRANCHE_A_ELIGIBLE: EnterpriseFormularyPilotTrancheEntry[] =
  ENTERPRISE_FORMULARY_PILOT_TRANCHE_A_MANIFEST.filter((e) => e.pilotEligible);

export const ENTERPRISE_FORMULARY_PILOT_TRANCHE_A_BY_CODE: Record<
  string,
  EnterpriseFormularyPilotTrancheEntry
> = Object.fromEntries(ENTERPRISE_FORMULARY_PILOT_TRANCHE_A_MANIFEST.map((e) => [e.catalogCode, e]));

export const ENTERPRISE_FORMULARY_PILOT_TRANCHE_A_STATS = {
  trancheTotal: ENTERPRISE_FORMULARY_PILOT_TRANCHE_A_MANIFEST.length,
  pilotEligible: ENTERPRISE_FORMULARY_PILOT_TRANCHE_A_ELIGIBLE.length,
  excluded: ENTERPRISE_FORMULARY_PILOT_TRANCHE_A_MANIFEST.length - ENTERPRISE_FORMULARY_PILOT_TRANCHE_A_ELIGIBLE.length,
} as const;
