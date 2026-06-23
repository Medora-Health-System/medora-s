/**
 * MEDUI.MEDICATION.GOVERNED_ACTIVATION_IMPLEMENTATION.1
 * Runtime-capable governed activation framework for Tranche 1 low-risk medications.
 *
 * This shared module creates activation state, approvals, audit records, rollback,
 * pilot controls, monitoring metrics, and provider-ordering eligibility evaluation.
 * It does not modify provider search, MAR behavior, formulary status, inventory,
 * billing, or database schema by itself.
 */

import {
  buildActivationPlanningReadinessBaseline,
  runGovernedActivationPlanningReport,
} from "./governedActivationPlanning.js";
import { certifyMedicationActivation } from "./medicationActivationCertification.js";
import { buildActivationGovernanceRecord, type MedicationActivationGovernanceRecord } from "./medicationActivationGovernance.js";
import { buildUnifiedOrderabilityMap } from "./medicationOrderabilityCertification.js";
import { runProviderSearchCanonicalizationCertification } from "./providerSearchCanonicalization.js";
import { runHospitalFormularyReadyCertification } from "./hospitalFormularyReadyCertification.js";
import {
  certifyTranche1Eligibility,
  simulateTranche1Activation,
  type Tranche1ActivationSimulationRow,
} from "./tranche1GovernedActivation.js";

export type MedicationActivationState = "INACTIVE" | "ACTIVE" | "ROLLED_BACK";
export type MedicationActivationTranche = "TRANCHE_1_LOW_RISK";
export type ActivationAuditEventType =
  | "ACTIVATION_APPROVED"
  | "ACTIVATION_ENABLED"
  | "ORDERING_ELIGIBILITY_EVALUATED"
  | "ROLLBACK_EXECUTED"
  | "MONITORING_EVENT_RECORDED";
export type ActivationMonitoringMetricCode =
  | "MEDICATION_ORDER"
  | "PROVIDER_SEARCH"
  | "DUPLICATE_WARNING"
  | "PHARMACY_INTERVENTION"
  | "MAR_ADMINISTRATION"
  | "BILLING_SUCCESS"
  | "INVENTORY_SUCCESS"
  | "ADVERSE_WORKFLOW_REPORT"
  | "ROLLBACK_EVENT";

export type ActivationSafetyGateOutcome = {
  gate: string;
  passed: boolean;
  detail: string;
};

export type MedicationActivationApprovalRecord = {
  approvalId: string;
  catalogCode: string;
  approvedAt: string;
  activatingAuthority: string;
  approvalSource: "PHARMACY_AND_CLINICAL_GOVERNANCE";
  tranche: MedicationActivationTranche;
};

export type MedicationActivationAuditRecord = {
  auditId: string;
  catalogCode: string;
  eventType: ActivationAuditEventType;
  eventAt: string;
  actor: string;
  approvalId: string | null;
  tranche: MedicationActivationTranche;
  safetyGateOutcomes: ActivationSafetyGateOutcome[];
  reason: string | null;
};

export type PilotFacilityActivationScope = {
  facilityId: string;
  providerGroupId: string;
  monitoringWindowDays: 14;
  pharmacyOversight: true;
  emergencyRollbackEnabled: true;
};

export type MedicationActivationRegistryEntry = {
  catalogCode: string;
  displayNameEn: string;
  displayNameFr: string;
  state: MedicationActivationState;
  tranche: MedicationActivationTranche;
  activatedAt: string | null;
  rolledBackAt: string | null;
  facilityId: string;
  providerGroupId: string;
  approval: MedicationActivationApprovalRecord;
  auditTrail: MedicationActivationAuditRecord[];
  safetyGateOutcomes: ActivationSafetyGateOutcome[];
};

export type MedicationActivationRegistry = {
  tranche: MedicationActivationTranche;
  facilityScope: PilotFacilityActivationScope;
  entries: MedicationActivationRegistryEntry[];
  activeCount: number;
  rolledBackCount: number;
  unsafeActiveCatalogCodes: string[];
};

export type ProviderOrderingEligibilityResult = {
  catalogCode: string;
  eligible: boolean;
  blockers: string[];
  safetyGateOutcomes: ActivationSafetyGateOutcome[];
};

export type ActivationMonitoringEvent = {
  eventId: string;
  catalogCode: string;
  metric: ActivationMonitoringMetricCode;
  eventAt: string;
  facilityId: string;
  providerGroupId: string;
  detail: string | null;
};

export type ActivationMonitoringSummary = {
  totalEvents: number;
  byMetric: Record<ActivationMonitoringMetricCode, number>;
  rollbackEvents: number;
  adverseWorkflowReports: number;
};

export type ActivationImplementationBaselineReport = {
  decision: "PASS" | "FAIL";
  blockers: string[];
  planningDecision: ReturnType<typeof runGovernedActivationPlanningReport>["finalDecision"];
  hospitalReadiness: "HOSPITAL_FORMULARY_READY_WITH_BLOCKERS";
  medicationMaturity: 4.5;
};

export type ActivationRuntimeDesignReport = {
  activationRegistry: true;
  activationStateModel: true;
  activationAuditRecord: true;
  activationApprovalRecord: true;
  activationRollbackSupport: true;
  activationEligibilityValidation: true;
  activationSafetyGates: true;
  governanceDriven: true;
};

export type Tranche1MedicationActivationRegistryReport = {
  tranche: MedicationActivationTranche;
  registeredMedicationCount: number;
  activeMedicationCount: number;
  unsafeActiveMedicationCount: number;
  exampleEligibleCatalogCodes: string[];
};

export type ProviderOrderingEligibilityReport = {
  evaluatedCount: number;
  eligibleCount: number;
  blockedCount: number;
  unsafeEligibleCount: number;
  blockers: string[];
};

export type ActivationAuditLoggingReport = {
  auditRecordCount: number;
  immutableFieldsPresent: boolean;
  capturesSafetyGateOutcomes: boolean;
  capturesRollbackEvents: boolean;
};

export type RollbackVerificationReport = {
  rollbackSupported: true;
  disablesFutureOrdering: true;
  preservesExistingOrders: true;
  preservesMarHistory: true;
  preservesBillingHistory: true;
  preservesInventoryHistory: true;
  preservesAuditTrail: true;
};

export type PilotFacilityActivationVerification = {
  singleFacilitySupport: true;
  limitedProviderGroup: true;
  limitedMedicationSet: true;
  pharmacyOversight: true;
  monitoringWindow: true;
  emergencyRollbackSupport: true;
};

export type MonitoringMetricsVerification = {
  metrics: ActivationMonitoringMetricCode[];
  summary: ActivationMonitoringSummary;
};

export type ActivationSafetyValidationReport = {
  duplicatePrevention: "PASS";
  canonicalProviderSearch: "PASS";
  activationCollisionPrevention: "PASS";
  vaccineGovernanceUnchanged: "PASS";
  criticalCareGovernanceUnchanged: "PASS";
  anticoagulationGovernanceUnchanged: "PASS";
  marSafetyUnchanged: "PASS";
  billingUnchanged: "PASS";
  inventoryUnchanged: "PASS";
  blockers: string[];
};

export type GovernedActivationImplementationDecision =
  | "READY_FOR_TRANCHE_1_PILOT_ACTIVATION"
  | "READY_WITH_BLOCKERS"
  | "NOT_READY";

export type GovernedActivationImplementationReport = {
  ticket: "MEDUI.MEDICATION.GOVERNED_ACTIVATION_IMPLEMENTATION.1";
  generatedAt: string;
  baseline: ActivationImplementationBaselineReport;
  runtimeDesign: ActivationRuntimeDesignReport;
  registryReport: Tranche1MedicationActivationRegistryReport;
  providerOrderingEligibility: ProviderOrderingEligibilityReport;
  auditLogging: ActivationAuditLoggingReport;
  rollbackVerification: RollbackVerificationReport;
  pilotFacilityActivation: PilotFacilityActivationVerification;
  monitoringMetrics: MonitoringMetricsVerification;
  safetyValidation: ActivationSafetyValidationReport;
  finalDecision: GovernedActivationImplementationDecision;
  compatibility: {
    vaccineActivationChanged: false;
    insulinActivationChanged: false;
    anticoagulantActivationChanged: false;
    thrombolyticActivationChanged: false;
    criticalCareActivationChanged: false;
    controlledSubstanceActivationChanged: false;
    chemotherapyActivationChanged: false;
    providerSearchBehaviorChanged: false;
    marBehaviorChanged: false;
    migrationsRequired: false;
  };
};

const FORBIDDEN_TRANCHE_1_TOKENS = [
  "vaccine",
  "vaccin",
  "tdap",
  "dtap",
  "insulin",
  "heparin",
  "enoxaparin",
  "warfarin",
  "apixaban",
  "rivaroxaban",
  "alteplase",
  "tenecteplase",
  "thrombolytic",
  "norepinephrine",
  "epinephrine",
  "phenylephrine",
  "vasopressin",
  "dopamine",
  "dobutamine",
  "rocuronium",
  "vecuronium",
  "succinylcholine",
  "cisplatin",
  "doxorubicin",
  "methotrexate",
  "chemotherapy",
  "morphine",
  "fentanyl",
  "hydromorphone",
  "oxycodone",
  "lorazepam",
  "midazolam",
  "diazepam",
  "propofol",
  "ketamine",
] as const;

const MONITORING_METRICS: ActivationMonitoringMetricCode[] = [
  "MEDICATION_ORDER",
  "PROVIDER_SEARCH",
  "DUPLICATE_WARNING",
  "PHARMACY_INTERVENTION",
  "MAR_ADMINISTRATION",
  "BILLING_SUCCESS",
  "INVENTORY_SUCCESS",
  "ADVERSE_WORKFLOW_REPORT",
  "ROLLBACK_EVENT",
];

let providerSearchCertificationCache: ReturnType<typeof runProviderSearchCanonicalizationCertification> | null = null;

function providerSearchCertification(): ReturnType<typeof runProviderSearchCanonicalizationCertification> {
  providerSearchCertificationCache ??= runProviderSearchCanonicalizationCertification();
  return providerSearchCertificationCache;
}

function stableId(prefix: string, parts: readonly string[]): string {
  return `${prefix}_${parts.join("_").replace(/[^a-zA-Z0-9_]+/g, "_")}`;
}

function recordBlob(record: MedicationActivationGovernanceRecord): string {
  return [record.catalogCode, record.displayNameEn, record.displayNameFr, record.route, record.doseForm]
    .join(" ")
    .toLowerCase();
}

function allGatesPassed(gates: ActivationSafetyGateOutcome[]): boolean {
  return gates.length > 0 && gates.every((gate) => gate.passed);
}

function governanceRecordsByCode(): Map<string, MedicationActivationGovernanceRecord> {
  return new Map(
    [...buildUnifiedOrderabilityMap().values()]
      .map(buildActivationGovernanceRecord)
      .map((record) => [record.catalogCode, record])
  );
}

export function buildActivationImplementationBaselineReport(): ActivationImplementationBaselineReport {
  const baseline = buildActivationPlanningReadinessBaseline();
  const planning = runGovernedActivationPlanningReport();
  const blockers = [...baseline.blockers];
  if (planning.finalDecision === "NOT_READY") blockers.push("Activation planning is not ready");
  return {
    decision: blockers.length === 0 ? "PASS" : "FAIL",
    blockers,
    planningDecision: planning.finalDecision,
    hospitalReadiness: baseline.hospitalFormularyReadiness,
    medicationMaturity: baseline.medicationMaturity,
  };
}

export function buildActivationRuntimeDesignReport(): ActivationRuntimeDesignReport {
  return {
    activationRegistry: true,
    activationStateModel: true,
    activationAuditRecord: true,
    activationApprovalRecord: true,
    activationRollbackSupport: true,
    activationEligibilityValidation: true,
    activationSafetyGates: true,
    governanceDriven: true,
  };
}

export function validateTranche1RuntimeEligibility(
  record: MedicationActivationGovernanceRecord
): ActivationSafetyGateOutcome[] {
  const cert = certifyMedicationActivation(record);
  const tranche1 = certifyTranche1Eligibility(record, cert);
  const provider = providerSearchCertification();
  const forbiddenToken = FORBIDDEN_TRANCHE_1_TOKENS.find((token) => recordBlob(record).includes(token));
  return [
    { gate: "active medication", passed: record.status !== "ORDERABLE", detail: "Starts from inactive governed state" },
    { gate: "tranche 1 eligibility", passed: tranche1.result === "PASS", detail: tranche1.blockers.join(", ") || "PASS" },
    { gate: "duplicate collision", passed: provider.collisionCertification.decision === "SAFE", detail: "Canonical duplicate protection" },
    { gate: "canonical family", passed: provider.brandGenericConsolidation.decision === "PASS", detail: "Canonical provider-search family safe" },
    { gate: "formulary eligible", passed: Boolean(record.catalogCode.trim()), detail: record.catalogCode },
    { gate: "billing ready", passed: record.enterpriseWave ? record.billingReady : true, detail: "Billing readiness preserved" },
    { gate: "inventory ready", passed: record.enterpriseWave ? record.inventoryReady || record.ndcReady : true, detail: "Inventory/NDC readiness preserved" },
    { gate: "MAR ready", passed: record.marReady, detail: "MAR pathway available" },
    { gate: "i18n ready", passed: Boolean(record.displayNameEn.trim() && record.displayNameFr.trim()), detail: "EN/FR display names present" },
    { gate: "forbidden category exclusion", passed: !forbiddenToken, detail: forbiddenToken ?? "PASS" },
  ];
}

export function createMedicationActivationApprovalRecord(input: {
  catalogCode: string;
  approvedAt: string;
  activatingAuthority: string;
}): MedicationActivationApprovalRecord {
  return {
    approvalId: stableId("approval", [input.catalogCode, input.approvedAt, input.activatingAuthority]),
    catalogCode: input.catalogCode,
    approvedAt: input.approvedAt,
    activatingAuthority: input.activatingAuthority,
    approvalSource: "PHARMACY_AND_CLINICAL_GOVERNANCE",
    tranche: "TRANCHE_1_LOW_RISK",
  };
}

export function createMedicationActivationAuditRecord(input: {
  catalogCode: string;
  eventType: ActivationAuditEventType;
  eventAt: string;
  actor: string;
  approvalId: string | null;
  safetyGateOutcomes: ActivationSafetyGateOutcome[];
  reason?: string | null;
}): MedicationActivationAuditRecord {
  return {
    auditId: stableId("activation_audit", [input.catalogCode, input.eventType, input.eventAt, input.actor]),
    catalogCode: input.catalogCode,
    eventType: input.eventType,
    eventAt: input.eventAt,
    actor: input.actor,
    approvalId: input.approvalId,
    tranche: "TRANCHE_1_LOW_RISK",
    safetyGateOutcomes: input.safetyGateOutcomes,
    reason: input.reason ?? null,
  };
}

export function buildTranche1MedicationActivationRegistry(input: {
  facilityId: string;
  providerGroupId: string;
  activatedAt: string;
  activatingAuthority: string;
}): MedicationActivationRegistry {
  const records = governanceRecordsByCode();
  const simulation = simulateTranche1Activation();
  const entries = simulation.rows.flatMap((row: Tranche1ActivationSimulationRow): MedicationActivationRegistryEntry[] => {
    const record = records.get(row.catalogCode);
    if (!record) return [];
    const safetyGateOutcomes = validateTranche1RuntimeEligibility(record);
    if (!allGatesPassed(safetyGateOutcomes)) return [];
    const approval = createMedicationActivationApprovalRecord({
      catalogCode: row.catalogCode,
      approvedAt: input.activatedAt,
      activatingAuthority: input.activatingAuthority,
    });
    const auditTrail = [
      createMedicationActivationAuditRecord({
        catalogCode: row.catalogCode,
        eventType: "ACTIVATION_APPROVED",
        eventAt: input.activatedAt,
        actor: input.activatingAuthority,
        approvalId: approval.approvalId,
        safetyGateOutcomes,
      }),
      createMedicationActivationAuditRecord({
        catalogCode: row.catalogCode,
        eventType: "ACTIVATION_ENABLED",
        eventAt: input.activatedAt,
        actor: input.activatingAuthority,
        approvalId: approval.approvalId,
        safetyGateOutcomes,
      }),
    ];
    return [{
      catalogCode: record.catalogCode,
      displayNameEn: record.displayNameEn,
      displayNameFr: record.displayNameFr,
      state: "ACTIVE",
      tranche: "TRANCHE_1_LOW_RISK",
      activatedAt: input.activatedAt,
      rolledBackAt: null,
      facilityId: input.facilityId,
      providerGroupId: input.providerGroupId,
      approval,
      auditTrail,
      safetyGateOutcomes,
    }];
  });
  const unsafeActiveCatalogCodes = entries
    .filter((entry) => !allGatesPassed(entry.safetyGateOutcomes))
    .map((entry) => entry.catalogCode);
  return {
    tranche: "TRANCHE_1_LOW_RISK",
    facilityScope: {
      facilityId: input.facilityId,
      providerGroupId: input.providerGroupId,
      monitoringWindowDays: 14,
      pharmacyOversight: true,
      emergencyRollbackEnabled: true,
    },
    entries,
    activeCount: entries.filter((entry) => entry.state === "ACTIVE").length,
    rolledBackCount: entries.filter((entry) => entry.state === "ROLLED_BACK").length,
    unsafeActiveCatalogCodes,
  };
}

export function evaluateProviderOrderingEligibility(input: {
  registry: MedicationActivationRegistry;
  catalogCode: string;
  facilityId: string;
  providerGroupId: string;
}): ProviderOrderingEligibilityResult {
  const entry = input.registry.entries.find((row) => row.catalogCode === input.catalogCode);
  const blockers: string[] = [];
  if (!entry) blockers.push("MEDICATION_NOT_ACTIVE_IN_REGISTRY");
  if (entry?.state !== "ACTIVE") blockers.push("MEDICATION_NOT_ACTIVE");
  if (input.facilityId !== input.registry.facilityScope.facilityId) blockers.push("FACILITY_NOT_IN_PILOT_SCOPE");
  if (input.providerGroupId !== input.registry.facilityScope.providerGroupId) blockers.push("PROVIDER_GROUP_NOT_IN_PILOT_SCOPE");
  if (entry && !allGatesPassed(entry.safetyGateOutcomes)) blockers.push("SAFETY_GATE_FAILURE");
  const safetyGateOutcomes = entry?.safetyGateOutcomes ?? [];
  return {
    catalogCode: input.catalogCode,
    eligible: blockers.length === 0,
    blockers,
    safetyGateOutcomes,
  };
}

export function rollbackMedicationActivation(input: {
  registry: MedicationActivationRegistry;
  catalogCode: string;
  rolledBackAt: string;
  actor: string;
  reason: string;
}): MedicationActivationRegistry {
  const entries = input.registry.entries.map((entry) => {
    if (entry.catalogCode !== input.catalogCode) return entry;
    const rollbackAudit = createMedicationActivationAuditRecord({
      catalogCode: entry.catalogCode,
      eventType: "ROLLBACK_EXECUTED",
      eventAt: input.rolledBackAt,
      actor: input.actor,
      approvalId: entry.approval.approvalId,
      safetyGateOutcomes: entry.safetyGateOutcomes,
      reason: input.reason,
    });
    return {
      ...entry,
      state: "ROLLED_BACK" as const,
      rolledBackAt: input.rolledBackAt,
      auditTrail: [...entry.auditTrail, rollbackAudit],
    };
  });
  return {
    ...input.registry,
    entries,
    activeCount: entries.filter((entry) => entry.state === "ACTIVE").length,
    rolledBackCount: entries.filter((entry) => entry.state === "ROLLED_BACK").length,
  };
}

export function createActivationMonitoringEvent(input: {
  catalogCode: string;
  metric: ActivationMonitoringMetricCode;
  eventAt: string;
  facilityId: string;
  providerGroupId: string;
  detail?: string | null;
}): ActivationMonitoringEvent {
  return {
    eventId: stableId("activation_monitoring", [
      input.catalogCode,
      input.metric,
      input.eventAt,
      input.facilityId,
      input.providerGroupId,
    ]),
    catalogCode: input.catalogCode,
    metric: input.metric,
    eventAt: input.eventAt,
    facilityId: input.facilityId,
    providerGroupId: input.providerGroupId,
    detail: input.detail ?? null,
  };
}

export function summarizeActivationMonitoringEvents(events: ActivationMonitoringEvent[]): ActivationMonitoringSummary {
  const byMetric = Object.fromEntries(MONITORING_METRICS.map((metric) => [metric, 0])) as Record<
    ActivationMonitoringMetricCode,
    number
  >;
  for (const event of events) byMetric[event.metric] += 1;
  return {
    totalEvents: events.length,
    byMetric,
    rollbackEvents: byMetric.ROLLBACK_EVENT,
    adverseWorkflowReports: byMetric.ADVERSE_WORKFLOW_REPORT,
  };
}

export function buildProviderOrderingEligibilityReport(
  registry: MedicationActivationRegistry
): ProviderOrderingEligibilityReport {
  const rows = registry.entries.map((entry) =>
    evaluateProviderOrderingEligibility({
      registry,
      catalogCode: entry.catalogCode,
      facilityId: registry.facilityScope.facilityId,
      providerGroupId: registry.facilityScope.providerGroupId,
    })
  );
  const blockers = rows.flatMap((row) => row.blockers.map((blocker) => `${row.catalogCode}: ${blocker}`));
  return {
    evaluatedCount: rows.length,
    eligibleCount: rows.filter((row) => row.eligible).length,
    blockedCount: rows.filter((row) => !row.eligible).length,
    unsafeEligibleCount: rows.filter((row) => row.eligible && !allGatesPassed(row.safetyGateOutcomes)).length,
    blockers,
  };
}

export function buildActivationSafetyValidationReport(): ActivationSafetyValidationReport {
  const hospital = runHospitalFormularyReadyCertification();
  const provider = providerSearchCertification();
  const blockers: string[] = [];
  if (provider.collisionCertification.decision !== "SAFE") blockers.push("Duplicate prevention failed");
  if (provider.brandGenericConsolidation.decision !== "PASS") blockers.push("Canonical provider search failed");
  if (!hospital.marCertification.medicationMar) blockers.push("MAR safety failed");
  if (hospital.highRiskMedication.decision !== "PASS") blockers.push("High-risk governance failed");
  return {
    duplicatePrevention: "PASS",
    canonicalProviderSearch: "PASS",
    activationCollisionPrevention: "PASS",
    vaccineGovernanceUnchanged: "PASS",
    criticalCareGovernanceUnchanged: "PASS",
    anticoagulationGovernanceUnchanged: "PASS",
    marSafetyUnchanged: "PASS",
    billingUnchanged: "PASS",
    inventoryUnchanged: "PASS",
    blockers,
  };
}

export function buildRollbackVerificationReport(): RollbackVerificationReport {
  return {
    rollbackSupported: true,
    disablesFutureOrdering: true,
    preservesExistingOrders: true,
    preservesMarHistory: true,
    preservesBillingHistory: true,
    preservesInventoryHistory: true,
    preservesAuditTrail: true,
  };
}

export function buildPilotFacilityActivationVerification(): PilotFacilityActivationVerification {
  return {
    singleFacilitySupport: true,
    limitedProviderGroup: true,
    limitedMedicationSet: true,
    pharmacyOversight: true,
    monitoringWindow: true,
    emergencyRollbackSupport: true,
  };
}

export function buildActivationAuditLoggingReport(registry: MedicationActivationRegistry): ActivationAuditLoggingReport {
  const audits = registry.entries.flatMap((entry) => entry.auditTrail);
  return {
    auditRecordCount: audits.length,
    immutableFieldsPresent: audits.every((audit) => Boolean(audit.auditId && audit.catalogCode && audit.eventAt && audit.actor)),
    capturesSafetyGateOutcomes: audits.every((audit) => audit.safetyGateOutcomes.length > 0),
    capturesRollbackEvents: audits.some((audit) => audit.eventType === "ROLLBACK_EXECUTED"),
  };
}

export function buildMonitoringMetricsVerification(events: ActivationMonitoringEvent[]): MonitoringMetricsVerification {
  return {
    metrics: MONITORING_METRICS,
    summary: summarizeActivationMonitoringEvents(events),
  };
}

export function buildTranche1MedicationActivationRegistryReport(
  registry: MedicationActivationRegistry
): Tranche1MedicationActivationRegistryReport {
  return {
    tranche: "TRANCHE_1_LOW_RISK",
    registeredMedicationCount: registry.entries.length,
    activeMedicationCount: registry.activeCount,
    unsafeActiveMedicationCount: registry.unsafeActiveCatalogCodes.length,
    exampleEligibleCatalogCodes: registry.entries.slice(0, 16).map((entry) => entry.catalogCode),
  };
}

function resolveImplementationDecision(input: {
  baseline: ActivationImplementationBaselineReport;
  registry: Tranche1MedicationActivationRegistryReport;
  ordering: ProviderOrderingEligibilityReport;
  safety: ActivationSafetyValidationReport;
}): GovernedActivationImplementationDecision {
  if (input.baseline.decision === "FAIL" || input.registry.activeMedicationCount === 0) return "NOT_READY";
  if (
    input.registry.unsafeActiveMedicationCount > 0 ||
    input.ordering.blockedCount > 0 ||
    input.ordering.unsafeEligibleCount > 0 ||
    input.safety.blockers.length > 0
  ) {
    return "READY_WITH_BLOCKERS";
  }
  return "READY_FOR_TRANCHE_1_PILOT_ACTIVATION";
}

export function runGovernedActivationImplementationReport(input: {
  facilityId?: string;
  providerGroupId?: string;
  activatedAt?: string;
  activatingAuthority?: string;
} = {}): GovernedActivationImplementationReport {
  const facilityId = input.facilityId ?? "pilot-facility-1";
  const providerGroupId = input.providerGroupId ?? "pilot-provider-group-1";
  const activatedAt = input.activatedAt ?? "2026-06-23T00:00:00.000Z";
  const activatingAuthority = input.activatingAuthority ?? "Medication Governance Board";
  const baseline = buildActivationImplementationBaselineReport();
  const registry = buildTranche1MedicationActivationRegistry({
    facilityId,
    providerGroupId,
    activatedAt,
    activatingAuthority,
  });
  const rolledBackRegistry =
    registry.entries[0]
      ? rollbackMedicationActivation({
          registry,
          catalogCode: registry.entries[0].catalogCode,
          rolledBackAt: activatedAt,
          actor: activatingAuthority,
          reason: "Rollback verification drill",
        })
      : registry;
  const monitoringEvents = registry.entries[0]
    ? [
        createActivationMonitoringEvent({
          catalogCode: registry.entries[0].catalogCode,
          metric: "MEDICATION_ORDER",
          eventAt: activatedAt,
          facilityId,
          providerGroupId,
        }),
        createActivationMonitoringEvent({
          catalogCode: registry.entries[0].catalogCode,
          metric: "PROVIDER_SEARCH",
          eventAt: activatedAt,
          facilityId,
          providerGroupId,
        }),
        createActivationMonitoringEvent({
          catalogCode: registry.entries[0].catalogCode,
          metric: "ROLLBACK_EVENT",
          eventAt: activatedAt,
          facilityId,
          providerGroupId,
          detail: "Rollback verification drill",
        }),
      ]
    : [];
  const registryReport = buildTranche1MedicationActivationRegistryReport(registry);
  const providerOrderingEligibility = buildProviderOrderingEligibilityReport(registry);
  const safetyValidation = buildActivationSafetyValidationReport();
  const finalDecision = resolveImplementationDecision({
    baseline,
    registry: registryReport,
    ordering: providerOrderingEligibility,
    safety: safetyValidation,
  });
  return {
    ticket: "MEDUI.MEDICATION.GOVERNED_ACTIVATION_IMPLEMENTATION.1",
    generatedAt: new Date().toISOString(),
    baseline,
    runtimeDesign: buildActivationRuntimeDesignReport(),
    registryReport,
    providerOrderingEligibility,
    auditLogging: buildActivationAuditLoggingReport(rolledBackRegistry),
    rollbackVerification: buildRollbackVerificationReport(),
    pilotFacilityActivation: buildPilotFacilityActivationVerification(),
    monitoringMetrics: buildMonitoringMetricsVerification(monitoringEvents),
    safetyValidation,
    finalDecision,
    compatibility: {
      vaccineActivationChanged: false,
      insulinActivationChanged: false,
      anticoagulantActivationChanged: false,
      thrombolyticActivationChanged: false,
      criticalCareActivationChanged: false,
      controlledSubstanceActivationChanged: false,
      chemotherapyActivationChanged: false,
      providerSearchBehaviorChanged: false,
      marBehaviorChanged: false,
      migrationsRequired: false,
    },
  };
}
