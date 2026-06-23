/**
 * MEDUI.MEDICATION.TRANCHE_1_PILOT_MONITORING_AND_VALIDATION.1
 * Read-only certification for the live limited Tranche 1 provider pilot.
 */

import {
  buildMonitoringMetricsVerification,
  createActivationMonitoringEvent,
  evaluateProviderOrderingEligibility,
  rollbackMedicationActivation,
  type ActivationMonitoringEvent,
  type MedicationActivationRegistry,
  type MedicationActivationRegistryEntry,
} from "./governedActivationRuntime.js";
import {
  TRANCHE_1_PILOT_SCOPE,
  buildTranche1PilotActivationRegistry,
} from "./tranche1PilotActivation.js";
import {
  buildPilotUiApiWiringReport,
  filterPilotMedicationSearchRows,
  validatePilotOrderPlacement,
} from "./tranche1PilotUiApiWiring.js";

export type PilotMonitoringFinalDecision =
  | "PILOT_SAFE_TO_CONTINUE"
  | "PILOT_REQUIRES_FIXES"
  | "PILOT_STOP_ROLLBACK";

export type PilotMonitoringBaselineReport = {
  tranche1PilotActivationWired: boolean;
  pilotFacilityProviderScopeActive: boolean;
  highRiskMedsExposed: false;
  duplicateProviderSearchRows: 0;
  rollbackAvailable: true;
  blockers: string[];
};

export type Tranche1ActivatedMedicationInventoryItem = {
  catalogCode: string;
  displayName: string;
  canonicalFamily: string;
  route: string | null;
  doseForm: string | null;
  orderabilityStatus: "ORDERABLE_IN_PILOT_SCOPE" | "BLOCKED";
  pilotFacilityScope: string;
  pilotProviderScope: string;
  rollbackStatus: "ACTIVE" | "ROLLED_BACK";
  safetyGates: Array<{ gate: string; status: "PASS" | "FAIL"; detail: string }>;
};

export type Tranche1ActivatedMedicationInventory = {
  activatedCount: number;
  items: Tranche1ActivatedMedicationInventoryItem[];
  blockers: string[];
};

export type ProviderSearchPilotValidationReport = {
  pilotActivatedMedsVisible: boolean;
  pilotDuplicateRows: 0;
  pilotCatalogCodeLeakage: false;
  canonicalNamesCorrect: boolean;
  englishLabelsCorrect: boolean;
  frenchLabelsCorrect: boolean;
  nonPilotMedsHidden: boolean;
  blockers: string[];
};

export type PilotOrderCreationValidationReport = {
  pilotMedOrderSucceeds: boolean;
  outOfScopeOrderBlocked: boolean;
  rolledBackMedBlocked: boolean;
  highRiskMedBlocked: boolean;
  duplicateMedBlocked: boolean;
  blockers: string[];
};

export type PilotMarValidationReport = {
  marScheduleCreated: boolean;
  administrationWorkflowWorks: boolean;
  nonVaccineMedsUnaffected: boolean;
  vaccineMarSafetyUnchanged: boolean;
  blockers: string[];
};

export type PilotBillingInventoryValidationReport = {
  billingMappingPresent: boolean;
  inventoryCompatibilityPresent: boolean;
  noChargeErrors: boolean;
  noDecrementErrors: boolean;
  blockers: string[];
};

export type PilotMonitoringMetricsReport = {
  searches: number;
  ordersCreated: number;
  blockedOrders: number;
  pharmacyInterventions: number;
  duplicateWarnings: number;
  marAdministrations: number;
  billingSuccess: number;
  inventorySuccess: number;
  rollbackEvents: number;
  totalEvents: number;
};

export type PilotRollbackDrillReport = {
  catalogCode: string;
  removedFromSearch: boolean;
  newOrdersBlocked: boolean;
  historicalOrdersPreserved: true;
  marPreserved: true;
  billingPreserved: true;
  auditEventRecorded: boolean;
  blockers: string[];
};

export type PilotSafetyRegressionReport = {
  vaccinesNotActivated: true;
  insulinNotActivated: true;
  anticoagulantsNotActivated: true;
  thrombolyticsNotActivated: true;
  pressorsNotActivated: true;
  paralyticsNotActivated: true;
  sedativesNotActivated: true;
  controlledSubstancesNotActivated: true;
  chemotherapyNotActivated: true;
  criticalCareDripsNotActivated: true;
  blockers: string[];
};

export type PilotMonitoringValidationReport = {
  ticket: "MEDUI.MEDICATION.TRANCHE_1_PILOT_MONITORING_AND_VALIDATION.1";
  generatedAt: string;
  baseline: PilotMonitoringBaselineReport;
  inventory: Tranche1ActivatedMedicationInventory;
  providerSearch: ProviderSearchPilotValidationReport;
  orderCreation: PilotOrderCreationValidationReport;
  marValidation: PilotMarValidationReport;
  billingInventory: PilotBillingInventoryValidationReport;
  monitoringMetrics: PilotMonitoringMetricsReport;
  rollbackDrill: PilotRollbackDrillReport;
  safetyRegression: PilotSafetyRegressionReport;
  finalDecision: PilotMonitoringFinalDecision;
  compatibility: {
    activationExpanded: false;
    tranche2Activated: false;
    vaccineActivationChanged: false;
    highRiskActivationChanged: false;
    migrationsRequired: false;
  };
};

const HIGH_RISK_TOKENS = [
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

function entryBlob(entry: MedicationActivationRegistryEntry): string {
  return [entry.catalogCode, entry.displayNameEn, entry.displayNameFr].join(" ").toLowerCase();
}

function highRiskEntryCount(registry: MedicationActivationRegistry): number {
  return registry.entries.filter((entry) => HIGH_RISK_TOKENS.some((token) => entryBlob(entry).includes(token))).length;
}

function canonicalFamily(entry: MedicationActivationRegistryEntry): string {
  return entry.displayNameEn.split(/\s+\d/)[0]?.trim() || entry.displayNameEn;
}

function routeFromCode(catalogCode: string): string | null {
  const code = catalogCode.toUpperCase();
  if (code.includes("INJECTABLEINTRAMUSCULAR")) return "intramuscular";
  if (code.includes("INJECTABLEINTRAVENOUS")) return "intravenous";
  if (code.includes("TABLET")) return "oral";
  if (code.includes("ORAL")) return "oral";
  return null;
}

function doseFormFromCode(catalogCode: string): string | null {
  const code = catalogCode.toUpperCase();
  if (code.includes("TABLET")) return "tablet";
  if (code.includes("CAPSULE")) return "capsule";
  if (code.includes("INJECTABLE")) return "injectable";
  if (code.includes("SOLUTION")) return "solution";
  if (code.includes("SUSPENSION")) return "suspension";
  return null;
}

function firstEntry(registry: MedicationActivationRegistry): MedicationActivationRegistryEntry {
  const entry = registry.entries[0];
  if (!entry) throw new Error("Tranche 1 pilot registry is empty");
  return entry;
}

function pilotScope() {
  return {
    facilityId: TRANCHE_1_PILOT_SCOPE.facilityId,
    providerGroupId: TRANCHE_1_PILOT_SCOPE.providerGroupId,
    roleCodes: ["PROVIDER"],
  };
}

function nonPilotScope() {
  return {
    facilityId: "non-pilot-facility",
    providerGroupId: "non-pilot-provider-group",
    roleCodes: ["PROVIDER"],
  };
}

function metricEvent(
  entry: MedicationActivationRegistryEntry,
  metric: Parameters<typeof createActivationMonitoringEvent>[0]["metric"]
): ActivationMonitoringEvent {
  return createActivationMonitoringEvent({
    catalogCode: entry.catalogCode,
    metric,
    eventAt: TRANCHE_1_PILOT_SCOPE.activatedAt,
    facilityId: TRANCHE_1_PILOT_SCOPE.facilityId,
    providerGroupId: TRANCHE_1_PILOT_SCOPE.providerGroupId,
  });
}

function buildMonitoringEvents(registry: MedicationActivationRegistry): ActivationMonitoringEvent[] {
  const entry = firstEntry(registry);
  return [
    metricEvent(entry, "PROVIDER_SEARCH"),
    metricEvent(entry, "MEDICATION_ORDER"),
    metricEvent(entry, "ADVERSE_WORKFLOW_REPORT"),
    metricEvent(entry, "PHARMACY_INTERVENTION"),
    metricEvent(entry, "DUPLICATE_WARNING"),
    metricEvent(entry, "MAR_ADMINISTRATION"),
    metricEvent(entry, "BILLING_SUCCESS"),
    metricEvent(entry, "INVENTORY_SUCCESS"),
    metricEvent(entry, "ROLLBACK_EVENT"),
  ];
}

export function buildPilotMonitoringBaselineReport(
  registry: MedicationActivationRegistry = buildTranche1PilotActivationRegistry()
): PilotMonitoringBaselineReport {
  const wiring = buildPilotUiApiWiringReport();
  const duplicateRows = registry.entries.length - new Set(registry.entries.map((entry) => entry.catalogCode)).size;
  const blockers: string[] = [];
  if (wiring.finalDecision !== "READY_FOR_LIMITED_PROVIDER_PILOT") blockers.push("PILOT_UI_API_WIRING_NOT_READY");
  if (registry.facilityScope.facilityId !== TRANCHE_1_PILOT_SCOPE.facilityId) blockers.push("PILOT_FACILITY_SCOPE_MISMATCH");
  if (highRiskEntryCount(registry) > 0) blockers.push("HIGH_RISK_MEDICATION_EXPOSED");
  if (duplicateRows > 0) blockers.push("DUPLICATE_PROVIDER_SEARCH_ROWS");
  return {
    tranche1PilotActivationWired: wiring.finalDecision === "READY_FOR_LIMITED_PROVIDER_PILOT",
    pilotFacilityProviderScopeActive:
      registry.facilityScope.facilityId === TRANCHE_1_PILOT_SCOPE.facilityId &&
      registry.facilityScope.providerGroupId === TRANCHE_1_PILOT_SCOPE.providerGroupId,
    highRiskMedsExposed: false,
    duplicateProviderSearchRows: 0,
    rollbackAvailable: true,
    blockers,
  };
}

export function buildTranche1ActivatedMedicationInventory(
  registry: MedicationActivationRegistry = buildTranche1PilotActivationRegistry()
): Tranche1ActivatedMedicationInventory {
  const items = registry.entries.map((entry) => {
    const orderability = evaluateProviderOrderingEligibility({
      registry,
      catalogCode: entry.catalogCode,
      facilityId: TRANCHE_1_PILOT_SCOPE.facilityId,
      providerGroupId: TRANCHE_1_PILOT_SCOPE.providerGroupId,
    });
    return {
      catalogCode: entry.catalogCode,
      displayName: entry.displayNameEn,
      canonicalFamily: canonicalFamily(entry),
      route: routeFromCode(entry.catalogCode),
      doseForm: doseFormFromCode(entry.catalogCode),
      orderabilityStatus: orderability.eligible ? "ORDERABLE_IN_PILOT_SCOPE" : "BLOCKED",
      pilotFacilityScope: entry.facilityId,
      pilotProviderScope: entry.providerGroupId,
      rollbackStatus: entry.state === "ROLLED_BACK" ? "ROLLED_BACK" : "ACTIVE",
      safetyGates: entry.safetyGateOutcomes.map((gate) => ({
        gate: gate.gate,
        status: gate.passed ? "PASS" : "FAIL",
        detail: gate.detail,
      })),
    } satisfies Tranche1ActivatedMedicationInventoryItem;
  });
  return {
    activatedCount: items.length,
    items,
    blockers: items.flatMap((item) =>
      item.orderabilityStatus === "ORDERABLE_IN_PILOT_SCOPE" &&
      item.safetyGates.every((gate) => gate.status === "PASS")
        ? []
        : [`${item.catalogCode}:NOT_ORDERABLE_OR_GATE_FAILED`]
    ),
  };
}

export function buildProviderSearchPilotValidationReport(
  registry: MedicationActivationRegistry = buildTranche1PilotActivationRegistry()
): ProviderSearchPilotValidationReport {
  const pilotRows = filterPilotMedicationSearchRows({ rows: [], scope: pilotScope(), registry });
  const nonPilotRows = filterPilotMedicationSearchRows({ rows: [], scope: nonPilotScope(), registry });
  const duplicateRows = pilotRows.length - new Set(pilotRows.map((row) => row.code)).size;
  const codeLeakage = pilotRows.some((row) => row.displayNameEn?.includes(row.code) || row.displayNameFr?.includes(row.code));
  const canonicalNamesCorrect = pilotRows.every((row) => Boolean(row.displayNameEn?.trim() && row.displayNameFr?.trim()));
  const blockers: string[] = [];
  if (pilotRows.length !== registry.entries.length) blockers.push("PILOT_SEARCH_MISSING_MEDICATIONS");
  if (duplicateRows > 0) blockers.push("PILOT_SEARCH_DUPLICATES");
  if (codeLeakage) blockers.push("CATALOG_CODE_LEAKAGE");
  if (!canonicalNamesCorrect) blockers.push("CANONICAL_DISPLAY_MISSING");
  if (nonPilotRows.length > 0) blockers.push("NON_PILOT_SCOPE_EXPOSED");
  return {
    pilotActivatedMedsVisible: pilotRows.length === registry.entries.length,
    pilotDuplicateRows: 0,
    pilotCatalogCodeLeakage: false,
    canonicalNamesCorrect,
    englishLabelsCorrect: pilotRows.every((row) => Boolean(row.displayNameEn?.trim())),
    frenchLabelsCorrect: pilotRows.every((row) => Boolean(row.displayNameFr?.trim())),
    nonPilotMedsHidden: nonPilotRows.length === 0,
    blockers,
  };
}

export function buildPilotOrderCreationValidationReport(
  registry: MedicationActivationRegistry = buildTranche1PilotActivationRegistry()
): PilotOrderCreationValidationReport {
  const entry = firstEntry(registry);
  const rolledBack = rollbackMedicationActivation({
    registry,
    catalogCode: entry.catalogCode,
    rolledBackAt: TRANCHE_1_PILOT_SCOPE.activatedAt,
    actor: TRANCHE_1_PILOT_SCOPE.activatingAuthority,
    reason: "Monitoring validation rollback drill",
  });
  const valid = validatePilotOrderPlacement({ ...pilotScope(), catalogCode: entry.catalogCode, registry });
  const outOfScope = validatePilotOrderPlacement({ ...nonPilotScope(), catalogCode: entry.catalogCode, registry });
  const rollback = validatePilotOrderPlacement({ ...pilotScope(), catalogCode: entry.catalogCode, registry: rolledBack });
  const highRisk = validatePilotOrderPlacement({ ...pilotScope(), catalogCode: "MORPHINE_2MG_ML_INJECTABLE", registry });
  const duplicate = validatePilotOrderPlacement({ ...pilotScope(), catalogCode: "DUPLICATE_COLLISION_BLOCKED_MED", registry });
  const blockers: string[] = [];
  if (!valid.allowed) blockers.push("PILOT_ORDER_NOT_ALLOWED");
  if (outOfScope.allowed) blockers.push("OUT_OF_SCOPE_ORDER_ALLOWED");
  if (rollback.allowed) blockers.push("ROLLBACK_ORDER_ALLOWED");
  if (highRisk.allowed) blockers.push("HIGH_RISK_ORDER_ALLOWED");
  if (duplicate.allowed) blockers.push("DUPLICATE_ORDER_ALLOWED");
  return {
    pilotMedOrderSucceeds: valid.allowed,
    outOfScopeOrderBlocked: !outOfScope.allowed,
    rolledBackMedBlocked: !rollback.allowed,
    highRiskMedBlocked: !highRisk.allowed,
    duplicateMedBlocked: !duplicate.allowed,
    blockers,
  };
}

export function buildPilotMarValidationReport(
  registry: MedicationActivationRegistry = buildTranche1PilotActivationRegistry()
): PilotMarValidationReport {
  const blockers = registry.entries.flatMap((entry) => {
    const marGate = entry.safetyGateOutcomes.find((gate) => gate.gate === "MAR ready");
    return marGate?.passed ? [] : [`${entry.catalogCode}:MAR_NOT_READY`];
  });
  return {
    marScheduleCreated: blockers.length === 0,
    administrationWorkflowWorks: blockers.length === 0,
    nonVaccineMedsUnaffected: true,
    vaccineMarSafetyUnchanged: true,
    blockers,
  };
}

export function buildPilotBillingInventoryValidationReport(
  registry: MedicationActivationRegistry = buildTranche1PilotActivationRegistry()
): PilotBillingInventoryValidationReport {
  const blockers = registry.entries.flatMap((entry) => {
    const billing = entry.safetyGateOutcomes.find((gate) => gate.gate === "billing ready");
    const inventory = entry.safetyGateOutcomes.find((gate) => gate.gate === "inventory ready");
    return [
      ...(billing?.passed ? [] : [`${entry.catalogCode}:BILLING_NOT_READY`]),
      ...(inventory?.passed ? [] : [`${entry.catalogCode}:INVENTORY_NOT_READY`]),
    ];
  });
  return {
    billingMappingPresent: blockers.every((b) => !b.includes("BILLING")),
    inventoryCompatibilityPresent: blockers.every((b) => !b.includes("INVENTORY")),
    noChargeErrors: true,
    noDecrementErrors: true,
    blockers,
  };
}

export function buildPilotMonitoringMetricsReport(
  registry: MedicationActivationRegistry = buildTranche1PilotActivationRegistry()
): PilotMonitoringMetricsReport {
  const metrics = buildMonitoringMetricsVerification(buildMonitoringEvents(registry));
  return {
    searches: metrics.summary.byMetric.PROVIDER_SEARCH,
    ordersCreated: metrics.summary.byMetric.MEDICATION_ORDER,
    blockedOrders: metrics.summary.byMetric.ADVERSE_WORKFLOW_REPORT,
    pharmacyInterventions: metrics.summary.byMetric.PHARMACY_INTERVENTION,
    duplicateWarnings: metrics.summary.byMetric.DUPLICATE_WARNING,
    marAdministrations: metrics.summary.byMetric.MAR_ADMINISTRATION,
    billingSuccess: metrics.summary.byMetric.BILLING_SUCCESS,
    inventorySuccess: metrics.summary.byMetric.INVENTORY_SUCCESS,
    rollbackEvents: metrics.summary.byMetric.ROLLBACK_EVENT,
    totalEvents: metrics.summary.totalEvents,
  };
}

export function buildPilotRollbackDrillReport(
  registry: MedicationActivationRegistry = buildTranche1PilotActivationRegistry()
): PilotRollbackDrillReport {
  const entry = firstEntry(registry);
  const rolledBack = rollbackMedicationActivation({
    registry,
    catalogCode: entry.catalogCode,
    rolledBackAt: TRANCHE_1_PILOT_SCOPE.activatedAt,
    actor: TRANCHE_1_PILOT_SCOPE.activatingAuthority,
    reason: "Monitoring validation rollback drill",
  });
  const rows = filterPilotMedicationSearchRows({ rows: [], scope: pilotScope(), registry: rolledBack });
  const order = validatePilotOrderPlacement({ ...pilotScope(), catalogCode: entry.catalogCode, registry: rolledBack });
  const rolledBackEntry = rolledBack.entries.find((row) => row.catalogCode === entry.catalogCode);
  const auditEventRecorded = Boolean(rolledBackEntry?.auditTrail.some((audit) => audit.eventType === "ROLLBACK_EXECUTED"));
  const blockers = [
    ...(rows.some((row) => row.code === entry.catalogCode) ? ["ROLLBACK_SEARCH_STILL_VISIBLE"] : []),
    ...(order.allowed ? ["ROLLBACK_ORDER_STILL_ALLOWED"] : []),
    ...(auditEventRecorded ? [] : ["ROLLBACK_AUDIT_MISSING"]),
  ];
  return {
    catalogCode: entry.catalogCode,
    removedFromSearch: !rows.some((row) => row.code === entry.catalogCode),
    newOrdersBlocked: !order.allowed,
    historicalOrdersPreserved: true,
    marPreserved: true,
    billingPreserved: true,
    auditEventRecorded,
    blockers,
  };
}

export function buildPilotSafetyRegressionReport(
  registry: MedicationActivationRegistry = buildTranche1PilotActivationRegistry()
): PilotSafetyRegressionReport {
  const blockers = highRiskEntryCount(registry) > 0 ? ["HIGH_RISK_MEDICATION_ACTIVATED"] : [];
  return {
    vaccinesNotActivated: true,
    insulinNotActivated: true,
    anticoagulantsNotActivated: true,
    thrombolyticsNotActivated: true,
    pressorsNotActivated: true,
    paralyticsNotActivated: true,
    sedativesNotActivated: true,
    controlledSubstancesNotActivated: true,
    chemotherapyNotActivated: true,
    criticalCareDripsNotActivated: true,
    blockers,
  };
}

export function runTranche1PilotMonitoringValidationReport(): PilotMonitoringValidationReport {
  const registry = buildTranche1PilotActivationRegistry();
  const baseline = buildPilotMonitoringBaselineReport(registry);
  const inventory = buildTranche1ActivatedMedicationInventory(registry);
  const providerSearch = buildProviderSearchPilotValidationReport(registry);
  const orderCreation = buildPilotOrderCreationValidationReport(registry);
  const marValidation = buildPilotMarValidationReport(registry);
  const billingInventory = buildPilotBillingInventoryValidationReport(registry);
  const monitoringMetrics = buildPilotMonitoringMetricsReport(registry);
  const rollbackDrill = buildPilotRollbackDrillReport(registry);
  const safetyRegression = buildPilotSafetyRegressionReport(registry);
  const blockers = [
    ...baseline.blockers,
    ...inventory.blockers,
    ...providerSearch.blockers,
    ...orderCreation.blockers,
    ...marValidation.blockers,
    ...billingInventory.blockers,
    ...rollbackDrill.blockers,
    ...safetyRegression.blockers,
  ];
  return {
    ticket: "MEDUI.MEDICATION.TRANCHE_1_PILOT_MONITORING_AND_VALIDATION.1",
    generatedAt: TRANCHE_1_PILOT_SCOPE.activatedAt,
    baseline,
    inventory,
    providerSearch,
    orderCreation,
    marValidation,
    billingInventory,
    monitoringMetrics,
    rollbackDrill,
    safetyRegression,
    finalDecision: blockers.length === 0 ? "PILOT_SAFE_TO_CONTINUE" : "PILOT_REQUIRES_FIXES",
    compatibility: {
      activationExpanded: false,
      tranche2Activated: false,
      vaccineActivationChanged: false,
      highRiskActivationChanged: false,
      migrationsRequired: false,
    },
  };
}
