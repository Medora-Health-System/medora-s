/**
 * MEDUI.MEDS.ENTERPRISE_FORMULARY_EXPANSION_WAVE_1_ACTIVATION.1
 * Governed Wave 1 enterprise formulary activation — SAFE_TO_ACTIVATE_NOW only.
 * No controlled substances. No high-alert without governance. MAR-ready required.
 */

import { buildActivationGovernanceRecord } from "./medicationActivationGovernance.js";
import { resolveMedicationBillingReadiness } from "./medicationActivationBillingReadiness.js";
import { certifyMedicationActivationCollision } from "./medicationCanonicalNormalization.js";
import { CONTROLLED_SUBSTANCE_GOVERNANCE_HOLD_CODES } from "./enterpriseEssentialFormularyActivationWaveRegistry.js";
import { HAITI_MEDICATION_FORMULARY_CATALOG } from "./haitiMedicationFormularyCatalog.js";
import { legacyOrderabilityRow } from "./tranche2ChronicDiseaseActivation.js";
import { getPriorProviderOrderableCatalogCodesForDomain } from "./providerOrderablePriorCodesState.js";

export type Wave1TherapeuticArea =
  | "Pain / Analgesia"
  | "Gastrointestinal"
  | "Infectious Disease / Antibiotics"
  | "Pulmonary"
  | "Cardiology"
  | "Endocrine / Diabetes"
  | "Renal / Electrolytes"
  | "Med-Surg Supportive";

export type Wave1ActivationDecision =
  | "SAFE_TO_ACTIVATE_NOW"
  | "ALREADY_ACTIVE"
  | "DEFER_CONTROLLED_SUBSTANCE"
  | "DEFER_HIGH_ALERT_GOVERNANCE"
  | "DEFER_GOVERNANCE_FIRST"
  | "NEEDS_IVPB_METADATA"
  | "NOT_MAR_READY"
  | "NOT_BILLING_READY"
  | "CATALOG_MISSING"
  | "ACTIVATION_COLLISION"
  | "NOT_WAVE_1";

export type Wave1ActivationCandidateRow = {
  catalogCode: string;
  label: string;
  therapeuticArea: Wave1TherapeuticArea;
  route: string;
  strength: string;
  marReady: boolean;
  currentlyProviderOrderable: boolean;
  controlledSubstance: boolean;
  highAlert: boolean;
  lasa: boolean;
  ivpb: boolean;
  infusionMetadataPresent: boolean;
  pediatricCaution: boolean;
  renalCaution: boolean;
  activationDecision: Wave1ActivationDecision;
  blockers: string[];
};

export type Wave1ActivationEntry = {
  catalogCode: string;
  label: string;
  therapeuticArea: Wave1TherapeuticArea;
  displayNameEn: string;
  displayNameFr: string;
  route: string;
  doseForm: string;
  marReady: true;
  billingReady: boolean;
  inventoryReady: boolean;
  state: "ACTIVE";
};

export type Wave1ExpansionActivationRegistry = {
  activatedAt: string;
  activatingAuthority: string;
  entries: Wave1ActivationEntry[];
  auditTrail: Array<{ catalogCode: string; eventType: "ACTIVATION_ENABLED"; reason: string }>;
};

export type Wave1ExpansionActivationReport = {
  ticket: "MEDUI.MEDS.ENTERPRISE_FORMULARY_EXPANSION_WAVE_1_ACTIVATION.1";
  previousProviderOrderableCount: number;
  newActivationsCount: number;
  totalProviderOrderableCount: number;
  deferredControlledSubstanceCount: number;
  deferredHighAlertCount: number;
  deferredIvpbMetadataCount: number;
  deferredGovernanceFirstCount: number;
  activatedCatalogCodes: string[];
  candidateRows: Wave1ActivationCandidateRow[];
  finalDecision: "ENTERPRISE_FORMULARY_WAVE_1_ACTIVATION_READY" | "READY_WITH_BLOCKERS" | "NOT_READY";
  blockers: string[];
};

const ACTIVATED_AT = "2026-06-28T06:00:00.000Z";
const ACTIVATING_AUTHORITY = "Medication Governance Board — Enterprise Formulary Wave 1 Expansion";

/** Explicit Wave 1 activation allow-list (curated, audit-verified). */
export const ENTERPRISE_FORMULARY_WAVE_1_ACTIVATION_SPECS: readonly {
  catalogCode: string;
  label: string;
  therapeuticArea: Wave1TherapeuticArea;
}[] = [
  { catalogCode: "ACETAMINOPHEN_10_MG_ML_INJECTABLE_INTRAVEINEUSE", label: "Acetaminophen IV", therapeuticArea: "Pain / Analgesia" },
  { catalogCode: "ACETAMINOPHEN_1000_MG_100_ML_PERFUSION_INTRAVEINEUSE", label: "Acetaminophen IVPB", therapeuticArea: "Pain / Analgesia" },
  { catalogCode: "ONDANSETRON_4_MG_5_ML_SOLUTION_BUVABLE_ORALE", label: "Ondansetron oral solution", therapeuticArea: "Gastrointestinal" },
  { catalogCode: "AMPICILLIN_SULBACTAM_3_G_POUDRE_INTRAVEINEUSE", label: "Ampicillin-sulbactam 3 g IV", therapeuticArea: "Infectious Disease / Antibiotics" },
  { catalogCode: "AMPICILLIN_SULBACTAM_1_5_G_POUDRE_INTRAVEINEUSE", label: "Ampicillin-sulbactam 1.5 g IV", therapeuticArea: "Infectious Disease / Antibiotics" },
  { catalogCode: "CIPROFLOXACIN_400_MG_200_ML_PERFUSION_INTRAVEINEUSE", label: "Ciprofloxacin IV", therapeuticArea: "Infectious Disease / Antibiotics" },
  { catalogCode: "LEVOFLOXACIN_750_MG_150_ML_PERFUSION_INTRAVEINEUSE", label: "Levofloxacin IV", therapeuticArea: "Infectious Disease / Antibiotics" },
  { catalogCode: "IMIPENEM_CILASTATIN_500_MG_POUDRE_INTRAVEINEUSE", label: "Imipenem-cilastatin 500 mg IV", therapeuticArea: "Infectious Disease / Antibiotics" },
  { catalogCode: "IMIPENEM_CILASTATIN_250_MG_POUDRE_INTRAVEINEUSE", label: "Imipenem-cilastatin 250 mg IV", therapeuticArea: "Infectious Disease / Antibiotics" },
  { catalogCode: "ERTAPENEM_1_G_POUDRE_INTRAVEINEUSE", label: "Ertapenem 1 g IV", therapeuticArea: "Infectious Disease / Antibiotics" },
  { catalogCode: "PREDNISONE_10_MG_COMPRIME_ORALE", label: "Prednisone 10 mg PO", therapeuticArea: "Med-Surg Supportive" },
  { catalogCode: "METHYLPREDNISOLONE_4_MG_COMPRIME_ORALE", label: "Methylprednisolone 4 mg PO", therapeuticArea: "Med-Surg Supportive" },
  { catalogCode: "METHYLPREDNISOLONE_40_MG_POUDRE_INTRAVEINEUSE", label: "Methylprednisolone 40 mg IV", therapeuticArea: "Med-Surg Supportive" },
  { catalogCode: "DEXAMETHASONE_10_MG_INJECTABLE_INTRAVEINEUSE", label: "Dexamethasone 10 mg IV", therapeuticArea: "Med-Surg Supportive" },
  { catalogCode: "DEXAMETHASONE_6_MG_IM_INJECTABLE_INTRAMUSCULAIRE", label: "Dexamethasone 6 mg IM", therapeuticArea: "Med-Surg Supportive" },
  { catalogCode: "DEXAMETHASONE_0_4_MG_ML_PEDS_INJECTABLE_INTRAVEINEUSE", label: "Dexamethasone pediatric IV", therapeuticArea: "Med-Surg Supportive" },
  { catalogCode: "METOPROLOL_SUCCINATE_50_MG_COMPRIME_ORALE", label: "Metoprolol succinate 50 mg PO", therapeuticArea: "Cardiology" },
  { catalogCode: "BISOPROLOL_5_MG_COMPRIME_ORALE", label: "Bisoprolol 5 mg PO", therapeuticArea: "Cardiology" },
  { catalogCode: "DILTIAZEM_120_MG_COMPRIME_ORALE", label: "Diltiazem 120 mg PO", therapeuticArea: "Cardiology" },
  { catalogCode: "VERAPAMIL_80_MG_COMPRIME_ORALE", label: "Verapamil 80 mg PO", therapeuticArea: "Cardiology" },
  { catalogCode: "ISOSORBIDE_MONONITRATE_30_MG_COMPRIME_ORALE", label: "Isosorbide mononitrate 30 mg PO", therapeuticArea: "Cardiology" },
  { catalogCode: "LABETALOL_200_MG_COMPRIME_ORALE", label: "Labetalol 200 mg PO", therapeuticArea: "Cardiology" },
  { catalogCode: "PRAVASTATIN_20_MG_COMPRIME_ORALE", label: "Pravastatin 20 mg PO", therapeuticArea: "Cardiology" },
  { catalogCode: "ALBUTEROL_0_083_PEDS_NEB_SOLUTION_DE_NEBULISATION_INHALEE", label: "Albuterol 0.083% neb", therapeuticArea: "Pulmonary" },
  { catalogCode: "MONTELUKAST_10_MG_COMPRIME_ORALE", label: "Montelukast 10 mg PO", therapeuticArea: "Pulmonary" },
  { catalogCode: "FLUTICASONE_SALMETEROL_100_50_MCG_INHALATEUR_INHALEE", label: "Fluticasone-salmeterol inhaler", therapeuticArea: "Pulmonary" },
  { catalogCode: "SODIUM_BICARBONATE_650_MG_COMPRIME_ORALE", label: "Sodium bicarbonate 650 mg PO", therapeuticArea: "Renal / Electrolytes" },
  { catalogCode: "TORSEMIDE_20_MG_COMPRIME_ORALE", label: "Torsemide 20 mg PO", therapeuticArea: "Renal / Electrolytes" },
  { catalogCode: "BUMETANIDE_1_MG_COMPRIME_ORALE", label: "Bumetanide 1 mg PO", therapeuticArea: "Renal / Electrolytes" },
  { catalogCode: "METOLAZONE_2_5_MG_COMPRIME_ORALE", label: "Metolazone 2.5 mg PO", therapeuticArea: "Renal / Electrolytes" },
  { catalogCode: "SODIUM_POLYSTYRENE_SULFONATE_15_G_POUDRE_ORALE", label: "Sodium polystyrene sulfonate PO", therapeuticArea: "Renal / Electrolytes" },
  { catalogCode: "GLIMEPIRIDE_2_MG_COMPRIME_ORALE", label: "Glimepiride 2 mg PO", therapeuticArea: "Endocrine / Diabetes" },
  { catalogCode: "ACARBOSE_50_MG_COMPRIME_ORALE", label: "Acarbose 50 mg PO", therapeuticArea: "Endocrine / Diabetes" },
  { catalogCode: "CANAGLIFLOZIN_100_MG_COMPRIME_ORALE", label: "Canagliflozin 100 mg PO", therapeuticArea: "Endocrine / Diabetes" },
  { catalogCode: "GABAPENTIN_600_MG_COMPRIME_ORALE", label: "Gabapentin 600 mg PO", therapeuticArea: "Med-Surg Supportive" },
  { catalogCode: "FOLIC_ACID_1_MG_COMPRIME_ORALE", label: "Folic acid 1 mg PO", therapeuticArea: "Med-Surg Supportive" },
  { catalogCode: "VITAMIN_D3_1000_IU_COMPRIME_ORALE", label: "Vitamin D3 1000 IU PO", therapeuticArea: "Med-Surg Supportive" },
  { catalogCode: "IRON_SUCROSE_20_MG_ML_INJECTABLE_INTRAVEINEUSE", label: "Iron sucrose IV", therapeuticArea: "Med-Surg Supportive" },
  { catalogCode: "FERRIC_CARBOXYMALTOSE_750_MG_15_ML_INJECTABLE_INTRAVEINEUSE", label: "Ferric carboxymaltose IV", therapeuticArea: "Med-Surg Supportive" },
  { catalogCode: "FLUCONAZOLE_150_MG_COMPRIME_ORALE", label: "Fluconazole 150 mg PO", therapeuticArea: "Infectious Disease / Antibiotics" },
] as const;

/** Governance-first deferrals — never activated in Wave 1. */
export const WAVE_1_GOVERNANCE_DEFER_CATALOG_CODES = [
  "NOREPINEPHRINE_8_MG_250_ML_PERFUSION_INTRAVEINEUSE",
  "EPINEPHRINE_0_1_MG_ML_PERFUSION_INTRAVEINEUSE",
  "VANCOMYCIN_1_G_INJECTABLE_INTRAVENOUS",
  "ENOXAPARIN_40_MG_PER_0.4_ML_INJECTABLE_INJECTION",
  "HEPARIN_5000_UNITS_ML_INJECTABLE_INTRAVEINEUSE",
  "INSULIN_GLARGINE_100_UI_ML_INJECTABLE_SOUS_CUTANEE",
  "PROPOFOL_20_MG_ML_INJECTABLE_INTRAVEINEUSE",
] as const;

const governanceHoldSet = new Set<string>(CONTROLLED_SUBSTANCE_GOVERNANCE_HOLD_CODES);
const wave1AllowSet = new Set(ENTERPRISE_FORMULARY_WAVE_1_ACTIVATION_SPECS.map((row) => row.catalogCode));

let registryCache: Wave1ExpansionActivationRegistry | null = null;
let candidateCache: Wave1ActivationCandidateRow[] | null = null;

function haitiRow(catalogCode: string) {
  return HAITI_MEDICATION_FORMULARY_CATALOG.find((row) => row.code === catalogCode) ?? null;
}

function isIvpbCatalogCode(catalogCode: string, route: string, doseForm: string): boolean {
  const blob = [catalogCode, route, doseForm].join(" ").toLowerCase();
  return blob.includes("perfusion") || blob.includes("ivpb");
}

function hasInfusionMetadata(catalogCode: string, route: string, doseForm: string): boolean {
  if (!isIvpbCatalogCode(catalogCode, route, doseForm)) return true;
  const haiti = haitiRow(catalogCode);
  if (haiti?.administrationType === "INFUSION") return true;
  return route.toLowerCase().includes("perfusion");
}

function isControlledCatalogCode(catalogCode: string): boolean {
  if (governanceHoldSet.has(catalogCode)) return true;
  return Boolean(haitiRow(catalogCode)?.isControlled);
}

function classifyCandidate(
  spec: (typeof ENTERPRISE_FORMULARY_WAVE_1_ACTIVATION_SPECS)[number],
  priorActive: ReadonlySet<string>
): Wave1ActivationCandidateRow {
  const legacy = legacyOrderabilityRow(spec.catalogCode);
  const blockers: string[] = [];
  if (!legacy) {
    return {
      catalogCode: spec.catalogCode,
      label: spec.label,
      therapeuticArea: spec.therapeuticArea,
      route: "",
      strength: "",
      marReady: false,
      currentlyProviderOrderable: priorActive.has(spec.catalogCode),
      controlledSubstance: isControlledCatalogCode(spec.catalogCode),
      highAlert: false,
      lasa: false,
      ivpb: false,
      infusionMetadataPresent: false,
      pediatricCaution: spec.label.toLowerCase().includes("pediatric"),
      renalCaution: spec.therapeuticArea === "Renal / Electrolytes",
      activationDecision: "CATALOG_MISSING",
      blockers: ["CATALOG_MISSING"],
    };
  }

  const governance = buildActivationGovernanceRecord(legacy);
  const billing = resolveMedicationBillingReadiness(spec.catalogCode);
  const ivpb = isIvpbCatalogCode(spec.catalogCode, legacy.route, legacy.dosageForm);
  const infusionMetadataPresent = hasInfusionMetadata(spec.catalogCode, legacy.route, legacy.dosageForm);
  const alreadyActive = priorActive.has(spec.catalogCode);

  if (isControlledCatalogCode(spec.catalogCode)) blockers.push("CONTROLLED_SUBSTANCE");
  if (governance.highRiskFlag) blockers.push("HIGH_ALERT");
  if (!governance.marReady) blockers.push("MAR_NOT_READY");
  if (!billing.billingReady) blockers.push("BILLING_NOT_READY");
  if (ivpb && !infusionMetadataPresent) blockers.push("IVPB_METADATA_MISSING");
  const collision = certifyMedicationActivationCollision([spec.catalogCode]);
  if (collision.decision !== "SAFE") blockers.push(...collision.blockers);

  let activationDecision: Wave1ActivationDecision = "SAFE_TO_ACTIVATE_NOW";
  if (alreadyActive) activationDecision = "ALREADY_ACTIVE";
  else if (isControlledCatalogCode(spec.catalogCode)) activationDecision = "DEFER_CONTROLLED_SUBSTANCE";
  else if (governance.highRiskFlag) activationDecision = "DEFER_HIGH_ALERT_GOVERNANCE";
  else if (ivpb && !infusionMetadataPresent) activationDecision = "NEEDS_IVPB_METADATA";
  else if (!governance.marReady) activationDecision = "NOT_MAR_READY";
  else if (!billing.billingReady) activationDecision = "NOT_BILLING_READY";
  else if (collision.decision !== "SAFE") activationDecision = "ACTIVATION_COLLISION";
  else if (blockers.length > 0) activationDecision = "NOT_WAVE_1";

  return {
    catalogCode: spec.catalogCode,
    label: spec.label,
    therapeuticArea: spec.therapeuticArea,
    route: legacy.route,
    strength: legacy.strength,
    marReady: governance.marReady,
    currentlyProviderOrderable: alreadyActive,
    controlledSubstance: governance.controlledSubstanceFlag,
    highAlert: governance.highRiskFlag,
    lasa: Boolean(legacy.restrictedReason?.toLowerCase().includes("lasa")),
    ivpb,
    infusionMetadataPresent,
    pediatricCaution: spec.label.toLowerCase().includes("pediatric") || legacy.dosageForm.toLowerCase().includes("peds"),
    renalCaution: spec.therapeuticArea === "Renal / Electrolytes",
    activationDecision,
    blockers: alreadyActive ? [] : [...new Set(blockers)],
  };
}

export function buildWave1ExpansionActivationCandidateTable(): Wave1ActivationCandidateRow[] {
  if (candidateCache) return candidateCache;
  const priorActive = getPriorProviderOrderableCatalogCodesForDomain("wave1Expansion");
  candidateCache = ENTERPRISE_FORMULARY_WAVE_1_ACTIVATION_SPECS.map((spec) => classifyCandidate(spec, priorActive));
  return candidateCache;
}

export function buildWave1ExpansionActivationRegistry(): Wave1ExpansionActivationRegistry {
  if (registryCache) return registryCache;
  const priorActive = getPriorProviderOrderableCatalogCodesForDomain("wave1Expansion");
  const entries = ENTERPRISE_FORMULARY_WAVE_1_ACTIVATION_SPECS.flatMap((spec) => {
    const candidate = classifyCandidate(spec, priorActive);
    if (candidate.activationDecision !== "SAFE_TO_ACTIVATE_NOW") return [];
    const legacy = legacyOrderabilityRow(spec.catalogCode)!;
    const governance = buildActivationGovernanceRecord(legacy);
    const billing = resolveMedicationBillingReadiness(spec.catalogCode);
    return [
      {
        catalogCode: spec.catalogCode,
        label: spec.label,
        therapeuticArea: spec.therapeuticArea,
        displayNameEn: legacy.displayNameEn,
        displayNameFr: legacy.displayNameFr,
        route: legacy.route,
        doseForm: legacy.dosageForm,
        marReady: true as const,
        billingReady: billing.billingReady,
        inventoryReady: billing.ndcReady || governance.inventoryReady,
        state: "ACTIVE" as const,
      },
    ];
  });

  registryCache = {
    activatedAt: ACTIVATED_AT,
    activatingAuthority: ACTIVATING_AUTHORITY,
    entries,
    auditTrail: entries.map((entry) => ({
      catalogCode: entry.catalogCode,
      eventType: "ACTIVATION_ENABLED" as const,
      reason: "Enterprise formulary Wave 1 expansion — SAFE_TO_ACTIVATE_NOW batch",
    })),
  };
  return registryCache;
}

export function listActiveWave1ExpansionProviderOrderingCatalogCodes(
  registry = buildWave1ExpansionActivationRegistry()
): readonly string[] {
  return registry.entries.filter((entry) => entry.state === "ACTIVE").map((entry) => entry.catalogCode);
}

export function isActiveWave1ExpansionProviderOrderingMedication(catalogCode: string): boolean {
  return wave1AllowSet.has(catalogCode) && listActiveWave1ExpansionProviderOrderingCatalogCodes().includes(catalogCode);
}

export function validateWave1ExpansionProviderOrderPlacement(input: {
  catalogCode: string;
}): { allowed: boolean; blockers: string[] } {
  if (!isActiveWave1ExpansionProviderOrderingMedication(input.catalogCode)) {
    return { allowed: false, blockers: ["WAVE1_EXPANSION_NOT_ACTIVE"] };
  }
  return { allowed: true, blockers: [] };
}

export function resetWave1ExpansionActivationRegistryForTests(): void {
  registryCache = null;
  candidateCache = null;
}

export function buildWave1ExpansionActivationReport(input?: {
  previousProviderOrderableCount?: number;
}): Wave1ExpansionActivationReport {
  const candidates = buildWave1ExpansionActivationCandidateTable();
  const registry = buildWave1ExpansionActivationRegistry();
  const activated = registry.entries.map((entry) => entry.catalogCode);
  const previous = input?.previousProviderOrderableCount ?? 0;
  const blockers: string[] = [];

  const orderableNotMar = candidates.filter(
    (row) => row.activationDecision === "SAFE_TO_ACTIVATE_NOW" && !row.marReady
  );
  if (orderableNotMar.length > 0) blockers.push("PROVIDER_ORDERABLE_NOT_MAR_READY_REGRESSION");

  const activatedControlled = activated.filter((code) => isControlledCatalogCode(code));
  if (activatedControlled.length > 0) blockers.push("CONTROLLED_SUBSTANCE_ACTIVATED");

  const activatedHighAlert = candidates.filter(
    (row) => activated.includes(row.catalogCode) && row.highAlert
  );
  if (activatedHighAlert.length > 0) blockers.push("HIGH_ALERT_ACTIVATED_WITHOUT_GOVERNANCE");

  const finalDecision =
    blockers.length === 0 && activated.length > 0
      ? "ENTERPRISE_FORMULARY_WAVE_1_ACTIVATION_READY"
      : activated.length > 0
        ? "READY_WITH_BLOCKERS"
        : "NOT_READY";

  return {
    ticket: "MEDUI.MEDS.ENTERPRISE_FORMULARY_EXPANSION_WAVE_1_ACTIVATION.1",
    previousProviderOrderableCount: previous,
    newActivationsCount: activated.length,
    totalProviderOrderableCount: previous + activated.length,
    deferredControlledSubstanceCount: candidates.filter((r) => r.activationDecision === "DEFER_CONTROLLED_SUBSTANCE").length,
    deferredHighAlertCount: candidates.filter((r) => r.activationDecision === "DEFER_HIGH_ALERT_GOVERNANCE").length,
    deferredIvpbMetadataCount: candidates.filter((r) => r.activationDecision === "NEEDS_IVPB_METADATA").length,
    deferredGovernanceFirstCount: WAVE_1_GOVERNANCE_DEFER_CATALOG_CODES.length,
    activatedCatalogCodes: activated,
    candidateRows: candidates,
    finalDecision,
    blockers,
  };
}
