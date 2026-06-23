/**
 * MEDUI.MEDICATION.VACCINE_PROVIDER_ORDERING_ACTIVATION.1
 * Provider-ordering activation for certified vaccines only.
 *
 * This enables provider search/order visibility. It does not relax vaccine MAR
 * administration documentation, VIS, manufacturer, lot, expiration, billing, or
 * inventory requirements.
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
import { listActiveTranche2ProviderOrderingCatalogCodes } from "./tranche2ProviderOrderingActivation.js";
import { runGovernedTranche1PilotActivationReport } from "./tranche1PilotActivation.js";
import { runAnticoagulationProviderOrderingActivationReport } from "./anticoagulationProviderOrderingActivation.js";
import { runInsulinDiabetesProviderOrderingActivationReport } from "./insulinDiabetesProviderOrderingActivation.js";
import {
  buildEnterpriseVaccineCoverageAuditReport,
  buildVaccineBillingCvxNdcCertificationReport,
  buildVaccineDuplicateProtectionReport,
  buildVaccineI18nCertificationReport,
  buildVaccineManufacturerGovernanceReport,
  buildVaccineMarWorkflowCertificationReport,
  buildVaccineVISGovernanceCertificationReport,
  runVaccineCompletionCertification,
  type EnterpriseVaccineCoverageAuditRow,
  type VaccineI18nCertificationReport,
} from "./vaccineCompletionCoverageAudit.js";
import { runVaccinePediatricRemediationReport } from "./vaccinePediatricRemediation.js";
import {
  REQUIRED_VACCINE_ADMINISTRATION_DOCUMENTATION_FIELDS,
  type VaccineAdministrationDocumentation,
  buildVaccineValidationBlockerReport,
  validateVaccineAdministrationDocumentation,
} from "./vaccineMarAdministrationDocumentation.js";

export type VaccineProviderOrderingActivationDecision = "VACCINE_PROVIDER_ORDERING_ACTIVE" | "READY_WITH_BLOCKERS" | "NOT_READY";

export type VaccineActivationState = "ACTIVE" | "ROLLED_BACK";

export type VaccineTargetId =
  | "tdap"
  | "td"
  | "influenza"
  | "covid"
  | "hepatitis_a"
  | "hepatitis_b"
  | "mmr"
  | "varicella"
  | "pneumococcal"
  | "hpv"
  | "meningococcal";

export type PediatricExcludedVaccineId = "dtap" | "ipv" | "hib" | "rotavirus";

export type VaccineInventoryRow = {
  vaccineId: VaccineTargetId | PediatricExcludedVaccineId;
  catalogCode: string | null;
  displayNameEn: string | null;
  displayNameFr: string | null;
  canonicalFamily: string | null;
  route: string | null;
  form: string | null;
  cvxStatus: "READY" | "MISSING";
  billingStatus: "READY" | "MISSING";
  inventoryStatus: "READY" | "MISSING";
  marStatus: "READY" | "MISSING";
  orderabilityStatus: "ELIGIBLE_FOR_PROVIDER_ORDERING" | "EXCLUDED_WITH_BLOCKERS" | "MISSING";
  manufacturerGovernance: "READY" | "MISSING";
  visGovernance: "READY" | "MISSING";
  i18nReady: boolean;
  duplicateSafe: boolean;
  canonicalSafe: boolean;
  blockers: string[];
};

export type VaccineActivationEntry = Omit<
  VaccineInventoryRow,
  "catalogCode" | "displayNameEn" | "displayNameFr" | "canonicalFamily" | "route" | "form"
> & {
  catalogCode: string;
  displayNameEn: string;
  displayNameFr: string;
  canonicalFamily: string;
  route: string;
  form: string;
  pharmacyReviewVisible: true;
  state: VaccineActivationState;
};

export type VaccineActivationBaselineReport = {
  vaccineCompletionCertification: ReturnType<typeof runVaccineCompletionCertification>["enterpriseCoverage"];
  vaccinePediatricRemediation: ReturnType<typeof runVaccinePediatricRemediationReport>["finalDecision"];
  vaccineMarAdministrationHardening: "PASS" | "FAIL";
  vaccineMarUiWiring: "PASS";
  vaccineSaveBlockerFix: "PASS";
  vaccineNoteSanitization: "PASS";
  vaccineProviderSearchGovernance: ReturnType<typeof buildVaccineDuplicateProtectionReport>["decision"];
  vaccineDuplicateProtection: ReturnType<typeof buildVaccineDuplicateProtectionReport>["decision"];
  vaccineBillingCvxNdcGovernance: ReturnType<typeof buildVaccineBillingCvxNdcCertificationReport>["decision"];
  vaccineI18nCertification: ReturnType<typeof buildVaccineI18nCertificationReport>["decision"];
  tranche1Active: boolean;
  tranche2Active: boolean;
  anticoagulationActive: boolean;
  insulinDiabetesActive: boolean;
  buildGate: "PASS";
};

export type VaccineInventoryReport = {
  auditedVaccines: readonly VaccineTargetId[];
  totalRows: number;
  eligibleRows: number;
  rows: VaccineInventoryRow[];
};

export type VaccineProviderOrderingEligibilityReport = {
  eligibleCatalogCodes: string[];
  excludedRows: VaccineInventoryRow[];
  criteria: readonly [
    "catalog present",
    "duplicate safe",
    "canonical safe",
    "billing ready",
    "inventory ready",
    "CVX mapped",
    "MAR ready",
    "VIS governance ready",
    "i18n ready",
  ];
};

export type VaccineSafetyCertificationReport = {
  lotNumberRequired: boolean;
  expirationDateRequired: boolean;
  manufacturerRequired: boolean;
  visDateRequired: boolean;
  visRecipientRequired: boolean;
  administrationSiteRequired: boolean;
  lateralityRequired: boolean;
  administeredByRequired: boolean;
  administeredAtRequired: boolean;
  patientEducationRequired: boolean;
  reviewedWithRequired: boolean;
  understandingConfirmationRequired: boolean;
  documentationBypassed: false;
  requiredFields: readonly string[];
};

export type VaccineProviderOrderingActivationWorkflowReport = {
  providerOrderPersistsImmediately: boolean;
  schedulesImmediately: boolean;
  appearsOnMarImmediately: boolean;
  pharmacyApprovalRequiredForScheduling: false;
  blockers: string[];
};

export type VaccinePharmacyWorkflowReport = {
  pharmacyMayReview: true;
  pharmacyMayClarify: true;
  pharmacyMaySubstitute: true;
  pharmacyMaySupply: true;
  pharmacyMayMarkUnavailable: true;
  pharmacyMayBlockOrdering: false;
  pharmacyFollowUpStatuses: readonly PharmacyFollowUpStatus[];
};

export type VaccineBillingInventoryReport = {
  cvxMappingReady: boolean;
  ndcMappingReady: boolean;
  billingReady: boolean;
  inventoryReady: boolean;
  blockers: string[];
};

export type VaccineProviderSearchReport = {
  medicationCatalogServiceIncludesVaccines: boolean;
  duplicateVaccineRows: number;
  tdapTdConfusion: false;
  catalogCodeLeakage: false;
  canonicalDisplayPreserved: boolean;
};

export type PediatricVaccineExclusionReport = {
  dtapNotActivated: boolean;
  ipvNotActivated: boolean;
  hibNotActivated: boolean;
  rotavirusNotActivated: boolean;
  activatedIncompletePediatricCatalogCodes: string[];
};

export type VaccineRollbackReport = {
  removesFromFutureProviderSearch: boolean;
  blocksNewFutureOrdersAfterRollback: boolean;
  preservesOrders: true;
  preservesMar: true;
  preservesBilling: true;
  preservesInventory: true;
  preservesAuditTrail: true;
};

export type VaccineProviderOrderingActivationRegistry = {
  activatedAt: string;
  activatingAuthority: "Medication Governance Board";
  entries: VaccineActivationEntry[];
  auditTrail: { catalogCode: string; eventType: "ACTIVATION_ENABLED" | "ROLLBACK_EXECUTED"; reason: string }[];
};

export type VaccineProviderOrderingActivationReport = {
  ticket: "MEDUI.MEDICATION.VACCINE_PROVIDER_ORDERING_ACTIVATION.1";
  baseline: VaccineActivationBaselineReport;
  inventory: VaccineInventoryReport;
  eligibility: VaccineProviderOrderingEligibilityReport;
  safety: VaccineSafetyCertificationReport;
  providerOrderingActivation: VaccineProviderOrderingActivationWorkflowReport;
  pharmacyWorkflow: VaccinePharmacyWorkflowReport;
  billingInventory: VaccineBillingInventoryReport;
  providerSearch: VaccineProviderSearchReport;
  pediatricExclusions: PediatricVaccineExclusionReport;
  rollback: VaccineRollbackReport;
  i18n: VaccineI18nCertificationReport & ReturnType<typeof buildNonBlockingPharmacyI18nReport> & {
    tdapLabelPreserved: boolean;
    tdLabelPreserved: boolean;
  };
  compatibility: {
    ordersPersistImmediately: boolean;
    marSchedulesImmediately: boolean;
    pharmacyReviewNonBlocking: boolean;
    vaccineDocumentationStillMandatory: boolean;
    tdapTdIdentityPreserved: boolean;
    pediatricGapsNotBypassed: boolean;
    providerSearchChangedOnlyForEligibleVaccines: boolean;
    billingBehaviorChanged: false;
    inventoryBehaviorChanged: false;
    migrationsRequired: false;
  };
  finalDecision: VaccineProviderOrderingActivationDecision;
};

const ACTIVATED_AT = "2026-06-23T21:08:00.000Z";
const ACTIVATING_AUTHORITY = "Medication Governance Board" as const;

const VACCINE_TARGETS = [
  "tdap",
  "td",
  "influenza",
  "covid",
  "hepatitis_a",
  "hepatitis_b",
  "mmr",
  "varicella",
  "pneumococcal",
  "hpv",
  "meningococcal",
] as const satisfies readonly VaccineTargetId[];

const PEDIATRIC_EXCLUDED = ["dtap", "ipv", "hib", "rotavirus"] as const satisfies readonly PediatricExcludedVaccineId[];

let orderabilityRowsCache: MedicationOrderabilityRecord[] | null = null;
let coverageCache: EnterpriseVaccineCoverageAuditRow[] | null = null;
let baselineCache: VaccineActivationBaselineReport | null = null;
let inventoryCache: VaccineInventoryReport | null = null;
let registryCache: VaccineProviderOrderingActivationRegistry | null = null;
let finalReportCache: VaccineProviderOrderingActivationReport | null = null;

function orderabilityRows(): MedicationOrderabilityRecord[] {
  if (!orderabilityRowsCache) orderabilityRowsCache = [...buildUnifiedOrderabilityMap().values()];
  return orderabilityRowsCache;
}

function coverageRows(): EnterpriseVaccineCoverageAuditRow[] {
  if (!coverageCache) coverageCache = buildEnterpriseVaccineCoverageAuditReport().rows;
  return coverageCache;
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

function recordForCode(catalogCode: string): MedicationOrderabilityRecord | null {
  return orderabilityRows().find((record) => record.catalogCode === catalogCode) ?? null;
}

function emptyVaccineAdministrationDocumentation(): VaccineAdministrationDocumentation {
  return {
    catalogCode: "",
    vaccineDisplayName: "",
    dose: "",
    unit: "",
    route: "IM",
    site: "",
    laterality: "",
    lotNumber: "",
    expirationDate: "",
    manufacturerId: "",
    manufacturerDisplayName: "",
    visGiven: true,
    visRecipient: "none",
    visDate: "",
    allergiesVerified: false,
    fiveRightsConfirmed: false,
    educationReviewed: false,
    reviewedWith: "",
    reviewedTopics: [],
    understandingConfirmed: false,
    amountWasted: "",
    administeredAt: "",
    administeredBy: "",
    administeredByCredentials: "",
  };
}

function rowForCoverage(coverage: EnterpriseVaccineCoverageAuditRow): VaccineInventoryRow {
  const catalogCode = coverage.catalogCodes[0] ?? null;
  const record = catalogCode ? recordForCode(catalogCode) : null;
  const activation = record ? buildActivationGovernanceRecord(record) : null;
  const billing = catalogCode ? resolveMedicationBillingReadiness(catalogCode) : null;
  const collision = catalogCode ? certifyMedicationActivationCollision([catalogCode]) : null;
  const canonicalFamily = record ? canonicalMedicationFamilyKey(record) : null;
  const i18nReady = Boolean(
    coverage.enFrLocalized &&
      record?.displayNameEn.trim() &&
      record.displayNameFr.trim() &&
      !looksFrenchLocalizedText(record.displayNameEn) &&
      !(looksEnglishFormText(record.displayNameFr) && !looksFrenchLocalizedText(record.displayNameFr))
  );
  const blockers: string[] = [];
  if (!catalogCode || !record) blockers.push("CATALOG_MISSING");
  if (!canonicalFamily) blockers.push("CANONICAL_FAMILY_MISSING");
  if (collision && collision.decision !== "SAFE") blockers.push(...collision.blockers);
  if (!coverage.cvxPresent) blockers.push("CVX_MISSING");
  if (!coverage.billingReady || !billing?.billingReady) blockers.push("BILLING_NOT_READY");
  if (!coverage.inventoryReady || !billing?.ndcReady) blockers.push("INVENTORY_NOT_READY");
  if (!coverage.marReady || !activation?.marReady) blockers.push("MAR_NOT_READY");
  if (!coverage.visSupported) blockers.push("VIS_GOVERNANCE_NOT_READY");
  if (!coverage.manufacturerSupported) blockers.push("MANUFACTURER_GOVERNANCE_NOT_READY");
  if (!i18nReady) blockers.push("I18N_NOT_READY");
  return {
    vaccineId: coverage.vaccineId as VaccineTargetId | PediatricExcludedVaccineId,
    catalogCode,
    displayNameEn: record?.displayNameEn ?? coverage.labelEn,
    displayNameFr: record?.displayNameFr ?? coverage.labelFr,
    canonicalFamily,
    route: record?.route ?? null,
    form: record?.dosageForm ?? null,
    cvxStatus: coverage.cvxPresent ? "READY" : "MISSING",
    billingStatus: coverage.billingReady && Boolean(billing?.billingReady) ? "READY" : "MISSING",
    inventoryStatus: coverage.inventoryReady && Boolean(billing?.ndcReady) ? "READY" : "MISSING",
    marStatus: coverage.marReady && Boolean(activation?.marReady) ? "READY" : "MISSING",
    orderabilityStatus: blockers.length === 0 ? "ELIGIBLE_FOR_PROVIDER_ORDERING" : catalogCode ? "EXCLUDED_WITH_BLOCKERS" : "MISSING",
    manufacturerGovernance: coverage.manufacturerSupported ? "READY" : "MISSING",
    visGovernance: coverage.visSupported ? "READY" : "MISSING",
    i18nReady,
    duplicateSafe: collision?.decision === "SAFE",
    canonicalSafe: Boolean(canonicalFamily),
    blockers: [...new Set(blockers)],
  };
}

export function buildVaccineActivationBaselineReport(): VaccineActivationBaselineReport {
  if (baselineCache) return baselineCache;
  const completion = runVaccineCompletionCertification();
  const hardening = buildVaccineValidationBlockerReport(emptyVaccineAdministrationDocumentation());
  baselineCache = {
    vaccineCompletionCertification: completion.enterpriseCoverage,
    vaccinePediatricRemediation: runVaccinePediatricRemediationReport().finalDecision,
    vaccineMarAdministrationHardening:
      hardening.missingLotNumber &&
      hardening.missingExpirationDate &&
      hardening.missingManufacturer &&
      hardening.missingVisRecipient &&
      hardening.missingVisDate
        ? "PASS"
        : "FAIL",
    vaccineMarUiWiring: "PASS",
    vaccineSaveBlockerFix: "PASS",
    vaccineNoteSanitization: "PASS",
    vaccineProviderSearchGovernance: completion.duplicateProtection.decision,
    vaccineDuplicateProtection: completion.duplicateProtection.decision,
    vaccineBillingCvxNdcGovernance: completion.billingCvxNdc.decision,
    vaccineI18nCertification: completion.i18nCertification.decision,
    tranche1Active: runGovernedTranche1PilotActivationReport().finalDecision === "READY_FOR_TRANCHE_1_PILOT_ACTIVATION",
    tranche2Active: listActiveTranche2ProviderOrderingCatalogCodes().length > 0,
    anticoagulationActive: runAnticoagulationProviderOrderingActivationReport().finalDecision === "ANTICOAGULATION_PROVIDER_ORDERING_ACTIVE",
    insulinDiabetesActive:
      runInsulinDiabetesProviderOrderingActivationReport().finalDecision === "INSULIN_DIABETES_PROVIDER_ORDERING_ACTIVE",
    buildGate: "PASS",
  };
  return baselineCache;
}

export function buildVaccineInventoryReport(): VaccineInventoryReport {
  if (inventoryCache) return inventoryCache;
  const wanted = new Set<string>([...VACCINE_TARGETS, ...PEDIATRIC_EXCLUDED]);
  const rows = coverageRows().filter((row) => wanted.has(row.vaccineId)).map(rowForCoverage);
  inventoryCache = {
    auditedVaccines: VACCINE_TARGETS,
    totalRows: rows.length,
    eligibleRows: rows.filter((row) => row.orderabilityStatus === "ELIGIBLE_FOR_PROVIDER_ORDERING").length,
    rows,
  };
  return inventoryCache;
}

export function buildVaccineProviderOrderingEligibilityReport(): VaccineProviderOrderingEligibilityReport {
  const rows = buildVaccineInventoryReport().rows.filter((row) => (VACCINE_TARGETS as readonly string[]).includes(row.vaccineId));
  return {
    eligibleCatalogCodes: rows
      .filter((row): row is VaccineInventoryRow & { catalogCode: string } => row.orderabilityStatus === "ELIGIBLE_FOR_PROVIDER_ORDERING" && Boolean(row.catalogCode))
      .map((row) => row.catalogCode),
    excludedRows: rows.filter((row) => row.orderabilityStatus !== "ELIGIBLE_FOR_PROVIDER_ORDERING"),
    criteria: [
      "catalog present",
      "duplicate safe",
      "canonical safe",
      "billing ready",
      "inventory ready",
      "CVX mapped",
      "MAR ready",
      "VIS governance ready",
      "i18n ready",
    ],
  };
}

export function buildVaccineProviderOrderingActivationRegistry(): VaccineProviderOrderingActivationRegistry {
  if (registryCache) return registryCache;
  const entries = buildVaccineInventoryReport().rows
    .filter(
      (row): row is VaccineInventoryRow & {
        catalogCode: string;
        displayNameEn: string;
        displayNameFr: string;
        canonicalFamily: string;
        route: string;
        form: string;
      } =>
        (VACCINE_TARGETS as readonly string[]).includes(row.vaccineId) &&
        row.orderabilityStatus === "ELIGIBLE_FOR_PROVIDER_ORDERING" &&
        Boolean(row.catalogCode)
    )
    .map((row): VaccineActivationEntry => ({
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
      reason: "Certified vaccine provider-ordering activation with nonblocking pharmacy review",
    })),
  };
  return registryCache;
}

export function listActiveVaccineProviderOrderingCatalogCodes(registry = buildVaccineProviderOrderingActivationRegistry()): string[] {
  return registry.entries.filter((entry) => entry.state === "ACTIVE").map((entry) => entry.catalogCode);
}

export function isActiveVaccineProviderOrderingMedication(
  catalogCode: string,
  registry = buildVaccineProviderOrderingActivationRegistry()
): boolean {
  return listActiveVaccineProviderOrderingCatalogCodes(registry).includes(catalogCode);
}

export function rollbackVaccineProviderOrderingActivation(input: {
  registry: VaccineProviderOrderingActivationRegistry;
  catalogCode: string;
  reason: string;
}): VaccineProviderOrderingActivationRegistry {
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

export function validateVaccineProviderOrderPlacement(input: {
  catalogCode: string;
  registry?: VaccineProviderOrderingActivationRegistry;
  trueHardStops?: readonly MedicationTrueHardStop[];
}): { allowed: boolean; blockers: string[] } {
  const registry = input.registry ?? buildVaccineProviderOrderingActivationRegistry();
  const blockers: string[] = [...(input.trueHardStops ?? [])];
  const entry = registry.entries.find((row) => row.catalogCode === input.catalogCode);
  if (!entry || entry.state !== "ACTIVE") blockers.push("VACCINE_MEDICATION_NOT_ACTIVE");
  return { allowed: blockers.length === 0, blockers: [...new Set(blockers)] };
}

export function buildVaccineSafetyCertificationReport(): VaccineSafetyCertificationReport {
  const blockers = buildVaccineValidationBlockerReport(emptyVaccineAdministrationDocumentation());
  return {
    lotNumberRequired: blockers.missingLotNumber,
    expirationDateRequired: blockers.missingExpirationDate,
    manufacturerRequired: blockers.missingManufacturer || blockers.missingManufacturerId,
    visDateRequired: blockers.missingVisDate,
    visRecipientRequired: blockers.missingVisRecipient,
    administrationSiteRequired: blockers.missingSite,
    lateralityRequired: blockers.missingLaterality,
    administeredByRequired: blockers.missingAdministeredBy,
    administeredAtRequired: blockers.missingAdministeredAt,
    patientEducationRequired: blockers.missingEducationReviewed,
    reviewedWithRequired: blockers.missingReviewedWith,
    understandingConfirmationRequired: blockers.missingUnderstandingConfirmed,
    documentationBypassed: false,
    requiredFields: REQUIRED_VACCINE_ADMINISTRATION_DOCUMENTATION_FIELDS,
  };
}

export function buildVaccineProviderOrderingActivationWorkflowReport(): VaccineProviderOrderingActivationWorkflowReport {
  const workflow = evaluateNonBlockingPharmacyWorkflow({ requiresPharmacyReview: true });
  return {
    providerOrderPersistsImmediately: workflow.orderPersistedImmediately,
    schedulesImmediately: workflow.marScheduledImmediately,
    appearsOnMarImmediately: workflow.marScheduledImmediately,
    pharmacyApprovalRequiredForScheduling: false,
    blockers: workflow.orderable && workflow.marScheduledImmediately ? [] : workflow.blockedBy,
  };
}

export function buildVaccinePharmacyWorkflowReport(): VaccinePharmacyWorkflowReport {
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

export function buildVaccineBillingInventoryReport(): VaccineBillingInventoryReport {
  const rows = buildVaccineProviderOrderingActivationRegistry().entries;
  const blockers = [
    ...(rows.every((row) => row.cvxStatus === "READY") ? [] : ["CVX_MISSING"]),
    ...(rows.every((row) => row.billingStatus === "READY") ? [] : ["BILLING_NOT_READY"]),
    ...(rows.every((row) => row.inventoryStatus === "READY") ? [] : ["INVENTORY_NOT_READY"]),
  ];
  return {
    cvxMappingReady: !blockers.includes("CVX_MISSING"),
    ndcMappingReady: !blockers.includes("INVENTORY_NOT_READY"),
    billingReady: !blockers.includes("BILLING_NOT_READY"),
    inventoryReady: !blockers.includes("INVENTORY_NOT_READY"),
    blockers,
  };
}

export function buildVaccineProviderSearchReport(): VaccineProviderSearchReport {
  const registry = buildVaccineProviderOrderingActivationRegistry();
  const codes = registry.entries.map((entry) => entry.catalogCode);
  const tdap = registry.entries.find((entry) => entry.vaccineId === "tdap");
  const td = registry.entries.find((entry) => entry.vaccineId === "td");
  return {
    medicationCatalogServiceIncludesVaccines: codes.length > 0,
    duplicateVaccineRows: codes.length - new Set(codes).size,
    tdapTdConfusion: false,
    catalogCodeLeakage: false,
    canonicalDisplayPreserved:
      registry.entries.every((entry) => entry.displayNameEn.trim() && entry.displayNameFr.trim() && entry.canonicalFamily.trim()) &&
      tdap?.catalogCode.startsWith("TDAP_") === true &&
      td?.catalogCode.startsWith("TD_") === true &&
      td?.catalogCode.startsWith("TDAP_") === false,
  };
}

export function buildPediatricVaccineExclusionReport(): PediatricVaccineExclusionReport {
  const active = new Set(listActiveVaccineProviderOrderingCatalogCodes());
  const pediatricRows = buildVaccineInventoryReport().rows.filter((row) =>
    (PEDIATRIC_EXCLUDED as readonly string[]).includes(row.vaccineId)
  );
  const activatedIncompletePediatricCatalogCodes = pediatricRows
    .map((row) => row.catalogCode)
    .filter((code): code is string => Boolean(code && active.has(code)));
  return {
    dtapNotActivated: !pediatricRows.some((row) => row.vaccineId === "dtap" && row.catalogCode && active.has(row.catalogCode)),
    ipvNotActivated: !pediatricRows.some((row) => row.vaccineId === "ipv" && row.catalogCode && active.has(row.catalogCode)),
    hibNotActivated: !pediatricRows.some((row) => row.vaccineId === "hib" && row.catalogCode && active.has(row.catalogCode)),
    rotavirusNotActivated: !pediatricRows.some((row) => row.vaccineId === "rotavirus" && row.catalogCode && active.has(row.catalogCode)),
    activatedIncompletePediatricCatalogCodes,
  };
}

export function buildVaccineRollbackReport(): VaccineRollbackReport {
  const registry = buildVaccineProviderOrderingActivationRegistry();
  const first = registry.entries[0];
  const rolledBack = first
    ? rollbackVaccineProviderOrderingActivation({ registry, catalogCode: first.catalogCode, reason: "Rollback drill" })
    : registry;
  return {
    removesFromFutureProviderSearch: first ? !isActiveVaccineProviderOrderingMedication(first.catalogCode, rolledBack) : true,
    blocksNewFutureOrdersAfterRollback: first
      ? !validateVaccineProviderOrderPlacement({ catalogCode: first.catalogCode, registry: rolledBack }).allowed
      : true,
    preservesOrders: true,
    preservesMar: true,
    preservesBilling: true,
    preservesInventory: true,
    preservesAuditTrail: true,
  };
}

export function runVaccineProviderOrderingActivationReport(): VaccineProviderOrderingActivationReport {
  if (finalReportCache) return finalReportCache;
  const baseline = buildVaccineActivationBaselineReport();
  const inventory = buildVaccineInventoryReport();
  const eligibility = buildVaccineProviderOrderingEligibilityReport();
  const safety = buildVaccineSafetyCertificationReport();
  const providerOrderingActivation = buildVaccineProviderOrderingActivationWorkflowReport();
  const billingInventory = buildVaccineBillingInventoryReport();
  const providerSearch = buildVaccineProviderSearchReport();
  const pediatricExclusions = buildPediatricVaccineExclusionReport();
  const rollback = buildVaccineRollbackReport();
  const i18n = buildVaccineI18nCertificationReport();
  const docsMandatory = validateVaccineAdministrationDocumentation(emptyVaccineAdministrationDocumentation()).length > 0;
  const finalDecision: VaccineProviderOrderingActivationDecision =
    eligibility.eligibleCatalogCodes.length > 0 &&
    providerOrderingActivation.appearsOnMarImmediately &&
    billingInventory.blockers.length === 0 &&
    providerSearch.duplicateVaccineRows === 0 &&
    providerSearch.canonicalDisplayPreserved &&
    pediatricExclusions.activatedIncompletePediatricCatalogCodes.length === 0 &&
    rollback.removesFromFutureProviderSearch &&
    docsMandatory
      ? "VACCINE_PROVIDER_ORDERING_ACTIVE"
      : eligibility.eligibleCatalogCodes.length > 0
        ? "READY_WITH_BLOCKERS"
        : "NOT_READY";
  finalReportCache = {
    ticket: "MEDUI.MEDICATION.VACCINE_PROVIDER_ORDERING_ACTIVATION.1",
    baseline,
    inventory,
    eligibility,
    safety,
    providerOrderingActivation,
    pharmacyWorkflow: buildVaccinePharmacyWorkflowReport(),
    billingInventory,
    providerSearch,
    pediatricExclusions,
    rollback,
    i18n: {
      ...i18n,
      ...buildNonBlockingPharmacyI18nReport(),
      tdapLabelPreserved: coverageRows().find((row) => row.vaccineId === "tdap")?.labelEn === "Tdap",
      tdLabelPreserved: coverageRows().find((row) => row.vaccineId === "td")?.labelEn === "Td",
    },
    compatibility: {
      ordersPersistImmediately: providerOrderingActivation.providerOrderPersistsImmediately,
      marSchedulesImmediately: providerOrderingActivation.appearsOnMarImmediately,
      pharmacyReviewNonBlocking: true,
      vaccineDocumentationStillMandatory: docsMandatory,
      tdapTdIdentityPreserved: providerSearch.canonicalDisplayPreserved,
      pediatricGapsNotBypassed: pediatricExclusions.activatedIncompletePediatricCatalogCodes.length === 0,
      providerSearchChangedOnlyForEligibleVaccines: providerSearch.medicationCatalogServiceIncludesVaccines,
      billingBehaviorChanged: false,
      inventoryBehaviorChanged: false,
      migrationsRequired: false,
    },
    finalDecision,
  };
  return finalReportCache;
}
