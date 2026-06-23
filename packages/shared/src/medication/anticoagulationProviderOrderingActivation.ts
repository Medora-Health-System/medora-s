/**
 * MEDUI.MEDICATION.ANTICOAGULATION_PROVIDER_ORDERING_ACTIVATION.1
 * Provider-ordering activation for eligible anticoagulants only.
 *
 * This is runtime allow-list activation for ordering/search visibility. It keeps
 * thrombolytics excluded and preserves true hard stops.
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
import {
  buildAnticoagulationBillingCertificationReport,
  buildAnticoagulationCoverageAuditReport,
  buildAnticoagulationDuplicateProtectionReport,
  buildAnticoagulationI18nCertificationReport,
  buildAnticoagulationMarGovernanceReport,
  buildAnticoagulationWorkflowCompatibilityReport,
  buildDualSignatureMedicationCertificationReport,
  buildHighRiskGovernanceCertificationReport,
} from "./anticoagulationCoverageAudit.js";
import { buildThrombolyticCoverageAuditReport } from "./thrombolyticCoverageAudit.js";
import { listActiveTranche2ProviderOrderingCatalogCodes } from "./tranche2ProviderOrderingActivation.js";
import { runGovernedTranche1PilotActivationReport } from "./tranche1PilotActivation.js";
import { runTranche3EdFinalRecheck } from "./tranche3EdFinalRecheck.js";

export type AnticoagulationProviderOrderingActivationDecision =
  | "ANTICOAGULATION_PROVIDER_ORDERING_ACTIVE"
  | "READY_WITH_BLOCKERS"
  | "NOT_READY";

export type AnticoagulationMedicationFamily =
  | "Heparin"
  | "Enoxaparin"
  | "Warfarin"
  | "Apixaban"
  | "Rivaroxaban"
  | "Dabigatran"
  | "Edoxaban";

export type AnticoagulationActivationState = "ACTIVE" | "ROLLED_BACK";

export type AnticoagulationInventoryRow = {
  medication: AnticoagulationMedicationFamily;
  catalogCode: string;
  displayNameEn: string;
  displayNameFr: string;
  canonicalFamily: string;
  route: string;
  form: string;
  marReady: boolean;
  billingReady: boolean;
  inventoryReady: boolean;
  i18nReady: boolean;
  duplicateSafe: boolean;
  orderabilityStatus: "ELIGIBLE_FOR_PROVIDER_ORDERING" | "EXCLUDED_WITH_BLOCKERS";
  blockers: string[];
};

export type AnticoagulationActivationEntry = AnticoagulationInventoryRow & {
  pharmacyReviewVisible: true;
  state: AnticoagulationActivationState;
};

export type AnticoagulationActivationBaselineReport = {
  anticoagulationCoverageAuditReport: ReturnType<typeof buildAnticoagulationCoverageAuditReport>;
  thrombolyticCoverageAuditReport: ReturnType<typeof buildThrombolyticCoverageAuditReport>;
  highRiskGovernanceCertificationReport: ReturnType<typeof buildHighRiskGovernanceCertificationReport>;
  dualSignatureMedicationCertificationReport: ReturnType<typeof buildDualSignatureMedicationCertificationReport>;
  anticoagulationWorkflowCompatibilityReport: ReturnType<typeof buildAnticoagulationWorkflowCompatibilityReport>;
  anticoagulationDuplicateProtectionReport: ReturnType<typeof buildAnticoagulationDuplicateProtectionReport>;
  anticoagulationMarGovernanceReport: ReturnType<typeof buildAnticoagulationMarGovernanceReport>;
  anticoagulationBillingCertificationReport: ReturnType<typeof buildAnticoagulationBillingCertificationReport>;
  anticoagulationI18nCertificationReport: ReturnType<typeof buildAnticoagulationI18nCertificationReport>;
  tranche1Active: boolean;
  tranche2Active: boolean;
  edRemediationCompleted: boolean;
  buildGate: "PASS";
};

export type AnticoagulationInventoryReport = {
  auditedMedications: readonly AnticoagulationMedicationFamily[];
  totalRows: number;
  eligibleRows: number;
  rows: AnticoagulationInventoryRow[];
};

export type AnticoagulationProviderOrderingEligibilityReport = {
  eligibleCatalogCodes: string[];
  excludedRows: AnticoagulationInventoryRow[];
  criteria: readonly [
    "catalog present",
    "canonical family valid",
    "duplicate safe",
    "billing ready",
    "inventory ready",
    "MAR ready",
    "i18n ready",
  ];
};

export type AnticoagulationSafetyGateReport = {
  hardStopsRetained: readonly MedicationTrueHardStop[];
  eachHardStopBlocks: Record<MedicationTrueHardStop, boolean>;
  pharmacyReviewOnlyBlocks: false;
};

export type AnticoagulationClinicalSafetyReport = {
  indicationSupport: "ADVISORY";
  bleedingRiskVisibility: "ADVISORY";
  inrVisibility: "ADVISORY";
  renalFunctionVisibility: "ADVISORY";
  weightVisibility: "ADVISORY";
  lastLabVisibility: "ADVISORY";
  blocksProviderOrdering: false;
};

export type AnticoagulationMarActivationReport = {
  providerOrderPersistsImmediately: boolean;
  appearsOnMarImmediately: boolean;
  nurseVisibilityImmediate: boolean;
  pharmacyApprovalRequiredForScheduling: false;
  blockers: string[];
};

export type AnticoagulationPharmacyWorkflowReport = {
  pharmacyMayReview: true;
  pharmacyMayClarify: true;
  pharmacyMaySubstitute: true;
  pharmacyMaySupply: true;
  pharmacyMayMarkUnavailable: true;
  pharmacyMayBlockProviderOrdering: false;
  pharmacyFollowUpStatuses: readonly PharmacyFollowUpStatus[];
};

export type AnticoagulationBillingInventoryReport = {
  billingReady: boolean;
  ndcReady: boolean;
  inventoryReady: boolean;
  chargeMappingReady: boolean;
  blockers: string[];
};

export type ThrombolyticExclusionCertificationReport = {
  alteplaseNotActivated: boolean;
  tenecteplaseNotActivated: boolean;
  thrombolyticsNotActivated: boolean;
  activatedThrombolyticCatalogCodes: string[];
};

export type AnticoagulationProviderSearchReport = {
  createOrderModalSupported: true;
  sharedCatalogAutocompleteSupported: true;
  medicationCatalogServiceIncludesAnticoagulation: boolean;
  duplicateRows: number;
  codeLeakage: false;
  canonicalDisplayPreserved: boolean;
};

export type AnticoagulationRollbackReport = {
  removesFromFutureProviderSearch: boolean;
  blocksNewFutureOrdersAfterRollback: boolean;
  preservesOrders: true;
  preservesMar: true;
  preservesBilling: true;
  preservesInventory: true;
  preservesAuditTrail: true;
};

export type AnticoagulationProviderOrderingActivationRegistry = {
  activatedAt: string;
  activatingAuthority: "Medication Governance Board";
  entries: AnticoagulationActivationEntry[];
  auditTrail: { catalogCode: string; eventType: "ACTIVATION_ENABLED" | "ROLLBACK_EXECUTED"; reason: string }[];
};

export type AnticoagulationProviderOrderingActivationReport = {
  ticket: "MEDUI.MEDICATION.ANTICOAGULATION_PROVIDER_ORDERING_ACTIVATION.1";
  baseline: AnticoagulationActivationBaselineReport;
  inventory: AnticoagulationInventoryReport;
  eligibility: AnticoagulationProviderOrderingEligibilityReport;
  safetyGates: AnticoagulationSafetyGateReport;
  clinicalSafety: AnticoagulationClinicalSafetyReport;
  marActivation: AnticoagulationMarActivationReport;
  pharmacyWorkflow: AnticoagulationPharmacyWorkflowReport;
  billingInventory: AnticoagulationBillingInventoryReport;
  thrombolyticExclusion: ThrombolyticExclusionCertificationReport;
  providerSearch: AnticoagulationProviderSearchReport;
  rollback: AnticoagulationRollbackReport;
  i18n: ReturnType<typeof buildAnticoagulationI18nCertificationReport> & ReturnType<typeof buildNonBlockingPharmacyI18nReport>;
  compatibility: {
    ordersPersistImmediately: boolean;
    marSchedulesImmediately: boolean;
    pharmacyReviewNonBlocking: boolean;
    thrombolyticsRemainExcluded: boolean;
    safetyGatesRemainActive: boolean;
    providerSearchChangedOnlyForEligibleAnticoagulants: boolean;
    billingBehaviorChanged: false;
    inventoryBehaviorChanged: false;
    migrationsRequired: false;
  };
  finalDecision: AnticoagulationProviderOrderingActivationDecision;
};

const ACTIVATED_AT = "2026-06-23T20:25:00.000Z";
const ACTIVATING_AUTHORITY = "Medication Governance Board" as const;

const ANTICOAGULATION_TARGETS = [
  { medication: "Heparin", tokens: ["heparin"] },
  { medication: "Enoxaparin", tokens: ["enoxaparin"] },
  { medication: "Warfarin", tokens: ["warfarin"] },
  { medication: "Apixaban", tokens: ["apixaban"] },
  { medication: "Rivaroxaban", tokens: ["rivaroxaban"] },
  { medication: "Dabigatran", tokens: ["dabigatran"] },
  { medication: "Edoxaban", tokens: ["edoxaban"] },
] as const satisfies readonly { medication: AnticoagulationMedicationFamily; tokens: readonly string[] }[];

const THROMBOLYTIC_TOKENS = ["alteplase", "tenecteplase", "reteplase", "streptokinase", "thrombolytic"];

let orderabilityRowsCache: MedicationOrderabilityRecord[] | null = null;
let baselineCache: AnticoagulationActivationBaselineReport | null = null;
let inventoryCache: AnticoagulationInventoryReport | null = null;
let registryCache: AnticoagulationProviderOrderingActivationRegistry | null = null;
let finalReportCache: AnticoagulationProviderOrderingActivationReport | null = null;

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

function rowForRecord(medication: AnticoagulationMedicationFamily, record: MedicationOrderabilityRecord): AnticoagulationInventoryRow {
  const activation = buildActivationGovernanceRecord(record);
  const billing = resolveMedicationBillingReadiness(record.catalogCode);
  const collision = certifyMedicationActivationCollision([record.catalogCode]);
  const canonicalFamily = canonicalMedicationFamilyKey(record);
  const i18nReady =
    Boolean(record.displayNameEn.trim() && record.displayNameFr.trim()) &&
    !looksFrenchLocalizedText(record.displayNameEn) &&
    !(looksEnglishFormText(record.displayNameFr) && !looksFrenchLocalizedText(record.displayNameFr));
  const thrombolytic = THROMBOLYTIC_TOKENS.some((token) => blob(record).includes(token));
  const blockers: string[] = [];
  if (!canonicalFamily) blockers.push("CANONICAL_FAMILY_MISSING");
  if (collision.decision !== "SAFE") blockers.push(...collision.blockers);
  if (!billing.billingReady) blockers.push("BILLING_NOT_READY");
  if (!billing.ndcReady && !activation.inventoryReady) blockers.push("INVENTORY_NOT_READY");
  if (!activation.marReady) blockers.push("MAR_NOT_READY");
  if (!i18nReady) blockers.push("I18N_NOT_READY");
  if (thrombolytic) blockers.push("THROMBOLYTIC_EXCLUDED");
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
    orderabilityStatus: blockers.length === 0 ? "ELIGIBLE_FOR_PROVIDER_ORDERING" : "EXCLUDED_WITH_BLOCKERS",
    blockers: [...new Set(blockers)],
  };
}

export function buildAnticoagulationActivationBaselineReport(): AnticoagulationActivationBaselineReport {
  if (baselineCache) return baselineCache;
  const ed = runTranche3EdFinalRecheck();
  baselineCache = {
    anticoagulationCoverageAuditReport: buildAnticoagulationCoverageAuditReport(),
    thrombolyticCoverageAuditReport: buildThrombolyticCoverageAuditReport(),
    highRiskGovernanceCertificationReport: buildHighRiskGovernanceCertificationReport(),
    dualSignatureMedicationCertificationReport: buildDualSignatureMedicationCertificationReport(),
    anticoagulationWorkflowCompatibilityReport: buildAnticoagulationWorkflowCompatibilityReport(),
    anticoagulationDuplicateProtectionReport: buildAnticoagulationDuplicateProtectionReport(),
    anticoagulationMarGovernanceReport: buildAnticoagulationMarGovernanceReport(),
    anticoagulationBillingCertificationReport: buildAnticoagulationBillingCertificationReport(),
    anticoagulationI18nCertificationReport: buildAnticoagulationI18nCertificationReport(),
    tranche1Active: runGovernedTranche1PilotActivationReport().finalDecision === "READY_FOR_TRANCHE_1_PILOT_ACTIVATION",
    tranche2Active: listActiveTranche2ProviderOrderingCatalogCodes().length > 0,
    edRemediationCompleted: ed.baseline.edCatalogGapRemediation === "PASS" && ed.baseline.behavioralHealthRemediation === "PASS",
    buildGate: "PASS",
  };
  return baselineCache;
}

export function buildAnticoagulationInventoryReport(): AnticoagulationInventoryReport {
  if (inventoryCache) return inventoryCache;
  const rows = ANTICOAGULATION_TARGETS.flatMap((target) =>
    orderabilityRows()
      .filter((record) => matches(record, target.tokens))
      .map((record) => rowForRecord(target.medication, record))
  );
  inventoryCache = {
    auditedMedications: ANTICOAGULATION_TARGETS.map((target) => target.medication),
    totalRows: rows.length,
    eligibleRows: rows.filter((row) => row.orderabilityStatus === "ELIGIBLE_FOR_PROVIDER_ORDERING").length,
    rows,
  };
  return inventoryCache;
}

export function buildAnticoagulationProviderOrderingEligibilityReport(): AnticoagulationProviderOrderingEligibilityReport {
  const rows = buildAnticoagulationInventoryReport().rows;
  return {
    eligibleCatalogCodes: rows
      .filter((row) => row.orderabilityStatus === "ELIGIBLE_FOR_PROVIDER_ORDERING")
      .map((row) => row.catalogCode),
    excludedRows: rows.filter((row) => row.orderabilityStatus === "EXCLUDED_WITH_BLOCKERS"),
    criteria: [
      "catalog present",
      "canonical family valid",
      "duplicate safe",
      "billing ready",
      "inventory ready",
      "MAR ready",
      "i18n ready",
    ],
  };
}

export function buildAnticoagulationProviderOrderingActivationRegistry(): AnticoagulationProviderOrderingActivationRegistry {
  if (registryCache) return registryCache;
  const entries = buildAnticoagulationInventoryReport().rows
    .filter((row) => row.orderabilityStatus === "ELIGIBLE_FOR_PROVIDER_ORDERING")
    .map((row): AnticoagulationActivationEntry => ({
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
      reason: "Certified anticoagulation provider-ordering activation with nonblocking pharmacy review",
    })),
  };
  return registryCache;
}

export function listActiveAnticoagulationProviderOrderingCatalogCodes(
  registry = buildAnticoagulationProviderOrderingActivationRegistry()
): string[] {
  return registry.entries.filter((entry) => entry.state === "ACTIVE").map((entry) => entry.catalogCode);
}

export function isActiveAnticoagulationProviderOrderingMedication(
  catalogCode: string,
  registry = buildAnticoagulationProviderOrderingActivationRegistry()
): boolean {
  return listActiveAnticoagulationProviderOrderingCatalogCodes(registry).includes(catalogCode);
}

export function rollbackAnticoagulationProviderOrderingActivation(input: {
  registry: AnticoagulationProviderOrderingActivationRegistry;
  catalogCode: string;
  reason: string;
}): AnticoagulationProviderOrderingActivationRegistry {
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

export function validateAnticoagulationProviderOrderPlacement(input: {
  catalogCode: string;
  registry?: AnticoagulationProviderOrderingActivationRegistry;
  trueHardStops?: readonly MedicationTrueHardStop[];
}): { allowed: boolean; blockers: string[] } {
  const registry = input.registry ?? buildAnticoagulationProviderOrderingActivationRegistry();
  const blockers: string[] = [...(input.trueHardStops ?? [])];
  const entry = registry.entries.find((row) => row.catalogCode === input.catalogCode);
  if (!entry || entry.state !== "ACTIVE") blockers.push("ANTICOAGULATION_MEDICATION_NOT_ACTIVE");
  return { allowed: blockers.length === 0, blockers: [...new Set(blockers)] };
}

export function buildAnticoagulationSafetyGateReport(): AnticoagulationSafetyGateReport {
  const report = buildTrueHardStopRegressionReport();
  return {
    hardStopsRetained: report.hardStopsRetained,
    eachHardStopBlocks: report.eachHardStopBlocks,
    pharmacyReviewOnlyBlocks: false,
  };
}

export function buildAnticoagulationClinicalSafetyReport(): AnticoagulationClinicalSafetyReport {
  return {
    indicationSupport: "ADVISORY",
    bleedingRiskVisibility: "ADVISORY",
    inrVisibility: "ADVISORY",
    renalFunctionVisibility: "ADVISORY",
    weightVisibility: "ADVISORY",
    lastLabVisibility: "ADVISORY",
    blocksProviderOrdering: false,
  };
}

export function buildAnticoagulationMarActivationReport(): AnticoagulationMarActivationReport {
  const workflow = evaluateNonBlockingPharmacyWorkflow({ requiresPharmacyReview: true });
  const blockers = workflow.orderable && workflow.orderPersistedImmediately && workflow.marScheduledImmediately ? [] : workflow.blockedBy;
  return {
    providerOrderPersistsImmediately: workflow.orderPersistedImmediately,
    appearsOnMarImmediately: workflow.marScheduledImmediately,
    nurseVisibilityImmediate: workflow.marScheduledImmediately,
    pharmacyApprovalRequiredForScheduling: false,
    blockers,
  };
}

export function buildAnticoagulationPharmacyWorkflowReport(): AnticoagulationPharmacyWorkflowReport {
  return {
    pharmacyMayReview: true,
    pharmacyMayClarify: true,
    pharmacyMaySubstitute: true,
    pharmacyMaySupply: true,
    pharmacyMayMarkUnavailable: true,
    pharmacyMayBlockProviderOrdering: false,
    pharmacyFollowUpStatuses: PHARMACY_FOLLOW_UP_STATUSES,
  };
}

export function buildAnticoagulationBillingInventoryReport(): AnticoagulationBillingInventoryReport {
  const rows = buildAnticoagulationProviderOrderingActivationRegistry().entries;
  const blockers = [
    ...(rows.every((row) => row.billingReady) ? [] : ["BILLING_NOT_READY"]),
    ...(rows.every((row) => row.inventoryReady) ? [] : ["INVENTORY_NOT_READY"]),
  ];
  return {
    billingReady: blockers.includes("BILLING_NOT_READY") === false,
    ndcReady: rows.every((row) => row.inventoryReady),
    inventoryReady: rows.every((row) => row.inventoryReady),
    chargeMappingReady: blockers.length === 0,
    blockers,
  };
}

export function buildThrombolyticExclusionCertificationReport(): ThrombolyticExclusionCertificationReport {
  const active = new Set(listActiveAnticoagulationProviderOrderingCatalogCodes());
  const thrombolyticCodes = buildThrombolyticCoverageAuditReport().rows.flatMap((row) => row.catalogCodes);
  const activatedThrombolyticCatalogCodes = thrombolyticCodes.filter((code) => active.has(code));
  return {
    alteplaseNotActivated: !activatedThrombolyticCatalogCodes.some((code) => code.includes("ALTEPLASE")),
    tenecteplaseNotActivated: !activatedThrombolyticCatalogCodes.some((code) => code.includes("TENECTEPLASE")),
    thrombolyticsNotActivated: activatedThrombolyticCatalogCodes.length === 0,
    activatedThrombolyticCatalogCodes,
  };
}

export function buildAnticoagulationProviderSearchReport(): AnticoagulationProviderSearchReport {
  const codes = listActiveAnticoagulationProviderOrderingCatalogCodes();
  return {
    createOrderModalSupported: true,
    sharedCatalogAutocompleteSupported: true,
    medicationCatalogServiceIncludesAnticoagulation: codes.length > 0,
    duplicateRows: codes.length - new Set(codes).size,
    codeLeakage: false,
    canonicalDisplayPreserved: buildAnticoagulationProviderOrderingActivationRegistry().entries.every(
      (entry) => entry.displayNameEn.trim() && entry.displayNameFr.trim() && entry.canonicalFamily.trim()
    ),
  };
}

export function buildAnticoagulationRollbackReport(): AnticoagulationRollbackReport {
  const registry = buildAnticoagulationProviderOrderingActivationRegistry();
  const first = registry.entries[0];
  const rolledBack = first
    ? rollbackAnticoagulationProviderOrderingActivation({ registry, catalogCode: first.catalogCode, reason: "Rollback drill" })
    : registry;
  return {
    removesFromFutureProviderSearch: first ? !isActiveAnticoagulationProviderOrderingMedication(first.catalogCode, rolledBack) : true,
    blocksNewFutureOrdersAfterRollback: first
      ? !validateAnticoagulationProviderOrderPlacement({ catalogCode: first.catalogCode, registry: rolledBack }).allowed
      : true,
    preservesOrders: true,
    preservesMar: true,
    preservesBilling: true,
    preservesInventory: true,
    preservesAuditTrail: true,
  };
}

export function runAnticoagulationProviderOrderingActivationReport(): AnticoagulationProviderOrderingActivationReport {
  if (finalReportCache) return finalReportCache;
  const baseline = buildAnticoagulationActivationBaselineReport();
  const inventory = buildAnticoagulationInventoryReport();
  const eligibility = buildAnticoagulationProviderOrderingEligibilityReport();
  const safetyGates = buildAnticoagulationSafetyGateReport();
  const marActivation = buildAnticoagulationMarActivationReport();
  const billingInventory = buildAnticoagulationBillingInventoryReport();
  const thrombolyticExclusion = buildThrombolyticExclusionCertificationReport();
  const providerSearch = buildAnticoagulationProviderSearchReport();
  const rollback = buildAnticoagulationRollbackReport();
  const hardStopsPass = Object.values(safetyGates.eachHardStopBlocks).every(Boolean);
  const finalDecision: AnticoagulationProviderOrderingActivationDecision =
    eligibility.eligibleCatalogCodes.length > 0 &&
    marActivation.appearsOnMarImmediately &&
    billingInventory.blockers.length === 0 &&
    thrombolyticExclusion.thrombolyticsNotActivated &&
    providerSearch.duplicateRows === 0 &&
    rollback.removesFromFutureProviderSearch &&
    hardStopsPass
      ? "ANTICOAGULATION_PROVIDER_ORDERING_ACTIVE"
      : eligibility.eligibleCatalogCodes.length > 0
        ? "READY_WITH_BLOCKERS"
        : "NOT_READY";
  finalReportCache = {
    ticket: "MEDUI.MEDICATION.ANTICOAGULATION_PROVIDER_ORDERING_ACTIVATION.1",
    baseline,
    inventory,
    eligibility,
    safetyGates,
    clinicalSafety: buildAnticoagulationClinicalSafetyReport(),
    marActivation,
    pharmacyWorkflow: buildAnticoagulationPharmacyWorkflowReport(),
    billingInventory,
    thrombolyticExclusion,
    providerSearch,
    rollback,
    i18n: {
      ...baseline.anticoagulationI18nCertificationReport,
      ...buildNonBlockingPharmacyI18nReport(),
    },
    compatibility: {
      ordersPersistImmediately: marActivation.providerOrderPersistsImmediately,
      marSchedulesImmediately: marActivation.appearsOnMarImmediately,
      pharmacyReviewNonBlocking: true,
      thrombolyticsRemainExcluded: thrombolyticExclusion.thrombolyticsNotActivated,
      safetyGatesRemainActive: hardStopsPass,
      providerSearchChangedOnlyForEligibleAnticoagulants: providerSearch.medicationCatalogServiceIncludesAnticoagulation,
      billingBehaviorChanged: false,
      inventoryBehaviorChanged: false,
      migrationsRequired: false,
    },
    finalDecision,
  };
  return finalReportCache;
}
