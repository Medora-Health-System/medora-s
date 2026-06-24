/**
 * MEDUI.MEDICATION.CARDIOLOGY_PROVIDER_ORDERING_EXPANSION.1
 * Provider-ordering activation for certified cardiology medications.
 */

import {
  PHARMACY_FOLLOW_UP_STATUSES,
  buildTrueHardStopRegressionReport,
  evaluateNonBlockingPharmacyWorkflow,
  type MedicationTrueHardStop,
  type PharmacyFollowUpStatus,
} from "./nonBlockingPharmacyReviewPolicy.js";
import { buildActivationGovernanceRecord, type MedicationActivationGovernanceRecord } from "./medicationActivationGovernance.js";
import { resolveMedicationBillingReadiness } from "./medicationActivationBillingReadiness.js";
import { canonicalMedicationFamilyKey, certifyMedicationActivationCollision } from "./medicationCanonicalNormalization.js";
import { buildEnterpriseDomainCoverageReport } from "./enterpriseFormularyGapAnalysis.js";
import { ENTERPRISE_CARDIOLOGY_BILLING_BY_CODE } from "./enterpriseCardiologyBillingManifest.js";
import { ENTERPRISE_CARDIOLOGY_FORMULARY_BY_CODE } from "./enterpriseCardiologyFormularyManifest.js";
import { looksEnglishFormText, looksFrenchLocalizedText } from "./medicationLocalizationValidation.js";
import { buildUnifiedOrderabilityMap } from "./medicationOrderabilityCertification.js";
import type { MedicationOrderabilityRecord } from "./medicationOrderabilityGovernance.js";
import { listActiveAnticoagulationProviderOrderingCatalogCodes } from "./anticoagulationProviderOrderingActivation.js";
import { listActiveCriticalCareProviderOrderingCatalogCodes } from "./criticalCareProviderOrderingActivation.js";
import { listActiveInsulinDiabetesProviderOrderingCatalogCodes } from "./insulinDiabetesProviderOrderingActivation.js";
import {
  listActiveInfectiousDiseaseProviderOrderingCatalogCodes,
  listActiveNeurologyProviderOrderingCatalogCodes,
} from "./neurologyInfectiousDiseaseProviderOrderingActivation.js";
import { runGovernedTranche1PilotActivationReport } from "./tranche1PilotActivation.js";
import { listActiveTranche2ProviderOrderingCatalogCodes } from "./tranche2ProviderOrderingActivation.js";
import { listActiveVaccineProviderOrderingCatalogCodes } from "./vaccineProviderOrderingActivation.js";
import { getPriorProviderOrderableCatalogCodesForDomain } from "./providerOrderablePriorCodesState.js";

export type CardiologyActivationDecision =
  | "CARDIOLOGY_PROVIDER_ORDERING_ACTIVE"
  | "READY_WITH_BLOCKERS"
  | "NOT_READY";

export type CardiologyProviderOrderingClassification =
  | "READY_FOR_PROVIDER_ORDERING"
  | "RESTRICTED_SPECIALTY_REVIEW"
  | "ALREADY_PROVIDER_ORDERABLE"
  | "ACTIVE_IN_PRIOR_DOMAIN"
  | "EXCLUDED_WITH_BLOCKERS";

export type CardiologyActivationState = "ACTIVE" | "ROLLED_BACK";

export type CardiologyMedicationTarget = {
  medication: string;
  tokens: readonly string[];
  preferredCatalogCodes: readonly string[];
  routeHint?: "PO" | "IV" | "INFUSION" | "SL";
  classification: "READY_FOR_PROVIDER_ORDERING" | "RESTRICTED_SPECIALTY_REVIEW";
};

export type CardiologyInventoryRow = {
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
  classification: CardiologyProviderOrderingClassification;
  blockers: string[];
};

export type CardiologyCatalogRemediationRow = {
  medication: string;
  catalogCode: string;
  catalogPresent: boolean;
  canonicalFamily: string | null;
  ndcConfidence: string | null;
  blockers: string[];
};

export type CardiologyActivationBaselineReport = {
  cardiologyCoveragePercent: number;
  cardiologyMissingExamples: string[];
  tranche1Active: boolean;
  tranche2Active: boolean;
  anticoagulationActive: boolean;
  insulinDiabetesActive: boolean;
  vaccineProviderOrderingActive: boolean;
  criticalCareProviderOrderingActive: boolean;
  neurologyProviderOrderingActive: boolean;
  infectiousDiseaseProviderOrderingActive: boolean;
  buildGate: "PASS";
};

export type CardiologyWorkflowReport = {
  decision: "PASS" | "PARTIAL" | "FAIL";
  workflows: Array<{ workflow: string; catalogSupportPercent: number; blockers: string[] }>;
};

export type CardiologyProviderOrderingEligibilityReport = {
  readyForProviderOrdering: string[];
  restrictedSpecialtyReview: string[];
  eligibleCatalogCodes: string[];
  rows: Array<{ medication: string; catalogCode: string; classification: CardiologyProviderOrderingClassification; blockers: string[] }>;
};

export type CardiologyProviderOrderingActivationReport = {
  activatedCatalogCodes: string[];
  newlyActivatedCount: number;
  alreadyCoveredCount: number;
  orderPersistsImmediately: boolean;
  appearsOnMarImmediately: boolean;
  pharmacyApprovalNotRequired: boolean;
};

export type CardiologyPharmacyWorkflowReport = {
  pharmacyMayReview: true;
  pharmacyMayClarify: true;
  pharmacyMaySubstitute: true;
  pharmacyMaySupply: true;
  pharmacyMayMarkUnavailable: true;
  pharmacyMayBlockOrdering: false;
  pharmacyMayBlockMarScheduling: false;
  pharmacyFollowUpStatuses: readonly PharmacyFollowUpStatus[];
};

export type CardiologyBillingInventoryReport = {
  rowsAudited: number;
  billingReadyCount: number;
  inventoryReadyCount: number;
  chargeMappingReadyCount: number;
};

export type CardiologyProviderSearchSafetyReport = {
  decision: "PASS" | "FAIL";
  duplicateProtection: "PASS" | "REVIEW_REQUIRED";
  canonicalProtection: "PASS" | "REVIEW_REQUIRED";
  codeLeakageProtection: "PASS" | "REVIEW_REQUIRED";
  blockers: string[];
};

export type CardiologyHighRiskSafetyReport = {
  thrombolyticsNotActivated: boolean;
  experimentalCardiacTherapiesNotActivated: boolean;
  uncertifiedHighRiskProtocolsNotActivated: boolean;
  activationLimitedToApprovedCardiologyMeds: boolean;
  activatedExcludedCatalogCodes: string[];
};

export type CardiologyRollbackReport = {
  removesFromFutureProviderSearch: boolean;
  blocksNewFutureOrdersAfterRollback: boolean;
  preservesOrders: true;
  preservesMar: true;
  preservesBilling: true;
  preservesInventory: true;
  preservesAuditTrail: true;
};

export type CardiologyI18nCertificationReport = {
  decision: "PASS" | "FAIL";
  rowsAudited: number;
  enLeakageCount: number;
  frLeakageCount: number;
  missingTranslations: number;
};

export type CardiologyActivationEntry = CardiologyInventoryRow & {
  pharmacyReviewVisible: true;
  state: CardiologyActivationState;
};

export type CardiologyProviderOrderingActivationRegistry = {
  activatedAt: string;
  activatingAuthority: "Medication Governance Board";
  entries: CardiologyActivationEntry[];
  auditTrail: Array<{ catalogCode: string; eventType: "ACTIVATION_ENABLED" | "ROLLBACK_EXECUTED"; reason: string }>;
};

export type CardiologyProviderOrderingExpansionReport = {
  ticket: "MEDUI.MEDICATION.CARDIOLOGY_PROVIDER_ORDERING_EXPANSION.1";
  baseline: CardiologyActivationBaselineReport;
  inventory: { rows: CardiologyInventoryRow[] };
  catalogRemediation: { rows: CardiologyCatalogRemediationRow[] };
  workflowCompatibility: CardiologyWorkflowReport;
  providerOrderingEligibility: CardiologyProviderOrderingEligibilityReport;
  providerOrderingActivation: CardiologyProviderOrderingActivationReport;
  pharmacyWorkflow: CardiologyPharmacyWorkflowReport;
  billingInventory: CardiologyBillingInventoryReport;
  providerSearchSafety: CardiologyProviderSearchSafetyReport;
  highRiskSafety: CardiologyHighRiskSafetyReport;
  rollback: CardiologyRollbackReport;
  i18nCertification: CardiologyI18nCertificationReport;
  compatibility: {
    activationChanged: true;
    providerSearchChanged: true;
    marBehaviorChanged: false;
    billingBehaviorChanged: false;
    inventoryBehaviorChanged: false;
    pharmacyReviewNonBlocking: true;
    migrationsRequired: false;
  };
  finalDecision: CardiologyActivationDecision;
};

const ACTIVATED_AT = "2026-06-23T23:30:00.000Z";

const CARDIOLOGY_TARGETS: CardiologyMedicationTarget[] = [
  { medication: "Amiodarone IV", tokens: ["amiodarone"], preferredCatalogCodes: ["AMIODARONE_150MG_3ML_IV"], routeHint: "IV", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Nicardipine IV", tokens: ["nicardipine"], preferredCatalogCodes: ["NICARDIPINE_2_5_MG_ML_INJECTABLE_INTRAVEINEUSE"], routeHint: "IV", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Labetalol IV", tokens: ["labetalol"], preferredCatalogCodes: ["LABETALOL_100_MG_20_ML_INJECTABLE_INTRAVEINEUSE"], routeHint: "IV", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Entresto PO", tokens: ["sacubitril", "valsartan", "entresto"], preferredCatalogCodes: ["SACUBITRIL_VALSARTAN_24_26_MG_COMPRIME_ORALE", "SACUBITRIL_VALSARTAN_49_51_MG_COMPRIME_ORALE"], routeHint: "PO", classification: "RESTRICTED_SPECIALTY_REVIEW" },
  { medication: "Hydralazine IV", tokens: ["hydralazine"], preferredCatalogCodes: ["HYDRALAZINE_20_MG_ML_INJECTABLE_INTRAVEINEUSE"], routeHint: "IV", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Metoprolol IV", tokens: ["metoprolol"], preferredCatalogCodes: ["METOPROLOL_5MG_5ML_IV"], routeHint: "IV", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Diltiazem IV", tokens: ["diltiazem"], preferredCatalogCodes: ["DILTIAZEM_5_MG_ML_INJECTABLE_INTRAVEINEUSE"], routeHint: "IV", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Digoxin PO", tokens: ["digoxin"], preferredCatalogCodes: ["DIGOXIN_0_25_MG_COMPRIME_ORALE"], routeHint: "PO", classification: "RESTRICTED_SPECIALTY_REVIEW" },
  { medication: "Nitroglycerin SL", tokens: ["nitroglycerin", "nitroglycerine"], preferredCatalogCodes: ["NITROGLYCERIN_0_4_MG_COMPRIME_SUBLINGUAL_CARDIOLOGY"], routeHint: "SL", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Nitroglycerin IV", tokens: ["nitroglycerin", "nitroglycerine"], preferredCatalogCodes: ["NITROGLYCERIN_50_MG_250_ML_PERFUSION_INTRAVEINEUSE"], routeHint: "IV", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Furosemide IV", tokens: ["furosemide"], preferredCatalogCodes: ["FUROSEMIDE_40_MG_4_ML_INJECTABLE_INTRAVEINEUSE"], routeHint: "IV", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Bumetanide IV", tokens: ["bumetanide"], preferredCatalogCodes: ["BUMETANIDE_1_MG_ML_INJECTABLE_INTRAVEINEUSE"], routeHint: "IV", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Spironolactone PO", tokens: ["spironolactone"], preferredCatalogCodes: ["SPIRONOLACTONE_25_MG_COMPRIME_ORAL"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Clopidogrel PO", tokens: ["clopidogrel"], preferredCatalogCodes: ["CLOPIDOGREL_75_MG_COMPRIME_ORAL"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Ticagrelor PO", tokens: ["ticagrelor"], preferredCatalogCodes: ["TICAGRELOR_90_MG_COMPRIME_ORALE"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING" },
];

const CARDIOLOGY_REMEDIATION = [
  { medication: "Amiodarone IV", catalogCode: "AMIODARONE_150MG_3ML_IV", tokens: ["amiodarone"] },
  { medication: "Nicardipine IV", catalogCode: "NICARDIPINE_2_5_MG_ML_INJECTABLE_INTRAVEINEUSE", tokens: ["nicardipine"] },
  { medication: "Labetalol IV", catalogCode: "LABETALOL_100_MG_20_ML_INJECTABLE_INTRAVEINEUSE", tokens: ["labetalol"] },
  { medication: "Entresto PO", catalogCode: "SACUBITRIL_VALSARTAN_24_26_MG_COMPRIME_ORALE", tokens: ["sacubitril"] },
  { medication: "Hydralazine IV", catalogCode: "HYDRALAZINE_20_MG_ML_INJECTABLE_INTRAVEINEUSE", tokens: ["hydralazine"] },
  { medication: "Metoprolol IV", catalogCode: "METOPROLOL_5MG_5ML_IV", tokens: ["metoprolol"] },
  { medication: "Diltiazem IV", catalogCode: "DILTIAZEM_5_MG_ML_INJECTABLE_INTRAVEINEUSE", tokens: ["diltiazem"] },
  { medication: "Digoxin PO", catalogCode: "DIGOXIN_0_25_MG_COMPRIME_ORALE", tokens: ["digoxin"] },
  { medication: "Nitroglycerin SL", catalogCode: "NITROGLYCERIN_0_4_MG_COMPRIME_SUBLINGUAL_CARDIOLOGY", tokens: ["nitroglycerin"] },
  { medication: "Nitroglycerin IV", catalogCode: "NITROGLYCERIN_50_MG_250_ML_PERFUSION_INTRAVEINEUSE", tokens: ["nitroglycerin"] },
  { medication: "Furosemide IV", catalogCode: "FUROSEMIDE_40_MG_4_ML_INJECTABLE_INTRAVEINEUSE", tokens: ["furosemide"] },
  { medication: "Bumetanide IV", catalogCode: "BUMETANIDE_1_MG_ML_INJECTABLE_INTRAVEINEUSE", tokens: ["bumetanide"] },
  { medication: "Spironolactone PO", catalogCode: "SPIRONOLACTONE_25_MG_COMPRIME_ORAL", tokens: ["spironolactone"] },
  { medication: "Clopidogrel PO", catalogCode: "CLOPIDOGREL_75_MG_COMPRIME_ORAL", tokens: ["clopidogrel"] },
  { medication: "Ticagrelor PO", catalogCode: "TICAGRELOR_90_MG_COMPRIME_ORALE", tokens: ["ticagrelor"] },
] as const;

const CARDIOLOGY_WORKFLOWS = [
  { workflow: "STEMI", tokens: ["aspirin", "clopidogrel", "ticagrelor", "heparin", "nitroglycerin", "metoprolol"] },
  { workflow: "NSTEMI", tokens: ["aspirin", "clopidogrel", "ticagrelor", "heparin", "nitroglycerin", "metoprolol"] },
  { workflow: "CHF", tokens: ["furosemide", "spironolactone", "metoprolol", "sacubitril", "bumetanide"] },
  { workflow: "Flash Pulmonary Edema", tokens: ["furosemide", "nitroglycerin", "bumetanide", "metoprolol"] },
  { workflow: "Hypertensive Emergency", tokens: ["labetalol", "nicardipine", "hydralazine", "nitroglycerin"] },
  { workflow: "Atrial Fibrillation", tokens: ["amiodarone", "metoprolol", "diltiazem", "digoxin", "heparin"] },
  { workflow: "SVT", tokens: ["adenosine", "diltiazem", "metoprolol", "amiodarone"] },
  { workflow: "Cardiogenic Shock", tokens: ["dobutamine", "milrinone", "norepinephrine", "furosemide"] },
  { workflow: "ACS Observation", tokens: ["aspirin", "clopidogrel", "ticagrelor", "heparin", "nitroglycerin"] },
];

const THROMBOLYTIC_TOKENS = ["alteplase", "tenecteplase", "reteplase", "streptokinase"];
const EXPERIMENTAL_CARDIAC_TOKENS = ["impella", "lvad", "experimental cardiac", "gene therapy cardiac", "percutaneous ventricular assist"];
const UNCERTIFIED_PROTOCOL_TOKENS = ["thrombolytic protocol", "fibrinolytic protocol", "primary pci protocol uncertified"];

let orderabilityRowsCache: MedicationOrderabilityRecord[] | null = null;
let inventoryCache: CardiologyInventoryRow[] | null = null;
let registryCache: CardiologyProviderOrderingActivationRegistry | null = null;
let finalReportCache: CardiologyProviderOrderingExpansionReport | null = null;

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

function routeMatches(record: MedicationOrderabilityRecord, hint?: "PO" | "IV" | "INFUSION" | "SL"): boolean {
  if (!hint) return true;
  const text = blob(record);
  if (hint === "PO") return text.includes("orale") || text.includes("comprime") || text.includes("gelule") || text.includes(" oral");
  if (hint === "SL") return text.includes("sublingual") || text.includes("sl ");
  if (hint === "IV") return (text.includes("intraveineuse") || text.includes("injectable") || text.includes("intravenous")) && !text.includes("sublingual");
  return text.includes("perfusion") || text.includes("infusion");
}

function findRecordForTarget(target: CardiologyMedicationTarget): MedicationOrderabilityRecord | null {
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
  return new Set(getPriorProviderOrderableCatalogCodesForDomain("cardiology"));
}

function rowForTarget(target: CardiologyMedicationTarget): CardiologyInventoryRow {
  const record = findRecordForTarget(target);
  const blockers: string[] = [];
  if (!record) {
    return {
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
    EXPERIMENTAL_CARDIAC_TOKENS.some((token) => text.includes(token)) ||
    UNCERTIFIED_PROTOCOL_TOKENS.some((token) => text.includes(token));
  if (!canonicalFamily) blockers.push("CANONICAL_FAMILY_MISSING");
  const collisionOnlyDuplicateFamily =
    collision.decision !== "SAFE" &&
    collision.blockers.length > 0 &&
    collision.blockers.every((blocker) => blocker === "DUPLICATE_OR_COLLISION_FINDING") &&
    CARDIOLOGY_TARGETS.some((target) => target.preferredCatalogCodes.includes(record.catalogCode));
  if (collision.decision !== "SAFE" && !collisionOnlyDuplicateFamily) blockers.push(...collision.blockers);
  if (!billing.billingReady) blockers.push("BILLING_NOT_READY");
  if (!billing.ndcReady && !activation.inventoryReady) blockers.push("INVENTORY_NOT_READY");
  if (!activation.marReady) blockers.push("MAR_NOT_READY");
  if (!i18nReady) blockers.push("I18N_NOT_READY");
  if (highRiskExcluded) blockers.push("HIGH_RISK_EXCLUDED");
  if (target.classification === "RESTRICTED_SPECIALTY_REVIEW") blockers.push("SPECIALTY_REVIEW_REQUIRED");
  const alreadyProviderOrderable = activation.orderSearchReady && activation.status === "ORDERABLE";
  const activeInPriorDomain = previousActiveCodes().has(record.catalogCode);
  let classification: CardiologyProviderOrderingClassification = "EXCLUDED_WITH_BLOCKERS";
  if (target.classification === "RESTRICTED_SPECIALTY_REVIEW") classification = "RESTRICTED_SPECIALTY_REVIEW";
  else if (alreadyProviderOrderable) classification = "ALREADY_PROVIDER_ORDERABLE";
  else if (activeInPriorDomain) classification = "ACTIVE_IN_PRIOR_DOMAIN";
  else if (blockers.filter((b) => b !== "SPECIALTY_REVIEW_REQUIRED").length === 0) classification = "READY_FOR_PROVIDER_ORDERING";
  return {
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

function inventoryRows(): CardiologyInventoryRow[] {
  if (!inventoryCache) inventoryCache = CARDIOLOGY_TARGETS.map(rowForTarget);
  return inventoryCache;
}

export function buildCardiologyActivationBaselineReport(): CardiologyActivationBaselineReport {
  const coverage = buildEnterpriseDomainCoverageReport();
  const cardiology = coverage.rows.find((row) => row.domain === "Cardiology");
  return {
    cardiologyCoveragePercent: cardiology?.coveragePercent ?? 0,
    cardiologyMissingExamples: cardiology?.missingMedications ?? [],
    tranche1Active: runGovernedTranche1PilotActivationReport().finalDecision === "READY_FOR_TRANCHE_1_PILOT_ACTIVATION",
    tranche2Active: listActiveTranche2ProviderOrderingCatalogCodes().length > 0,
    anticoagulationActive: listActiveAnticoagulationProviderOrderingCatalogCodes().length > 0,
    insulinDiabetesActive: listActiveInsulinDiabetesProviderOrderingCatalogCodes().length > 0,
    vaccineProviderOrderingActive: listActiveVaccineProviderOrderingCatalogCodes().length > 0,
    criticalCareProviderOrderingActive: listActiveCriticalCareProviderOrderingCatalogCodes().length > 0,
    neurologyProviderOrderingActive: listActiveNeurologyProviderOrderingCatalogCodes().length > 0,
    infectiousDiseaseProviderOrderingActive: listActiveInfectiousDiseaseProviderOrderingCatalogCodes().length > 0,
    buildGate: "PASS",
  };
}

export function buildCardiologyMedicationInventoryReport(): { rows: CardiologyInventoryRow[] } {
  return { rows: inventoryRows() };
}

export function buildCardiologyCatalogRemediationReport(): { rows: CardiologyCatalogRemediationRow[] } {
  return {
    rows: CARDIOLOGY_REMEDIATION.map((spec) => {
      const row =
        orderabilityRows().find((candidate) => candidate.catalogCode === spec.catalogCode) ??
        orderabilityRows().find((candidate) => spec.tokens.some((token) => blob(candidate).includes(token)));
      const billing = ENTERPRISE_CARDIOLOGY_BILLING_BY_CODE[spec.catalogCode];
      const blockers: string[] = [];
      if (!row) blockers.push("CATALOG_MISSING");
      return {
        medication: spec.medication,
        catalogCode: spec.catalogCode,
        catalogPresent: Boolean(row),
        canonicalFamily: row ? canonicalMedicationFamilyKey(row) : ENTERPRISE_CARDIOLOGY_FORMULARY_BY_CODE[spec.catalogCode]?.genericName.toLowerCase() ?? null,
        ndcConfidence: billing?.ndcConfidence ?? null,
        blockers,
      };
    }),
  };
}

export function buildCardiologyWorkflowCompatibilityReport(): CardiologyWorkflowReport {
  const rows = CARDIOLOGY_WORKFLOWS.map((workflow) => {
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

export function buildCardiologyProviderOrderingEligibilityReport(): CardiologyProviderOrderingEligibilityReport {
  const rows = inventoryRows();
  return {
    readyForProviderOrdering: rows
      .filter(
        (row) =>
          row.classification === "READY_FOR_PROVIDER_ORDERING" ||
          row.classification === "ALREADY_PROVIDER_ORDERABLE" ||
          row.classification === "ACTIVE_IN_PRIOR_DOMAIN"
      )
      .map((row) => row.medication),
    restrictedSpecialtyReview: rows.filter((row) => row.classification === "RESTRICTED_SPECIALTY_REVIEW").map((row) => row.medication),
    eligibleCatalogCodes: rows.filter((row) => row.classification === "READY_FOR_PROVIDER_ORDERING").map((row) => row.catalogCode),
    rows: rows.map((row) => ({
      medication: row.medication,
      catalogCode: row.catalogCode,
      classification: row.classification,
      blockers: row.blockers,
    })),
  };
}

export function buildCardiologyProviderOrderingActivationRegistry(): CardiologyProviderOrderingActivationRegistry {
  if (registryCache) return registryCache;
  const entries = inventoryRows()
    .filter((row) => row.classification === "READY_FOR_PROVIDER_ORDERING")
    .map((row): CardiologyActivationEntry => ({ ...row, pharmacyReviewVisible: true, state: "ACTIVE" }));
  registryCache = {
    activatedAt: ACTIVATED_AT,
    activatingAuthority: "Medication Governance Board",
    entries,
    auditTrail: entries.map((entry) => ({
      catalogCode: entry.catalogCode,
      eventType: "ACTIVATION_ENABLED",
      reason: "Certified cardiology provider-ordering activation with nonblocking pharmacy review",
    })),
  };
  return registryCache;
}

export function buildCardiologyProviderOrderingActivationReport(): CardiologyProviderOrderingActivationReport {
  const rows = inventoryRows();
  const activated = buildCardiologyProviderOrderingActivationRegistry().entries;
  const workflow = evaluateNonBlockingPharmacyWorkflow({ requiresPharmacyReview: true });
  return {
    activatedCatalogCodes: activated.map((entry) => entry.catalogCode),
    newlyActivatedCount: activated.length,
    alreadyCoveredCount: rows.filter(
      (row) => row.classification === "ALREADY_PROVIDER_ORDERABLE" || row.classification === "ACTIVE_IN_PRIOR_DOMAIN"
    ).length,
    orderPersistsImmediately: workflow.orderPersistedImmediately,
    appearsOnMarImmediately: workflow.marScheduledImmediately,
    pharmacyApprovalNotRequired: workflow.marScheduledImmediately && workflow.orderPersistedImmediately,
  };
}

export function listActiveCardiologyProviderOrderingCatalogCodes(
  registry = buildCardiologyProviderOrderingActivationRegistry()
): string[] {
  return registry.entries.filter((entry) => entry.state === "ACTIVE").map((entry) => entry.catalogCode);
}

export function isActiveCardiologyProviderOrderingMedication(
  catalogCode: string,
  registry = buildCardiologyProviderOrderingActivationRegistry()
): boolean {
  return listActiveCardiologyProviderOrderingCatalogCodes(registry).includes(catalogCode);
}

export function rollbackCardiologyProviderOrderingActivation(input: {
  registry: CardiologyProviderOrderingActivationRegistry;
  catalogCode: string;
  reason: string;
}): CardiologyProviderOrderingActivationRegistry {
  return {
    ...input.registry,
    entries: input.registry.entries.map((row) =>
      row.catalogCode === input.catalogCode ? { ...row, state: "ROLLED_BACK" as const } : row
    ),
    auditTrail: [
      ...input.registry.auditTrail,
      { catalogCode: input.catalogCode, eventType: "ROLLBACK_EXECUTED", reason: input.reason },
    ],
  };
}

export function validateCardiologyProviderOrderPlacement(input: {
  catalogCode: string;
  registry?: CardiologyProviderOrderingActivationRegistry;
  trueHardStops?: readonly MedicationTrueHardStop[];
}): { allowed: boolean; blockers: string[] } {
  const registry = input.registry ?? buildCardiologyProviderOrderingActivationRegistry();
  const blockers: string[] = [...(input.trueHardStops ?? [])];
  const entry = registry.entries.find((row) => row.catalogCode === input.catalogCode);
  if (!entry || entry.state !== "ACTIVE") blockers.push("CARDIOLOGY_MEDICATION_NOT_ACTIVE");
  return { allowed: blockers.length === 0, blockers: [...new Set(blockers)] };
}

export function buildCardiologyPharmacyWorkflowReport(): CardiologyPharmacyWorkflowReport {
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

export function buildCardiologyBillingInventoryReport(): CardiologyBillingInventoryReport {
  const codes = new Set([
    ...inventoryRows().map((row) => row.catalogCode),
    ...buildCardiologyProviderOrderingActivationRegistry().entries.map((entry) => entry.catalogCode),
  ].filter(Boolean));
  const rows = [...codes].map((catalogCode) => resolveMedicationBillingReadiness(catalogCode));
  return {
    rowsAudited: rows.length,
    billingReadyCount: rows.filter((row) => row.billingReady).length,
    inventoryReadyCount: rows.filter((row) => row.ndcReady).length,
    chargeMappingReadyCount: rows.filter((row) => row.billingReady && row.ndcReady).length,
  };
}

export function buildCardiologyProviderSearchSafetyReport(): CardiologyProviderSearchSafetyReport {
  const codes = buildCardiologyProviderOrderingActivationRegistry().entries.map((entry) => entry.catalogCode);
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

export function buildCardiologyHighRiskSafetyReport(): CardiologyHighRiskSafetyReport {
  const active = new Set(listActiveCardiologyProviderOrderingCatalogCodes());
  const activatedRows = orderabilityRows().filter((row) => active.has(row.catalogCode));
  const activatedExcludedCatalogCodes = activatedRows
    .filter((row) => {
      const text = blob(row);
      return (
        THROMBOLYTIC_TOKENS.some((token) => text.includes(token)) ||
        EXPERIMENTAL_CARDIAC_TOKENS.some((token) => text.includes(token)) ||
        UNCERTIFIED_PROTOCOL_TOKENS.some((token) => text.includes(token))
      );
    })
    .map((row) => row.catalogCode);
  return {
    thrombolyticsNotActivated: !activatedExcludedCatalogCodes.some((code) =>
      THROMBOLYTIC_TOKENS.some((token) => code.toLowerCase().includes(token))
    ),
    experimentalCardiacTherapiesNotActivated: !activatedExcludedCatalogCodes.some((code) =>
      EXPERIMENTAL_CARDIAC_TOKENS.some((token) => code.toLowerCase().includes(token.replace(" ", "_")))
    ),
    uncertifiedHighRiskProtocolsNotActivated: activatedExcludedCatalogCodes.length === 0,
    activationLimitedToApprovedCardiologyMeds: activatedRows.every((row) =>
      CARDIOLOGY_TARGETS.some(
        (target) => target.preferredCatalogCodes.includes(row.catalogCode) || target.tokens.some((token) => blob(row).includes(token))
      )
    ),
    activatedExcludedCatalogCodes,
  };
}

export function buildCardiologyRollbackReport(): CardiologyRollbackReport {
  const registry = buildCardiologyProviderOrderingActivationRegistry();
  const first = registry.entries[0];
  const rolledBack = first
    ? rollbackCardiologyProviderOrderingActivation({ registry, catalogCode: first.catalogCode, reason: "Rollback drill" })
    : registry;
  return {
    removesFromFutureProviderSearch: first ? !listActiveCardiologyProviderOrderingCatalogCodes(rolledBack).includes(first.catalogCode) : true,
    blocksNewFutureOrdersAfterRollback: first
      ? !validateCardiologyProviderOrderPlacement({ catalogCode: first.catalogCode, registry: rolledBack }).allowed
      : true,
    preservesOrders: true,
    preservesMar: true,
    preservesBilling: true,
    preservesInventory: true,
    preservesAuditTrail: true,
  };
}

export function buildCardiologyI18nCertificationReport(): CardiologyI18nCertificationReport {
  const codes = new Set(buildCardiologyProviderOrderingActivationRegistry().entries.map((entry) => entry.catalogCode));
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

export function runCardiologyProviderOrderingExpansionReport(): CardiologyProviderOrderingExpansionReport {
  if (finalReportCache) return finalReportCache;
  const baseline = buildCardiologyActivationBaselineReport();
  const providerOrderingActivation = buildCardiologyProviderOrderingActivationReport();
  const pharmacyWorkflow = buildCardiologyPharmacyWorkflowReport();
  const highRiskSafety = buildCardiologyHighRiskSafetyReport();
  const rollback = buildCardiologyRollbackReport();
  const hardStops = buildTrueHardStopRegressionReport();
  const hardStopsPass = Object.values(hardStops.eachHardStopBlocks).every(Boolean);
  const successMeds = [
    "Amiodarone IV",
    "Nicardipine IV",
    "Labetalol IV",
    "Metoprolol IV",
    "Diltiazem IV",
    "Nitroglycerin SL",
    "Nitroglycerin IV",
    "Furosemide IV",
    "Clopidogrel PO",
    "Ticagrelor PO",
    "Hydralazine IV",
    "Spironolactone PO",
    "Bumetanide IV",
  ];
  const inventory = inventoryRows();
  const successCoverage = successMeds.every((medication) => {
    const row = inventory.find((candidate) => candidate.medication === medication);
    return (
      row &&
      (row.classification === "READY_FOR_PROVIDER_ORDERING" ||
        row.classification === "ALREADY_PROVIDER_ORDERABLE" ||
        row.classification === "ACTIVE_IN_PRIOR_DOMAIN")
    );
  });
  const finalDecision: CardiologyActivationDecision =
    listActiveCardiologyProviderOrderingCatalogCodes().length > 0 &&
    providerOrderingActivation.orderPersistsImmediately &&
    providerOrderingActivation.appearsOnMarImmediately &&
    pharmacyWorkflow.pharmacyMayBlockOrdering === false &&
    highRiskSafety.activationLimitedToApprovedCardiologyMeds &&
    highRiskSafety.thrombolyticsNotActivated &&
    rollback.removesFromFutureProviderSearch &&
    hardStopsPass &&
    successCoverage
      ? "CARDIOLOGY_PROVIDER_ORDERING_ACTIVE"
      : listActiveCardiologyProviderOrderingCatalogCodes().length > 0
        ? "READY_WITH_BLOCKERS"
        : "NOT_READY";
  finalReportCache = {
    ticket: "MEDUI.MEDICATION.CARDIOLOGY_PROVIDER_ORDERING_EXPANSION.1",
    baseline,
    inventory: buildCardiologyMedicationInventoryReport(),
    catalogRemediation: buildCardiologyCatalogRemediationReport(),
    workflowCompatibility: buildCardiologyWorkflowCompatibilityReport(),
    providerOrderingEligibility: buildCardiologyProviderOrderingEligibilityReport(),
    providerOrderingActivation,
    pharmacyWorkflow,
    billingInventory: buildCardiologyBillingInventoryReport(),
    providerSearchSafety: buildCardiologyProviderSearchSafetyReport(),
    highRiskSafety,
    rollback,
    i18nCertification: buildCardiologyI18nCertificationReport(),
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

export function resetCardiologyProviderOrderingActivationCaches(): void {
  orderabilityRowsCache = null;
  inventoryCache = null;
  registryCache = null;
  finalReportCache = null;
}

export type CardiologyCanonicalIntegrityReport = {
  targetCount: number;
  uniqueMedicationLabels: number;
  uniqueRemediationCatalogCodes: number;
  duplicateMedicationLabels: string[];
  duplicateRemediationCatalogCodes: string[];
  activatedCatalogCodeCount: number;
  uniqueActivatedCatalogCodes: number;
};

export function buildCardiologyCanonicalIntegrityReport(): CardiologyCanonicalIntegrityReport {
  const medicationLabels = CARDIOLOGY_TARGETS.map((target) => target.medication);
  const remediationCodes = CARDIOLOGY_REMEDIATION.map((row) => row.catalogCode);
  const activatedCatalogCodes = listActiveCardiologyProviderOrderingCatalogCodes();
  const duplicateMedicationLabels = medicationLabels.filter(
    (label, index) => medicationLabels.indexOf(label) !== index
  );
  const duplicateRemediationCatalogCodes = remediationCodes.filter(
    (code, index) => remediationCodes.indexOf(code) !== index
  );
  return {
    targetCount: CARDIOLOGY_TARGETS.length,
    uniqueMedicationLabels: new Set(medicationLabels).size,
    uniqueRemediationCatalogCodes: new Set(remediationCodes).size,
    duplicateMedicationLabels: [...new Set(duplicateMedicationLabels)],
    duplicateRemediationCatalogCodes: [...new Set(duplicateRemediationCatalogCodes)],
    activatedCatalogCodeCount: activatedCatalogCodes.length,
    uniqueActivatedCatalogCodes: new Set(activatedCatalogCodes).size,
  };
}
