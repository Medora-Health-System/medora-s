/**
 * MEDUI.MEDS.ENTERPRISE_IVPB_INFUSION_GOVERNANCE_WAVE.1
 * Enterprise IVPB / infusion governance audit — certification only, no activation.
 */

import { CONTROLLED_SUBSTANCE_GOVERNANCE_HOLD_CODES } from "./enterpriseEssentialFormularyActivationWaveRegistry.js";
import { ENTERPRISE_CARDIOLOGY_FORMULARY_BY_CODE } from "./enterpriseCardiologyFormularyManifest.js";
import { ENTERPRISE_CONTROLLED_SUBSTANCE_FORMULARY_BY_CODE } from "./enterpriseControlledSubstanceFormularyManifest.js";
import { ENTERPRISE_GASTROENTEROLOGY_FORMULARY_BY_CODE } from "./enterpriseGastroenterologyFormularyManifest.js";
import {
  buildEnterpriseMedicationInventoryReport,
  resetEnterpriseFormularyGapAnalysisCaches,
  type EnterpriseMedicationInventoryRow,
} from "./enterpriseFormularyGapAnalysis.js";
import { ENTERPRISE_IV_FLUIDS_FORMULARY_BY_CODE } from "./enterpriseIvFluidsFormularyManifest.js";
import { ENTERPRISE_NEUROLOGY_INFECTIOUS_DISEASE_FORMULARY_BY_CODE } from "./enterpriseNeurologyInfectiousDiseaseFormularyManifest.js";
import { ENTERPRISE_OBGYN_FORMULARY_BY_CODE } from "./enterpriseObgynFormularyManifest.js";
import { ENTERPRISE_ONCOLOGY_FORMULARY_BY_CODE } from "./enterpriseOncologyFormularyManifest.js";
import { ENTERPRISE_PEDIATRICS_FORMULARY_BY_CODE } from "./enterprisePediatricsFormularyManifest.js";
import { ENTERPRISE_PSYCHIATRY_FORMULARY_BY_CODE } from "./enterprisePsychiatryFormularyManifest.js";
import { ENTERPRISE_SURGERY_PERIOPERATIVE_FORMULARY_BY_CODE } from "./enterpriseSurgeryPerioperativeFormularyManifest.js";
import { ENTERPRISE_WAVE1_FORMULARY_BY_CODE } from "./enterpriseWave1FormularyManifest.js";
import { ENTERPRISE_WAVE2_FORMULARY_BY_CODE } from "./enterpriseWave2FormularyManifest.js";
import { ENTERPRISE_WAVE3_FORMULARY_BY_CODE } from "./enterpriseWave3FormularyManifest.js";
import { ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_BY_CODE } from "./enterpriseWave4EdHospitalFormularyManifest.js";
import { HAITI_MEDICATION_FORMULARY_CATALOG } from "./haitiMedicationFormularyCatalog.js";
import { resolveIvpbRuntimeCatalogCodeAlias } from "./haitiIvpbRuntimeCatalogCodeAliases.js";
import {
  buildContinuousInfusionWorkflowReport,
  isEnterpriseContinuousInfusionCatalogCode,
} from "./continuousInfusionLifecycleGovernance.js";
import { isMedicationInfusionCandidate } from "./infusionRoute.util.js";
import { evaluateIvpbDoseSessionEligibility } from "./ivpbDoseSessionEligibility.js";
import { buildActivationGovernanceRecord } from "./medicationActivationGovernance.js";
import { resolveMedicationBillingReadiness } from "./medicationActivationBillingReadiness.js";
import { evaluateDoseGatedMarEligibility } from "./medicationDoseMarEligibility.js";
import { buildUnifiedOrderabilityMap } from "./medicationOrderabilityCertification.js";
import type { MedicationOrderabilityRecord } from "./medicationOrderabilityGovernance.js";
import { normalizeMedicationRoute } from "./medicationOrderRoute.js";
import { evaluateNonBlockingPharmacyWorkflow } from "./nonBlockingPharmacyReviewPolicy.js";
import { isActiveProviderOrderableCatalogCode } from "./providerOrderableCatalogCodesRegistry.js";

export type IvpbGovernanceClassification =
  | "READY_FOR_ACTIVATION"
  | "NEEDS_INFUSION_METADATA"
  | "NEEDS_RUNTIME_GOVERNANCE"
  | "NEEDS_PROVIDER_GOVERNANCE"
  | "NEEDS_PHARMACY_GOVERNANCE"
  | "BLOCKED";

export type IvpbInfusionWorkflowKind = "IVPB" | "CONTINUOUS_INFUSION";

export type IvpbGovernanceAuditRow = {
  catalogCode: string;
  displayNameEn: string;
  displayNameFr: string;
  genericName: string;
  route: string;
  doseForm: string;
  administrationType: string | null;
  workflowKind: IvpbInfusionWorkflowKind;
  providerOrderable: boolean;
  marReady: boolean;
  stagingAdministrationType: string | null;
  runtimeInfusionMetadataPresent: boolean;
  stagingOnlyInfusionMetadata: boolean;
  runtimeCompatible: boolean;
  startStopCompatible: boolean;
  marCompatible: boolean;
  pharmacyCompatible: boolean;
  providerGovernanceCompatible: boolean;
  edWorkflowCompatible: boolean;
  icuWorkflowCompatible: boolean;
  medicationResponseSupport: boolean;
  orderLifecycleSupport: boolean;
  printPacketSupport: boolean;
  summarySupport: boolean;
  auditTrailSupport: boolean;
  classification: IvpbGovernanceClassification;
  blockers: string[];
};

export type IvpbEnterpriseGovernanceAuditReport = {
  ticket: "MEDUI.MEDS.ENTERPRISE_IVPB_INFUSION_GOVERNANCE_WAVE.1";
  totalIvpbMedications: number;
  totalCatalogMedications: number;
  totalProviderOrderable: number;
  classificationCounts: Record<IvpbGovernanceClassification, number>;
  expansionAuditMissingInfusionMetadataCount: number;
  strictMissingAdministrationTypeCount: number;
  stagingOnlyInfusionMetadataCount: number;
  readyForActivationCount: number;
  providerOrderableIvpbCount: number;
  rows: IvpbGovernanceAuditRow[];
  finalDecision: "ENTERPRISE_IVPB_GOVERNANCE_CERTIFIED" | "ENTERPRISE_IVPB_GOVERNANCE_BLOCKED";
  blockers: string[];
};

export type IvpbInfusionRuntimeCompatibilityReport = {
  decision: "PASS" | "PARTIAL" | "FAIL";
  ivpbSessionRuntimeSupported: boolean;
  continuousInfusionRuntimeSupported: boolean;
  startStopSupported: boolean;
  readyRowsRuntimeCompatible: number;
  readyRowsTotal: number;
  blockers: string[];
};

export type IvpbPharmacyCompatibilityReport = {
  decision: "PASS" | "PARTIAL" | "FAIL";
  nonBlockingPharmacyWorkflow: boolean;
  readyRowsPharmacyCompatible: number;
  needsPharmacyGovernanceCount: number;
  blockers: string[];
};

export type IvpbProviderGovernanceCompatibilityReport = {
  decision: "PASS" | "PARTIAL" | "FAIL";
  readyRowsProviderGovernanceCompatible: number;
  needsProviderGovernanceCount: number;
  blockedControlledCount: number;
  blockers: string[];
};

export type IvpbMedicationClassificationReport = {
  rows: Array<{ catalogCode: string; classification: IvpbGovernanceClassification; workflowKind: IvpbInfusionWorkflowKind }>;
  byClassification: Record<IvpbGovernanceClassification, string[]>;
};

export type IvpbRemainingBlockersReport = {
  needsInfusionMetadata: string[];
  needsRuntimeGovernance: string[];
  needsProviderGovernance: string[];
  needsPharmacyGovernance: string[];
  blocked: string[];
};

export type IvpbEnterpriseGovernanceWaveReport = {
  audit: IvpbEnterpriseGovernanceAuditReport;
  runtime: IvpbInfusionRuntimeCompatibilityReport;
  pharmacy: IvpbPharmacyCompatibilityReport;
  providerGovernance: IvpbProviderGovernanceCompatibilityReport;
  classification: IvpbMedicationClassificationReport;
  remainingBlockers: IvpbRemainingBlockersReport;
};

const governanceHoldSet = new Set<string>(CONTROLLED_SUBSTANCE_GOVERNANCE_HOLD_CODES);

let orderabilityCache: Map<string, MedicationOrderabilityRecord> | null = null;
let auditCache: IvpbEnterpriseGovernanceWaveReport | null = null;

function orderabilityMap(): Map<string, MedicationOrderabilityRecord> {
  if (!orderabilityCache) orderabilityCache = buildUnifiedOrderabilityMap();
  return orderabilityCache;
}

function inventoryBlob(row: EnterpriseMedicationInventoryRow | IvpbGovernanceAuditRow): string {
  return [row.catalogCode, row.displayNameEn, row.displayNameFr, row.route, "form" in row ? row.form : row.doseForm]
    .join(" ")
    .toLowerCase();
}

/** Aligns with enterprise formulary expansion audit IVPB row detection. */
export function isEnterpriseIvpbInventoryRow(row: EnterpriseMedicationInventoryRow): boolean {
  const text = inventoryBlob(row);
  return (
    text.includes("ivpb") ||
    text.includes("perfusion") ||
    (text.includes("injectable") && text.includes("piperacillin"))
  );
}

export function resolveCatalogAdministrationType(
  catalogCode: string,
  record?: MedicationOrderabilityRecord | null
): string | null {
  const resolvedCode = resolveIvpbRuntimeCatalogCodeAlias(catalogCode);
  const haiti =
    HAITI_MEDICATION_FORMULARY_CATALOG.find((row) => row.code === resolvedCode)?.administrationType ?? null;
  const orderabilityAdmin =
    (record as { administrationType?: string | null } | undefined)?.administrationType ?? null;
  if (haiti) return haiti;
  if (orderabilityAdmin) return orderabilityAdmin;
  if (record?.dosageForm?.toLowerCase().includes("perfusion")) return "INFUSION";
  return null;
}

/** Enterprise manifest staging metadata — not yet runtime-authoritative until seeded. */
export function resolveStagingCatalogAdministrationType(catalogCode: string): string | null {
  return (
    ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_BY_CODE[catalogCode]?.administrationType ??
    ENTERPRISE_NEUROLOGY_INFECTIOUS_DISEASE_FORMULARY_BY_CODE[catalogCode]?.administrationType ??
    ENTERPRISE_IV_FLUIDS_FORMULARY_BY_CODE[catalogCode]?.administrationType ??
    ENTERPRISE_CARDIOLOGY_FORMULARY_BY_CODE[catalogCode]?.administrationType ??
    ENTERPRISE_ONCOLOGY_FORMULARY_BY_CODE[catalogCode]?.administrationType ??
    ENTERPRISE_OBGYN_FORMULARY_BY_CODE[catalogCode]?.administrationType ??
    ENTERPRISE_PSYCHIATRY_FORMULARY_BY_CODE[catalogCode]?.administrationType ??
    ENTERPRISE_GASTROENTEROLOGY_FORMULARY_BY_CODE[catalogCode]?.administrationType ??
    ENTERPRISE_PEDIATRICS_FORMULARY_BY_CODE[catalogCode]?.administrationType ??
    ENTERPRISE_SURGERY_PERIOPERATIVE_FORMULARY_BY_CODE[catalogCode]?.administrationType ??
    ENTERPRISE_CONTROLLED_SUBSTANCE_FORMULARY_BY_CODE[catalogCode]?.administrationType ??
    ENTERPRISE_WAVE3_FORMULARY_BY_CODE[catalogCode]?.administrationType ??
    ENTERPRISE_WAVE2_FORMULARY_BY_CODE[catalogCode]?.administrationType ??
    ENTERPRISE_WAVE1_FORMULARY_BY_CODE[catalogCode]?.administrationType ??
    null
  );
}

/** Expansion-audit-compatible metadata check (route perfusion fallback included). */
export function expansionAuditInfusionMetadataPresent(
  row: EnterpriseMedicationInventoryRow,
  record?: MedicationOrderabilityRecord | null
): boolean {
  const resolvedCode = resolveIvpbRuntimeCatalogCodeAlias(row.catalogCode);
  const adminType = (record as { administrationType?: string | null } | undefined)?.administrationType;
  const haiti = HAITI_MEDICATION_FORMULARY_CATALOG.find((h) => h.code === resolvedCode);
  return Boolean(
    adminType === "INFUSION" ||
      haiti?.administrationType === "INFUSION" ||
      row.route.toLowerCase().includes("perfusion")
  );
}

export function resolveIvpbInfusionWorkflowKind(
  catalogCode: string,
  record: MedicationOrderabilityRecord,
  adminType: string | null
): IvpbInfusionWorkflowKind {
  if (isEnterpriseContinuousInfusionCatalogCode(catalogCode)) return "CONTINUOUS_INFUSION";
  const hay = [catalogCode, record.genericName, record.displayNameEn].join(" ").toLowerCase();
  const pressorTokens = [
    "norepinephrine",
    "epinephrine",
    "dopamine",
    "dobutamine",
    "phenylephrine",
    "vasopressin",
    "milrinone",
    "nicardipine",
    "nitroglycerin",
    "insulin",
    "heparin infusion",
    "propofol",
    "midazolam",
    "fentanyl",
    "morphine infusion",
  ];
  if (pressorTokens.some((token) => hay.includes(token)) && adminType === "INFUSION") {
    return "CONTINUOUS_INFUSION";
  }
  return "IVPB";
}

function evaluateRuntimeCompatibility(
  workflowKind: IvpbInfusionWorkflowKind,
  record: MedicationOrderabilityRecord,
  adminType: string | null
): { runtimeCompatible: boolean; startStopCompatible: boolean; blockers: string[] } {
  const blockers: string[] = [];
  const infusionCandidate = isMedicationInfusionCandidate({
    route: record.route,
    medicationLabel: record.displayNameEn,
    code: record.catalogCode,
    genericName: record.genericName,
    catalogAdministrationType: adminType,
  });
  if (!infusionCandidate) blockers.push("NOT_INFUSION_CANDIDATE");

  const normalizedRoute = normalizeMedicationRoute({ route: record.route, administrationType: adminType });
  if (workflowKind === "IVPB" && normalizedRoute !== "IVPB" && adminType !== "INFUSION") {
    blockers.push("IVPB_ROUTE_NOT_NORMALIZED");
  }

  let startStopCompatible = false;
  if (workflowKind === "IVPB") {
    const session = evaluateIvpbDoseSessionEligibility({
      doseKind: "IVPB_SESSION",
      doseStatus: "DUE",
      scheduleClassification: "RECURRING_IVPB",
    });
    if ("start" in session) {
      startStopCompatible = session.start.eligible;
      if (!startStopCompatible) blockers.push("IVPB_SESSION_START_STOP_INELIGIBLE");
    }
  } else {
    const workflow = buildContinuousInfusionWorkflowReport();
    startStopCompatible = workflow.startStopSupported;
    if (!startStopCompatible) blockers.push("CONTINUOUS_START_STOP_UNSUPPORTED");
  }

  return {
    runtimeCompatible: blockers.length === 0,
    startStopCompatible,
    blockers,
  };
}

function evaluateMarCompatibility(
  workflowKind: IvpbInfusionWorkflowKind,
  marReady: boolean,
  record: MedicationOrderabilityRecord,
  adminType: string | null
): { marCompatible: boolean; blockers: string[] } {
  const blockers: string[] = [];
  if (!marReady) blockers.push("MAR_NOT_READY");

  if (workflowKind === "IVPB") {
    const gated = evaluateDoseGatedMarEligibility({
      scheduleClassification: "RECURRING_IVPB",
      scheduleStatus: "ACTIVE",
      doseKind: "IVPB_SESSION",
      doseStatus: "DUE",
      doseOrderItemId: "oi-cert",
      requestOrderItemId: "oi-cert",
      doseEncounterId: "enc-cert",
      requestEncounterId: "enc-cert",
      doseFacilityId: "fac-cert",
      requestFacilityId: "fac-cert",
    });
    if (gated.eligible) blockers.push("DIRECT_MAR_BYPASS_NOT_BLOCKED");
  }

  const infusionCandidate = isMedicationInfusionCandidate({
    route: record.route,
    medicationLabel: record.displayNameEn,
    code: record.catalogCode,
    genericName: record.genericName,
    catalogAdministrationType: adminType,
  });
  if (!infusionCandidate) blockers.push("INFUSION_LIFECYCLE_NOT_REQUIRED");

  return { marCompatible: blockers.length === 0, blockers };
}

function evaluatePharmacyCompatibility(catalogCode: string): { pharmacyCompatible: boolean; blockers: string[] } {
  const billing = resolveMedicationBillingReadiness(catalogCode);
  const workflow = evaluateNonBlockingPharmacyWorkflow({ requiresPharmacyReview: true });
  const blockers: string[] = [];
  if (!billing.billingReady && !billing.ndcReady) blockers.push("BILLING_NDC_NOT_READY");
  if (!workflow.pharmacyVisible) blockers.push("PHARMACY_NOT_VISIBLE");
  return { pharmacyCompatible: blockers.length === 0, blockers };
}

function evaluateProviderGovernanceCompatibility(
  record: MedicationOrderabilityRecord,
  providerOrderable: boolean
): { providerGovernanceCompatible: boolean; blockers: string[] } {
  const governance = buildActivationGovernanceRecord(record);
  const blockers: string[] = [];
  if (governance.controlledSubstanceFlag && governanceHoldSet.has(record.catalogCode)) {
    blockers.push("CONTROLLED_SUBSTANCE_GOVERNANCE_HOLD");
  }
  if (governance.highRiskFlag && !providerOrderable && !governance.orderSearchReady) {
    blockers.push("HIGH_ALERT_GOVERNANCE_MISSING");
  }
  if (!governance.marReady) blockers.push("MAR_NOT_READY");
  return { providerGovernanceCompatible: blockers.length === 0, blockers };
}

function classifyIvpbMedication(
  inventoryRow: EnterpriseMedicationInventoryRow,
  record: MedicationOrderabilityRecord | undefined
): IvpbGovernanceAuditRow {
  const blockers: string[] = [];
  if (!record) {
    return {
      catalogCode: inventoryRow.catalogCode,
      displayNameEn: inventoryRow.displayNameEn,
      displayNameFr: inventoryRow.displayNameFr,
      genericName: "",
      route: inventoryRow.route,
      doseForm: inventoryRow.form,
      administrationType: null,
      workflowKind: "IVPB",
      providerOrderable: inventoryRow.providerOrderable,
      marReady: false,
      runtimeInfusionMetadataPresent: false,
      stagingAdministrationType: null,
      stagingOnlyInfusionMetadata: false,
      runtimeCompatible: false,
      startStopCompatible: false,
      marCompatible: false,
      pharmacyCompatible: false,
      providerGovernanceCompatible: false,
      edWorkflowCompatible: false,
      icuWorkflowCompatible: false,
      medicationResponseSupport: false,
      orderLifecycleSupport: false,
      printPacketSupport: false,
      summarySupport: false,
      auditTrailSupport: false,
      classification: "BLOCKED",
      blockers: ["CATALOG_RECORD_MISSING"],
    };
  }

  const adminType = resolveCatalogAdministrationType(record.catalogCode, record);
  const stagingAdminType = resolveStagingCatalogAdministrationType(record.catalogCode);
  const runtimeMetadata = expansionAuditInfusionMetadataPresent(inventoryRow, record);
  const stagingOnlyMetadata = stagingAdminType === "INFUSION" && !runtimeMetadata;
  const workflowKind = resolveIvpbInfusionWorkflowKind(record.catalogCode, record, adminType ?? stagingAdminType);
  const providerOrderable = isActiveProviderOrderableCatalogCode(record.catalogCode);
  const governance = buildActivationGovernanceRecord(record);

  const runtime = evaluateRuntimeCompatibility(workflowKind, record, adminType ?? stagingAdminType);
  const mar = evaluateMarCompatibility(workflowKind, governance.marReady, record, adminType ?? stagingAdminType);
  const pharmacy = evaluatePharmacyCompatibility(record.catalogCode);
  const providerGov = evaluateProviderGovernanceCompatibility(record, providerOrderable);

  blockers.push(...runtime.blockers, ...mar.blockers, ...pharmacy.blockers, ...providerGov.blockers);

  const workflowReady =
    governance.marReady &&
    runtimeMetadata &&
    runtime.runtimeCompatible &&
    runtime.startStopCompatible &&
    mar.marCompatible;

  const edWorkflowCompatible = workflowReady;
  const icuWorkflowCompatible = workflowReady || workflowKind === "CONTINUOUS_INFUSION";
  const medicationResponseSupport = workflowReady;
  const orderLifecycleSupport = providerOrderable || governance.marReady;
  const printPacketSupport = workflowReady;
  const summarySupport = workflowReady;
  const auditTrailSupport = workflowReady;

  let classification: IvpbGovernanceClassification = "READY_FOR_ACTIVATION";

  if (governanceHoldSet.has(record.catalogCode) && governance.controlledSubstanceFlag) {
    classification = "BLOCKED";
    blockers.push("CONTROLLED_SUBSTANCE_BLOCKED");
  } else if (!runtimeMetadata) {
    classification = "NEEDS_INFUSION_METADATA";
    if (stagingOnlyMetadata) blockers.push("STAGING_ONLY_INFUSION_METADATA");
  } else if (!runtime.runtimeCompatible || !runtime.startStopCompatible) {
    classification = "NEEDS_RUNTIME_GOVERNANCE";
  } else if (!providerGov.providerGovernanceCompatible) {
    classification = "NEEDS_PROVIDER_GOVERNANCE";
  } else if (!pharmacy.pharmacyCompatible) {
    classification = "NEEDS_PHARMACY_GOVERNANCE";
  } else if (!mar.marCompatible) {
    classification = "NEEDS_PROVIDER_GOVERNANCE";
  }

  const uniqueBlockers = [...new Set(blockers)];

  return {
    catalogCode: record.catalogCode,
    displayNameEn: record.displayNameEn,
    displayNameFr: record.displayNameFr,
    genericName: record.genericName,
    route: record.route,
    doseForm: record.dosageForm,
    administrationType: adminType,
    workflowKind,
    providerOrderable,
    marReady: governance.marReady,
    runtimeInfusionMetadataPresent: runtimeMetadata,
    stagingAdministrationType: stagingAdminType,
    stagingOnlyInfusionMetadata: stagingOnlyMetadata,
    runtimeCompatible: runtime.runtimeCompatible,
    startStopCompatible: runtime.startStopCompatible,
    marCompatible: mar.marCompatible,
    pharmacyCompatible: pharmacy.pharmacyCompatible,
    providerGovernanceCompatible: providerGov.providerGovernanceCompatible,
    edWorkflowCompatible,
    icuWorkflowCompatible,
    medicationResponseSupport,
    orderLifecycleSupport,
    printPacketSupport,
    summarySupport,
    auditTrailSupport,
    classification,
    blockers: uniqueBlockers,
  };
}

export function buildIvpbGovernanceAuditRows(): IvpbGovernanceAuditRow[] {
  const inventory = buildEnterpriseMedicationInventoryReport();
  const map = orderabilityMap();
  return inventory.rows.filter(isEnterpriseIvpbInventoryRow).map((row) => classifyIvpbMedication(row, map.get(row.catalogCode)));
}

function emptyClassificationCounts(): Record<IvpbGovernanceClassification, number> {
  return {
    READY_FOR_ACTIVATION: 0,
    NEEDS_INFUSION_METADATA: 0,
    NEEDS_RUNTIME_GOVERNANCE: 0,
    NEEDS_PROVIDER_GOVERNANCE: 0,
    NEEDS_PHARMACY_GOVERNANCE: 0,
    BLOCKED: 0,
  };
}

export function buildIvpbEnterpriseGovernanceAuditReport(): IvpbEnterpriseGovernanceAuditReport {
  const rows = buildIvpbGovernanceAuditRows();
  const inventory = buildEnterpriseMedicationInventoryReport();
  const classificationCounts = emptyClassificationCounts();
  for (const row of rows) classificationCounts[row.classification] += 1;

  const expansionAuditMissing = rows.filter((row) => !row.runtimeInfusionMetadataPresent).length;
  const strictMissing = rows.filter((row) => !row.runtimeInfusionMetadataPresent).length;
  const stagingOnlyCount = rows.filter((row) => row.stagingOnlyInfusionMetadata).length;
  const ready = rows.filter((row) => row.classification === "READY_FOR_ACTIVATION");

  const frameworkBlockers: string[] = [];
  if (rows.length === 0) frameworkBlockers.push("NO_IVPB_MEDICATIONS_FOUND");
  const orderableMissingRuntimeMeta = rows.filter((r) => r.providerOrderable && !r.runtimeInfusionMetadataPresent);
  if (orderableMissingRuntimeMeta.length > 0) {
    frameworkBlockers.push("PROVIDER_ORDERABLE_IVPB_MISSING_RUNTIME_INFUSION_METADATA");
  }

  return {
    ticket: "MEDUI.MEDS.ENTERPRISE_IVPB_INFUSION_GOVERNANCE_WAVE.1",
    totalIvpbMedications: rows.length,
    totalCatalogMedications: inventory.totalCatalogRows,
    totalProviderOrderable: inventory.totalProviderOrderableRows,
    classificationCounts,
    expansionAuditMissingInfusionMetadataCount: expansionAuditMissing,
    strictMissingAdministrationTypeCount: strictMissing,
    stagingOnlyInfusionMetadataCount: stagingOnlyCount,
    readyForActivationCount: ready.length,
    providerOrderableIvpbCount: rows.filter((row) => row.providerOrderable).length,
    rows,
    finalDecision:
      frameworkBlockers.length === 0 ? "ENTERPRISE_IVPB_GOVERNANCE_CERTIFIED" : "ENTERPRISE_IVPB_GOVERNANCE_BLOCKED",
    blockers: frameworkBlockers,
  };
}

export function buildIvpbInfusionRuntimeCompatibilityReport(): IvpbInfusionRuntimeCompatibilityReport {
  const rows = buildIvpbGovernanceAuditRows();
  const ready = rows.filter((row) => row.classification === "READY_FOR_ACTIVATION");
  const workflow = buildContinuousInfusionWorkflowReport();
  const blockers: string[] = [];
  const runtimeFail = rows.filter((row) => row.runtimeInfusionMetadataPresent && !row.runtimeCompatible);
  if (runtimeFail.length > 0) blockers.push("RUNTIME_INCOMPATIBLE_ROWS_PRESENT");

  return {
    decision: ready.every((row) => row.runtimeCompatible && row.startStopCompatible)
      ? "PASS"
      : ready.length > 0
        ? "PARTIAL"
        : "FAIL",
    ivpbSessionRuntimeSupported: (() => {
      const session = evaluateIvpbDoseSessionEligibility({
        doseKind: "IVPB_SESSION",
        doseStatus: "DUE",
        scheduleClassification: "RECURRING_IVPB",
      });
      return "start" in session && session.start.eligible;
    })(),
    continuousInfusionRuntimeSupported: workflow.startStopSupported,
    startStopSupported: workflow.startStopSupported,
    readyRowsRuntimeCompatible: ready.filter((row) => row.runtimeCompatible && row.startStopCompatible).length,
    readyRowsTotal: ready.length,
    blockers,
  };
}

export function buildIvpbPharmacyCompatibilityReport(): IvpbPharmacyCompatibilityReport {
  const rows = buildIvpbGovernanceAuditRows();
  const ready = rows.filter((row) => row.classification === "READY_FOR_ACTIVATION");
  const workflow = evaluateNonBlockingPharmacyWorkflow({ requiresPharmacyReview: true });
  return {
    decision: ready.every((row) => row.pharmacyCompatible) ? "PASS" : ready.length > 0 ? "PARTIAL" : "FAIL",
    nonBlockingPharmacyWorkflow: workflow.pharmacyVisible && workflow.orderPersistedImmediately,
    readyRowsPharmacyCompatible: ready.filter((row) => row.pharmacyCompatible).length,
    needsPharmacyGovernanceCount: rows.filter((row) => row.classification === "NEEDS_PHARMACY_GOVERNANCE").length,
    blockers: [],
  };
}

export function buildIvpbProviderGovernanceCompatibilityReport(): IvpbProviderGovernanceCompatibilityReport {
  const rows = buildIvpbGovernanceAuditRows();
  const ready = rows.filter((row) => row.classification === "READY_FOR_ACTIVATION");
  return {
    decision: ready.every((row) => row.providerGovernanceCompatible) ? "PASS" : ready.length > 0 ? "PARTIAL" : "FAIL",
    readyRowsProviderGovernanceCompatible: ready.filter((row) => row.providerGovernanceCompatible).length,
    needsProviderGovernanceCount: rows.filter((row) => row.classification === "NEEDS_PROVIDER_GOVERNANCE").length,
    blockedControlledCount: rows.filter((row) => row.classification === "BLOCKED").length,
    blockers: [],
  };
}

export function buildIvpbMedicationClassificationReport(): IvpbMedicationClassificationReport {
  const rows = buildIvpbGovernanceAuditRows();
  const byClassification = {
    READY_FOR_ACTIVATION: [] as string[],
    NEEDS_INFUSION_METADATA: [] as string[],
    NEEDS_RUNTIME_GOVERNANCE: [] as string[],
    NEEDS_PROVIDER_GOVERNANCE: [] as string[],
    NEEDS_PHARMACY_GOVERNANCE: [] as string[],
    BLOCKED: [] as string[],
  };
  for (const row of rows) byClassification[row.classification].push(row.catalogCode);
  return {
    rows: rows.map((row) => ({
      catalogCode: row.catalogCode,
      classification: row.classification,
      workflowKind: row.workflowKind,
    })),
    byClassification,
  };
}

export function buildIvpbRemainingBlockersReport(): IvpbRemainingBlockersReport {
  const classification = buildIvpbMedicationClassificationReport();
  return {
    needsInfusionMetadata: classification.byClassification.NEEDS_INFUSION_METADATA,
    needsRuntimeGovernance: classification.byClassification.NEEDS_RUNTIME_GOVERNANCE,
    needsProviderGovernance: classification.byClassification.NEEDS_PROVIDER_GOVERNANCE,
    needsPharmacyGovernance: classification.byClassification.NEEDS_PHARMACY_GOVERNANCE,
    blocked: classification.byClassification.BLOCKED,
  };
}

export function buildIvpbEnterpriseGovernanceWaveReport(): IvpbEnterpriseGovernanceWaveReport {
  if (auditCache) return auditCache;
  auditCache = {
    audit: buildIvpbEnterpriseGovernanceAuditReport(),
    runtime: buildIvpbInfusionRuntimeCompatibilityReport(),
    pharmacy: buildIvpbPharmacyCompatibilityReport(),
    providerGovernance: buildIvpbProviderGovernanceCompatibilityReport(),
    classification: buildIvpbMedicationClassificationReport(),
    remainingBlockers: buildIvpbRemainingBlockersReport(),
  };
  return auditCache;
}

/** Certification helper for tests — validates a READY_FOR_ACTIVATION row end-to-end. */
export function certifyReadyIvpbMedicationGovernance(row: IvpbGovernanceAuditRow): {
  certified: boolean;
  blockers: string[];
} {
  const blockers: string[] = [];
  if (row.classification !== "READY_FOR_ACTIVATION") blockers.push("NOT_READY_FOR_ACTIVATION");
  if (!row.startStopCompatible) blockers.push("START_STOP_INCOMPATIBLE");
  if (!row.marCompatible) blockers.push("MAR_INCOMPATIBLE");
  if (!row.pharmacyCompatible) blockers.push("PHARMACY_INCOMPATIBLE");
  if (!row.edWorkflowCompatible) blockers.push("ED_WORKFLOW_INCOMPATIBLE");
  if (!row.printPacketSupport) blockers.push("PRINT_PACKET_UNSUPPORTED");
  if (!row.summarySupport) blockers.push("SUMMARY_UNSUPPORTED");
  if (!row.auditTrailSupport) blockers.push("AUDIT_TRAIL_UNSUPPORTED");
  return { certified: blockers.length === 0, blockers };
}

export function resetEnterpriseIvpbInfusionGovernanceCachesForTests(): void {
  orderabilityCache = null;
  auditCache = null;
  resetEnterpriseFormularyGapAnalysisCaches();
}
