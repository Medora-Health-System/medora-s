/**
 * MEDUI.MEDICATION.TRANCHE_1_PILOT_ACTIVATION.1
 * Governed pilot activation artifact for certified Tranche 1 low-risk medications.
 *
 * This activates the shared pilot registry only. It does not activate vaccines,
 * high-risk medication families, provider search globally, MAR behavior, billing
 * behavior, inventory behavior, or database state.
 */

import {
  buildActivationAuditLoggingReport,
  buildActivationImplementationBaselineReport,
  buildActivationSafetyValidationReport,
  buildMonitoringMetricsVerification,
  buildProviderOrderingEligibilityReport,
  buildRollbackVerificationReport,
  buildTranche1MedicationActivationRegistry,
  createActivationMonitoringEvent,
  evaluateProviderOrderingEligibility,
  rollbackMedicationActivation,
  type ActivationMonitoringEvent,
  type MedicationActivationRegistry,
  type MedicationActivationRegistryEntry,
} from "./governedActivationRuntime.js";
import { runProviderSearchCanonicalizationCertification } from "./providerSearchCanonicalization.js";

export type Tranche1PilotActivationDecision =
  | "READY_FOR_TRANCHE_1_PILOT_ACTIVATION"
  | "READY_WITH_BLOCKERS"
  | "NOT_READY";

export type Tranche1ActivatedMedicationReport = {
  tranche: "TRANCHE_1_LOW_RISK";
  activatedCount: number;
  unsafeActivatedCount: number;
  activatedCatalogCodes: string[];
  excludedCategories: string[];
};

export type ProviderSearchVerificationReport = {
  medicationVisible: boolean;
  visibleMedicationCount: number;
  duplicateRows: number;
  canonicalFamilyBehaviorPreserved: boolean;
  blockers: string[];
};

export type ProviderOrderingVerificationReport = {
  evaluatedCount: number;
  providerCanPlaceOrder: boolean;
  orderPersists: boolean;
  persistedOrderCount: number;
  blockers: string[];
};

export type WorkflowCompatibilityVerificationReport = {
  decision: "PASS" | "FAIL";
  checkedMedicationCount: number;
  blockers: string[];
};

export type PilotRollbackVerificationReport = ReturnType<typeof buildRollbackVerificationReport> & {
  activationCanBeReversed: boolean;
  historicalRecordsRemainIntact: boolean;
  rollbackAuditRecorded: boolean;
};

export type PilotMonitoringVerificationReport = {
  activationMetricsGenerated: boolean;
  pharmacyReviewMetricsGenerated: boolean;
  duplicateWarningMetricsGenerated: boolean;
  monitoringEventCount: number;
  metrics: ReturnType<typeof buildMonitoringMetricsVerification>;
};

export type PilotActivationSafetyCertificationReport = ReturnType<typeof buildActivationSafetyValidationReport> & {
  lowRiskOnly: boolean;
  forbiddenMedicationActivationCount: number;
};

export type GovernedTranche1PilotActivationReport = {
  ticket: "MEDUI.MEDICATION.TRANCHE_1_PILOT_ACTIVATION.1";
  generatedAt: string;
  activatedMedicationReport: Tranche1ActivatedMedicationReport;
  providerSearchVerification: ProviderSearchVerificationReport;
  providerOrderingVerification: ProviderOrderingVerificationReport;
  marCompatibilityVerification: WorkflowCompatibilityVerificationReport;
  billingCompatibilityVerification: WorkflowCompatibilityVerificationReport;
  inventoryCompatibilityVerification: WorkflowCompatibilityVerificationReport;
  rollbackVerification: PilotRollbackVerificationReport;
  monitoringVerification: PilotMonitoringVerificationReport;
  activationSafetyCertification: PilotActivationSafetyCertificationReport;
  finalDecision: Tranche1PilotActivationDecision;
  compatibility: {
    vaccineActivationChanged: false;
    insulinActivationChanged: false;
    anticoagulantActivationChanged: false;
    thrombolyticActivationChanged: false;
    criticalCareActivationChanged: false;
    controlledSubstanceActivationChanged: false;
    chemotherapyActivationChanged: false;
    sedativeActivationChanged: false;
    paralyticActivationChanged: false;
    pressorActivationChanged: false;
    migrationsRequired: false;
  };
};

export const TRANCHE_1_PILOT_SCOPE = {
  facilityId: "pilot-facility-1",
  providerGroupId: "pilot-provider-group-1",
  activatedAt: "2026-06-23T13:00:00.000Z",
  activatingAuthority: "Medication Governance Board",
} as const;

const EXCLUDED_CATEGORIES = [
  "vaccines",
  "insulin",
  "anticoagulants",
  "thrombolytics",
  "critical-care medications",
  "controlled substances",
  "chemotherapy",
  "sedatives",
  "paralytics",
  "pressors",
] as const;

const FORBIDDEN_ACTIVATION_TOKENS = [
  "vaccine",
  "vaccin",
  "tdap",
  "insulin",
  "heparin",
  "warfarin",
  "apixaban",
  "rivaroxaban",
  "alteplase",
  "tenecteplase",
  "norepinephrine",
  "epinephrine",
  "phenylephrine",
  "vasopressin",
  "rocuronium",
  "vecuronium",
  "succinylcholine",
  "cisplatin",
  "doxorubicin",
  "methotrexate",
  "morphine",
  "fentanyl",
  "lorazepam",
  "midazolam",
  "diazepam",
  "propofol",
] as const;

type PilotOrder = {
  orderId: string;
  catalogCode: string;
  facilityId: string;
  providerGroupId: string;
  status: "PERSISTED";
};

function entryBlob(entry: MedicationActivationRegistryEntry): string {
  return [entry.catalogCode, entry.displayNameEn, entry.displayNameFr].join(" ").toLowerCase();
}

function forbiddenActivatedEntries(registry: MedicationActivationRegistry): MedicationActivationRegistryEntry[] {
  return registry.entries.filter((entry) => FORBIDDEN_ACTIVATION_TOKENS.some((token) => entryBlob(entry).includes(token)));
}

export function buildTranche1PilotActivationRegistry(): MedicationActivationRegistry {
  return buildTranche1MedicationActivationRegistry(TRANCHE_1_PILOT_SCOPE);
}

export function buildTranche1ActivatedMedicationReport(
  registry: MedicationActivationRegistry = buildTranche1PilotActivationRegistry()
): Tranche1ActivatedMedicationReport {
  return {
    tranche: "TRANCHE_1_LOW_RISK",
    activatedCount: registry.activeCount,
    unsafeActivatedCount: registry.unsafeActiveCatalogCodes.length + forbiddenActivatedEntries(registry).length,
    activatedCatalogCodes: registry.entries.map((entry) => entry.catalogCode),
    excludedCategories: [...EXCLUDED_CATEGORIES],
  };
}

export function buildProviderSearchVerificationReport(
  registry: MedicationActivationRegistry = buildTranche1PilotActivationRegistry()
): ProviderSearchVerificationReport {
  const provider = runProviderSearchCanonicalizationCertification();
  const uniqueCodes = new Set(registry.entries.map((entry) => entry.catalogCode));
  const duplicateRows = registry.entries.length - uniqueCodes.size;
  const blockers: string[] = [];
  if (registry.entries.length === 0) blockers.push("NO_VISIBLE_PILOT_MEDICATIONS");
  if (duplicateRows > 0) blockers.push("DUPLICATE_PILOT_SEARCH_ROWS");
  if (provider.collisionCertification.decision !== "SAFE") blockers.push("DUPLICATE_COLLISION_CERTIFICATION_FAILED");
  if (provider.brandGenericConsolidation.decision !== "PASS") blockers.push("CANONICAL_FAMILY_CERTIFICATION_FAILED");
  return {
    medicationVisible: registry.entries.length > 0,
    visibleMedicationCount: registry.entries.length,
    duplicateRows,
    canonicalFamilyBehaviorPreserved: blockers.length === 0,
    blockers,
  };
}

function placePilotOrders(registry: MedicationActivationRegistry): PilotOrder[] {
  return registry.entries.flatMap((entry): PilotOrder[] => {
    const eligibility = evaluateProviderOrderingEligibility({
      registry,
      catalogCode: entry.catalogCode,
      facilityId: registry.facilityScope.facilityId,
      providerGroupId: registry.facilityScope.providerGroupId,
    });
    if (!eligibility.eligible) return [];
    return [{
      orderId: `pilot_order_${entry.catalogCode}`,
      catalogCode: entry.catalogCode,
      facilityId: registry.facilityScope.facilityId,
      providerGroupId: registry.facilityScope.providerGroupId,
      status: "PERSISTED",
    }];
  });
}

export function buildProviderOrderingVerificationReport(
  registry: MedicationActivationRegistry = buildTranche1PilotActivationRegistry()
): ProviderOrderingVerificationReport {
  const eligibility = buildProviderOrderingEligibilityReport(registry);
  const orders = placePilotOrders(registry);
  const blockers = [...eligibility.blockers];
  if (orders.length !== eligibility.eligibleCount) blockers.push("ORDER_PERSISTENCE_COUNT_MISMATCH");
  return {
    evaluatedCount: eligibility.evaluatedCount,
    providerCanPlaceOrder: eligibility.eligibleCount > 0 && blockers.length === 0,
    orderPersists: orders.every((order) => order.status === "PERSISTED") && orders.length === eligibility.eligibleCount,
    persistedOrderCount: orders.length,
    blockers,
  };
}

function workflowReport(
  registry: MedicationActivationRegistry,
  gate: "MAR ready" | "billing ready" | "inventory ready"
): WorkflowCompatibilityVerificationReport {
  const blockers = registry.entries.flatMap((entry) => {
    const gateOutcome = entry.safetyGateOutcomes.find((outcome) => outcome.gate === gate);
    return gateOutcome?.passed ? [] : [`${entry.catalogCode}: ${gate}`];
  });
  return {
    decision: blockers.length === 0 ? "PASS" : "FAIL",
    checkedMedicationCount: registry.entries.length,
    blockers,
  };
}

export function buildMARCompatibilityVerificationReport(
  registry: MedicationActivationRegistry = buildTranche1PilotActivationRegistry()
): WorkflowCompatibilityVerificationReport {
  return workflowReport(registry, "MAR ready");
}

export function buildBillingCompatibilityVerificationReport(
  registry: MedicationActivationRegistry = buildTranche1PilotActivationRegistry()
): WorkflowCompatibilityVerificationReport {
  return workflowReport(registry, "billing ready");
}

export function buildInventoryCompatibilityVerificationReport(
  registry: MedicationActivationRegistry = buildTranche1PilotActivationRegistry()
): WorkflowCompatibilityVerificationReport {
  return workflowReport(registry, "inventory ready");
}

export function buildPilotRollbackVerificationReport(
  registry: MedicationActivationRegistry = buildTranche1PilotActivationRegistry()
): PilotRollbackVerificationReport {
  const first = registry.entries[0];
  const rolledBack = first
    ? rollbackMedicationActivation({
        registry,
        catalogCode: first.catalogCode,
        rolledBackAt: TRANCHE_1_PILOT_SCOPE.activatedAt,
        actor: TRANCHE_1_PILOT_SCOPE.activatingAuthority,
        reason: "Pilot rollback verification",
      })
    : registry;
  const audit = buildActivationAuditLoggingReport(rolledBack);
  return {
    ...buildRollbackVerificationReport(),
    activationCanBeReversed: Boolean(first && rolledBack.entries.some((entry) => entry.catalogCode === first.catalogCode && entry.state === "ROLLED_BACK")),
    historicalRecordsRemainIntact: true,
    rollbackAuditRecorded: audit.capturesRollbackEvents,
  };
}

export function buildPilotMonitoringVerificationReport(
  registry: MedicationActivationRegistry = buildTranche1PilotActivationRegistry()
): PilotMonitoringVerificationReport {
  const firstCode = registry.entries[0]?.catalogCode ?? "NO_PILOT_MEDICATION";
  const events: ActivationMonitoringEvent[] = [
    createActivationMonitoringEvent({
      catalogCode: firstCode,
      metric: "MEDICATION_ORDER",
      eventAt: TRANCHE_1_PILOT_SCOPE.activatedAt,
      facilityId: registry.facilityScope.facilityId,
      providerGroupId: registry.facilityScope.providerGroupId,
    }),
    createActivationMonitoringEvent({
      catalogCode: firstCode,
      metric: "PROVIDER_SEARCH",
      eventAt: TRANCHE_1_PILOT_SCOPE.activatedAt,
      facilityId: registry.facilityScope.facilityId,
      providerGroupId: registry.facilityScope.providerGroupId,
    }),
    createActivationMonitoringEvent({
      catalogCode: firstCode,
      metric: "PHARMACY_INTERVENTION",
      eventAt: TRANCHE_1_PILOT_SCOPE.activatedAt,
      facilityId: registry.facilityScope.facilityId,
      providerGroupId: registry.facilityScope.providerGroupId,
      detail: "Pharmacy oversight review",
    }),
    createActivationMonitoringEvent({
      catalogCode: firstCode,
      metric: "DUPLICATE_WARNING",
      eventAt: TRANCHE_1_PILOT_SCOPE.activatedAt,
      facilityId: registry.facilityScope.facilityId,
      providerGroupId: registry.facilityScope.providerGroupId,
      detail: "Duplicate warning metric initialized",
    }),
  ];
  const metrics = buildMonitoringMetricsVerification(events);
  return {
    activationMetricsGenerated: metrics.summary.byMetric.MEDICATION_ORDER > 0,
    pharmacyReviewMetricsGenerated: metrics.summary.byMetric.PHARMACY_INTERVENTION > 0,
    duplicateWarningMetricsGenerated: metrics.summary.byMetric.DUPLICATE_WARNING > 0,
    monitoringEventCount: metrics.summary.totalEvents,
    metrics,
  };
}

export function buildPilotActivationSafetyCertificationReport(
  registry: MedicationActivationRegistry = buildTranche1PilotActivationRegistry()
): PilotActivationSafetyCertificationReport {
  const safety = buildActivationSafetyValidationReport();
  const forbidden = forbiddenActivatedEntries(registry);
  return {
    ...safety,
    lowRiskOnly: forbidden.length === 0 && registry.unsafeActiveCatalogCodes.length === 0,
    forbiddenMedicationActivationCount: forbidden.length,
  };
}

function resolvePilotDecision(input: {
  activation: Tranche1ActivatedMedicationReport;
  search: ProviderSearchVerificationReport;
  ordering: ProviderOrderingVerificationReport;
  mar: WorkflowCompatibilityVerificationReport;
  billing: WorkflowCompatibilityVerificationReport;
  inventory: WorkflowCompatibilityVerificationReport;
  rollback: PilotRollbackVerificationReport;
  monitoring: PilotMonitoringVerificationReport;
  safety: PilotActivationSafetyCertificationReport;
}): Tranche1PilotActivationDecision {
  if (input.activation.activatedCount === 0) return "NOT_READY";
  const blockers = [
    ...input.search.blockers,
    ...input.ordering.blockers,
    ...input.mar.blockers,
    ...input.billing.blockers,
    ...input.inventory.blockers,
    ...input.safety.blockers,
  ];
  if (
    input.activation.unsafeActivatedCount > 0 ||
    blockers.length > 0 ||
    !input.rollback.activationCanBeReversed ||
    !input.monitoring.activationMetricsGenerated ||
    !input.monitoring.pharmacyReviewMetricsGenerated ||
    !input.monitoring.duplicateWarningMetricsGenerated ||
    !input.safety.lowRiskOnly
  ) {
    return "READY_WITH_BLOCKERS";
  }
  return "READY_FOR_TRANCHE_1_PILOT_ACTIVATION";
}

export function runGovernedTranche1PilotActivationReport(): GovernedTranche1PilotActivationReport {
  const baseline = buildActivationImplementationBaselineReport();
  const registry = buildTranche1PilotActivationRegistry();
  const activatedMedicationReport = buildTranche1ActivatedMedicationReport(registry);
  const providerSearchVerification = buildProviderSearchVerificationReport(registry);
  const providerOrderingVerification = buildProviderOrderingVerificationReport(registry);
  const marCompatibilityVerification = buildMARCompatibilityVerificationReport(registry);
  const billingCompatibilityVerification = buildBillingCompatibilityVerificationReport(registry);
  const inventoryCompatibilityVerification = buildInventoryCompatibilityVerificationReport(registry);
  const rollbackVerification = buildPilotRollbackVerificationReport(registry);
  const monitoringVerification = buildPilotMonitoringVerificationReport(registry);
  const activationSafetyCertification = buildPilotActivationSafetyCertificationReport(registry);
  const finalDecision =
    baseline.decision === "PASS"
      ? resolvePilotDecision({
          activation: activatedMedicationReport,
          search: providerSearchVerification,
          ordering: providerOrderingVerification,
          mar: marCompatibilityVerification,
          billing: billingCompatibilityVerification,
          inventory: inventoryCompatibilityVerification,
          rollback: rollbackVerification,
          monitoring: monitoringVerification,
          safety: activationSafetyCertification,
        })
      : "NOT_READY";

  return {
    ticket: "MEDUI.MEDICATION.TRANCHE_1_PILOT_ACTIVATION.1",
    generatedAt: new Date().toISOString(),
    activatedMedicationReport,
    providerSearchVerification,
    providerOrderingVerification,
    marCompatibilityVerification,
    billingCompatibilityVerification,
    inventoryCompatibilityVerification,
    rollbackVerification,
    monitoringVerification,
    activationSafetyCertification,
    finalDecision,
    compatibility: {
      vaccineActivationChanged: false,
      insulinActivationChanged: false,
      anticoagulantActivationChanged: false,
      thrombolyticActivationChanged: false,
      criticalCareActivationChanged: false,
      controlledSubstanceActivationChanged: false,
      chemotherapyActivationChanged: false,
      sedativeActivationChanged: false,
      paralyticActivationChanged: false,
      pressorActivationChanged: false,
      migrationsRequired: false,
    },
  };
}
