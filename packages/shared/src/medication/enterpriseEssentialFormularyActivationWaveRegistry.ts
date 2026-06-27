/**
 * MEDUI.MEDS.ENTERPRISE_FORMULARY_ACTIVATION_WAVE.1
 * Safe essential formulary activation from existing catalog rows.
 * Does not activate controlled substances without governance.
 */

import { type MedicationTrueHardStop } from "./nonBlockingPharmacyReviewPolicy.js";
import { buildActivationGovernanceRecord } from "./medicationActivationGovernance.js";
import { HAITI_MEDICATION_FORMULARY_CATALOG } from "./haitiMedicationFormularyCatalog.js";
import { legacyOrderabilityRow } from "./tranche2ChronicDiseaseActivation.js";
import { getPriorProviderOrderableCatalogCodesForDomain } from "./providerOrderablePriorCodesState.js";

export type EssentialFormularyActivationWaveDecision =
  | "ENTERPRISE_FORMULARY_ACTIVATION_WAVE_ACTIVE"
  | "READY_WITH_BLOCKERS"
  | "NOT_READY";

export type EssentialFormularyActivationWaveState = "ACTIVE" | "ROLLED_BACK";

export type EssentialFormularyActivationWaveEntry = {
  catalogCode: string;
  displayNameEn: string;
  displayNameFr: string;
  route: string;
  doseForm: string;
  focusArea: EssentialFormularyFocusArea;
  marReady: boolean;
  billingReady: boolean;
  inventoryReady: boolean;
  pharmacyReviewVisible: true;
  state: EssentialFormularyActivationWaveState;
};

export type EssentialFormularyFocusArea =
  | "TMP_SMX"
  | "ACLS_ER"
  | "ICU_DRIPS"
  | "ANTICOAGULATION"
  | "ANTIBIOTICS"
  | "ELECTROLYTES_FLUIDS"
  | "OBGYN_HIGH_RISK"
  | "INSULIN_DIABETES"
  | "ORTHO_SUPPORT";

export type EssentialFormularyActivationWaveRegistry = {
  activatedAt: string;
  activatingAuthority: string;
  entries: EssentialFormularyActivationWaveEntry[];
  auditTrail: Array<{
    catalogCode: string;
    eventType: "ACTIVATION_ENABLED" | "ROLLBACK_EXECUTED";
    reason: string;
  }>;
};

export const TMP_SMX_CATALOG_CODES = [
  "COTRIMOXAZOLE_800_PER_160_MG_COMPRIME_ORAL",
  "COTRIMOXAZOLE_400_PER_80_MG_COMPRIME_ORAL",
  "COTRIMOXAZOLE_240_MG_PER_5_ML_SUSPENSION_BUVABLE_ORAL",
] as const;

/** Explicit governance hold — present in catalog but not activated by this wave. */
export const CONTROLLED_SUBSTANCE_GOVERNANCE_HOLD_CODES = [
  "FENTANYL_50MCG_ML_INJECTABLE",
  "FENTANYL_50_MCG_ML_INJECTABLE_INTRAVEINEUSE",
  "FENTANYL_100_MCG_2_ML_INJECTABLE_INTRAVEINEUSE",
  "FENTANYL_250_MCG_5_ML_INJECTABLE_INTRAVEINEUSE",
  "FENTANYL_25_MCG_ML_INJECTABLE_INTRAVEINEUSE",
  "MIDAZOLAM_5MG_ML_INJECTABLE",
  "MIDAZOLAM_1_MG_ML_INJECTABLE_INTRAVEINEUSE",
  "MIDAZOLAM_5_MG_0_5_ML_NASAL_SOLUTION_NASALE_NASALE",
  "KETAMINE_50MG_ML_INJECTABLE",
  "KETAMINE_10_MG_ML_INJECTABLE_INTRAVEINEUSE",
  "KETAMINE_100_MG_ML_PEDS_INJECTABLE_INTRAVEINEUSE",
  "HYDROCODONE_ACETAMINOPHEN_5_325_COMPRIME_ORAL",
  "HYDROCODONE_ACETAMINOPHEN_7_5_325_COMPRIME_ORAL",
  "HYDROCODONE_ACETAMINOPHEN_10_325_COMPRIME_ORAL",
  "OXYCODONE_5_MG_COMPRIME_ORAL",
  "OXYCODONE_10_MG_COMPRIME_ORAL",
  "OXYCODONE_ACETAMINOPHEN_5_325_COMPRIME_ORAL",
  "OXYCODONE_ACETAMINOPHEN_7_5_325_COMPRIME_ORAL",
  "OXYCODONE_ACETAMINOPHEN_10_325_COMPRIME_ORAL",
  "HYDROMORPHONE_2MG_ML_INJECTABLE",
  "HYDROMORPHONE_1_MG_ML_INJECTABLE_INTRAVEINEUSE",
  "HYDROMORPHONE_2_MG_ML_INJECTABLE_INTRAVEINEUSE",
  "HYDROMORPHONE_4_MG_ML_INJECTABLE_INTRAVEINEUSE",
  "HYDROMORPHONE_0_5_MG_ML_INJECTABLE_INTRAVEINEUSE",
  "MORPHINE_10_MG_PER_ML_INJECTABLE_INJECTION",
  "MORPHINE_2_MG_ML_INJECTABLE_INTRAVEINEUSE",
  "MORPHINE_4_MG_ML_INJECTABLE_INTRAVEINEUSE",
  "MORPHINE_1_MG_ML_INJECTABLE_INTRAVEINEUSE",
] as const;

type WaveSpec = { catalogCode: string; focusArea: EssentialFormularyFocusArea };

const ESSENTIAL_FORMULARY_ACTIVATION_WAVE_SPECS: readonly WaveSpec[] = [
  ...TMP_SMX_CATALOG_CODES.map((catalogCode) => ({ catalogCode, focusArea: "TMP_SMX" as const })),
  { catalogCode: "EPINEPHRINE_1_MG_1_ML_IM_INJECTABLE_INTRAMUSCULAIRE", focusArea: "ACLS_ER" },
  { catalogCode: "EPINEPHRINE_0_1_MG_ML_PERFUSION_INTRAVEINEUSE", focusArea: "ICU_DRIPS" },
  { catalogCode: "ATROPINE_1_MG_10_ML_INJECTABLE_INTRAVEINEUSE", focusArea: "ACLS_ER" },
  { catalogCode: "AMIODARONE_150MG_3ML_IV", focusArea: "ACLS_ER" },
  { catalogCode: "AMIODARONE_900_MG_500_ML_PERFUSION_INTRAVEINEUSE", focusArea: "ACLS_ER" },
  { catalogCode: "NALOXONE_4_MG_0_4_ML_INJECTABLE_INTRANASALE", focusArea: "ACLS_ER" },
  { catalogCode: "NALOXONE_1_MG_ML_INJECTABLE_INTRAVEINEUSE", focusArea: "ACLS_ER" },
  { catalogCode: "GLUCAGON_1_MG_POUDRE_INJECTABLE", focusArea: "ACLS_ER" },
  { catalogCode: "NITROGLYCERIN_0_4_MG_COMPRIME_SUBLINGUAL_CARDIOLOGY", focusArea: "ACLS_ER" },
  { catalogCode: "NITROGLYCERIN_50_MG_250_ML_PERFUSION_INTRAVEINEUSE", focusArea: "ICU_DRIPS" },
  { catalogCode: "NICARDIPINE_2_5_MG_ML_INJECTABLE_INTRAVEINEUSE", focusArea: "ICU_DRIPS" },
  { catalogCode: "PROPOFOL_20_MG_ML_INJECTABLE_INTRAVEINEUSE", focusArea: "ICU_DRIPS" },
  { catalogCode: "DEXMEDETOMIDINE_100_MCG_ML_INJECTABLE_INTRAVEINEUSE", focusArea: "ICU_DRIPS" },
  { catalogCode: "HEPARIN_25000_UNITS_500_ML_PERFUSION_INTRAVEINEUSE", focusArea: "ICU_DRIPS" },
  { catalogCode: "HEPARIN_5000_UNITS_ML_INJECTABLE_INTRAVEINEUSE", focusArea: "ANTICOAGULATION" },
  { catalogCode: "REGULAR_INSULIN_100_UI_ML_DRIP_KIT_PERFUSION_INTRAVEINEUSE", focusArea: "ICU_DRIPS" },
  { catalogCode: "ENOXAPARIN_40_MG_PER_0.4_ML_INJECTABLE_INJECTION", focusArea: "ANTICOAGULATION" },
  { catalogCode: "ENOXAPARIN_60_MG_PER_0.6_ML_INJECTABLE_INJECTION", focusArea: "ANTICOAGULATION" },
  { catalogCode: "ENOXAPARIN_120_MG_0_8_ML_INJECTABLE_SOUS_CUTANEE", focusArea: "ANTICOAGULATION" },
  { catalogCode: "INSULIN_LISPRO_100_UI_ML_INJECTABLE_SOUS_CUTANEE", focusArea: "INSULIN_DIABETES" },
  { catalogCode: "INSULIN_GLARGINE_100_UI_ML_INJECTABLE_SOUS_CUTANEE", focusArea: "INSULIN_DIABETES" },
  { catalogCode: "VANCOMYCIN_1_G_INJECTABLE_INTRAVENOUS", focusArea: "ANTIBIOTICS" },
  { catalogCode: "VANCOMYCIN_500_MG_POUDRE_INTRAVEINEUSE", focusArea: "ANTIBIOTICS" },
  { catalogCode: "CEFTRIAXONE_1_G_INJECTABLE_INJECTION", focusArea: "ANTIBIOTICS" },
  { catalogCode: "CEFTRIAXONE_100_MG_ML_PEDS_POUDRE_INTRAVEINEUSE", focusArea: "ANTIBIOTICS" },
  { catalogCode: "CEFEPIME_1G_INJECTABLE", focusArea: "ANTIBIOTICS" },
  { catalogCode: "CEFAZOLIN_1G_INJECTABLE", focusArea: "ANTIBIOTICS" },
  { catalogCode: "POTASSIUM_CHLORIDE_20_MEQ_PER_10_ML_INJECTABLE_INTRAVENOUS", focusArea: "ELECTROLYTES_FLUIDS" },
  { catalogCode: "POTASSIUM_CHLORIDE_10_MEQ_100_ML_PERFUSION_INTRAVEINEUSE", focusArea: "ELECTROLYTES_FLUIDS" },
  { catalogCode: "HYPERTONIC_SALINE_3_1000_ML_PERFUSION_INTRAVEINEUSE", focusArea: "ELECTROLYTES_FLUIDS" },
  { catalogCode: "HYPERTONIC_SALINE_23_4_30_ML_INJECTABLE_INTRAVEINEUSE", focusArea: "ELECTROLYTES_FLUIDS" },
  { catalogCode: "METHYLERGONOVINE_0_2_MG_ML_INJECTABLE_INTRAMUSCULAIRE", focusArea: "OBGYN_HIGH_RISK" },
  { catalogCode: "CARBOPROST_250_MCG_ML_INJECTABLE_INTRAMUSCULAIRE", focusArea: "OBGYN_HIGH_RISK" },
  { catalogCode: "RH_IMMUNE_GLOBULIN_300_MCG_INJECTABLE_INTRAMUSCULAIRE", focusArea: "OBGYN_HIGH_RISK" },
  { catalogCode: "TERBUTALINE_0_25_MG_SC_OB_INJECTABLE_SOUS_CUTANEE", focusArea: "OBGYN_HIGH_RISK" },
  { catalogCode: "CYCLOBENZAPRINE_5_MG_COMPRIME_ORAL", focusArea: "ORTHO_SUPPORT" },
  { catalogCode: "METHOCARBAMOL_500_MG_COMPRIME_ORAL", focusArea: "ORTHO_SUPPORT" },
];

const ACTIVATED_AT = "2026-06-23T00:00:00.000Z";
const ACTIVATING_AUTHORITY = "Medication Governance Board — Enterprise Essential Formulary Wave 1";

let registryCache: EssentialFormularyActivationWaveRegistry | null = null;

const governanceHoldSet = new Set<string>(CONTROLLED_SUBSTANCE_GOVERNANCE_HOLD_CODES);

function isControlledCatalogCode(catalogCode: string): boolean {
  if (governanceHoldSet.has(catalogCode)) return true;
  const haiti = HAITI_MEDICATION_FORMULARY_CATALOG.find((row) => row.code === catalogCode);
  return Boolean(haiti?.isControlled);
}

function buildWaveEntry(spec: WaveSpec, priorActive: ReadonlySet<string>): EssentialFormularyActivationWaveEntry | null {
  if (priorActive.has(spec.catalogCode)) return null;
  if (isControlledCatalogCode(spec.catalogCode)) return null;
  const legacy = legacyOrderabilityRow(spec.catalogCode);
  if (!legacy) return null;
  const governance = buildActivationGovernanceRecord(legacy);
  if (!governance.marReady) return null;
  return {
    catalogCode: spec.catalogCode,
    displayNameEn: legacy.displayNameEn,
    displayNameFr: legacy.displayNameFr,
    route: legacy.route,
    doseForm: legacy.dosageForm,
    focusArea: spec.focusArea,
    marReady: true,
    billingReady: governance.billingReady,
    inventoryReady: governance.inventoryReady,
    pharmacyReviewVisible: true,
    state: "ACTIVE",
  };
}

export function buildEnterpriseEssentialFormularyActivationWaveRegistry(): EssentialFormularyActivationWaveRegistry {
  if (registryCache) return registryCache;
  const priorActive = getPriorProviderOrderableCatalogCodesForDomain("essentialFormularyWave");
  const entries = ESSENTIAL_FORMULARY_ACTIVATION_WAVE_SPECS.flatMap((spec) => {
    const entry = buildWaveEntry(spec, priorActive);
    return entry ? [entry] : [];
  });
  registryCache = {
    activatedAt: ACTIVATED_AT,
    activatingAuthority: ACTIVATING_AUTHORITY,
    entries,
    auditTrail: entries.map((entry) => ({
      catalogCode: entry.catalogCode,
      eventType: "ACTIVATION_ENABLED" as const,
      reason: "Enterprise essential formulary activation wave — safe catalog supplement",
    })),
  };
  return registryCache;
}

export function listActiveEnterpriseEssentialFormularyWaveCatalogCodes(
  registry = buildEnterpriseEssentialFormularyActivationWaveRegistry()
): string[] {
  return registry.entries.filter((entry) => entry.state === "ACTIVE").map((entry) => entry.catalogCode);
}

export function isActiveEnterpriseEssentialFormularyWaveMedication(
  catalogCode: string,
  registry = buildEnterpriseEssentialFormularyActivationWaveRegistry()
): boolean {
  return listActiveEnterpriseEssentialFormularyWaveCatalogCodes(registry).includes(catalogCode);
}

export function validateEnterpriseEssentialFormularyWaveOrderPlacement(input: {
  catalogCode: string;
  registry?: EssentialFormularyActivationWaveRegistry;
  trueHardStops?: readonly MedicationTrueHardStop[];
}): { allowed: boolean; blockers: string[] } {
  const registry = input.registry ?? buildEnterpriseEssentialFormularyActivationWaveRegistry();
  const blockers: string[] = [...(input.trueHardStops ?? [])];
  const entry = registry.entries.find((row) => row.catalogCode === input.catalogCode);
  if (!entry || entry.state !== "ACTIVE") blockers.push("ESSENTIAL_FORMULARY_WAVE_MEDICATION_NOT_ACTIVE");
  if (!entry?.marReady) blockers.push("MAR_NOT_READY");
  return { allowed: blockers.length === 0, blockers: [...new Set(blockers)] };
}

export function resetEnterpriseEssentialFormularyActivationWaveRegistryForTests(): void {
  registryCache = null;
}
