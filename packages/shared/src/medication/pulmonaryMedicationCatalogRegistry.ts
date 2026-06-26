/**
 * MEDUI.MEDICATION.PULMONARY_AND_CONTINUOUS_INFUSION_EXPANSION.1
 * Enterprise pulmonary medication catalog registry and gap analysis.
 */

import { ENTERPRISE_WAVE2_FORMULARY_BY_CODE } from "./enterpriseWave2FormularyManifest.js";
import { ENTERPRISE_WAVE3_FORMULARY_BY_CODE } from "./enterpriseWave3FormularyManifest.js";
import { ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_BY_CODE } from "./enterpriseWave4EdHospitalFormularyManifest.js";
import { ENTERPRISE_PULMONARY_FORMULARY_SUPPLEMENT_BY_CODE } from "./enterprisePulmonaryFormularySupplement.js";
import { resolveMedicationBillingReadiness } from "./medicationActivationBillingReadiness.js";

export type PulmonaryMedicationRouteClass = "INH" | "NEB" | "MDI" | "DPI" | "ETT" | "TRACH";

export type PulmonaryMedicationRegistryEntry = {
  medication: string;
  tokens: readonly string[];
  preferredCatalogCodes: readonly string[];
  routeClass: PulmonaryMedicationRouteClass;
  aliases: readonly string[];
  prnSupported: boolean;
  weightIndependent: boolean;
};

export const ENTERPRISE_PULMONARY_MEDICATION_REGISTRY: readonly PulmonaryMedicationRegistryEntry[] = [
  {
    medication: "Albuterol Nebulizer",
    tokens: ["albuterol", "salbutamol", "ventolin"],
    preferredCatalogCodes: [
      "SALBUTAMOL_2.5_MG_PER_2.5_ML_SOLUTION_NEBULISATION_INHALATION",
      "ALBUTEROL_0_083_PEDS_NEB_SOLUTION_DE_NEBULISATION_INHALEE",
    ],
    routeClass: "NEB",
    aliases: ["Ventolin nebules", "Proventil neb"],
    prnSupported: true,
    weightIndependent: true,
  },
  {
    medication: "Albuterol MDI",
    tokens: ["albuterol", "salbutamol", "ventolin", "proventil"],
    preferredCatalogCodes: ["SALBUTAMOL_100_MCG_PER_DOSE_INHALATEUR_INHALATION"],
    routeClass: "MDI",
    aliases: ["Ventolin HFA", "Proventil HFA"],
    prnSupported: true,
    weightIndependent: true,
  },
  {
    medication: "Levalbuterol",
    tokens: ["levalbuterol", "xopenex"],
    preferredCatalogCodes: ["LEVALBUTEROL_1_25_MG_3_ML_SOLUTION_DE_NEBULISATION_INHALEE"],
    routeClass: "NEB",
    aliases: ["Xopenex"],
    prnSupported: true,
    weightIndependent: true,
  },
  {
    medication: "Ipratropium Neb",
    tokens: ["ipratropium", "atrovent"],
    preferredCatalogCodes: ["IPRATROPIUM_0_5_MG_2_5_ML_SOLUTION_DE_NEBULISATION_INHALEE"],
    routeClass: "NEB",
    aliases: ["Atrovent neb"],
    prnSupported: true,
    weightIndependent: true,
  },
  {
    medication: "Atrovent MDI",
    tokens: ["ipratropium", "atrovent"],
    preferredCatalogCodes: ["IPRATROPIUM_20_MCG_PER_DOSE_INHALATEUR_INHALATION"],
    routeClass: "MDI",
    aliases: ["Atrovent HFA"],
    prnSupported: true,
    weightIndependent: true,
  },
  {
    medication: "Duoneb",
    tokens: ["duoneb", "ipratropium", "albuterol", "combivent"],
    preferredCatalogCodes: ["IPRATROPIUM_ALBUTEROL_0_5_3_MG_SOLUTION_DE_NEBULISATION_INHALEE"],
    routeClass: "NEB",
    aliases: ["Combivent neb", "DuoNeb"],
    prnSupported: true,
    weightIndependent: true,
  },
  {
    medication: "Budesonide Neb",
    tokens: ["budesonide", "pulmicort"],
    preferredCatalogCodes: ["BUDESONIDE_0_5_MG_2_ML_SUSPENSION_POUR_NEBULISATION_INHALEE"],
    routeClass: "NEB",
    aliases: ["Pulmicort respules"],
    prnSupported: false,
    weightIndependent: true,
  },
  {
    medication: "Pulmicort MDI",
    tokens: ["budesonide", "pulmicort"],
    preferredCatalogCodes: ["BUDESONIDE_200_MCG_PER_DOSE_INHALATEUR_INHALATION"],
    routeClass: "MDI",
    aliases: ["Pulmicort Flexhaler"],
    prnSupported: false,
    weightIndependent: true,
  },
  {
    medication: "Fluticasone",
    tokens: ["fluticasone", "flovent"],
    preferredCatalogCodes: ["FLUTICASONE_110_MCG_DOSE_INHALATEUR_INHALEE"],
    routeClass: "MDI",
    aliases: ["Flovent"],
    prnSupported: false,
    weightIndependent: true,
  },
  {
    medication: "Symbicort",
    tokens: ["symbicort", "budesonide", "formoterol"],
    preferredCatalogCodes: ["BUDESONIDE_FORMOTEROL_160_4_5_MCG_INHALATEUR_INHALEE"],
    routeClass: "MDI",
    aliases: ["Budesonide/formoterol"],
    prnSupported: false,
    weightIndependent: true,
  },
  {
    medication: "Advair",
    tokens: ["advair", "fluticasone", "salmeterol"],
    preferredCatalogCodes: ["FLUTICASONE_SALMETEROL_250_50_MCG_INHALATEUR_INHALEE", "FLUTICASONE_SALMETEROL_100_50_MCG_INHALATEUR_INHALEE"],
    routeClass: "MDI",
    aliases: ["Fluticasone/salmeterol"],
    prnSupported: false,
    weightIndependent: true,
  },
  {
    medication: "Spiriva",
    tokens: ["spiriva", "tiotropium"],
    preferredCatalogCodes: ["TIOTROPIUM_18_MCG_INHALATEUR_INHALEE"],
    routeClass: "DPI",
    aliases: ["Tiotropium"],
    prnSupported: false,
    weightIndependent: true,
  },
  {
    medication: "Combivent MDI",
    tokens: ["combivent", "ipratropium", "albuterol"],
    preferredCatalogCodes: ["IPRATROPIUM_20_MCG_PER_DOSE_INHALATEUR_INHALATION"],
    routeClass: "MDI",
    aliases: ["Combivent Respimat"],
    prnSupported: true,
    weightIndependent: true,
  },
  {
    medication: "Hypertonic Saline Neb",
    tokens: ["hypertonic", "saline", "3%"],
    preferredCatalogCodes: ["HYPERTONIC_SALINE_3_NEB_SOLUTION_DE_NEBULISATION_INHALEE"],
    routeClass: "NEB",
    aliases: ["HTS neb", "3% saline neb"],
    prnSupported: false,
    weightIndependent: true,
  },
  {
    medication: "Acetylcysteine Neb",
    tokens: ["acetylcysteine", "mucomyst"],
    preferredCatalogCodes: ["ACETYLCYSTEINE_20_SOLUTION_DE_NEBULISATION_INHALEE"],
    routeClass: "NEB",
    aliases: ["Mucomyst"],
    prnSupported: false,
    weightIndependent: true,
  },
  {
    medication: "Racepinephrine",
    tokens: ["racepinephrine", "racemic epinephrine"],
    preferredCatalogCodes: [
      "RACEMIC_EPINEPHRINE_2_25_SOLUTION_DE_NEBULISATION_INHALEE",
      "RACEMIC_EPINEPHRINE_0_25_ML_PEDS_NEB_SOLUTION_DE_NEBULISATION_INHALEE",
    ],
    routeClass: "NEB",
    aliases: ["Racemic epinephrine neb"],
    prnSupported: true,
    weightIndependent: true,
  },
  {
    medication: "Epinephrine Neb",
    tokens: ["epinephrine", "adrenaline"],
    preferredCatalogCodes: ["RACEMIC_EPINEPHRINE_2_25_SOLUTION_DE_NEBULISATION_INHALEE"],
    routeClass: "NEB",
    aliases: ["Adrenaline neb"],
    prnSupported: true,
    weightIndependent: true,
  },
] as const;

function resolveFormularyEntry(catalogCode: string) {
  return (
    ENTERPRISE_WAVE2_FORMULARY_BY_CODE[catalogCode] ??
    ENTERPRISE_WAVE3_FORMULARY_BY_CODE[catalogCode] ??
    ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_BY_CODE[catalogCode] ??
    ENTERPRISE_PULMONARY_FORMULARY_SUPPLEMENT_BY_CODE[catalogCode] ??
    null
  );
}

export type PulmonaryMedicationGapRow = {
  medication: string;
  routeClass: PulmonaryMedicationRouteClass;
  catalogPresent: boolean;
  resolvedCatalogCode: string | null;
  billingReady: boolean;
  marPathwaySupported: boolean;
  providerOrderingSupported: boolean;
  aliasesPresent: boolean;
  gaps: string[];
};

export type PulmonaryMedicationGapAnalysisReport = {
  currentActiveCount: number;
  expectedCount: number;
  missingMedications: string[];
  missingStrengths: string[];
  missingRoutes: PulmonaryMedicationRouteClass[];
  rows: PulmonaryMedicationGapRow[];
  decision: "PASS" | "PARTIAL" | "FAIL";
};

/** O(1) lookup of pulmonary registry entry by catalog code. */
const PULMONARY_CATALOG_CODE_INDEX = new Map<string, PulmonaryMedicationRegistryEntry>();
for (const entry of ENTERPRISE_PULMONARY_MEDICATION_REGISTRY) {
  for (const code of entry.preferredCatalogCodes) {
    PULMONARY_CATALOG_CODE_INDEX.set(code, entry);
  }
}

export function resolvePulmonaryMedicationRegistryEntryByCatalogCode(
  catalogCode: string
): PulmonaryMedicationRegistryEntry | null {
  return PULMONARY_CATALOG_CODE_INDEX.get(catalogCode.trim()) ?? null;
}

export function isEnterprisePulmonaryCatalogCode(catalogCode: string): boolean {
  return PULMONARY_CATALOG_CODE_INDEX.has(catalogCode.trim());
}

export function buildPulmonaryMedicationGapAnalysisReport(): PulmonaryMedicationGapAnalysisReport {
  const rows: PulmonaryMedicationGapRow[] = [];
  const missingMedications: string[] = [];
  const missingStrengths: string[] = [];
  const missingRoutes = new Set<PulmonaryMedicationRouteClass>();
  let currentActiveCount = 0;

  for (const entry of ENTERPRISE_PULMONARY_MEDICATION_REGISTRY) {
    const resolvedCode =
      entry.preferredCatalogCodes.find((code) => Boolean(resolveFormularyEntry(code))) ?? null;
    const gaps: string[] = [];
    if (!resolvedCode) {
      missingMedications.push(entry.medication);
      gaps.push("catalog_missing");
    } else {
      currentActiveCount += 1;
      const formulary = resolveFormularyEntry(resolvedCode);
      if (!formulary?.strength?.trim()) {
        missingStrengths.push(entry.medication);
        gaps.push("strength_missing");
      }
      const billing = resolveMedicationBillingReadiness(resolvedCode);
      if (!billing.billingReady) gaps.push("billing_missing");
      if (entry.aliases.length === 0) gaps.push("aliases_missing");
    }

    rows.push({
      medication: entry.medication,
      routeClass: entry.routeClass,
      catalogPresent: Boolean(resolvedCode),
      resolvedCatalogCode: resolvedCode,
      billingReady: resolvedCode ? resolveMedicationBillingReadiness(resolvedCode).billingReady : false,
      marPathwaySupported: Boolean(resolvedCode),
      providerOrderingSupported: Boolean(resolvedCode),
      aliasesPresent: entry.aliases.length > 0,
      gaps,
    });
  }

  for (const route of ["INH", "NEB", "MDI", "DPI", "ETT", "TRACH"] as const) {
    if (!rows.some((row) => row.routeClass === route && row.catalogPresent)) {
      if (route === "INH" || route === "ETT" || route === "TRACH") continue;
      missingRoutes.add(route);
    }
  }

  const decision =
    missingMedications.length === 0 && missingRoutes.size === 0 ? "PASS" : missingMedications.length <= 2 ? "PARTIAL" : "FAIL";

  return {
    currentActiveCount,
    expectedCount: ENTERPRISE_PULMONARY_MEDICATION_REGISTRY.length,
    missingMedications,
    missingStrengths,
    missingRoutes: [...missingRoutes],
    rows,
    decision,
  };
}
