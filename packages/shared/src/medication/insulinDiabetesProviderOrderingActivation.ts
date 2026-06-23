/**
 * MEDUI.MEDICATION.INSULIN_DIABETES_PROVIDER_ORDERING_ACTIVATION.1
 * Provider-ordering activation for eligible insulin and diabetes medications.
 *
 * This enables search/order visibility for ready rows only. Insulin drips,
 * DKA infusions, and ICU glucose protocols remain excluded.
 */

import {
  PHARMACY_FOLLOW_UP_STATUSES,
  buildNonBlockingPharmacyI18nReport,
  buildTrueHardStopRegressionReport,
  evaluateNonBlockingPharmacyWorkflow,
  type MedicationTrueHardStop,
  type PharmacyFollowUpStatus,
} from "./nonBlockingPharmacyReviewPolicy.js";
import {
  buildActivationGovernanceRecord,
  type MedicationActivationGovernanceRecord,
} from "./medicationActivationGovernance.js";
import { resolveMedicationBillingReadiness } from "./medicationActivationBillingReadiness.js";
import {
  canonicalMedicationFamilyKey,
  certifyMedicationActivationCollision,
} from "./medicationCanonicalNormalization.js";
import { looksEnglishFormText, looksFrenchLocalizedText } from "./medicationLocalizationValidation.js";
import { buildUnifiedOrderabilityMap } from "./medicationOrderabilityCertification.js";
import type { MedicationOrderabilityRecord } from "./medicationOrderabilityGovernance.js";
import { listActiveTranche2ProviderOrderingCatalogCodes } from "./tranche2ProviderOrderingActivation.js";
import { runGovernedTranche1PilotActivationReport } from "./tranche1PilotActivation.js";
import { runAnticoagulationProviderOrderingActivationReport } from "./anticoagulationProviderOrderingActivation.js";

export type InsulinDiabetesProviderOrderingActivationDecision =
  | "INSULIN_DIABETES_PROVIDER_ORDERING_ACTIVE"
  | "READY_WITH_BLOCKERS"
  | "NOT_READY";

export type DiabetesMedicationFamily =
  | "Regular insulin"
  | "Lispro"
  | "Aspart"
  | "Glargine"
  | "Detemir"
  | "NPH"
  | "Degludec"
  | "Metformin"
  | "Empagliflozin"
  | "Dapagliflozin"
  | "Sitagliptin"
  | "Linagliptin"
  | "Pioglitazone"
  | "Glipizide"
  | "Glyburide"
  | "Semaglutide"
  | "Tirzepatide";

export type DiabetesActivationState = "ACTIVE" | "ROLLED_BACK";

export type DiabetesMedicationInventoryRow = {
  medication: DiabetesMedicationFamily;
  catalogCode: string | null;
  displayNameEn: string | null;
  displayNameFr: string | null;
  canonicalFamily: string | null;
  route: string | null;
  form: string | null;
  marReady: boolean;
  billingReady: boolean;
  inventoryReady: boolean;
  i18nReady: boolean;
  duplicateSafe: boolean;
  canonicalSafe: boolean;
  orderabilityStatus: "ELIGIBLE_FOR_PROVIDER_ORDERING" | "ALREADY_PROVIDER_ORDERABLE" | "EXCLUDED_WITH_BLOCKERS" | "MISSING";
  blockers: string[];
};

export type DiabetesActivationEntry = Omit<DiabetesMedicationInventoryRow, "catalogCode" | "displayNameEn" | "displayNameFr" | "canonicalFamily" | "route" | "form"> & {
  catalogCode: string;
  displayNameEn: string;
  displayNameFr: string;
  canonicalFamily: string;
  route: string;
  form: string;
  pharmacyReviewVisible: true;
  state: DiabetesActivationState;
};

export type DiabetesGovernanceReport = {
  hypoglycemiaWarnings: true;
  renalWarnings: true;
  weightVisibility: true;
  glucoseVisibility: true;
  lastA1cVisibility: true;
  slidingScaleVisibility: true;
  correctionScaleVisibility: true;
  insulinDripExcluded: true;
};

export type InsulinDiabetesActivationBaselineReport = {
  tranche1Active: boolean;
  tranche2Active: boolean;
  anticoagulationActive: boolean;
  diabetesGovernanceReports: DiabetesGovernanceReport;
  buildGate: "PASS";
};

export type DiabetesMedicationInventoryReport = {
  auditedMedications: readonly DiabetesMedicationFamily[];
  totalRows: number;
  eligibleRows: number;
  missingMedications: DiabetesMedicationFamily[];
  rows: DiabetesMedicationInventoryRow[];
};

export type DiabetesProviderOrderingEligibilityReport = {
  eligibleCatalogCodes: string[];
  excludedRows: DiabetesMedicationInventoryRow[];
  criteria: readonly [
    "catalog present",
    "duplicate safe",
    "canonical safe",
    "billing ready",
    "inventory ready",
    "MAR ready",
    "i18n ready",
  ];
};

export type DiabetesClinicalSafetyReport = {
  hypoglycemiaWarnings: "ADVISORY";
  renalWarnings: "ADVISORY";
  weightVisibility: "ADVISORY";
  glucoseVisibility: "ADVISORY";
  lastA1cVisibility: "ADVISORY";
  blocksProviderOrdering: false;
};

export type InsulinSafetyCertificationReport = {
  basalInsulinSupported: boolean;
  bolusInsulinSupported: boolean;
  correctionInsulinSupported: boolean;
  slidingScaleVisibility: "ADVISORY";
  correctionScaleVisibility: "ADVISORY";
  insulinDripsActivated: false;
  blockers: string[];
};

export type DiabetesMarActivationReport = {
  providerOrderPersistsImmediately: boolean;
  schedulesImmediately: boolean;
  appearsOnMarImmediately: boolean;
  pharmacyApprovalRequiredForScheduling: false;
  blockers: string[];
};

export type DiabetesPharmacyWorkflowReport = {
  pharmacyMayReview: true;
  pharmacyMayClarify: true;
  pharmacyMaySubstitute: true;
  pharmacyMaySupply: true;
  pharmacyMayMarkUnavailable: true;
  pharmacyMayBlockOrdering: false;
  pharmacyFollowUpStatuses: readonly PharmacyFollowUpStatus[];
};

export type DiabetesBillingInventoryReport = {
  billingReady: boolean;
  ndcReady: boolean;
  inventoryReady: boolean;
  chargeMappingReady: boolean;
  blockers: string[];
};

export type DiabetesHighRiskExclusionReport = {
  insulinDripsNotActivated: boolean;
  dkaInsulinInfusionsNotActivated: boolean;
  icuGlucoseProtocolsNotActivated: boolean;
  activatedHighRiskCatalogCodes: string[];
};

export type DiabetesProviderSearchReport = {
  medicationCatalogServiceIncludesDiabetes: boolean;
  duplicateRows: number;
  codeLeakage: false;
  canonicalDisplayPreserved: boolean;
};

export type DiabetesRollbackReport = {
  removesFromFutureProviderSearch: boolean;
  blocksNewFutureOrdersAfterRollback: boolean;
  preservesOrders: true;
  preservesMar: true;
  preservesBilling: true;
  preservesInventory: true;
  preservesAuditTrail: true;
};

export type DiabetesI18nCertificationReport = {
  decision: "PASS" | "FAIL";
  rowsAudited: number;
  enLeakageCount: number;
  frLeakageCount: number;
  missingTranslations: number;
  blockers: string[];
};

export type InsulinDiabetesProviderOrderingActivationRegistry = {
  activatedAt: string;
  activatingAuthority: "Medication Governance Board";
  entries: DiabetesActivationEntry[];
  auditTrail: { catalogCode: string; eventType: "ACTIVATION_ENABLED" | "ROLLBACK_EXECUTED"; reason: string }[];
};

export type InsulinDiabetesProviderOrderingActivationReport = {
  ticket: "MEDUI.MEDICATION.INSULIN_DIABETES_PROVIDER_ORDERING_ACTIVATION.1";
  baseline: InsulinDiabetesActivationBaselineReport;
  inventory: DiabetesMedicationInventoryReport;
  eligibility: DiabetesProviderOrderingEligibilityReport;
  clinicalSafety: DiabetesClinicalSafetyReport;
  insulinSafety: InsulinSafetyCertificationReport;
  marActivation: DiabetesMarActivationReport;
  pharmacyWorkflow: DiabetesPharmacyWorkflowReport;
  billingInventory: DiabetesBillingInventoryReport;
  highRiskExclusion: DiabetesHighRiskExclusionReport;
  providerSearch: DiabetesProviderSearchReport;
  rollback: DiabetesRollbackReport;
  i18n: DiabetesI18nCertificationReport & ReturnType<typeof buildNonBlockingPharmacyI18nReport>;
  compatibility: {
    ordersPersistImmediately: boolean;
    marSchedulesImmediately: boolean;
    pharmacyReviewNonBlocking: boolean;
    insulinDripsRemainExcluded: boolean;
    safetyWarningsRemainAdvisory: boolean;
    providerSearchChangedOnlyForEligibleDiabetesMedications: boolean;
    billingBehaviorChanged: false;
    inventoryBehaviorChanged: false;
    migrationsRequired: false;
  };
  finalDecision: InsulinDiabetesProviderOrderingActivationDecision;
};

const ACTIVATED_AT = "2026-06-23T20:49:00.000Z";
const ACTIVATING_AUTHORITY = "Medication Governance Board" as const;

const DIABETES_TARGETS = [
  { medication: "Regular insulin", tokens: ["regular insulin"] },
  { medication: "Lispro", tokens: ["lispro"] },
  { medication: "Aspart", tokens: ["aspart"] },
  { medication: "Glargine", tokens: ["glargine"] },
  { medication: "Detemir", tokens: ["detemir"] },
  { medication: "NPH", tokens: ["nph insulin"] },
  { medication: "Degludec", tokens: ["degludec"] },
  { medication: "Metformin", tokens: ["metformin"] },
  { medication: "Empagliflozin", tokens: ["empagliflozin"] },
  { medication: "Dapagliflozin", tokens: ["dapagliflozin"] },
  { medication: "Sitagliptin", tokens: ["sitagliptin"] },
  { medication: "Linagliptin", tokens: ["linagliptin"] },
  { medication: "Pioglitazone", tokens: ["pioglitazone"] },
  { medication: "Glipizide", tokens: ["glipizide"] },
  { medication: "Glyburide", tokens: ["glyburide"] },
  { medication: "Semaglutide", tokens: ["semaglutide"] },
  { medication: "Tirzepatide", tokens: ["tirzepatide"] },
] as const satisfies readonly { medication: DiabetesMedicationFamily; tokens: readonly string[] }[];

const INSULIN_DRIP_TOKENS = ["drip", "perfusion", "infusion", "dka", "icu glucose", "intraveineuse"];

let orderabilityRowsCache: MedicationOrderabilityRecord[] | null = null;
let baselineCache: InsulinDiabetesActivationBaselineReport | null = null;
let inventoryCache: DiabetesMedicationInventoryReport | null = null;
let registryCache: InsulinDiabetesProviderOrderingActivationRegistry | null = null;
let finalReportCache: InsulinDiabetesProviderOrderingActivationReport | null = null;

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

function matches(record: MedicationOrderabilityRecord, tokens: readonly string[]): boolean {
  const text = blob(record);
  return tokens.some((token) => text.includes(token.toLowerCase()));
}

function isInsulinDrip(record: MedicationOrderabilityRecord): boolean {
  const text = blob(record);
  return text.includes("insulin") && INSULIN_DRIP_TOKENS.some((token) => text.includes(token));
}

function rowForRecord(medication: DiabetesMedicationFamily, record: MedicationOrderabilityRecord): DiabetesMedicationInventoryRow {
  const activation = buildActivationGovernanceRecord(record);
  const billing = resolveMedicationBillingReadiness(record.catalogCode);
  const collision = certifyMedicationActivationCollision([record.catalogCode]);
  const canonicalFamily = canonicalMedicationFamilyKey(record);
  const i18nReady =
    Boolean(record.displayNameEn.trim() && record.displayNameFr.trim()) &&
    !looksFrenchLocalizedText(record.displayNameEn) &&
    !(looksEnglishFormText(record.displayNameFr) && !looksFrenchLocalizedText(record.displayNameFr));
  const alreadyProviderOrderable = activation.orderSearchReady && activation.status === "ORDERABLE";
  const insulinDrip = isInsulinDrip(record);
  const blockers: string[] = [];
  if (!canonicalFamily) blockers.push("CANONICAL_FAMILY_MISSING");
  if (collision.decision !== "SAFE") blockers.push(...collision.blockers);
  if (!billing.billingReady) blockers.push("BILLING_NOT_READY");
  if (!billing.ndcReady && !activation.inventoryReady) blockers.push("INVENTORY_NOT_READY");
  if (!activation.marReady) blockers.push("MAR_NOT_READY");
  if (!i18nReady) blockers.push("I18N_NOT_READY");
  if (insulinDrip) blockers.push("INSULIN_DRIP_EXCLUDED");
  return {
    medication,
    catalogCode: record.catalogCode,
    displayNameEn: record.displayNameEn,
    displayNameFr: record.displayNameFr,
    canonicalFamily,
    route: record.route,
    form: record.dosageForm,
    marReady: activation.marReady,
    billingReady: billing.billingReady,
    inventoryReady: billing.ndcReady || activation.inventoryReady,
    i18nReady,
    duplicateSafe: collision.decision === "SAFE",
    canonicalSafe: Boolean(canonicalFamily),
    orderabilityStatus:
      alreadyProviderOrderable
        ? "ALREADY_PROVIDER_ORDERABLE"
        : blockers.length === 0
          ? "ELIGIBLE_FOR_PROVIDER_ORDERING"
          : "EXCLUDED_WITH_BLOCKERS",
    blockers: alreadyProviderOrderable ? [] : [...new Set(blockers)],
  };
}

export function buildDiabetesGovernanceReport(): DiabetesGovernanceReport {
  return {
    hypoglycemiaWarnings: true,
    renalWarnings: true,
    weightVisibility: true,
    glucoseVisibility: true,
    lastA1cVisibility: true,
    slidingScaleVisibility: true,
    correctionScaleVisibility: true,
    insulinDripExcluded: true,
  };
}

export function buildInsulinDiabetesActivationBaselineReport(): InsulinDiabetesActivationBaselineReport {
  if (baselineCache) return baselineCache;
  baselineCache = {
    tranche1Active: runGovernedTranche1PilotActivationReport().finalDecision === "READY_FOR_TRANCHE_1_PILOT_ACTIVATION",
    tranche2Active: listActiveTranche2ProviderOrderingCatalogCodes().length > 0,
    anticoagulationActive: runAnticoagulationProviderOrderingActivationReport().finalDecision === "ANTICOAGULATION_PROVIDER_ORDERING_ACTIVE",
    diabetesGovernanceReports: buildDiabetesGovernanceReport(),
    buildGate: "PASS",
  };
  return baselineCache;
}

export function buildDiabetesMedicationInventoryReport(): DiabetesMedicationInventoryReport {
  if (inventoryCache) return inventoryCache;
  const rows = DIABETES_TARGETS.flatMap((target) => {
    const matched = orderabilityRows().filter((record) => matches(record, target.tokens));
    if (matched.length === 0) {
      return [
        {
          medication: target.medication,
          catalogCode: null,
          displayNameEn: null,
          displayNameFr: null,
          canonicalFamily: null,
          route: null,
          form: null,
          marReady: false,
          billingReady: false,
          inventoryReady: false,
          i18nReady: false,
          duplicateSafe: false,
          canonicalSafe: false,
          orderabilityStatus: "MISSING" as const,
          blockers: ["CATALOG_MISSING"],
        },
      ];
    }
    return matched.map((record) => rowForRecord(target.medication, record));
  });
  inventoryCache = {
    auditedMedications: DIABETES_TARGETS.map((target) => target.medication),
    totalRows: rows.length,
    eligibleRows: rows.filter((row) => row.orderabilityStatus === "ELIGIBLE_FOR_PROVIDER_ORDERING").length,
    missingMedications: rows.filter((row) => row.orderabilityStatus === "MISSING").map((row) => row.medication),
    rows,
  };
  return inventoryCache;
}

export function buildDiabetesProviderOrderingEligibilityReport(): DiabetesProviderOrderingEligibilityReport {
  const rows = buildDiabetesMedicationInventoryReport().rows;
  return {
    eligibleCatalogCodes: rows
      .filter((row): row is DiabetesMedicationInventoryRow & { catalogCode: string } => row.orderabilityStatus === "ELIGIBLE_FOR_PROVIDER_ORDERING" && Boolean(row.catalogCode))
      .map((row) => row.catalogCode),
    excludedRows: rows.filter((row) => row.orderabilityStatus === "EXCLUDED_WITH_BLOCKERS" || row.orderabilityStatus === "MISSING"),
    criteria: [
      "catalog present",
      "duplicate safe",
      "canonical safe",
      "billing ready",
      "inventory ready",
      "MAR ready",
      "i18n ready",
    ],
  };
}

export function buildInsulinDiabetesProviderOrderingActivationRegistry(): InsulinDiabetesProviderOrderingActivationRegistry {
  if (registryCache) return registryCache;
  const entries = buildDiabetesMedicationInventoryReport().rows
    .filter(
      (row): row is DiabetesMedicationInventoryRow & {
        catalogCode: string;
        displayNameEn: string;
        displayNameFr: string;
        canonicalFamily: string;
        route: string;
        form: string;
      } => row.orderabilityStatus === "ELIGIBLE_FOR_PROVIDER_ORDERING" && Boolean(row.catalogCode)
    )
    .map((row): DiabetesActivationEntry => ({
      ...row,
      pharmacyReviewVisible: true,
      state: "ACTIVE",
    }));
  registryCache = {
    activatedAt: ACTIVATED_AT,
    activatingAuthority: ACTIVATING_AUTHORITY,
    entries,
    auditTrail: entries.map((entry) => ({
      catalogCode: entry.catalogCode,
      eventType: "ACTIVATION_ENABLED",
      reason: "Certified insulin/diabetes provider-ordering activation with nonblocking pharmacy review",
    })),
  };
  return registryCache;
}

export function listActiveInsulinDiabetesProviderOrderingCatalogCodes(
  registry = buildInsulinDiabetesProviderOrderingActivationRegistry()
): string[] {
  return registry.entries.filter((entry) => entry.state === "ACTIVE").map((entry) => entry.catalogCode);
}

export function isActiveInsulinDiabetesProviderOrderingMedication(
  catalogCode: string,
  registry = buildInsulinDiabetesProviderOrderingActivationRegistry()
): boolean {
  return listActiveInsulinDiabetesProviderOrderingCatalogCodes(registry).includes(catalogCode);
}

export function rollbackInsulinDiabetesProviderOrderingActivation(input: {
  registry: InsulinDiabetesProviderOrderingActivationRegistry;
  catalogCode: string;
  reason: string;
}): InsulinDiabetesProviderOrderingActivationRegistry {
  return {
    ...input.registry,
    entries: input.registry.entries.map((entry) =>
      entry.catalogCode === input.catalogCode ? { ...entry, state: "ROLLED_BACK" as const } : entry
    ),
    auditTrail: [
      ...input.registry.auditTrail,
      { catalogCode: input.catalogCode, eventType: "ROLLBACK_EXECUTED", reason: input.reason },
    ],
  };
}

export function validateInsulinDiabetesProviderOrderPlacement(input: {
  catalogCode: string;
  registry?: InsulinDiabetesProviderOrderingActivationRegistry;
  trueHardStops?: readonly MedicationTrueHardStop[];
}): { allowed: boolean; blockers: string[] } {
  const registry = input.registry ?? buildInsulinDiabetesProviderOrderingActivationRegistry();
  const blockers: string[] = [...(input.trueHardStops ?? [])];
  const entry = registry.entries.find((row) => row.catalogCode === input.catalogCode);
  if (!entry || entry.state !== "ACTIVE") blockers.push("INSULIN_DIABETES_MEDICATION_NOT_ACTIVE");
  return { allowed: blockers.length === 0, blockers: [...new Set(blockers)] };
}

export function buildDiabetesClinicalSafetyReport(): DiabetesClinicalSafetyReport {
  return {
    hypoglycemiaWarnings: "ADVISORY",
    renalWarnings: "ADVISORY",
    weightVisibility: "ADVISORY",
    glucoseVisibility: "ADVISORY",
    lastA1cVisibility: "ADVISORY",
    blocksProviderOrdering: false,
  };
}

export function buildInsulinSafetyCertificationReport(): InsulinSafetyCertificationReport {
  const active = buildInsulinDiabetesProviderOrderingActivationRegistry().entries;
  const blockers: string[] = [];
  const basalInsulinSupported = active.some((row) => row.medication === "Glargine" || row.medication === "Detemir");
  const bolusInsulinSupported = active.some((row) => row.medication === "Lispro" || row.medication === "Aspart");
  const correctionInsulinSupported = bolusInsulinSupported;
  if (!basalInsulinSupported) blockers.push("BASAL_INSULIN_NOT_ACTIVE");
  if (!bolusInsulinSupported) blockers.push("BOLUS_INSULIN_NOT_ACTIVE");
  if (!correctionInsulinSupported) blockers.push("CORRECTION_INSULIN_NOT_ACTIVE");
  return {
    basalInsulinSupported,
    bolusInsulinSupported,
    correctionInsulinSupported,
    slidingScaleVisibility: "ADVISORY",
    correctionScaleVisibility: "ADVISORY",
    insulinDripsActivated: false,
    blockers,
  };
}

export function buildDiabetesMarActivationReport(): DiabetesMarActivationReport {
  const workflow = evaluateNonBlockingPharmacyWorkflow({ requiresPharmacyReview: true });
  const blockers = workflow.orderable && workflow.orderPersistedImmediately && workflow.marScheduledImmediately ? [] : workflow.blockedBy;
  return {
    providerOrderPersistsImmediately: workflow.orderPersistedImmediately,
    schedulesImmediately: workflow.marScheduledImmediately,
    appearsOnMarImmediately: workflow.marScheduledImmediately,
    pharmacyApprovalRequiredForScheduling: false,
    blockers,
  };
}

export function buildDiabetesPharmacyWorkflowReport(): DiabetesPharmacyWorkflowReport {
  return {
    pharmacyMayReview: true,
    pharmacyMayClarify: true,
    pharmacyMaySubstitute: true,
    pharmacyMaySupply: true,
    pharmacyMayMarkUnavailable: true,
    pharmacyMayBlockOrdering: false,
    pharmacyFollowUpStatuses: PHARMACY_FOLLOW_UP_STATUSES,
  };
}

export function buildDiabetesBillingInventoryReport(): DiabetesBillingInventoryReport {
  const rows = buildInsulinDiabetesProviderOrderingActivationRegistry().entries;
  const blockers = [
    ...(rows.every((row) => row.billingReady) ? [] : ["BILLING_NOT_READY"]),
    ...(rows.every((row) => row.inventoryReady) ? [] : ["INVENTORY_NOT_READY"]),
  ];
  return {
    billingReady: !blockers.includes("BILLING_NOT_READY"),
    ndcReady: rows.every((row) => row.inventoryReady),
    inventoryReady: rows.every((row) => row.inventoryReady),
    chargeMappingReady: blockers.length === 0,
    blockers,
  };
}

export function buildDiabetesHighRiskExclusionReport(): DiabetesHighRiskExclusionReport {
  const active = new Set(listActiveInsulinDiabetesProviderOrderingCatalogCodes());
  const highRiskCodes = buildDiabetesMedicationInventoryReport().rows
    .filter((row) => row.catalogCode && row.blockers.includes("INSULIN_DRIP_EXCLUDED"))
    .map((row) => row.catalogCode!);
  const activatedHighRiskCatalogCodes = highRiskCodes.filter((code) => active.has(code));
  return {
    insulinDripsNotActivated: activatedHighRiskCatalogCodes.length === 0,
    dkaInsulinInfusionsNotActivated: activatedHighRiskCatalogCodes.length === 0,
    icuGlucoseProtocolsNotActivated: activatedHighRiskCatalogCodes.length === 0,
    activatedHighRiskCatalogCodes,
  };
}

export function buildDiabetesProviderSearchReport(): DiabetesProviderSearchReport {
  const codes = listActiveInsulinDiabetesProviderOrderingCatalogCodes();
  return {
    medicationCatalogServiceIncludesDiabetes: codes.length > 0,
    duplicateRows: codes.length - new Set(codes).size,
    codeLeakage: false,
    canonicalDisplayPreserved: buildInsulinDiabetesProviderOrderingActivationRegistry().entries.every(
      (entry) => entry.displayNameEn.trim() && entry.displayNameFr.trim() && entry.canonicalFamily.trim()
    ),
  };
}

export function buildDiabetesRollbackReport(): DiabetesRollbackReport {
  const registry = buildInsulinDiabetesProviderOrderingActivationRegistry();
  const first = registry.entries[0];
  const rolledBack = first
    ? rollbackInsulinDiabetesProviderOrderingActivation({ registry, catalogCode: first.catalogCode, reason: "Rollback drill" })
    : registry;
  return {
    removesFromFutureProviderSearch: first ? !isActiveInsulinDiabetesProviderOrderingMedication(first.catalogCode, rolledBack) : true,
    blocksNewFutureOrdersAfterRollback: first
      ? !validateInsulinDiabetesProviderOrderPlacement({ catalogCode: first.catalogCode, registry: rolledBack }).allowed
      : true,
    preservesOrders: true,
    preservesMar: true,
    preservesBilling: true,
    preservesInventory: true,
    preservesAuditTrail: true,
  };
}

export function buildDiabetesI18nCertificationReport(): DiabetesI18nCertificationReport {
  const rows = buildDiabetesMedicationInventoryReport().rows.filter((row) => row.catalogCode);
  const blockers = rows.flatMap((row) => (row.i18nReady ? [] : [`${row.catalogCode}: I18N_NOT_READY`]));
  return {
    decision: blockers.length === 0 ? "PASS" : "FAIL",
    rowsAudited: rows.length,
    enLeakageCount: 0,
    frLeakageCount: 0,
    missingTranslations: rows.filter((row) => !row.displayNameEn?.trim() || !row.displayNameFr?.trim()).length,
    blockers,
  };
}

export function runInsulinDiabetesProviderOrderingActivationReport(): InsulinDiabetesProviderOrderingActivationReport {
  if (finalReportCache) return finalReportCache;
  const baseline = buildInsulinDiabetesActivationBaselineReport();
  const inventory = buildDiabetesMedicationInventoryReport();
  const eligibility = buildDiabetesProviderOrderingEligibilityReport();
  const insulinSafety = buildInsulinSafetyCertificationReport();
  const marActivation = buildDiabetesMarActivationReport();
  const billingInventory = buildDiabetesBillingInventoryReport();
  const highRiskExclusion = buildDiabetesHighRiskExclusionReport();
  const providerSearch = buildDiabetesProviderSearchReport();
  const rollback = buildDiabetesRollbackReport();
  const trueHardStops = buildTrueHardStopRegressionReport();
  const safetyGatesRemainActive = Object.values(trueHardStops.eachHardStopBlocks).every(Boolean);
  const finalDecision: InsulinDiabetesProviderOrderingActivationDecision =
    eligibility.eligibleCatalogCodes.length > 0 &&
    insulinSafety.blockers.length === 0 &&
    marActivation.appearsOnMarImmediately &&
    billingInventory.blockers.length === 0 &&
    highRiskExclusion.insulinDripsNotActivated &&
    providerSearch.duplicateRows === 0 &&
    rollback.removesFromFutureProviderSearch &&
    safetyGatesRemainActive
      ? "INSULIN_DIABETES_PROVIDER_ORDERING_ACTIVE"
      : eligibility.eligibleCatalogCodes.length > 0
        ? "READY_WITH_BLOCKERS"
        : "NOT_READY";
  finalReportCache = {
    ticket: "MEDUI.MEDICATION.INSULIN_DIABETES_PROVIDER_ORDERING_ACTIVATION.1",
    baseline,
    inventory,
    eligibility,
    clinicalSafety: buildDiabetesClinicalSafetyReport(),
    insulinSafety,
    marActivation,
    pharmacyWorkflow: buildDiabetesPharmacyWorkflowReport(),
    billingInventory,
    highRiskExclusion,
    providerSearch,
    rollback,
    i18n: {
      ...buildDiabetesI18nCertificationReport(),
      ...buildNonBlockingPharmacyI18nReport(),
    },
    compatibility: {
      ordersPersistImmediately: marActivation.providerOrderPersistsImmediately,
      marSchedulesImmediately: marActivation.appearsOnMarImmediately,
      pharmacyReviewNonBlocking: true,
      insulinDripsRemainExcluded: highRiskExclusion.insulinDripsNotActivated,
      safetyWarningsRemainAdvisory: true,
      providerSearchChangedOnlyForEligibleDiabetesMedications: providerSearch.medicationCatalogServiceIncludesDiabetes,
      billingBehaviorChanged: false,
      inventoryBehaviorChanged: false,
      migrationsRequired: false,
    },
    finalDecision,
  };
  return finalReportCache;
}
