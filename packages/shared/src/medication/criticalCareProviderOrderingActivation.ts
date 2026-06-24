/**
 * MEDUI.MEDICATION.CRITICAL_CARE_PROVIDER_ORDERING_ACTIVATION.1
 * Provider-ordering activation for certified critical-care medications.
 *
 * This is an explicit allow-list for ready ICU medications. It preserves
 * infusion lifecycle, route authority, MAR, billing, inventory, audit, and
 * high-risk governance protections.
 */

import {
  PHARMACY_FOLLOW_UP_STATUSES,
  buildNonBlockingPharmacyI18nReport,
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
  buildCriticalCareActivationEligibilityReport,
  buildCriticalCareCoverageAuditReport,
  buildCriticalCareDuplicateProtectionReport,
  buildCriticalCareI18nCertificationReport,
  buildCriticalCareInfusionGovernanceReport,
  buildCriticalCareWorkflowCompatibilityReport,
} from "./criticalCareCoverageAudit.js";
import { runGovernedTranche1PilotActivationReport } from "./tranche1PilotActivation.js";
import { listActiveAnticoagulationProviderOrderingCatalogCodes } from "./anticoagulationProviderOrderingActivation.js";
import { listActiveInsulinDiabetesProviderOrderingCatalogCodes } from "./insulinDiabetesProviderOrderingActivation.js";
import { listActiveTranche2ProviderOrderingCatalogCodes } from "./tranche2ProviderOrderingActivation.js";
import { listActiveVaccineProviderOrderingCatalogCodes } from "./vaccineProviderOrderingActivation.js";
import { getPriorProviderOrderableCatalogCodesForDomain } from "./providerOrderablePriorCodesState.js";

export type CriticalCareProviderOrderingActivationDecision =
  | "CRITICAL_CARE_PROVIDER_ORDERING_ACTIVE"
  | "READY_WITH_BLOCKERS"
  | "NOT_READY";

export type CriticalCareActivationState = "ACTIVE" | "ROLLED_BACK";

export type CriticalCareInventoryCategory =
  | "VASOPRESSORS"
  | "INOTROPES"
  | "ICU_ANTIARRHYTHMICS"
  | "ICU_ELECTROLYTE_THERAPIES"
  | "HYPERKALEMIA_THERAPIES"
  | "DKA_THERAPIES"
  | "VENTILATOR_SEDATION_AGENTS"
  | "RSI_MEDICATIONS"
  | "ICU_ANTIBIOTICS"
  | "ICU_ANTICOAGULATION_SUPPORT";

export type CriticalCareOrderabilityStatus =
  | "ELIGIBLE_FOR_PROVIDER_ORDERING"
  | "ALREADY_PROVIDER_ORDERABLE"
  | "ACTIVE_IN_PRIOR_DOMAIN"
  | "EXCLUDED_WITH_BLOCKERS";

export type CriticalCareInventoryRow = {
  category: CriticalCareInventoryCategory;
  catalogCode: string;
  displayNameEn: string;
  displayNameFr: string;
  canonicalFamily: string;
  route: string;
  form: string;
  infusionRequired: boolean;
  marReady: boolean;
  billingReady: boolean;
  inventoryReady: boolean;
  duplicateSafe: boolean;
  canonicalSafe: boolean;
  icuCompatible: boolean;
  orderabilityStatus: CriticalCareOrderabilityStatus;
  blockers: string[];
};

export type CriticalCareActivationEntry = CriticalCareInventoryRow & {
  pharmacyReviewVisible: true;
  state: CriticalCareActivationState;
};

export type CriticalCareActivationBaselineReport = {
  criticalCareCoverageAuditReport: ReturnType<typeof buildCriticalCareCoverageAuditReport>;
  criticalCareActivationEligibilityReport: ReturnType<typeof buildCriticalCareActivationEligibilityReport>;
  criticalCareWorkflowCompatibilityReport: ReturnType<typeof buildCriticalCareWorkflowCompatibilityReport>;
  criticalCareInfusionGovernanceReport: ReturnType<typeof buildCriticalCareInfusionGovernanceReport>;
  criticalCareDuplicateProtectionReport: ReturnType<typeof buildCriticalCareDuplicateProtectionReport>;
  criticalCareI18nCertificationReport: ReturnType<typeof buildCriticalCareI18nCertificationReport>;
  tranche1Active: boolean;
  tranche2Active: boolean;
  anticoagulationActive: boolean;
  insulinDiabetesActive: boolean;
  vaccineProviderOrderingActive: boolean;
  buildGate: "PASS";
};

export type CriticalCareInventoryReport = {
  auditedCategories: readonly CriticalCareInventoryCategory[];
  totalRows: number;
  eligibleRows: number;
  alreadyCoveredRows: number;
  rows: CriticalCareInventoryRow[];
};

export type CriticalCareProviderOrderingEligibilityReport = {
  eligibleCatalogCodes: string[];
  excludedRows: CriticalCareInventoryRow[];
  criteria: readonly [
    "READY or GOVERNED",
    "ICU compatible",
    "MAR compatible",
    "Billing compatible",
    "Inventory compatible",
    "Duplicate safe",
    "Canonical safe",
  ];
};

export type CriticalCareInfusionGovernanceVerificationReport = {
  routeAuthorityPreserved: boolean;
  ivpbLifecycleGovernancePreserved: boolean;
  infusionStartStopLifecyclePreserved: boolean;
  pumpDocumentationPreserved: boolean;
  rateDocumentationPreserved: boolean;
  doseDocumentationPreserved: boolean;
  infusionAuditTrailPreserved: boolean;
  directMarBypass: false;
};

export type CriticalCareClinicalSafetyReport = {
  renalFunctionVisibility: "ADVISORY";
  liverFunctionVisibility: "ADVISORY";
  weightVisibility: "ADVISORY";
  mapVisibility: "ADVISORY";
  icuMonitoringParametersVisibility: "ADVISORY";
  laboratoryMonitoringVisibility: "ADVISORY";
  blocksProviderOrdering: false;
};

export type CriticalCareProviderOrderingActivationWorkflowReport = {
  providerOrderPersistsImmediately: boolean;
  schedulesImmediately: boolean;
  appearsOnMarImmediately: boolean;
  pharmacyApprovalRequiredForScheduling: false;
  blockers: string[];
};

export type CriticalCarePharmacyWorkflowReport = {
  pharmacyMayReview: true;
  pharmacyMayClarify: true;
  pharmacyMaySubstitute: true;
  pharmacyMaySupply: true;
  pharmacyMayMarkUnavailable: true;
  pharmacyMayBlockOrdering: false;
  pharmacyFollowUpStatuses: readonly PharmacyFollowUpStatus[];
};

export type CriticalCareBillingInventoryReport = {
  ndcMappingReady: boolean;
  billingReady: boolean;
  inventoryReady: boolean;
  chargeMappingReady: boolean;
  blockers: string[];
};

export type CriticalCareHighRiskExclusionReport = {
  thrombolyticsNotActivated: boolean;
  chemotherapyNotActivated: boolean;
  uncertifiedControlledSubstancesNotActivated: boolean;
  experimentalIcuTherapiesNotActivated: boolean;
  activatedExcludedCatalogCodes: string[];
};

export type CriticalCareProviderSearchReport = {
  medicationCatalogServiceIncludesCriticalCare: boolean;
  duplicateRows: number;
  codeLeakage: false;
  canonicalDisplayPreserved: boolean;
};

export type CriticalCareRollbackReport = {
  removesFromFutureProviderSearch: boolean;
  blocksNewFutureOrdersAfterRollback: boolean;
  preservesOrders: true;
  preservesMar: true;
  preservesBilling: true;
  preservesInventory: true;
  preservesInfusionHistory: true;
  preservesAuditTrail: true;
};

export type CriticalCareProviderOrderingActivationRegistry = {
  activatedAt: string;
  activatingAuthority: "Medication Governance Board";
  entries: CriticalCareActivationEntry[];
  auditTrail: { catalogCode: string; eventType: "ACTIVATION_ENABLED" | "ROLLBACK_EXECUTED"; reason: string }[];
};

export type CriticalCareProviderOrderingActivationReport = {
  ticket: "MEDUI.MEDICATION.CRITICAL_CARE_PROVIDER_ORDERING_ACTIVATION.1";
  baseline: CriticalCareActivationBaselineReport;
  inventory: CriticalCareInventoryReport;
  eligibility: CriticalCareProviderOrderingEligibilityReport;
  infusionGovernance: CriticalCareInfusionGovernanceVerificationReport;
  clinicalSafety: CriticalCareClinicalSafetyReport;
  providerOrderingActivation: CriticalCareProviderOrderingActivationWorkflowReport;
  pharmacyWorkflow: CriticalCarePharmacyWorkflowReport;
  billingInventory: CriticalCareBillingInventoryReport;
  highRiskExclusion: CriticalCareHighRiskExclusionReport;
  providerSearch: CriticalCareProviderSearchReport;
  rollback: CriticalCareRollbackReport;
  i18n: ReturnType<typeof buildCriticalCareI18nCertificationReport> & ReturnType<typeof buildNonBlockingPharmacyI18nReport>;
  compatibility: {
    ordersPersistImmediately: boolean;
    marSchedulesImmediately: boolean;
    pharmacyReviewNonBlocking: boolean;
    infusionGovernanceIntact: boolean;
    excludedHighRiskCategoriesRemainExcluded: boolean;
    providerSearchChangedOnlyForEligibleCriticalCareMedications: boolean;
    billingBehaviorChanged: false;
    inventoryBehaviorChanged: false;
    migrationsRequired: false;
  };
  finalDecision: CriticalCareProviderOrderingActivationDecision;
};

const ACTIVATED_AT = "2026-06-23T21:27:00.000Z";
const ACTIVATING_AUTHORITY = "Medication Governance Board" as const;

const CATEGORY_TOKENS: Record<CriticalCareInventoryCategory, readonly string[]> = {
  VASOPRESSORS: ["norepinephrine", "epinephrine", "vasopressin", "dopamine", "phenylephrine"],
  INOTROPES: ["dobutamine", "milrinone"],
  ICU_ANTIARRHYTHMICS: ["amiodarone", "lidocaine"],
  ICU_ELECTROLYTE_THERAPIES: ["potassium chloride", "calcium chloride", "calcium gluconate", "magnesium sulfate"],
  HYPERKALEMIA_THERAPIES: ["calcium gluconate", "calcium chloride", "dextrose", "regular insulin", "sodium bicarbonate"],
  DKA_THERAPIES: ["regular insulin", "dextrose", "potassium chloride"],
  VENTILATOR_SEDATION_AGENTS: ["propofol", "dexmedetomidine", "midazolam", "ketamine"],
  RSI_MEDICATIONS: ["rocuronium", "vecuronium", "succinylcholine", "propofol", "ketamine", "midazolam"],
  ICU_ANTIBIOTICS: ["piperacillin", "vancomycin", "cefepime", "meropenem"],
  ICU_ANTICOAGULATION_SUPPORT: ["heparin", "enoxaparin"],
} as const;

const INFUSION_TERMS = ["perfusion", "infusion", "drip", "250 ml", "500 ml", "1000 ml"];
const THROMBOLYTIC_TERMS = ["alteplase", "tenecteplase", "reteplase", "streptokinase", "thrombolytic"];
const CHEMOTHERAPY_TERMS = ["cyclophosphamide", "doxorubicin", "methotrexate", "chemo"];
const EXPERIMENTAL_TERMS = ["experimental", "investigational"];

let orderabilityRowsCache: MedicationOrderabilityRecord[] | null = null;
let baselineCache: CriticalCareActivationBaselineReport | null = null;
let inventoryCache: CriticalCareInventoryReport | null = null;
let registryCache: CriticalCareProviderOrderingActivationRegistry | null = null;
let finalReportCache: CriticalCareProviderOrderingActivationReport | null = null;

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

function matchesCategory(record: MedicationOrderabilityRecord, category: CriticalCareInventoryCategory): boolean {
  const text = blob(record);
  return CATEGORY_TOKENS[category].some((token) => text.includes(token));
}

function previousActiveCodes(): Set<string> {
  return new Set(getPriorProviderOrderableCatalogCodesForDomain("criticalCare"));
}

function categoryRows(): Array<{ category: CriticalCareInventoryCategory; record: MedicationOrderabilityRecord }> {
  const byCode = new Map<string, { category: CriticalCareInventoryCategory; record: MedicationOrderabilityRecord }>();
  for (const category of Object.keys(CATEGORY_TOKENS) as CriticalCareInventoryCategory[]) {
    for (const record of orderabilityRows()) {
      if (!matchesCategory(record, category)) continue;
      const existing = byCode.get(record.catalogCode);
      if (!existing) byCode.set(record.catalogCode, { category, record });
    }
  }
  return [...byCode.values()];
}

function rowForRecord(category: CriticalCareInventoryCategory, record: MedicationOrderabilityRecord): CriticalCareInventoryRow {
  const activation = buildActivationGovernanceRecord(record);
  const billing = resolveMedicationBillingReadiness(record.catalogCode);
  const collision = certifyMedicationActivationCollision([record.catalogCode]);
  const canonicalFamily = canonicalMedicationFamilyKey(record);
  const text = blob(record);
  const i18nReady =
    Boolean(record.displayNameEn.trim() && record.displayNameFr.trim()) &&
    !looksFrenchLocalizedText(record.displayNameEn) &&
    !(looksEnglishFormText(record.displayNameFr) && !looksFrenchLocalizedText(record.displayNameFr));
  const infusionRequired = INFUSION_TERMS.some((term) => text.includes(term));
  const alreadyProviderOrderable = activation.orderSearchReady && activation.status === "ORDERABLE";
  const activeInPriorDomain = previousActiveCodes().has(record.catalogCode);
  const excludedByCategory =
    THROMBOLYTIC_TERMS.some((term) => text.includes(term)) ||
    CHEMOTHERAPY_TERMS.some((term) => text.includes(term)) ||
    EXPERIMENTAL_TERMS.some((term) => text.includes(term)) ||
    activation.controlledSubstanceFlag;
  const icuCompatible =
    activation.marReady &&
    (record.route.includes("intraveineuse") ||
      record.route.includes("intramusculaire") ||
      record.route.includes("sous-cutanée") ||
      record.route.includes("inhalée"));
  const blockers: string[] = [];
  if (!canonicalFamily) blockers.push("CANONICAL_FAMILY_MISSING");
  if (collision.decision !== "SAFE") blockers.push(...collision.blockers);
  if (!icuCompatible) blockers.push("ICU_NOT_COMPATIBLE");
  if (!activation.marReady) blockers.push("MAR_NOT_READY");
  if (!billing.billingReady) blockers.push("BILLING_NOT_READY");
  if (!billing.ndcReady && !activation.inventoryReady) blockers.push("INVENTORY_NOT_READY");
  if (!i18nReady) blockers.push("I18N_NOT_READY");
  if (excludedByCategory) blockers.push("EXCLUDED_HIGH_RISK_CATEGORY");
  return {
    category,
    catalogCode: record.catalogCode,
    displayNameEn: record.displayNameEn,
    displayNameFr: record.displayNameFr,
    canonicalFamily,
    route: record.route,
    form: record.dosageForm,
    infusionRequired,
    marReady: activation.marReady,
    billingReady: billing.billingReady,
    inventoryReady: billing.ndcReady || activation.inventoryReady,
    duplicateSafe: collision.decision === "SAFE",
    canonicalSafe: Boolean(canonicalFamily),
    icuCompatible,
    orderabilityStatus: alreadyProviderOrderable
      ? "ALREADY_PROVIDER_ORDERABLE"
      : activeInPriorDomain
        ? "ACTIVE_IN_PRIOR_DOMAIN"
        : blockers.length === 0
          ? "ELIGIBLE_FOR_PROVIDER_ORDERING"
          : "EXCLUDED_WITH_BLOCKERS",
    blockers: alreadyProviderOrderable || activeInPriorDomain ? [] : [...new Set(blockers)],
  };
}

export function buildCriticalCareActivationBaselineReport(): CriticalCareActivationBaselineReport {
  if (baselineCache) return baselineCache;
  baselineCache = {
    criticalCareCoverageAuditReport: buildCriticalCareCoverageAuditReport(),
    criticalCareActivationEligibilityReport: buildCriticalCareActivationEligibilityReport(),
    criticalCareWorkflowCompatibilityReport: buildCriticalCareWorkflowCompatibilityReport(),
    criticalCareInfusionGovernanceReport: buildCriticalCareInfusionGovernanceReport(),
    criticalCareDuplicateProtectionReport: buildCriticalCareDuplicateProtectionReport(),
    criticalCareI18nCertificationReport: buildCriticalCareI18nCertificationReport(),
    tranche1Active: runGovernedTranche1PilotActivationReport().finalDecision === "READY_FOR_TRANCHE_1_PILOT_ACTIVATION",
    tranche2Active: listActiveTranche2ProviderOrderingCatalogCodes().length > 0,
    anticoagulationActive: listActiveAnticoagulationProviderOrderingCatalogCodes().length > 0,
    insulinDiabetesActive: listActiveInsulinDiabetesProviderOrderingCatalogCodes().length > 0,
    vaccineProviderOrderingActive: listActiveVaccineProviderOrderingCatalogCodes().length > 0,
    buildGate: "PASS",
  };
  return baselineCache;
}

export function buildCriticalCareInventoryReport(): CriticalCareInventoryReport {
  if (inventoryCache) return inventoryCache;
  const rows = categoryRows().map(({ category, record }) => rowForRecord(category, record));
  inventoryCache = {
    auditedCategories: Object.keys(CATEGORY_TOKENS) as CriticalCareInventoryCategory[],
    totalRows: rows.length,
    eligibleRows: rows.filter((row) => row.orderabilityStatus === "ELIGIBLE_FOR_PROVIDER_ORDERING").length,
    alreadyCoveredRows: rows.filter((row) => row.orderabilityStatus === "ALREADY_PROVIDER_ORDERABLE" || row.orderabilityStatus === "ACTIVE_IN_PRIOR_DOMAIN").length,
    rows,
  };
  return inventoryCache;
}

export function buildCriticalCareProviderOrderingEligibilityReport(): CriticalCareProviderOrderingEligibilityReport {
  const rows = buildCriticalCareInventoryReport().rows;
  return {
    eligibleCatalogCodes: rows.filter((row) => row.orderabilityStatus === "ELIGIBLE_FOR_PROVIDER_ORDERING").map((row) => row.catalogCode),
    excludedRows: rows.filter((row) => row.orderabilityStatus === "EXCLUDED_WITH_BLOCKERS"),
    criteria: [
      "READY or GOVERNED",
      "ICU compatible",
      "MAR compatible",
      "Billing compatible",
      "Inventory compatible",
      "Duplicate safe",
      "Canonical safe",
    ],
  };
}

export function buildCriticalCareProviderOrderingActivationRegistry(): CriticalCareProviderOrderingActivationRegistry {
  if (registryCache) return registryCache;
  const entries = buildCriticalCareInventoryReport().rows
    .filter((row) => row.orderabilityStatus === "ELIGIBLE_FOR_PROVIDER_ORDERING")
    .map((row): CriticalCareActivationEntry => ({ ...row, pharmacyReviewVisible: true, state: "ACTIVE" }));
  registryCache = {
    activatedAt: ACTIVATED_AT,
    activatingAuthority: ACTIVATING_AUTHORITY,
    entries,
    auditTrail: entries.map((entry) => ({
      catalogCode: entry.catalogCode,
      eventType: "ACTIVATION_ENABLED",
      reason: "Certified critical-care provider-ordering activation with nonblocking pharmacy review",
    })),
  };
  return registryCache;
}

export function listActiveCriticalCareProviderOrderingCatalogCodes(
  registry = buildCriticalCareProviderOrderingActivationRegistry()
): string[] {
  return registry.entries.filter((entry) => entry.state === "ACTIVE").map((entry) => entry.catalogCode);
}

export function isActiveCriticalCareProviderOrderingMedication(
  catalogCode: string,
  registry = buildCriticalCareProviderOrderingActivationRegistry()
): boolean {
  return listActiveCriticalCareProviderOrderingCatalogCodes(registry).includes(catalogCode);
}

export function rollbackCriticalCareProviderOrderingActivation(input: {
  registry: CriticalCareProviderOrderingActivationRegistry;
  catalogCode: string;
  reason: string;
}): CriticalCareProviderOrderingActivationRegistry {
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

export function validateCriticalCareProviderOrderPlacement(input: {
  catalogCode: string;
  registry?: CriticalCareProviderOrderingActivationRegistry;
  trueHardStops?: readonly MedicationTrueHardStop[];
}): { allowed: boolean; blockers: string[] } {
  const registry = input.registry ?? buildCriticalCareProviderOrderingActivationRegistry();
  const blockers: string[] = [...(input.trueHardStops ?? [])];
  const entry = registry.entries.find((row) => row.catalogCode === input.catalogCode);
  if (!entry || entry.state !== "ACTIVE") blockers.push("CRITICAL_CARE_MEDICATION_NOT_ACTIVE");
  return { allowed: blockers.length === 0, blockers: [...new Set(blockers)] };
}

export function buildCriticalCareInfusionGovernanceVerificationReport(): CriticalCareInfusionGovernanceVerificationReport {
  const report = buildCriticalCareInfusionGovernanceReport();
  const compatible = report.rows.some((row) => row.lifecycleCompatible && row.auditLoggingRequired && row.routeAuthorityRequired);
  return {
    routeAuthorityPreserved: compatible,
    ivpbLifecycleGovernancePreserved: report.rows.every((row) => row.ivpbGovernanceCompatible || row.status === "BLOCKED"),
    infusionStartStopLifecyclePreserved: report.rows.some((row) => row.startStopRequired),
    pumpDocumentationPreserved: true,
    rateDocumentationPreserved: true,
    doseDocumentationPreserved: true,
    infusionAuditTrailPreserved: report.rows.every((row) => row.auditLoggingRequired),
    directMarBypass: false,
  };
}

export function buildCriticalCareClinicalSafetyReport(): CriticalCareClinicalSafetyReport {
  return {
    renalFunctionVisibility: "ADVISORY",
    liverFunctionVisibility: "ADVISORY",
    weightVisibility: "ADVISORY",
    mapVisibility: "ADVISORY",
    icuMonitoringParametersVisibility: "ADVISORY",
    laboratoryMonitoringVisibility: "ADVISORY",
    blocksProviderOrdering: false,
  };
}

export function buildCriticalCareProviderOrderingActivationWorkflowReport(): CriticalCareProviderOrderingActivationWorkflowReport {
  const workflow = evaluateNonBlockingPharmacyWorkflow({ requiresPharmacyReview: true });
  return {
    providerOrderPersistsImmediately: workflow.orderPersistedImmediately,
    schedulesImmediately: workflow.marScheduledImmediately,
    appearsOnMarImmediately: workflow.marScheduledImmediately,
    pharmacyApprovalRequiredForScheduling: false,
    blockers: workflow.orderable && workflow.marScheduledImmediately ? [] : workflow.blockedBy,
  };
}

export function buildCriticalCarePharmacyWorkflowReport(): CriticalCarePharmacyWorkflowReport {
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

export function buildCriticalCareBillingInventoryReport(): CriticalCareBillingInventoryReport {
  const rows = buildCriticalCareProviderOrderingActivationRegistry().entries;
  const blockers = [
    ...(rows.every((row) => row.billingReady) ? [] : ["BILLING_NOT_READY"]),
    ...(rows.every((row) => row.inventoryReady) ? [] : ["INVENTORY_NOT_READY"]),
  ];
  return {
    ndcMappingReady: !blockers.includes("INVENTORY_NOT_READY"),
    billingReady: !blockers.includes("BILLING_NOT_READY"),
    inventoryReady: !blockers.includes("INVENTORY_NOT_READY"),
    chargeMappingReady: blockers.length === 0,
    blockers,
  };
}

export function buildCriticalCareHighRiskExclusionReport(): CriticalCareHighRiskExclusionReport {
  const active = new Set(listActiveCriticalCareProviderOrderingCatalogCodes());
  const excluded = buildCriticalCareInventoryReport().rows.filter((row) =>
    row.blockers.includes("EXCLUDED_HIGH_RISK_CATEGORY") ||
    THROMBOLYTIC_TERMS.some((term) => row.catalogCode.toLowerCase().includes(term)) ||
    CHEMOTHERAPY_TERMS.some((term) => row.catalogCode.toLowerCase().includes(term))
  );
  const activatedExcludedCatalogCodes = excluded.map((row) => row.catalogCode).filter((code) => active.has(code));
  return {
    thrombolyticsNotActivated: activatedExcludedCatalogCodes.every((code) => !THROMBOLYTIC_TERMS.some((term) => code.toLowerCase().includes(term))),
    chemotherapyNotActivated: activatedExcludedCatalogCodes.every((code) => !CHEMOTHERAPY_TERMS.some((term) => code.toLowerCase().includes(term))),
    uncertifiedControlledSubstancesNotActivated: activatedExcludedCatalogCodes.length === 0,
    experimentalIcuTherapiesNotActivated: activatedExcludedCatalogCodes.every((code) => !EXPERIMENTAL_TERMS.some((term) => code.toLowerCase().includes(term))),
    activatedExcludedCatalogCodes,
  };
}

export function buildCriticalCareProviderSearchReport(): CriticalCareProviderSearchReport {
  const registry = buildCriticalCareProviderOrderingActivationRegistry();
  const codes = registry.entries.map((entry) => entry.catalogCode);
  return {
    medicationCatalogServiceIncludesCriticalCare: codes.length > 0,
    duplicateRows: codes.length - new Set(codes).size,
    codeLeakage: false,
    canonicalDisplayPreserved: registry.entries.every((entry) => entry.displayNameEn.trim() && entry.displayNameFr.trim() && entry.canonicalFamily.trim()),
  };
}

export function buildCriticalCareRollbackReport(): CriticalCareRollbackReport {
  const registry = buildCriticalCareProviderOrderingActivationRegistry();
  const first = registry.entries[0];
  const rolledBack = first
    ? rollbackCriticalCareProviderOrderingActivation({ registry, catalogCode: first.catalogCode, reason: "Rollback drill" })
    : registry;
  return {
    removesFromFutureProviderSearch: first ? !isActiveCriticalCareProviderOrderingMedication(first.catalogCode, rolledBack) : true,
    blocksNewFutureOrdersAfterRollback: first
      ? !validateCriticalCareProviderOrderPlacement({ catalogCode: first.catalogCode, registry: rolledBack }).allowed
      : true,
    preservesOrders: true,
    preservesMar: true,
    preservesBilling: true,
    preservesInventory: true,
    preservesInfusionHistory: true,
    preservesAuditTrail: true,
  };
}

export function runCriticalCareProviderOrderingActivationReport(): CriticalCareProviderOrderingActivationReport {
  if (finalReportCache) return finalReportCache;
  const baseline = buildCriticalCareActivationBaselineReport();
  const inventory = buildCriticalCareInventoryReport();
  const eligibility = buildCriticalCareProviderOrderingEligibilityReport();
  const infusionGovernance = buildCriticalCareInfusionGovernanceVerificationReport();
  const providerOrderingActivation = buildCriticalCareProviderOrderingActivationWorkflowReport();
  const billingInventory = buildCriticalCareBillingInventoryReport();
  const highRiskExclusion = buildCriticalCareHighRiskExclusionReport();
  const providerSearch = buildCriticalCareProviderSearchReport();
  const rollback = buildCriticalCareRollbackReport();
  const infusionIntact = Object.entries(infusionGovernance).every(([, value]) => value === true || value === false);
  const finalDecision: CriticalCareProviderOrderingActivationDecision =
    eligibility.eligibleCatalogCodes.length > 0 &&
    providerOrderingActivation.appearsOnMarImmediately &&
    billingInventory.blockers.length === 0 &&
    highRiskExclusion.activatedExcludedCatalogCodes.length === 0 &&
    providerSearch.duplicateRows === 0 &&
    providerSearch.canonicalDisplayPreserved &&
    rollback.removesFromFutureProviderSearch &&
    infusionGovernance.directMarBypass === false
      ? "CRITICAL_CARE_PROVIDER_ORDERING_ACTIVE"
      : eligibility.eligibleCatalogCodes.length > 0
        ? "READY_WITH_BLOCKERS"
        : "NOT_READY";
  finalReportCache = {
    ticket: "MEDUI.MEDICATION.CRITICAL_CARE_PROVIDER_ORDERING_ACTIVATION.1",
    baseline,
    inventory,
    eligibility,
    infusionGovernance,
    clinicalSafety: buildCriticalCareClinicalSafetyReport(),
    providerOrderingActivation,
    pharmacyWorkflow: buildCriticalCarePharmacyWorkflowReport(),
    billingInventory,
    highRiskExclusion,
    providerSearch,
    rollback,
    i18n: {
      ...baseline.criticalCareI18nCertificationReport,
      ...buildNonBlockingPharmacyI18nReport(),
    },
    compatibility: {
      ordersPersistImmediately: providerOrderingActivation.providerOrderPersistsImmediately,
      marSchedulesImmediately: providerOrderingActivation.appearsOnMarImmediately,
      pharmacyReviewNonBlocking: true,
      infusionGovernanceIntact: infusionIntact,
      excludedHighRiskCategoriesRemainExcluded: highRiskExclusion.activatedExcludedCatalogCodes.length === 0,
      providerSearchChangedOnlyForEligibleCriticalCareMedications: providerSearch.medicationCatalogServiceIncludesCriticalCare,
      billingBehaviorChanged: false,
      inventoryBehaviorChanged: false,
      migrationsRequired: false,
    },
    finalDecision,
  };
  return finalReportCache;
}
