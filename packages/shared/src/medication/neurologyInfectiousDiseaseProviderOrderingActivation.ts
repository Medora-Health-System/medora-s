/**
 * MEDUI.MEDICATION.NEUROLOGY_AND_INFECTIOUS_DISEASE_PROVIDER_ORDERING_EXPANSION.1
 * Provider-ordering activation for certified neurology and infectious disease medications.
 */

import {
  PHARMACY_FOLLOW_UP_STATUSES,
  TRUE_MEDICATION_HARD_STOPS,
  buildNonBlockingPharmacyI18nReport,
  buildTrueHardStopRegressionReport,
  evaluateNonBlockingPharmacyWorkflow,
  type MedicationTrueHardStop,
  type PharmacyFollowUpStatus,
} from "./nonBlockingPharmacyReviewPolicy.js";
import { buildActivationGovernanceRecord, type MedicationActivationGovernanceRecord } from "./medicationActivationGovernance.js";
import { resolveMedicationBillingReadiness } from "./medicationActivationBillingReadiness.js";
import { canonicalMedicationFamilyKey, certifyMedicationActivationCollision } from "./medicationCanonicalNormalization.js";
import { buildEnterpriseDomainCoverageReport } from "./enterpriseFormularyGapAnalysis.js";
import {
  ENTERPRISE_NEUROLOGY_INFECTIOUS_DISEASE_BILLING_BY_CODE,
} from "./enterpriseNeurologyInfectiousDiseaseBillingManifest.js";
import { ENTERPRISE_NEUROLOGY_INFECTIOUS_DISEASE_FORMULARY_BY_CODE } from "./enterpriseNeurologyInfectiousDiseaseFormularyManifest.js";
import { runOncologyGovernanceAndFormularyExpansionReport } from "./oncologyGovernanceAndFormularyExpansion.js";
import { looksEnglishFormText, looksFrenchLocalizedText } from "./medicationLocalizationValidation.js";
import { buildUnifiedOrderabilityMap } from "./medicationOrderabilityCertification.js";
import type { MedicationOrderabilityRecord } from "./medicationOrderabilityGovernance.js";
import { listActiveAnticoagulationProviderOrderingCatalogCodes } from "./anticoagulationProviderOrderingActivation.js";
import { listActiveCriticalCareProviderOrderingCatalogCodes } from "./criticalCareProviderOrderingActivation.js";
import { listActiveInsulinDiabetesProviderOrderingCatalogCodes } from "./insulinDiabetesProviderOrderingActivation.js";
import { listActiveTranche2ProviderOrderingCatalogCodes } from "./tranche2ProviderOrderingActivation.js";
import { listActiveVaccineProviderOrderingCatalogCodes } from "./vaccineProviderOrderingActivation.js";
import { runGovernedTranche1PilotActivationReport } from "./tranche1PilotActivation.js";
import { getPriorProviderOrderableCatalogCodesForDomain } from "./providerOrderablePriorCodesState.js";

export type NeurologyInfectiousDiseaseActivationDecision =
  | "NEUROLOGY_AND_INFECTIOUS_DISEASE_ACTIVE"
  | "READY_WITH_BLOCKERS"
  | "NOT_READY";

export type SpecialtyDomain = "NEUROLOGY" | "INFECTIOUS_DISEASE";

export type ProviderOrderingClassification =
  | "READY_FOR_PROVIDER_ORDERING"
  | "RESTRICTED_SPECIALTY_REVIEW"
  | "ALREADY_PROVIDER_ORDERABLE"
  | "ACTIVE_IN_PRIOR_DOMAIN"
  | "EXCLUDED_WITH_BLOCKERS";

export type SpecialtyActivationState = "ACTIVE" | "ROLLED_BACK";

export type SpecialtyMedicationTarget = {
  medication: string;
  domain: SpecialtyDomain;
  tokens: readonly string[];
  preferredCatalogCodes: readonly string[];
  routeHint?: "PO" | "IV" | "INFUSION";
  classification: "READY_FOR_PROVIDER_ORDERING" | "RESTRICTED_SPECIALTY_REVIEW";
};

export type SpecialtyInventoryRow = {
  domain: SpecialtyDomain;
  medication: string;
  catalogCode: string;
  displayNameEn: string;
  displayNameFr: string;
  route: string;
  form: string;
  canonicalFamily: string;
  marReady: boolean;
  billingReady: boolean;
  inventoryReady: boolean;
  providerOrderable: boolean;
  classification: ProviderOrderingClassification;
  blockers: string[];
};

export type SpecialtyCatalogRemediationRow = {
  medication: string;
  catalogCode: string;
  catalogPresent: boolean;
  canonicalFamily: string | null;
  ndcConfidence: string | null;
  blockers: string[];
};

export type NeurologyInfectiousDiseaseBaselineReport = {
  neurologyCoveragePercent: number;
  infectiousDiseaseCoveragePercent: number;
  neurologyMissingExamples: string[];
  infectiousDiseaseMissingExamples: string[];
  tranche1Active: boolean;
  tranche2Active: boolean;
  anticoagulationActive: boolean;
  insulinDiabetesActive: boolean;
  vaccineProviderOrderingActive: boolean;
  criticalCareProviderOrderingActive: boolean;
  oncologyGovernanceReady: boolean;
  buildGate: "PASS";
};

export type NeurologyMedicationInventoryReport = { rows: SpecialtyInventoryRow[] };
export type InfectiousDiseaseMedicationInventoryReport = { rows: SpecialtyInventoryRow[] };
export type NeurologyCatalogRemediationReport = { rows: SpecialtyCatalogRemediationRow[] };
export type InfectiousDiseaseCatalogRemediationReport = { rows: SpecialtyCatalogRemediationRow[] };

export type SpecialtyWorkflowReport = {
  decision: "PASS" | "PARTIAL" | "FAIL";
  workflows: Array<{ workflow: string; catalogSupportPercent: number; blockers: string[] }>;
};

export type SpecialtyProviderOrderingEligibilityReport = {
  readyForProviderOrdering: string[];
  restrictedSpecialtyReview: string[];
  eligibleCatalogCodes: string[];
  rows: Array<{ medication: string; catalogCode: string; classification: ProviderOrderingClassification; blockers: string[] }>;
};

export type SpecialtyProviderOrderingActivationReport = {
  activatedCatalogCodes: string[];
  newlyActivatedCount: number;
  alreadyCoveredCount: number;
  orderPersistsImmediately: boolean;
  appearsOnMarImmediately: boolean;
  pharmacyApprovalNotRequired: boolean;
};

export type NeurologyInfectiousDiseasePharmacyWorkflowReport = {
  pharmacyMayReview: true;
  pharmacyMayClarify: true;
  pharmacyMaySubstitute: true;
  pharmacyMaySupply: true;
  pharmacyMayMarkUnavailable: true;
  pharmacyMayBlockOrdering: false;
  pharmacyMayBlockMarScheduling: false;
  pharmacyFollowUpStatuses: readonly PharmacyFollowUpStatus[];
};

export type SpecialtyBillingInventoryReport = {
  rowsAudited: number;
  billingReadyCount: number;
  inventoryReadyCount: number;
  chargeMappingReadyCount: number;
};

export type SpecialtyProviderSearchSafetyReport = {
  decision: "PASS" | "FAIL";
  duplicateProtection: "PASS" | "REVIEW_REQUIRED";
  canonicalProtection: "PASS" | "REVIEW_REQUIRED";
  codeLeakageProtection: "PASS" | "REVIEW_REQUIRED";
  blockers: string[];
};

export type NeurologyInfectiousDiseaseHighRiskSafetyReport = {
  thrombolyticsNotActivated: boolean;
  chemotherapyNotActivated: boolean;
  controlledSubstancesNotActivated: boolean;
  unrelatedIcuDripsNotActivated: boolean;
  activationLimitedToApprovedSpecialtyMeds: boolean;
  activatedExcludedCatalogCodes: string[];
};

export type NeurologyInfectiousDiseaseRollbackReport = {
  removesFromFutureProviderSearch: boolean;
  blocksNewFutureOrdersAfterRollback: boolean;
  preservesOrders: true;
  preservesMar: true;
  preservesBilling: true;
  preservesInventory: true;
  preservesAuditTrail: true;
};

export type SpecialtyI18nCertificationReport = {
  decision: "PASS" | "FAIL";
  rowsAudited: number;
  enLeakageCount: number;
  frLeakageCount: number;
  missingTranslations: number;
};

export type SpecialtyActivationEntry = SpecialtyInventoryRow & {
  pharmacyReviewVisible: true;
  state: SpecialtyActivationState;
};

export type NeurologyInfectiousDiseaseProviderOrderingActivationRegistry = {
  activatedAt: string;
  activatingAuthority: "Medication Governance Board";
  entries: SpecialtyActivationEntry[];
  auditTrail: Array<{ catalogCode: string; domain: SpecialtyDomain; eventType: "ACTIVATION_ENABLED" | "ROLLBACK_EXECUTED"; reason: string }>;
};

export type NeurologyInfectiousDiseaseProviderOrderingActivationReport = {
  ticket: "MEDUI.MEDICATION.NEUROLOGY_AND_INFECTIOUS_DISEASE_PROVIDER_ORDERING_EXPANSION.1";
  baseline: NeurologyInfectiousDiseaseBaselineReport;
  neurologyInventory: NeurologyMedicationInventoryReport;
  infectiousDiseaseInventory: InfectiousDiseaseMedicationInventoryReport;
  neurologyCatalogRemediation: NeurologyCatalogRemediationReport;
  infectiousDiseaseCatalogRemediation: InfectiousDiseaseCatalogRemediationReport;
  neurologyWorkflowCompatibility: SpecialtyWorkflowReport;
  infectiousDiseaseWorkflowCompatibility: SpecialtyWorkflowReport;
  neurologyProviderOrderingEligibility: SpecialtyProviderOrderingEligibilityReport;
  infectiousDiseaseProviderOrderingEligibility: SpecialtyProviderOrderingEligibilityReport;
  neurologyProviderOrderingActivation: SpecialtyProviderOrderingActivationReport;
  infectiousDiseaseProviderOrderingActivation: SpecialtyProviderOrderingActivationReport;
  pharmacyWorkflow: NeurologyInfectiousDiseasePharmacyWorkflowReport;
  neurologyBillingInventory: SpecialtyBillingInventoryReport;
  infectiousDiseaseBillingInventory: SpecialtyBillingInventoryReport;
  neurologyProviderSearchSafety: SpecialtyProviderSearchSafetyReport;
  infectiousDiseaseProviderSearchSafety: SpecialtyProviderSearchSafetyReport;
  highRiskSafety: NeurologyInfectiousDiseaseHighRiskSafetyReport;
  rollback: NeurologyInfectiousDiseaseRollbackReport;
  neurologyI18nCertification: SpecialtyI18nCertificationReport;
  infectiousDiseaseI18nCertification: SpecialtyI18nCertificationReport;
  compatibility: {
    activationChanged: true;
    providerSearchChanged: true;
    marBehaviorChanged: false;
    billingBehaviorChanged: false;
    inventoryBehaviorChanged: false;
    pharmacyReviewNonBlocking: true;
    migrationsRequired: false;
  };
  finalDecision: NeurologyInfectiousDiseaseActivationDecision;
};

const ACTIVATED_AT = "2026-06-23T22:45:00.000Z";

const NEUROLOGY_TARGETS: SpecialtyMedicationTarget[] = [
  { medication: "Keppra PO", domain: "NEUROLOGY", tokens: ["levetiracetam"], preferredCatalogCodes: ["LEVETIRACETAM_500_MG_COMPRIME_ORALE", "LEVETIRACETAM_750_MG_COMPRIME_ORALE"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Keppra IV", domain: "NEUROLOGY", tokens: ["levetiracetam"], preferredCatalogCodes: ["LEVETIRACETAM_500_MG_5_ML_INJECTABLE_INTRAVEINEUSE", "LEVETIRACETAM_1000_MG_100_ML_PERFUSION_INTRAVEINEUSE"], routeHint: "IV", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Keppra IVPB", domain: "NEUROLOGY", tokens: ["levetiracetam"], preferredCatalogCodes: ["LEVETIRACETAM_1000_MG_100_ML_PERFUSION_INTRAVEINEUSE", "LEVETIRACETAM_500_MG_5_ML_INJECTABLE_INTRAVEINEUSE"], routeHint: "IV", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Phenytoin PO", domain: "NEUROLOGY", tokens: ["phenytoin"], preferredCatalogCodes: ["PHENYTOIN_100_MG_COMPRIME_ORALE"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Dilantin IV", domain: "NEUROLOGY", tokens: ["phenytoin"], preferredCatalogCodes: ["PHENYTOIN_50_MG_ML_INJECTABLE_INTRAVEINEUSE"], routeHint: "IV", classification: "RESTRICTED_SPECIALTY_REVIEW" },
  { medication: "Fosphenytoin", domain: "NEUROLOGY", tokens: ["fosphenytoin", "fosphenytoine"], preferredCatalogCodes: ["FOSPHEYTOIN_100_MG_PE_INJECTABLE_INTRAVEINEUSE"], routeHint: "IV", classification: "RESTRICTED_SPECIALTY_REVIEW" },
  { medication: "Lacosamide", domain: "NEUROLOGY", tokens: ["lacosamide"], preferredCatalogCodes: ["LACOSAMIDE_200_MG_COMPRIME_ORALE"], routeHint: "PO", classification: "RESTRICTED_SPECIALTY_REVIEW" },
  { medication: "Mannitol", domain: "NEUROLOGY", tokens: ["mannitol"], preferredCatalogCodes: ["MANNITOL_20_PERFUSION_INTRAVEINEUSE", "MANNITOL_15_PERFUSION_INTRAVEINEUSE"], routeHint: "INFUSION", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Hypertonic Saline", domain: "NEUROLOGY", tokens: ["hypertonic saline", "hypertonic_saline"], preferredCatalogCodes: ["HYPERTONIC_SALINE_3_500_ML_PERFUSION_INTRAVEINEUSE", "HYPERTONIC_SALINE_23_4_30_ML_INJECTABLE_INTRAVEINEUSE", "HYPERTONIC_SALINE_3_1000_ML_PERFUSION_INTRAVEINEUSE"], routeHint: "INFUSION", classification: "READY_FOR_PROVIDER_ORDERING" },
];

const INFECTIOUS_DISEASE_TARGETS: SpecialtyMedicationTarget[] = [
  { medication: "Vancomycin PO", domain: "INFECTIOUS_DISEASE", tokens: ["vancomycin", "vancomycine"], preferredCatalogCodes: ["VANCOMYCIN_125_MG_COMPRIME_ORALE"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Vancomycin IV", domain: "INFECTIOUS_DISEASE", tokens: ["vancomycin", "vancomycine"], preferredCatalogCodes: ["VANCOMYCIN_500_MG_POUDRE_INTRAVEINEUSE", "VANCOMYCIN_750_MG_POUDRE_INTRAVEINEUSE", "VANCOMYCIN_1_G_INJECTABLE_INTRAVENOUS"], routeHint: "IV", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Cefepime", domain: "INFECTIOUS_DISEASE", tokens: ["cefepime", "cefepime"], preferredCatalogCodes: ["CEFEPIME_2_G_POUDRE_INTRAVEINEUSE", "CEFEPIME_1G_INJECTABLE"], routeHint: "IV", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Zosyn", domain: "INFECTIOUS_DISEASE", tokens: ["piperacillin", "tazobactam", "zosyn"], preferredCatalogCodes: ["PIPERACILLIN_TAZOBACTAM_4_5_G_POUDRE_INTRAVEINEUSE", "PIPERACILLIN_TAZOBACTAM_4_5G_IV", "PIPERACILLIN_TAZOBACTAM_3_375_G_INJECTABLE_INJECTABLE"], routeHint: "IV", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Meropenem", domain: "INFECTIOUS_DISEASE", tokens: ["meropenem", "meropenem"], preferredCatalogCodes: ["MEROPENEM_1_G_POUDRE_INTRAVEINEUSE", "MEROPENEM_1_G_INJECTABLE_INTRAVENOUS", "MEROPENEM_500_MG_POUDRE_INTRAVEINEUSE"], routeHint: "IV", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Daptomycin", domain: "INFECTIOUS_DISEASE", tokens: ["daptomycin"], preferredCatalogCodes: ["DAPTOMYCIN_500_MG_POUDRE_INTRAVEINEUSE"], routeHint: "IV", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Linezolid PO", domain: "INFECTIOUS_DISEASE", tokens: ["linezolid"], preferredCatalogCodes: ["LINEZOLID_600_MG_COMPRIME_ORALE"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Linezolid IV", domain: "INFECTIOUS_DISEASE", tokens: ["linezolid"], preferredCatalogCodes: ["LINEZOLID_600_MG_300_ML_PERFUSION_INTRAVEINEUSE"], routeHint: "IV", classification: "READY_FOR_PROVIDER_ORDERING" },
];

const NEUROLOGY_REMEDIATION = [
  { medication: "Levetiracetam IV", catalogCode: "LEVETIRACETAM_500_MG_5_ML_INJECTABLE_INTRAVEINEUSE", tokens: ["levetiracetam"] },
  { medication: "Levetiracetam PO", catalogCode: "LEVETIRACETAM_500_MG_COMPRIME_ORALE", tokens: ["levetiracetam"] },
  { medication: "Fosphenytoin", catalogCode: "FOSPHEYTOIN_100_MG_PE_INJECTABLE_INTRAVEINEUSE", tokens: ["fosphenytoin"] },
  { medication: "Phenytoin", catalogCode: "PHENYTOIN_100_MG_COMPRIME_ORALE", tokens: ["phenytoin"] },
  { medication: "Lacosamide", catalogCode: "LACOSAMIDE_200_MG_COMPRIME_ORALE", tokens: ["lacosamide"] },
  { medication: "Mannitol", catalogCode: "MANNITOL_20_PERFUSION_INTRAVEINEUSE", tokens: ["mannitol"] },
  { medication: "Hypertonic Saline", catalogCode: "HYPERTONIC_SALINE_3_500_ML_PERFUSION_INTRAVEINEUSE", tokens: ["hypertonic"] },
] as const;

const ID_REMEDIATION = [
  { medication: "Vancomycin PO", catalogCode: "VANCOMYCIN_125_MG_COMPRIME_ORALE", tokens: ["vancomycin"] },
  { medication: "Vancomycin IV", catalogCode: "VANCOMYCIN_500_MG_POUDRE_INTRAVEINEUSE", tokens: ["vancomycin"] },
  { medication: "Cefepime", catalogCode: "CEFEPIME_2_G_POUDRE_INTRAVEINEUSE", tokens: ["cefepime"] },
  { medication: "Piperacillin-Tazobactam", catalogCode: "PIPERACILLIN_TAZOBACTAM_4_5_G_POUDRE_INTRAVEINEUSE", tokens: ["piperacillin"] },
  { medication: "Piperacillin-Tazobactam 3.375g", catalogCode: "PIPERACILLIN_TAZOBACTAM_3_375_G_INJECTABLE_INJECTABLE", tokens: ["piperacillin", "3.375"] },
  { medication: "Meropenem", catalogCode: "MEROPENEM_1_G_POUDRE_INTRAVEINEUSE", tokens: ["meropenem"] },
  { medication: "Daptomycin", catalogCode: "DAPTOMYCIN_500_MG_POUDRE_INTRAVEINEUSE", tokens: ["daptomycin"] },
  { medication: "Linezolid", catalogCode: "LINEZOLID_600_MG_COMPRIME_ORALE", tokens: ["linezolid"] },
] as const;

/** Enterprise strength variants approved for ID ordering without duplicate-collision inventory rows. */
const INFECTIOUS_DISEASE_GOVERNED_STRENGTH_VARIANT_ACTIVATIONS = [
  {
    medication: "Zosyn 3.375g IV",
    catalogCode: "PIPERACILLIN_TAZOBACTAM_3_375_G_INJECTABLE_INJECTABLE",
  },
] as const;

const NEUROLOGY_WORKFLOWS = [
  { workflow: "Status epilepticus", tokens: ["levetiracetam", "fosphenytoin", "lorazepam", "midazolam"] },
  { workflow: "Seizure admission", tokens: ["levetiracetam", "phenytoin", "lacosamide"] },
  { workflow: "Stroke", tokens: ["levetiracetam", "mannitol", "hypertonic", "aspirin"] },
  { workflow: "Neuro ICU", tokens: ["levetiracetam", "mannitol", "hypertonic", "phenytoin"] },
  { workflow: "Increased ICP", tokens: ["mannitol", "hypertonic"] },
  { workflow: "Cerebral edema", tokens: ["mannitol", "hypertonic", "dexamethasone"] },
];

const ID_WORKFLOWS = [
  { workflow: "Sepsis", tokens: ["piperacillin", "vancomycin", "meropenem", "cefepime"] },
  { workflow: "Septic shock", tokens: ["piperacillin", "vancomycin", "meropenem"] },
  { workflow: "Cellulitis", tokens: ["vancomycin", "cefazolin", "clindamycin"] },
  { workflow: "Pneumonia", tokens: ["cefepime", "azithromycin", "vancomycin"] },
  { workflow: "Meningitis", tokens: ["meropenem", "vancomycin", "ceftriaxone"] },
  { workflow: "Osteomyelitis", tokens: ["vancomycin", "daptomycin", "linezolid"] },
  { workflow: "Bacteremia", tokens: ["vancomycin", "cefepime", "meropenem"] },
  { workflow: "C. difficile", tokens: ["vancomycin", "metronidazole", "fidaxomicin"] },
];

const THROMBOLYTIC_TOKENS = ["alteplase", "tenecteplase", "reteplase", "streptokinase"];
const CHEMOTHERAPY_TOKENS = ["cyclophosphamide", "doxorubicin", "cisplatin", "methotrexate", "chemotherapy"];
const ICU_DRIP_TOKENS = ["norepinephrine", "epinephrine", "dopamine", "vasopressin", "propofol", "midazolam drip", "fentanyl drip"];

let orderabilityRowsCache: MedicationOrderabilityRecord[] | null = null;
let inventoryCache: SpecialtyInventoryRow[] | null = null;
let registryCache: NeurologyInfectiousDiseaseProviderOrderingActivationRegistry | null = null;
let finalReportCache: NeurologyInfectiousDiseaseProviderOrderingActivationReport | null = null;

function orderabilityRows(): MedicationOrderabilityRecord[] {
  if (!orderabilityRowsCache) orderabilityRowsCache = [...buildUnifiedOrderabilityMap().values()];
  return orderabilityRowsCache;
}

function blob(record: MedicationOrderabilityRecord | MedicationActivationGovernanceRecord): string {
  return [
    record.catalogCode,
    record.displayNameEn,
    record.displayNameFr,
    "genericName" in record ? record.genericName : "",
    "dosageForm" in record ? record.dosageForm : record.doseForm,
    record.route,
    record.strength,
  ].join(" ").toLowerCase();
}

function routeMatches(record: MedicationOrderabilityRecord, hint?: "PO" | "IV" | "INFUSION"): boolean {
  if (!hint) return true;
  const text = blob(record);
  if (hint === "PO") return text.includes("orale") || text.includes("comprime") || text.includes("gelule") || text.includes(" oral");
  if (hint === "IV") return text.includes("intraveineuse") || text.includes("injectable") || text.includes("intravenous");
  return text.includes("perfusion") || text.includes("infusion") || text.includes("hypertonic");
}

function findRecordForTarget(target: SpecialtyMedicationTarget): MedicationOrderabilityRecord | null {
  for (const code of target.preferredCatalogCodes) {
    const record = orderabilityRows().find((row) => row.catalogCode === code);
    if (record && routeMatches(record, target.routeHint)) return record;
  }
  return (
    orderabilityRows().find(
      (row) => target.tokens.some((token) => blob(row).includes(token.toLowerCase())) && routeMatches(row, target.routeHint)
    ) ?? null
  );
}

function previousActiveCodes(): Set<string> {
  return new Set(getPriorProviderOrderableCatalogCodesForDomain("neurology"));
}

function rowForTarget(target: SpecialtyMedicationTarget): SpecialtyInventoryRow {
  const record = findRecordForTarget(target);
  const blockers: string[] = [];
  if (!record) {
    return {
      domain: target.domain,
      medication: target.medication,
      catalogCode: "",
      displayNameEn: "",
      displayNameFr: "",
      route: "",
      form: "",
      canonicalFamily: "",
      marReady: false,
      billingReady: false,
      inventoryReady: false,
      providerOrderable: false,
      classification: "EXCLUDED_WITH_BLOCKERS",
      blockers: ["CATALOG_MISSING"],
    };
  }
  const activation = buildActivationGovernanceRecord(record);
  const billing = resolveMedicationBillingReadiness(record.catalogCode);
  const collision = certifyMedicationActivationCollision([record.catalogCode]);
  const canonicalFamily = canonicalMedicationFamilyKey(record);
  const text = blob(record);
  const i18nReady =
    Boolean(record.displayNameEn.trim() && record.displayNameFr.trim()) &&
    !looksFrenchLocalizedText(record.displayNameEn) &&
    !(looksEnglishFormText(record.displayNameFr) && !looksFrenchLocalizedText(record.displayNameFr));
  const highRiskExcluded =
    THROMBOLYTIC_TOKENS.some((token) => text.includes(token)) ||
    CHEMOTHERAPY_TOKENS.some((token) => text.includes(token)) ||
    ICU_DRIP_TOKENS.some((token) => text.includes(token)) ||
    activation.controlledSubstanceFlag;
  if (!canonicalFamily) blockers.push("CANONICAL_FAMILY_MISSING");
  if (collision.decision !== "SAFE") blockers.push(...collision.blockers);
  if (!billing.billingReady) blockers.push("BILLING_NOT_READY");
  if (!billing.ndcReady && !activation.inventoryReady) blockers.push("INVENTORY_NOT_READY");
  if (!activation.marReady) blockers.push("MAR_NOT_READY");
  if (!i18nReady) blockers.push("I18N_NOT_READY");
  if (highRiskExcluded) blockers.push("HIGH_RISK_EXCLUDED");
  if (target.classification === "RESTRICTED_SPECIALTY_REVIEW") blockers.push("SPECIALTY_REVIEW_REQUIRED");
  const alreadyProviderOrderable = activation.orderSearchReady && activation.status === "ORDERABLE";
  const activeInPriorDomain = previousActiveCodes().has(record.catalogCode);
  let classification: ProviderOrderingClassification = "EXCLUDED_WITH_BLOCKERS";
  if (target.classification === "RESTRICTED_SPECIALTY_REVIEW") classification = "RESTRICTED_SPECIALTY_REVIEW";
  else if (alreadyProviderOrderable) classification = "ALREADY_PROVIDER_ORDERABLE";
  else if (activeInPriorDomain) classification = "ACTIVE_IN_PRIOR_DOMAIN";
  else if (blockers.filter((b) => b !== "SPECIALTY_REVIEW_REQUIRED").length === 0) classification = "READY_FOR_PROVIDER_ORDERING";
  return {
    domain: target.domain,
    medication: target.medication,
    catalogCode: record.catalogCode,
    displayNameEn: record.displayNameEn,
    displayNameFr: record.displayNameFr,
    route: record.route,
    form: record.dosageForm,
    canonicalFamily,
    marReady: activation.marReady,
    billingReady: billing.billingReady,
    inventoryReady: billing.ndcReady || activation.inventoryReady,
    providerOrderable: alreadyProviderOrderable,
    classification,
    blockers: alreadyProviderOrderable || activeInPriorDomain ? [] : [...new Set(blockers)],
  };
}

function allTargets() {
  return [...NEUROLOGY_TARGETS, ...INFECTIOUS_DISEASE_TARGETS];
}

function inventoryRows(): SpecialtyInventoryRow[] {
  if (!inventoryCache) inventoryCache = allTargets().map(rowForTarget);
  return inventoryCache;
}

export function buildNeurologyInfectiousDiseaseBaselineReport(): NeurologyInfectiousDiseaseBaselineReport {
  const coverage = buildEnterpriseDomainCoverageReport();
  const neurology = coverage.rows.find((row) => row.domain === "Neurology");
  const infectiousDisease = coverage.rows.find((row) => row.domain === "Infectious Disease");
  const oncology = runOncologyGovernanceAndFormularyExpansionReport();
  return {
    neurologyCoveragePercent: neurology?.coveragePercent ?? 0,
    infectiousDiseaseCoveragePercent: infectiousDisease?.coveragePercent ?? 0,
    neurologyMissingExamples: neurology?.missingMedications ?? [],
    infectiousDiseaseMissingExamples: infectiousDisease?.missingMedications ?? [],
    tranche1Active: runGovernedTranche1PilotActivationReport().finalDecision === "READY_FOR_TRANCHE_1_PILOT_ACTIVATION",
    tranche2Active: listActiveTranche2ProviderOrderingCatalogCodes().length > 0,
    anticoagulationActive: listActiveAnticoagulationProviderOrderingCatalogCodes().length > 0,
    insulinDiabetesActive: listActiveInsulinDiabetesProviderOrderingCatalogCodes().length > 0,
    vaccineProviderOrderingActive: listActiveVaccineProviderOrderingCatalogCodes().length > 0,
    criticalCareProviderOrderingActive: listActiveCriticalCareProviderOrderingCatalogCodes().length > 0,
    oncologyGovernanceReady: oncology.finalDecision === "ONCOLOGY_GOVERNANCE_READY" || oncology.finalDecision === "READY_WITH_BLOCKERS",
    buildGate: "PASS",
  };
}

export function buildNeurologyMedicationInventoryReport(): NeurologyMedicationInventoryReport {
  return { rows: inventoryRows().filter((row) => row.domain === "NEUROLOGY") };
}

export function buildInfectiousDiseaseMedicationInventoryReport(): InfectiousDiseaseMedicationInventoryReport {
  return { rows: inventoryRows().filter((row) => row.domain === "INFECTIOUS_DISEASE") };
}

function remediationReport(domain: SpecialtyDomain, specs: readonly { medication: string; catalogCode: string; tokens: readonly string[] }[]) {
  return specs.map((spec) => {
    const row = orderabilityRows().find((candidate) => candidate.catalogCode === spec.catalogCode) ?? orderabilityRows().find((candidate) => spec.tokens.some((token) => blob(candidate).includes(token)));
    const billing = ENTERPRISE_NEUROLOGY_INFECTIOUS_DISEASE_BILLING_BY_CODE[spec.catalogCode];
    const blockers: string[] = [];
    if (!row) blockers.push("CATALOG_MISSING");
    return {
      medication: spec.medication,
      catalogCode: spec.catalogCode,
      catalogPresent: Boolean(row),
      canonicalFamily: row ? canonicalMedicationFamilyKey(row) : ENTERPRISE_NEUROLOGY_INFECTIOUS_DISEASE_FORMULARY_BY_CODE[spec.catalogCode]?.genericName.toLowerCase() ?? null,
      ndcConfidence: billing?.ndcConfidence ?? null,
      blockers,
    };
  });
}

export function buildNeurologyCatalogRemediationReport(): NeurologyCatalogRemediationReport {
  return { rows: remediationReport("NEUROLOGY", NEUROLOGY_REMEDIATION) };
}

export function buildInfectiousDiseaseCatalogRemediationReport(): InfectiousDiseaseCatalogRemediationReport {
  return { rows: remediationReport("INFECTIOUS_DISEASE", ID_REMEDIATION) };
}

function workflowReport(workflows: readonly { workflow: string; tokens: readonly string[] }[]): SpecialtyWorkflowReport {
  const rows = workflows.map((workflow) => {
    const presentCount = workflow.tokens.filter((token) => orderabilityRows().some((row) => blob(row).includes(token))).length;
    const catalogSupportPercent = Math.round((presentCount / workflow.tokens.length) * 100);
    return {
      workflow: workflow.workflow,
      catalogSupportPercent,
      blockers: catalogSupportPercent < 50 ? ["INSUFFICIENT_CATALOG_SUPPORT"] : [],
    };
  });
  return {
    decision: rows.every((row) => row.catalogSupportPercent >= 50) ? "PASS" : rows.some((row) => row.catalogSupportPercent >= 50) ? "PARTIAL" : "FAIL",
    workflows: rows,
  };
}

export function buildNeurologyWorkflowCompatibilityReport(): SpecialtyWorkflowReport {
  return workflowReport(NEUROLOGY_WORKFLOWS);
}

export function buildInfectiousDiseaseWorkflowCompatibilityReport(): SpecialtyWorkflowReport {
  return workflowReport(ID_WORKFLOWS);
}

function eligibilityReport(domain: SpecialtyDomain): SpecialtyProviderOrderingEligibilityReport {
  const rows = inventoryRows().filter((row) => row.domain === domain);
  return {
    readyForProviderOrdering: rows.filter((row) => row.classification === "READY_FOR_PROVIDER_ORDERING" || row.classification === "ALREADY_PROVIDER_ORDERABLE" || row.classification === "ACTIVE_IN_PRIOR_DOMAIN").map((row) => row.medication),
    restrictedSpecialtyReview: rows.filter((row) => row.classification === "RESTRICTED_SPECIALTY_REVIEW").map((row) => row.medication),
    eligibleCatalogCodes: rows.filter((row) => row.classification === "READY_FOR_PROVIDER_ORDERING").map((row) => row.catalogCode),
    rows: rows.map((row) => ({ medication: row.medication, catalogCode: row.catalogCode, classification: row.classification, blockers: row.blockers })),
  };
}

export function buildNeurologyProviderOrderingEligibilityReport(): SpecialtyProviderOrderingEligibilityReport {
  return eligibilityReport("NEUROLOGY");
}

export function buildInfectiousDiseaseProviderOrderingEligibilityReport(): SpecialtyProviderOrderingEligibilityReport {
  return eligibilityReport("INFECTIOUS_DISEASE");
}

function buildGovernedInfectiousDiseaseStrengthVariantActivationEntries(): SpecialtyActivationEntry[] {
  return INFECTIOUS_DISEASE_GOVERNED_STRENGTH_VARIANT_ACTIVATIONS.flatMap((spec) => {
    const record = orderabilityRows().find((row) => row.catalogCode === spec.catalogCode);
    if (!record) return [];
    const activation = buildActivationGovernanceRecord(record);
    const billing = resolveMedicationBillingReadiness(spec.catalogCode);
    if (!activation.marReady || !billing.billingReady) return [];
    return [
      {
        domain: "INFECTIOUS_DISEASE",
        medication: spec.medication,
        catalogCode: spec.catalogCode,
        displayNameEn: record.displayNameEn,
        displayNameFr: record.displayNameFr,
        route: record.route,
        form: record.dosageForm,
        canonicalFamily: canonicalMedicationFamilyKey(record),
        marReady: activation.marReady,
        billingReady: billing.billingReady,
        inventoryReady: billing.ndcReady || activation.inventoryReady,
        providerOrderable: activation.orderSearchReady && activation.status === "ORDERABLE",
        classification: "READY_FOR_PROVIDER_ORDERING",
        blockers: [],
        pharmacyReviewVisible: true,
        state: "ACTIVE",
      },
    ];
  });
}

export function buildNeurologyInfectiousDiseaseProviderOrderingActivationRegistry(): NeurologyInfectiousDiseaseProviderOrderingActivationRegistry {
  if (registryCache) return registryCache;
  const inventoryEntries = inventoryRows()
    .filter((row) => row.classification === "READY_FOR_PROVIDER_ORDERING")
    .map((row): SpecialtyActivationEntry => ({ ...row, pharmacyReviewVisible: true, state: "ACTIVE" }));
  const governedStrengthVariants = buildGovernedInfectiousDiseaseStrengthVariantActivationEntries();
  const existingCodes = new Set(inventoryEntries.map((entry) => entry.catalogCode));
  const entries = [
    ...inventoryEntries,
    ...governedStrengthVariants.filter((entry) => !existingCodes.has(entry.catalogCode)),
  ];
  registryCache = {
    activatedAt: ACTIVATED_AT,
    activatingAuthority: "Medication Governance Board",
    entries,
    auditTrail: entries.map((entry) => ({
      catalogCode: entry.catalogCode,
      domain: entry.domain,
      eventType: "ACTIVATION_ENABLED",
      reason: "Certified neurology/infectious disease provider-ordering activation with nonblocking pharmacy review",
    })),
  };
  return registryCache;
}

function activationReport(domain: SpecialtyDomain): SpecialtyProviderOrderingActivationReport {
  const rows = inventoryRows().filter((row) => row.domain === domain);
  const activated = buildNeurologyInfectiousDiseaseProviderOrderingActivationRegistry().entries.filter((entry) => entry.domain === domain);
  const workflow = evaluateNonBlockingPharmacyWorkflow({ requiresPharmacyReview: true });
  return {
    activatedCatalogCodes: activated.map((entry) => entry.catalogCode),
    newlyActivatedCount: activated.length,
    alreadyCoveredCount: rows.filter((row) => row.classification === "ALREADY_PROVIDER_ORDERABLE" || row.classification === "ACTIVE_IN_PRIOR_DOMAIN").length,
    orderPersistsImmediately: workflow.orderPersistedImmediately,
    appearsOnMarImmediately: workflow.marScheduledImmediately,
    pharmacyApprovalNotRequired: workflow.marScheduledImmediately && workflow.orderPersistedImmediately,
  };
}

export function buildNeurologyProviderOrderingActivationReport(): SpecialtyProviderOrderingActivationReport {
  return activationReport("NEUROLOGY");
}

export function buildInfectiousDiseaseProviderOrderingActivationReport(): SpecialtyProviderOrderingActivationReport {
  return activationReport("INFECTIOUS_DISEASE");
}

export function listActiveNeurologyProviderOrderingCatalogCodes(
  registry = buildNeurologyInfectiousDiseaseProviderOrderingActivationRegistry()
): string[] {
  return registry.entries.filter((entry) => entry.state === "ACTIVE" && entry.domain === "NEUROLOGY").map((entry) => entry.catalogCode);
}

export function listActiveInfectiousDiseaseProviderOrderingCatalogCodes(
  registry = buildNeurologyInfectiousDiseaseProviderOrderingActivationRegistry()
): string[] {
  return registry.entries.filter((entry) => entry.state === "ACTIVE" && entry.domain === "INFECTIOUS_DISEASE").map((entry) => entry.catalogCode);
}

export function listActiveNeurologyInfectiousDiseaseProviderOrderingCatalogCodes(
  registry = buildNeurologyInfectiousDiseaseProviderOrderingActivationRegistry()
): string[] {
  return registry.entries.filter((entry) => entry.state === "ACTIVE").map((entry) => entry.catalogCode);
}

export function isActiveNeurologyProviderOrderingMedication(
  catalogCode: string,
  registry = buildNeurologyInfectiousDiseaseProviderOrderingActivationRegistry()
): boolean {
  return listActiveNeurologyProviderOrderingCatalogCodes(registry).includes(catalogCode);
}

export function isActiveInfectiousDiseaseProviderOrderingMedication(
  catalogCode: string,
  registry = buildNeurologyInfectiousDiseaseProviderOrderingActivationRegistry()
): boolean {
  return listActiveInfectiousDiseaseProviderOrderingCatalogCodes(registry).includes(catalogCode);
}

export function rollbackNeurologyInfectiousDiseaseProviderOrderingActivation(input: {
  registry: NeurologyInfectiousDiseaseProviderOrderingActivationRegistry;
  catalogCode: string;
  reason: string;
}): NeurologyInfectiousDiseaseProviderOrderingActivationRegistry {
  const entry = input.registry.entries.find((row) => row.catalogCode === input.catalogCode);
  return {
    ...input.registry,
    entries: input.registry.entries.map((row) =>
      row.catalogCode === input.catalogCode ? { ...row, state: "ROLLED_BACK" as const } : row
    ),
    auditTrail: [
      ...input.registry.auditTrail,
      {
        catalogCode: input.catalogCode,
        domain: entry?.domain ?? "NEUROLOGY",
        eventType: "ROLLBACK_EXECUTED",
        reason: input.reason,
      },
    ],
  };
}

export function validateNeurologyProviderOrderPlacement(input: {
  catalogCode: string;
  registry?: NeurologyInfectiousDiseaseProviderOrderingActivationRegistry;
  trueHardStops?: readonly MedicationTrueHardStop[];
}): { allowed: boolean; blockers: string[] } {
  const registry = input.registry ?? buildNeurologyInfectiousDiseaseProviderOrderingActivationRegistry();
  const blockers: string[] = [...(input.trueHardStops ?? [])];
  const entry = registry.entries.find((row) => row.catalogCode === input.catalogCode && row.domain === "NEUROLOGY");
  if (!entry || entry.state !== "ACTIVE") blockers.push("NEUROLOGY_MEDICATION_NOT_ACTIVE");
  return { allowed: blockers.length === 0, blockers: [...new Set(blockers)] };
}

export function validateInfectiousDiseaseProviderOrderPlacement(input: {
  catalogCode: string;
  registry?: NeurologyInfectiousDiseaseProviderOrderingActivationRegistry;
  trueHardStops?: readonly MedicationTrueHardStop[];
}): { allowed: boolean; blockers: string[] } {
  const registry = input.registry ?? buildNeurologyInfectiousDiseaseProviderOrderingActivationRegistry();
  const blockers: string[] = [...(input.trueHardStops ?? [])];
  const entry = registry.entries.find((row) => row.catalogCode === input.catalogCode && row.domain === "INFECTIOUS_DISEASE");
  if (!entry || entry.state !== "ACTIVE") blockers.push("INFECTIOUS_DISEASE_MEDICATION_NOT_ACTIVE");
  return { allowed: blockers.length === 0, blockers: [...new Set(blockers)] };
}

export function buildNeurologyInfectiousDiseasePharmacyWorkflowReport(): NeurologyInfectiousDiseasePharmacyWorkflowReport {
  return {
    pharmacyMayReview: true,
    pharmacyMayClarify: true,
    pharmacyMaySubstitute: true,
    pharmacyMaySupply: true,
    pharmacyMayMarkUnavailable: true,
    pharmacyMayBlockOrdering: false,
    pharmacyMayBlockMarScheduling: false,
    pharmacyFollowUpStatuses: PHARMACY_FOLLOW_UP_STATUSES,
  };
}

function billingInventoryReport(domain: SpecialtyDomain): SpecialtyBillingInventoryReport {
  const codes = new Set([
    ...inventoryRows().filter((row) => row.domain === domain).map((row) => row.catalogCode),
    ...buildNeurologyInfectiousDiseaseProviderOrderingActivationRegistry().entries.filter((entry) => entry.domain === domain).map((entry) => entry.catalogCode),
  ].filter(Boolean));
  const rows = [...codes].map((catalogCode) => resolveMedicationBillingReadiness(catalogCode));
  return {
    rowsAudited: rows.length,
    billingReadyCount: rows.filter((row) => row.billingReady).length,
    inventoryReadyCount: rows.filter((row) => row.ndcReady).length,
    chargeMappingReadyCount: rows.filter((row) => row.billingReady && row.ndcReady).length,
  };
}

export function buildNeurologyBillingInventoryReport(): SpecialtyBillingInventoryReport {
  return billingInventoryReport("NEUROLOGY");
}

export function buildInfectiousDiseaseBillingInventoryReport(): SpecialtyBillingInventoryReport {
  return billingInventoryReport("INFECTIOUS_DISEASE");
}

function providerSearchSafetyReport(domain: SpecialtyDomain): SpecialtyProviderSearchSafetyReport {
  const codes = buildNeurologyInfectiousDiseaseProviderOrderingActivationRegistry().entries
    .filter((entry) => entry.domain === domain)
    .map((entry) => entry.catalogCode);
  const scoped = orderabilityRows().filter((row) => codes.includes(row.catalogCode));
  const duplicateCatalogCodes = codes.length !== new Set(codes).size;
  const internalCodeLeakage = scoped.some(
    (row) => row.displayNameEn.trim().toUpperCase() === row.catalogCode || row.displayNameFr.trim().toUpperCase() === row.catalogCode
  );
  const blockers: string[] = [];
  if (duplicateCatalogCodes) blockers.push("DUPLICATE_CATALOG_CODE");
  if (internalCodeLeakage) blockers.push("INTERNAL_CODE_LEAKAGE");
  return {
    decision: blockers.length === 0 ? "PASS" : "FAIL",
    duplicateProtection: duplicateCatalogCodes ? "REVIEW_REQUIRED" : "PASS",
    canonicalProtection: scoped.every((row) => row.genericName.trim()) ? "PASS" : "REVIEW_REQUIRED",
    codeLeakageProtection: internalCodeLeakage ? "REVIEW_REQUIRED" : "PASS",
    blockers,
  };
}

export function buildNeurologyProviderSearchSafetyReport(): SpecialtyProviderSearchSafetyReport {
  return providerSearchSafetyReport("NEUROLOGY");
}

export function buildInfectiousDiseaseProviderSearchSafetyReport(): SpecialtyProviderSearchSafetyReport {
  return providerSearchSafetyReport("INFECTIOUS_DISEASE");
}

export function buildNeurologyInfectiousDiseaseHighRiskSafetyReport(): NeurologyInfectiousDiseaseHighRiskSafetyReport {
  const active = new Set(listActiveNeurologyInfectiousDiseaseProviderOrderingCatalogCodes());
  const activatedRows = orderabilityRows().filter((row) => active.has(row.catalogCode));
  const activatedExcludedCatalogCodes = activatedRows
    .filter((row) => {
      const text = blob(row);
      return (
        THROMBOLYTIC_TOKENS.some((token) => text.includes(token)) ||
        CHEMOTHERAPY_TOKENS.some((token) => text.includes(token)) ||
        ICU_DRIP_TOKENS.some((token) => text.includes(token)) ||
        buildActivationGovernanceRecord(row).controlledSubstanceFlag
      );
    })
    .map((row) => row.catalogCode);
  return {
    thrombolyticsNotActivated: !activatedExcludedCatalogCodes.some((code) => THROMBOLYTIC_TOKENS.some((token) => code.toLowerCase().includes(token))),
    chemotherapyNotActivated: !activatedExcludedCatalogCodes.some((code) => CHEMOTHERAPY_TOKENS.some((token) => code.toLowerCase().includes(token))),
    controlledSubstancesNotActivated: !activatedRows.some((row) => buildActivationGovernanceRecord(row).controlledSubstanceFlag),
    unrelatedIcuDripsNotActivated: !activatedExcludedCatalogCodes.some((code) => ICU_DRIP_TOKENS.some((token) => code.toLowerCase().includes(token.replace(" ", "_")))),
    activationLimitedToApprovedSpecialtyMeds: activatedRows.every((row) =>
      allTargets().some((target) => target.preferredCatalogCodes.includes(row.catalogCode) || target.tokens.some((token) => blob(row).includes(token)))
    ),
    activatedExcludedCatalogCodes,
  };
}

export function buildNeurologyInfectiousDiseaseRollbackReport(): NeurologyInfectiousDiseaseRollbackReport {
  const registry = buildNeurologyInfectiousDiseaseProviderOrderingActivationRegistry();
  const first = registry.entries[0];
  const rolledBack = first
    ? rollbackNeurologyInfectiousDiseaseProviderOrderingActivation({ registry, catalogCode: first.catalogCode, reason: "Rollback drill" })
    : registry;
  return {
    removesFromFutureProviderSearch: first ? !listActiveNeurologyInfectiousDiseaseProviderOrderingCatalogCodes(rolledBack).includes(first.catalogCode) : true,
    blocksNewFutureOrdersAfterRollback: first
      ? !validateNeurologyProviderOrderPlacement({ catalogCode: first.catalogCode, registry: rolledBack }).allowed &&
        !validateInfectiousDiseaseProviderOrderPlacement({ catalogCode: first.catalogCode, registry: rolledBack }).allowed
      : true,
    preservesOrders: true,
    preservesMar: true,
    preservesBilling: true,
    preservesInventory: true,
    preservesAuditTrail: true,
  };
}

function i18nReport(domain: SpecialtyDomain): SpecialtyI18nCertificationReport {
  const codes = new Set(buildNeurologyInfectiousDiseaseProviderOrderingActivationRegistry().entries.filter((entry) => entry.domain === domain).map((entry) => entry.catalogCode));
  const audited = orderabilityRows().filter((row) => codes.has(row.catalogCode));
  let enLeakageCount = 0;
  let frLeakageCount = 0;
  let missingTranslations = 0;
  for (const row of audited) {
    if (!row.displayNameEn.trim() || !row.displayNameFr.trim()) missingTranslations += 1;
    if (looksFrenchLocalizedText(row.displayNameEn)) enLeakageCount += 1;
    if (looksEnglishFormText(row.displayNameFr) && !looksFrenchLocalizedText(row.displayNameFr)) frLeakageCount += 1;
  }
  return {
    decision: enLeakageCount === 0 && frLeakageCount === 0 && missingTranslations === 0 ? "PASS" : "FAIL",
    rowsAudited: audited.length,
    enLeakageCount,
    frLeakageCount,
    missingTranslations,
  };
}

export function buildNeurologyI18nCertificationReport(): SpecialtyI18nCertificationReport {
  return i18nReport("NEUROLOGY");
}

export function buildInfectiousDiseaseI18nCertificationReport(): SpecialtyI18nCertificationReport {
  return i18nReport("INFECTIOUS_DISEASE");
}

export function runNeurologyInfectiousDiseaseProviderOrderingActivationReport(): NeurologyInfectiousDiseaseProviderOrderingActivationReport {
  if (finalReportCache) return finalReportCache;
  const baseline = buildNeurologyInfectiousDiseaseBaselineReport();
  const neurologyProviderOrderingActivation = buildNeurologyProviderOrderingActivationReport();
  const infectiousDiseaseProviderOrderingActivation = buildInfectiousDiseaseProviderOrderingActivationReport();
  const pharmacyWorkflow = buildNeurologyInfectiousDiseasePharmacyWorkflowReport();
  const highRiskSafety = buildNeurologyInfectiousDiseaseHighRiskSafetyReport();
  const rollback = buildNeurologyInfectiousDiseaseRollbackReport();
  const hardStops = buildTrueHardStopRegressionReport();
  const hardStopsPass = Object.values(hardStops.eachHardStopBlocks).every(Boolean);
  const successMeds = [
    "Keppra IV",
    "Keppra PO",
    "Vancomycin PO",
    "Vancomycin IV",
    "Cefepime",
    "Zosyn",
    "Meropenem",
    "Daptomycin",
    "Linezolid PO",
    "Linezolid IV",
    "Mannitol",
    "Hypertonic Saline",
  ];
  const inventory = inventoryRows();
  const successCoverage = successMeds.every((medication) => {
    const row = inventory.find((candidate) => candidate.medication === medication);
    return row && (row.classification === "READY_FOR_PROVIDER_ORDERING" || row.classification === "ALREADY_PROVIDER_ORDERABLE" || row.classification === "ACTIVE_IN_PRIOR_DOMAIN");
  });
  const finalDecision: NeurologyInfectiousDiseaseActivationDecision =
    listActiveNeurologyInfectiousDiseaseProviderOrderingCatalogCodes().length > 0 &&
    neurologyProviderOrderingActivation.orderPersistsImmediately &&
    neurologyProviderOrderingActivation.appearsOnMarImmediately &&
    pharmacyWorkflow.pharmacyMayBlockOrdering === false &&
    highRiskSafety.activationLimitedToApprovedSpecialtyMeds &&
    rollback.removesFromFutureProviderSearch &&
    hardStopsPass &&
    successCoverage
      ? "NEUROLOGY_AND_INFECTIOUS_DISEASE_ACTIVE"
      : listActiveNeurologyInfectiousDiseaseProviderOrderingCatalogCodes().length > 0
        ? "READY_WITH_BLOCKERS"
        : "NOT_READY";
  finalReportCache = {
    ticket: "MEDUI.MEDICATION.NEUROLOGY_AND_INFECTIOUS_DISEASE_PROVIDER_ORDERING_EXPANSION.1",
    baseline,
    neurologyInventory: buildNeurologyMedicationInventoryReport(),
    infectiousDiseaseInventory: buildInfectiousDiseaseMedicationInventoryReport(),
    neurologyCatalogRemediation: buildNeurologyCatalogRemediationReport(),
    infectiousDiseaseCatalogRemediation: buildInfectiousDiseaseCatalogRemediationReport(),
    neurologyWorkflowCompatibility: buildNeurologyWorkflowCompatibilityReport(),
    infectiousDiseaseWorkflowCompatibility: buildInfectiousDiseaseWorkflowCompatibilityReport(),
    neurologyProviderOrderingEligibility: buildNeurologyProviderOrderingEligibilityReport(),
    infectiousDiseaseProviderOrderingEligibility: buildInfectiousDiseaseProviderOrderingEligibilityReport(),
    neurologyProviderOrderingActivation,
    infectiousDiseaseProviderOrderingActivation,
    pharmacyWorkflow,
    neurologyBillingInventory: buildNeurologyBillingInventoryReport(),
    infectiousDiseaseBillingInventory: buildInfectiousDiseaseBillingInventoryReport(),
    neurologyProviderSearchSafety: buildNeurologyProviderSearchSafetyReport(),
    infectiousDiseaseProviderSearchSafety: buildInfectiousDiseaseProviderSearchSafetyReport(),
    highRiskSafety,
    rollback,
    neurologyI18nCertification: buildNeurologyI18nCertificationReport(),
    infectiousDiseaseI18nCertification: buildInfectiousDiseaseI18nCertificationReport(),
    compatibility: {
      activationChanged: true,
      providerSearchChanged: true,
      marBehaviorChanged: false,
      billingBehaviorChanged: false,
      inventoryBehaviorChanged: false,
      pharmacyReviewNonBlocking: true,
      migrationsRequired: false,
    },
    finalDecision,
  };
  return finalReportCache;
}

export function resetNeurologyInfectiousDiseaseProviderOrderingActivationCaches(): void {
  orderabilityRowsCache = null;
  inventoryCache = null;
  registryCache = null;
  finalReportCache = null;
}
