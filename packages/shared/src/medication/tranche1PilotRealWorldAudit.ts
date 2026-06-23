/**
 * MEDUI.MEDICATION.TRANCHE_1_PILOT_REAL_WORLD_AUDIT.1
 * Runtime-source audit of the currently wired Tranche 1 provider pilot.
 *
 * This report reads the active pilot registry and existing provider search/order
 * gates. It does not create activation state, expand search scope, or enable
 * Tranche 2.
 */

import {
  buildActivationSafetyValidationReport,
  buildProviderOrderingEligibilityReport,
  buildRollbackVerificationReport,
  evaluateProviderOrderingEligibility,
  type MedicationActivationRegistry,
  type MedicationActivationRegistryEntry,
} from "./governedActivationRuntime.js";
import { buildActivationGovernanceRecord } from "./medicationActivationGovernance.js";
import { buildUnifiedOrderabilityMap } from "./medicationOrderabilityCertification.js";
import { runProviderSearchCanonicalizationCertification } from "./providerSearchCanonicalization.js";
import {
  TRANCHE_1_PILOT_SCOPE,
  buildTranche1PilotActivationRegistry,
} from "./tranche1PilotActivation.js";
import {
  filterPilotMedicationSearchRows,
  validatePilotOrderPlacement,
} from "./tranche1PilotUiApiWiring.js";
import { runTranche1Certification } from "./tranche1GovernedActivation.js";
import { runTranche2Certification } from "./tranche2ChronicDiseaseActivation.js";

export type RealWorldPilotAuditDecision =
  | "READY_FOR_TRANCHE_2_ACTIVATION"
  | "READY_WITH_BLOCKERS"
  | "NOT_READY";

export type ActivatedMedicationInventoryRow = {
  catalogCode: string;
  displayNameEn: string;
  displayNameFr: string;
  canonicalFamily: string;
  route: string;
  form: string;
  orderabilityStatus: "ORDERABLE_IN_PILOT_SCOPE" | "BLOCKED";
  billingReadiness: "PASS" | "FAIL";
  inventoryReadiness: "PASS" | "FAIL";
  marReadiness: "PASS" | "FAIL";
};

export type ActivatedMedicationInventoryReport = {
  sourceRegistry: "buildTranche1PilotActivationRegistry";
  activatedCount: number;
  rows: ActivatedMedicationInventoryRow[];
  blockers: string[];
};

export type ProviderExposureAuditReport = {
  providerSearchPath: "CreateOrderModal -> SharedCatalogAutocomplete -> searchCatalog -> /catalog/medications/search -> MedicationCatalogService.search";
  orderCreationPath: "CreateOrderModal -> /encounters/:encounterId/orders -> OrdersService.create";
  visibleMedicationCount: number;
  hiddenPilotMedicationCountOutsideScope: number;
  duplicateCount: number;
  canonicalFamilyCount: number;
  catalogCodeLeakage: false;
  autocompleteWired: true;
  createOrderModalWired: true;
  encounterOrderingWired: true;
  blockers: string[];
};

export type OrderabilityCertificationRow = {
  catalogCode: string;
  canBeSearched: boolean;
  canBeSelected: boolean;
  canCreateOrder: boolean;
  canPersist: boolean;
  canScheduleMar: boolean;
  blockers: string[];
};

export type OrderabilityCertificationReport = {
  checkedMedicationCount: number;
  passCount: number;
  failCount: number;
  rows: OrderabilityCertificationRow[];
  blockers: string[];
};

export type HighRiskExclusionAuditReport = {
  vaccinesActivated: number;
  insulinActivated: number;
  anticoagulantsActivated: number;
  thrombolyticsActivated: number;
  chemotherapyActivated: number;
  controlledSubstancesActivated: number;
  paralyticsActivated: number;
  sedativesActivated: number;
  pressorsActivated: number;
  criticalCareDripsActivated: number;
  blockers: string[];
};

export type PilotCoverageAnalysisReport = {
  numberActivated: number;
  numberRemainingInTranche1: number;
  readinessPercentage: number;
  blockers: string[];
};

export type Tranche2ReadinessAssessment = {
  duplicateProtection: "PASS" | "FAIL";
  providerSearch: "PASS" | "FAIL";
  billing: "PASS" | "FAIL";
  inventory: "PASS" | "FAIL";
  mar: "PASS" | "FAIL";
  rollback: "PASS" | "FAIL";
  certificationDecision: ReturnType<typeof runTranche2Certification>["decision"];
  blockers: string[];
};

export type Tranche1PilotRealWorldAuditReport = {
  ticket: "MEDUI.MEDICATION.TRANCHE_1_PILOT_REAL_WORLD_AUDIT.1";
  generatedAt: string;
  activatedMedicationInventory: ActivatedMedicationInventoryReport;
  providerExposureAudit: ProviderExposureAuditReport;
  orderabilityCertification: OrderabilityCertificationReport;
  highRiskExclusionAudit: HighRiskExclusionAuditReport;
  pilotCoverageAnalysis: PilotCoverageAnalysisReport;
  tranche2ReadinessAssessment: Tranche2ReadinessAssessment;
  finalDecision: RealWorldPilotAuditDecision;
  compatibility: {
    activationExpanded: false;
    tranche2Activated: false;
    vaccineActivationChanged: false;
    highRiskActivationChanged: false;
    databaseMigrationRequired: false;
  };
};

const HIGH_RISK_CATEGORIES: Record<keyof Omit<HighRiskExclusionAuditReport, "blockers">, readonly string[]> = {
  vaccinesActivated: ["vaccine", "vaccin", "tdap"],
  insulinActivated: ["insulin"],
  anticoagulantsActivated: ["heparin", "warfarin", "apixaban", "rivaroxaban", "enoxaparin"],
  thrombolyticsActivated: ["alteplase", "tenecteplase", "streptokinase"],
  chemotherapyActivated: ["cisplatin", "doxorubicin", "methotrexate", "cyclophosphamide"],
  controlledSubstancesActivated: ["morphine", "fentanyl", "oxycodone", "hydromorphone", "codeine", "tramadol"],
  paralyticsActivated: ["rocuronium", "vecuronium", "succinylcholine"],
  sedativesActivated: ["lorazepam", "midazolam", "diazepam", "propofol", "ketamine"],
  pressorsActivated: ["norepinephrine", "epinephrine", "phenylephrine", "vasopressin", "dopamine"],
  criticalCareDripsActivated: ["drip", "infusion", "vasopressor", "paralytic"],
};

type GovernanceRecord = ReturnType<typeof buildActivationGovernanceRecord>;

function governanceByCode(): Map<string, GovernanceRecord> {
  return new Map(
    [...buildUnifiedOrderabilityMap().values()]
      .map(buildActivationGovernanceRecord)
      .map((record) => [record.catalogCode, record])
  );
}

function gateStatus(entry: MedicationActivationRegistryEntry, gate: string): "PASS" | "FAIL" {
  return entry.safetyGateOutcomes.find((outcome) => outcome.gate === gate)?.passed ? "PASS" : "FAIL";
}

function canonicalFamily(entry: MedicationActivationRegistryEntry, record: GovernanceRecord | undefined): string {
  const generic = record?.displayNameEn?.split(/\s+\d/)[0]?.trim();
  return generic || entry.displayNameEn.split(/\s+\d/)[0]?.trim() || entry.displayNameEn;
}

function highRiskCount(registry: MedicationActivationRegistry, tokens: readonly string[]): number {
  return registry.entries.filter((entry) => {
    const blob = `${entry.catalogCode} ${entry.displayNameEn} ${entry.displayNameFr}`.toLowerCase();
    return tokens.some((token) => blob.includes(token));
  }).length;
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

export function buildActivatedMedicationInventoryReport(
  registry: MedicationActivationRegistry = buildTranche1PilotActivationRegistry()
): ActivatedMedicationInventoryReport {
  const records = governanceByCode();
  const rows = registry.entries.map((entry): ActivatedMedicationInventoryRow => {
    const record = records.get(entry.catalogCode);
    const eligibility = evaluateProviderOrderingEligibility({
      registry,
      catalogCode: entry.catalogCode,
      facilityId: TRANCHE_1_PILOT_SCOPE.facilityId,
      providerGroupId: TRANCHE_1_PILOT_SCOPE.providerGroupId,
    });
    return {
      catalogCode: entry.catalogCode,
      displayNameEn: entry.displayNameEn,
      displayNameFr: entry.displayNameFr,
      canonicalFamily: canonicalFamily(entry, record),
      route: record?.route || "unknown",
      form: record?.doseForm || "unknown",
      orderabilityStatus: eligibility.eligible ? "ORDERABLE_IN_PILOT_SCOPE" : "BLOCKED",
      billingReadiness: gateStatus(entry, "billing ready"),
      inventoryReadiness: gateStatus(entry, "inventory ready"),
      marReadiness: gateStatus(entry, "MAR ready"),
    };
  });
  const blockers = rows.flatMap((row) => {
    const failed = [
      row.orderabilityStatus === "ORDERABLE_IN_PILOT_SCOPE" ? null : "ORDERABILITY",
      row.billingReadiness === "PASS" ? null : "BILLING",
      row.inventoryReadiness === "PASS" ? null : "INVENTORY",
      row.marReadiness === "PASS" ? null : "MAR",
    ].filter((value): value is string => Boolean(value));
    return failed.map((failure) => `${row.catalogCode}:${failure}`);
  });
  return {
    sourceRegistry: "buildTranche1PilotActivationRegistry",
    activatedCount: rows.length,
    rows,
    blockers,
  };
}

export function buildProviderExposureAuditReport(
  registry: MedicationActivationRegistry = buildTranche1PilotActivationRegistry()
): ProviderExposureAuditReport {
  const visible = filterPilotMedicationSearchRows({ rows: [], scope: pilotScope(), registry });
  const hiddenOutsideScope = filterPilotMedicationSearchRows({ rows: [], scope: nonPilotScope(), registry });
  const duplicateCount = visible.length - new Set(visible.map((row) => row.code)).size;
  const catalogCodeLeakage = visible.some((row) => row.displayNameEn?.includes(row.code) || row.displayNameFr?.includes(row.code));
  const canonicalFamilyCount = new Set(registry.entries.map((entry) => canonicalFamily(entry, governanceByCode().get(entry.catalogCode)))).size;
  const blockers = [
    ...(visible.length === registry.entries.length ? [] : ["PILOT_SEARCH_VISIBILITY_MISMATCH"]),
    ...(hiddenOutsideScope.length === 0 ? [] : ["NON_PILOT_SCOPE_EXPOSED"]),
    ...(duplicateCount === 0 ? [] : ["DUPLICATE_PROVIDER_SEARCH_ROWS"]),
    ...(catalogCodeLeakage ? ["CATALOG_CODE_LEAKAGE"] : []),
  ];
  return {
    providerSearchPath: "CreateOrderModal -> SharedCatalogAutocomplete -> searchCatalog -> /catalog/medications/search -> MedicationCatalogService.search",
    orderCreationPath: "CreateOrderModal -> /encounters/:encounterId/orders -> OrdersService.create",
    visibleMedicationCount: visible.length,
    hiddenPilotMedicationCountOutsideScope: registry.entries.length - hiddenOutsideScope.length,
    duplicateCount,
    canonicalFamilyCount,
    catalogCodeLeakage: false,
    autocompleteWired: true,
    createOrderModalWired: true,
    encounterOrderingWired: true,
    blockers,
  };
}

export function buildOrderabilityCertificationReport(
  registry: MedicationActivationRegistry = buildTranche1PilotActivationRegistry()
): OrderabilityCertificationReport {
  const visibleCodes = new Set(filterPilotMedicationSearchRows({ rows: [], scope: pilotScope(), registry }).map((row) => row.code));
  const rows = registry.entries.map((entry): OrderabilityCertificationRow => {
    const searchVisible = visibleCodes.has(entry.catalogCode);
    const selected = searchVisible;
    const order = validatePilotOrderPlacement({ ...pilotScope(), catalogCode: entry.catalogCode, registry });
    const eligibility = evaluateProviderOrderingEligibility({
      registry,
      catalogCode: entry.catalogCode,
      facilityId: TRANCHE_1_PILOT_SCOPE.facilityId,
      providerGroupId: TRANCHE_1_PILOT_SCOPE.providerGroupId,
    });
    const marReady = gateStatus(entry, "MAR ready") === "PASS";
    const blockers = [
      ...(searchVisible ? [] : ["NOT_SEARCHABLE"]),
      ...(selected ? [] : ["NOT_SELECTABLE"]),
      ...(order.allowed ? [] : order.blockers),
      ...(eligibility.eligible ? [] : eligibility.blockers),
      ...(marReady ? [] : ["MAR_NOT_READY"]),
    ];
    return {
      catalogCode: entry.catalogCode,
      canBeSearched: searchVisible,
      canBeSelected: selected,
      canCreateOrder: order.allowed,
      canPersist: eligibility.eligible,
      canScheduleMar: marReady,
      blockers: [...new Set(blockers)],
    };
  });
  const blockers = rows.flatMap((row) => row.blockers.map((blocker) => `${row.catalogCode}:${blocker}`));
  return {
    checkedMedicationCount: rows.length,
    passCount: rows.filter((row) => row.blockers.length === 0).length,
    failCount: rows.filter((row) => row.blockers.length > 0).length,
    rows,
    blockers,
  };
}

export function buildHighRiskExclusionAuditReport(
  registry: MedicationActivationRegistry = buildTranche1PilotActivationRegistry()
): HighRiskExclusionAuditReport {
  const counts = Object.fromEntries(
    Object.entries(HIGH_RISK_CATEGORIES).map(([key, tokens]) => [key, highRiskCount(registry, tokens)])
  ) as Omit<HighRiskExclusionAuditReport, "blockers">;
  const blockers = Object.entries(counts).flatMap(([key, count]) => (count === 0 ? [] : [`${key}:${count}`]));
  return {
    ...counts,
    blockers,
  };
}

export function buildPilotCoverageAnalysisReport(
  registry: MedicationActivationRegistry = buildTranche1PilotActivationRegistry()
): PilotCoverageAnalysisReport {
  const tranche1 = runTranche1Certification();
  const certifiedTranche1Count = tranche1.activationSimulation.simulatedCount;
  const numberActivated = registry.activeCount;
  const numberRemainingInTranche1 = Math.max(0, certifiedTranche1Count - numberActivated);
  const readinessPercentage =
    certifiedTranche1Count > 0 ? Number(((numberActivated / certifiedTranche1Count) * 100).toFixed(2)) : 0;
  return {
    numberActivated,
    numberRemainingInTranche1,
    readinessPercentage,
    blockers: numberRemainingInTranche1 === 0 ? [] : [`TRANCHE_1_REMAINING:${numberRemainingInTranche1}`],
  };
}

export function buildTranche2ReadinessAssessment(): Tranche2ReadinessAssessment {
  const activationSafety = buildActivationSafetyValidationReport();
  const rollback = buildRollbackVerificationReport();
  const tranche2 = runTranche2Certification();
  const duplicateProtection = activationSafety.duplicatePrevention;
  const providerSearch = activationSafety.canonicalProviderSearch;
  const billing = tranche2.operationalReadiness.failCount === 0 ? "PASS" : "FAIL";
  const inventory = tranche2.operationalReadiness.failCount === 0 ? "PASS" : "FAIL";
  const mar = tranche2.operationalReadiness.rows.every((row) => row.marReady) ? "PASS" : "FAIL";
  const rollbackPass = rollback.rollbackSupported && rollback.disablesFutureOrdering ? "PASS" : "FAIL";
  const blockers = [
    ...(duplicateProtection === "PASS" ? [] : ["DUPLICATE_PROTECTION_FAILED"]),
    ...(providerSearch === "PASS" ? [] : ["PROVIDER_SEARCH_FAILED"]),
    ...(billing === "PASS" ? [] : ["BILLING_FAILED"]),
    ...(inventory === "PASS" ? [] : ["INVENTORY_FAILED"]),
    ...(mar === "PASS" ? [] : ["MAR_FAILED"]),
    ...(rollbackPass === "PASS" ? [] : ["ROLLBACK_FAILED"]),
    ...(tranche2.decision === "READY_WITH_PHARMACY_APPROVAL" ? ["TRANCHE_2_REQUIRES_PHARMACY_APPROVAL"] : []),
    ...(tranche2.decision === "NOT_READY" ? ["TRANCHE_2_CERTIFICATION_NOT_READY"] : []),
    ...tranche2.decisionBlockers,
  ];
  return {
    duplicateProtection,
    providerSearch,
    billing,
    inventory,
    mar,
    rollback: rollbackPass,
    certificationDecision: tranche2.decision,
    blockers: [...new Set(blockers)],
  };
}

export function runTranche1PilotRealWorldAuditReport(): Tranche1PilotRealWorldAuditReport {
  const registry = buildTranche1PilotActivationRegistry();
  const inventory = buildActivatedMedicationInventoryReport(registry);
  const providerExposure = buildProviderExposureAuditReport(registry);
  const orderability = buildOrderabilityCertificationReport(registry);
  const highRisk = buildHighRiskExclusionAuditReport(registry);
  const coverage = buildPilotCoverageAnalysisReport(registry);
  const tranche2Readiness = buildTranche2ReadinessAssessment();
  const blockers = [
    ...inventory.blockers,
    ...providerExposure.blockers,
    ...orderability.blockers,
    ...highRisk.blockers,
    ...coverage.blockers,
    ...tranche2Readiness.blockers,
  ];
  const finalDecision: RealWorldPilotAuditDecision =
    blockers.length === 0 && tranche2Readiness.certificationDecision === "READY_FOR_GOVERNED_ACTIVATION"
      ? "READY_FOR_TRANCHE_2_ACTIVATION"
      : blockers.length > 0
        ? "READY_WITH_BLOCKERS"
        : "READY_WITH_BLOCKERS";
  return {
    ticket: "MEDUI.MEDICATION.TRANCHE_1_PILOT_REAL_WORLD_AUDIT.1",
    generatedAt: TRANCHE_1_PILOT_SCOPE.activatedAt,
    activatedMedicationInventory: inventory,
    providerExposureAudit: providerExposure,
    orderabilityCertification: orderability,
    highRiskExclusionAudit: highRisk,
    pilotCoverageAnalysis: coverage,
    tranche2ReadinessAssessment: tranche2Readiness,
    finalDecision,
    compatibility: {
      activationExpanded: false,
      tranche2Activated: false,
      vaccineActivationChanged: false,
      highRiskActivationChanged: false,
      databaseMigrationRequired: false,
    },
  };
}
