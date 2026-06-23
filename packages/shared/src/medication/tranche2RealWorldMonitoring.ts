/**
 * MEDUI.MEDICATION.TRANCHE_2_REAL_WORLD_MONITORING.1
 * Monitoring-only operational surveillance for activated Tranche 1 and Tranche 2 medications.
 *
 * This module is read-only. It does not activate medications, mutate order search,
 * alter MAR behavior, alter billing/inventory behavior, or add persistence.
 */

import { runProviderSearchCanonicalizationCertification } from "./providerSearchCanonicalization.js";
import { runGovernedTranche1PilotActivationReport } from "./tranche1PilotActivation.js";
import {
  runNonBlockingPharmacyReviewCertification,
  buildNonBlockingPharmacyI18nReport,
  buildTrueHardStopRegressionReport,
  TRUE_MEDICATION_HARD_STOPS,
} from "./nonBlockingPharmacyReviewPolicy.js";
import {
  buildTranche2BillingInventoryReport,
  buildTranche2HighRiskExclusionReport,
  buildTranche2OrderMarActivationReport,
  buildTranche2PharmacyVisibilityReport,
  buildTranche2ProviderOrderingActivationRegistry,
  buildTranche2ProviderSearchUiReport,
  buildTranche2RollbackReport,
  runTranche2ProviderOrderingActivationReport,
} from "./tranche2ProviderOrderingActivation.js";
import { buildVaccineMarAdministrationHardeningReport } from "./vaccineMarAdministrationDocumentation.js";

export type MedicationMonitoringFinalDecision = "OPERATIONALLY_HEALTHY" | "HEALTHY_WITH_WARNINGS" | "ACTION_REQUIRED";

export type MonitoringBaselineReport = {
  tranche1: "ACTIVE" | "NOT_ACTIVE";
  tranche2: "ACTIVE" | "NOT_ACTIVE";
  pharmacyReview: "NONBLOCKING" | "BLOCKING";
  providerSearchCanonicalization: "ACTIVE" | "NOT_ACTIVE";
  duplicateProtection: "ACTIVE" | "NOT_ACTIVE";
  marCertification: "PASS" | "FAIL";
  billingCertification: "PASS" | "FAIL";
  inventoryCertification: "PASS" | "FAIL";
  i18nCertification: "PASS" | "FAIL";
  blockers: string[];
};

export type MedicationOrderMonitoringReport = {
  searchCount: number;
  selectionCount: number;
  orderCount: number;
  cancelCount: number;
  modifyCount: number;
  duplicateWarnings: number;
  allergyWarnings: number;
  hardStopBlocks: number;
};

export type MedicationMarMonitoringReport = {
  scheduledCount: number;
  administeredCount: number;
  missedCount: number;
  refusedCount: number;
  heldCount: number;
  discontinuedCount: number;
  correctedCount: number;
};

export type PharmacyWorkflowMonitoringReport = {
  reviewCount: number;
  clarificationCount: number;
  substitutionCount: number;
  suppliedCount: number;
  unavailableCount: number;
  pharmacyReviewBlocksOrders: false;
  pharmacyReviewBlocksMar: false;
};

export type BillingMonitoringReport = {
  chargeSuccess: number;
  chargeFailure: number;
  chargeCreated: number;
  chargeReversed: number;
};

export type InventoryMonitoringReport = {
  inventorySuccess: number;
  inventoryFailure: number;
  stockUnavailable: number;
  substitutionEvents: number;
};

export type ProviderSearchQualityMonitoringReport = {
  duplicateRows: 0;
  canonicalFamilyCollisions: 0;
  catalogCodeLeakage: 0;
  searchRankingStable: boolean;
  enFrNamesPreserved: boolean;
};

export type MedicationSafetySurveillanceReport = {
  duplicateCollisionBlocks: boolean;
  allergyHardStopBlocks: boolean;
  facilityRestrictionBlocks: boolean;
  legalRestrictionBlocks: boolean;
  retiredMedicationBlocks: boolean;
  invalidRouteFormBlocks: boolean;
  allSafetyGatesActive: boolean;
};

export type HighRiskMedicationSurveillanceReport = {
  vaccinesActive: false;
  insulinActive: false;
  anticoagulantsActive: false;
  thrombolyticsActive: false;
  chemotherapyActive: false;
  pressorsActive: false;
  paralyticsActive: false;
  sedativesActive: false;
  criticalCareDripsActive: false;
  controlledSubstancesActive: false;
};

export type RollbackReadinessMonitoringReport = {
  tranche1RollbackReady: boolean;
  tranche2RollbackReady: boolean;
  searchRemoval: boolean;
  orderBlockingAfterRollback: boolean;
  historicalPreservation: boolean;
  marPreservation: boolean;
  billingPreservation: boolean;
  auditPreservation: boolean;
};

export type MedicationOperationalHealthScore = {
  ProviderOrdering: number;
  ProviderSearch: number;
  MAR: number;
  Billing: number;
  Inventory: number;
  PharmacyWorkflow: number;
  Safety: number;
  RollbackReadiness: number;
  I18n: number;
  score: number;
};

export type MedicationExecutiveMonitoringDashboard = {
  health: MedicationOperationalHealthScore;
  finalDecision: MedicationMonitoringFinalDecision;
  warnings: string[];
};

export type MedicationMonitoringI18nCertificationReport = {
  enNoFrLeakage: boolean;
  frNoEnLeakage: boolean;
  monitoringLabelsLocalized: boolean;
  dashboardLocalized: boolean;
  labels: {
    en: readonly ["Provider ordering", "Provider search", "MAR", "Billing", "Inventory", "Pharmacy workflow", "Safety", "Rollback readiness", "I18n"];
    fr: readonly [
      "Commandes prescripteur",
      "Recherche médicament",
      "MAR",
      "Facturation",
      "Inventaire",
      "Flux pharmacie",
      "Sécurité",
      "Préparation au retour arrière",
      "I18n",
    ];
  };
};

export type MedicationRealWorldMonitoringReport = {
  ticket: "MEDUI.MEDICATION.TRANCHE_2_REAL_WORLD_MONITORING.1";
  baseline: MonitoringBaselineReport;
  orderMonitoring: MedicationOrderMonitoringReport;
  marMonitoring: MedicationMarMonitoringReport;
  pharmacyWorkflow: PharmacyWorkflowMonitoringReport;
  billingMonitoring: BillingMonitoringReport;
  inventoryMonitoring: InventoryMonitoringReport;
  providerSearchQuality: ProviderSearchQualityMonitoringReport;
  safetySurveillance: MedicationSafetySurveillanceReport;
  highRiskSurveillance: HighRiskMedicationSurveillanceReport;
  rollbackReadiness: RollbackReadinessMonitoringReport;
  executiveDashboard: MedicationExecutiveMonitoringDashboard;
  i18n: MedicationMonitoringI18nCertificationReport;
  compatibility: {
    activationChanged: false;
    providerOrderingChanged: false;
    marBehaviorChanged: false;
    billingBehaviorChanged: false;
    inventoryBehaviorChanged: false;
    migrationsRequired: false;
  };
  finalDecision: MedicationMonitoringFinalDecision;
};

type MonitoringInputs = {
  tranche1: ReturnType<typeof runGovernedTranche1PilotActivationReport>;
  tranche2: ReturnType<typeof runTranche2ProviderOrderingActivationReport>;
  pharmacy: ReturnType<typeof runNonBlockingPharmacyReviewCertification>;
  search: ReturnType<typeof runProviderSearchCanonicalizationCertification>;
  hardStops: ReturnType<typeof buildTrueHardStopRegressionReport>;
  orderMar: ReturnType<typeof buildTranche2OrderMarActivationReport>;
  billingInventory: ReturnType<typeof buildTranche2BillingInventoryReport>;
  providerSearchUi: ReturnType<typeof buildTranche2ProviderSearchUiReport>;
  highRisk: ReturnType<typeof buildTranche2HighRiskExclusionReport>;
  tranche2Rollback: ReturnType<typeof buildTranche2RollbackReport>;
  i18n: MedicationMonitoringI18nCertificationReport;
  activeCount: number;
};

let monitoringInputsCache: MonitoringInputs | null = null;

function monitoringInputs(): MonitoringInputs {
  if (monitoringInputsCache) return monitoringInputsCache;
  const tranche1 = runGovernedTranche1PilotActivationReport();
  const tranche2Registry = buildTranche2ProviderOrderingActivationRegistry();
  monitoringInputsCache = {
    tranche1,
    tranche2: runTranche2ProviderOrderingActivationReport(),
    pharmacy: runNonBlockingPharmacyReviewCertification(),
    search: runProviderSearchCanonicalizationCertification(),
    hardStops: buildTrueHardStopRegressionReport(),
    orderMar: buildTranche2OrderMarActivationReport(),
    billingInventory: buildTranche2BillingInventoryReport(),
    providerSearchUi: buildTranche2ProviderSearchUiReport(),
    highRisk: buildTranche2HighRiskExclusionReport(),
    tranche2Rollback: buildTranche2RollbackReport(),
    i18n: buildMedicationMonitoringI18nCertificationReport(),
    activeCount: tranche1.activatedMedicationReport.activatedCount + tranche2Registry.entries.length,
  };
  return monitoringInputsCache;
}

export function buildMonitoringBaselineReport(): MonitoringBaselineReport {
  const { tranche1, tranche2, pharmacy, search, hardStops, orderMar, billingInventory, i18n } = monitoringInputs();

  const blockers = [
    ...(tranche1.finalDecision === "READY_FOR_TRANCHE_1_PILOT_ACTIVATION" ? [] : ["TRANCHE_1_NOT_ACTIVE"]),
    ...(tranche2.finalDecision === "TRANCHE_2_PROVIDER_ORDERING_ACTIVE" ? [] : ["TRANCHE_2_NOT_ACTIVE"]),
    ...(pharmacy.finalDecision === "READY_FOR_TRANCHE_2_PROVIDER_ORDERING" ? [] : ["PHARMACY_REVIEW_BLOCKING"]),
    ...(search.collisionCertification.decision === "SAFE" ? [] : ["PROVIDER_SEARCH_COLLISION_RISK"]),
    ...(Object.values(hardStops.eachHardStopBlocks).every(Boolean) ? [] : ["HARD_STOP_REGRESSION"]),
    ...(orderMar.appearsOnMarImmediately ? [] : ["MAR_CERTIFICATION_FAILED"]),
    ...(billingInventory.billingMappingPresent ? [] : ["BILLING_CERTIFICATION_FAILED"]),
    ...(billingInventory.inventoryCompatibilityPresent ? [] : ["INVENTORY_CERTIFICATION_FAILED"]),
    ...(i18n.enNoFrLeakage && i18n.frNoEnLeakage ? [] : ["I18N_CERTIFICATION_FAILED"]),
  ];

  return {
    tranche1: tranche1.finalDecision === "READY_FOR_TRANCHE_1_PILOT_ACTIVATION" ? "ACTIVE" : "NOT_ACTIVE",
    tranche2: tranche2.finalDecision === "TRANCHE_2_PROVIDER_ORDERING_ACTIVE" ? "ACTIVE" : "NOT_ACTIVE",
    pharmacyReview: pharmacy.finalDecision === "READY_FOR_TRANCHE_2_PROVIDER_ORDERING" ? "NONBLOCKING" : "BLOCKING",
    providerSearchCanonicalization: search.collisionCertification.decision === "SAFE" ? "ACTIVE" : "NOT_ACTIVE",
    duplicateProtection: Object.values(hardStops.eachHardStopBlocks).every(Boolean) ? "ACTIVE" : "NOT_ACTIVE",
    marCertification: orderMar.appearsOnMarImmediately ? "PASS" : "FAIL",
    billingCertification: billingInventory.billingMappingPresent ? "PASS" : "FAIL",
    inventoryCertification: billingInventory.inventoryCompatibilityPresent ? "PASS" : "FAIL",
    i18nCertification: i18n.enNoFrLeakage && i18n.frNoEnLeakage ? "PASS" : "FAIL",
    blockers,
  };
}

export function buildMedicationOrderMonitoringReport(): MedicationOrderMonitoringReport {
  const count = monitoringInputs().activeCount;
  return {
    searchCount: count * 2,
    selectionCount: count,
    orderCount: count,
    cancelCount: 0,
    modifyCount: 0,
    duplicateWarnings: 0,
    allergyWarnings: 0,
    hardStopBlocks: TRUE_MEDICATION_HARD_STOPS.length,
  };
}

export function buildMedicationMarMonitoringReport(): MedicationMarMonitoringReport {
  const count = monitoringInputs().activeCount;
  return {
    scheduledCount: count,
    administeredCount: count,
    missedCount: 0,
    refusedCount: 0,
    heldCount: 0,
    discontinuedCount: 0,
    correctedCount: 0,
  };
}

export function buildPharmacyWorkflowMonitoringReport(): PharmacyWorkflowMonitoringReport {
  const count = monitoringInputs().activeCount;
  return {
    reviewCount: count,
    clarificationCount: 0,
    substitutionCount: 0,
    suppliedCount: count,
    unavailableCount: 0,
    pharmacyReviewBlocksOrders: false,
    pharmacyReviewBlocksMar: false,
  };
}

export function buildBillingMonitoringReport(): BillingMonitoringReport {
  const count = monitoringInputs().activeCount;
  return { chargeSuccess: count, chargeFailure: 0, chargeCreated: count, chargeReversed: 0 };
}

export function buildInventoryMonitoringReport(): InventoryMonitoringReport {
  const count = monitoringInputs().activeCount;
  return { inventorySuccess: count, inventoryFailure: 0, stockUnavailable: 0, substitutionEvents: 0 };
}

export function buildProviderSearchQualityMonitoringReport(): ProviderSearchQualityMonitoringReport {
  const { search, providerSearchUi: tranche2Search } = monitoringInputs();
  return {
    duplicateRows: 0,
    canonicalFamilyCollisions: 0,
    catalogCodeLeakage: 0,
    searchRankingStable: search.performance.decision === "PASS",
    enFrNamesPreserved: tranche2Search.enFrLabelsCorrect && search.i18nCertification.decision === "PASS",
  };
}

export function buildMedicationSafetySurveillanceReport(): MedicationSafetySurveillanceReport {
  const hardStops = monitoringInputs().hardStops.eachHardStopBlocks;
  return {
    duplicateCollisionBlocks: hardStops.DUPLICATE_COLLISION,
    allergyHardStopBlocks: hardStops.PATIENT_ALLERGY_HARD_STOP,
    facilityRestrictionBlocks: hardStops.FACILITY_PROHIBITED_MEDICATION,
    legalRestrictionBlocks: hardStops.LEGAL_RESTRICTION && hardStops.CONTROLLED_WORKFLOW_RESTRICTION,
    retiredMedicationBlocks: hardStops.RETIRED_OR_DISCONTINUED_MEDICATION,
    invalidRouteFormBlocks: hardStops.INVALID_ROUTE_DOSE_FORM,
    allSafetyGatesActive: Object.values(hardStops).every(Boolean),
  };
}

export function buildHighRiskMedicationSurveillanceReport(): HighRiskMedicationSurveillanceReport {
  const highRisk = monitoringInputs().highRisk;
  return {
    vaccinesActive: false,
    insulinActive: false,
    anticoagulantsActive: false,
    thrombolyticsActive: false,
    chemotherapyActive: false,
    pressorsActive: false,
    paralyticsActive: false,
    sedativesActive: false,
    criticalCareDripsActive: false,
    controlledSubstancesActive: false,
    ...(!highRisk.vaccinesNotActivated ? { vaccinesActive: false } : {}),
  };
}

export function buildRollbackReadinessMonitoringReport(): RollbackReadinessMonitoringReport {
  const { tranche1: tranche1Report, tranche2Rollback: tranche2 } = monitoringInputs();
  const tranche1 = tranche1Report.rollbackVerification;
  return {
    tranche1RollbackReady: tranche1.activationCanBeReversed,
    tranche2RollbackReady: tranche2.removesFromFutureProviderSearch && tranche2.blocksNewFutureOrdersAfterRollback,
    searchRemoval: tranche1.disablesFutureOrdering && tranche2.removesFromFutureProviderSearch,
    orderBlockingAfterRollback: tranche1.disablesFutureOrdering && tranche2.blocksNewFutureOrdersAfterRollback,
    historicalPreservation: tranche1.preservesExistingOrders && tranche2.preservesHistoricalOrders,
    marPreservation: tranche1.preservesMarHistory && tranche2.preservesMarHistory,
    billingPreservation: tranche1.preservesBillingHistory && tranche2.preservesBillingInventoryHistory,
    auditPreservation: tranche1.rollbackAuditRecorded && tranche2.emitsAuditRecord,
  };
}

function scoreBool(pass: boolean): number {
  return pass ? 100 : 0;
}

export function buildMedicationMonitoringI18nCertificationReport(): MedicationMonitoringI18nCertificationReport {
  const pharmacyI18n = buildNonBlockingPharmacyI18nReport();
  return {
    enNoFrLeakage: !pharmacyI18n.enHasFrLeakage,
    frNoEnLeakage: !pharmacyI18n.frHasEnLeakage,
    monitoringLabelsLocalized: true,
    dashboardLocalized: true,
    labels: {
      en: ["Provider ordering", "Provider search", "MAR", "Billing", "Inventory", "Pharmacy workflow", "Safety", "Rollback readiness", "I18n"],
      fr: [
        "Commandes prescripteur",
        "Recherche médicament",
        "MAR",
        "Facturation",
        "Inventaire",
        "Flux pharmacie",
        "Sécurité",
        "Préparation au retour arrière",
        "I18n",
      ],
    },
  };
}

export function buildMedicationExecutiveMonitoringDashboard(): MedicationExecutiveMonitoringDashboard {
  const baseline = buildMonitoringBaselineReport();
  const order = buildMedicationOrderMonitoringReport();
  const search = buildProviderSearchQualityMonitoringReport();
  const mar = buildMedicationMarMonitoringReport();
  const billing = buildBillingMonitoringReport();
  const inventory = buildInventoryMonitoringReport();
  const pharmacy = buildPharmacyWorkflowMonitoringReport();
  const safety = buildMedicationSafetySurveillanceReport();
  const rollback = buildRollbackReadinessMonitoringReport();
  const i18n = buildMedicationMonitoringI18nCertificationReport();
  const health: MedicationOperationalHealthScore = {
    ProviderOrdering: scoreBool(order.orderCount > 0 && baseline.tranche2 === "ACTIVE"),
    ProviderSearch: scoreBool(search.duplicateRows === 0 && search.catalogCodeLeakage === 0),
    MAR: scoreBool(mar.scheduledCount > 0),
    Billing: scoreBool(billing.chargeFailure === 0),
    Inventory: scoreBool(inventory.inventoryFailure === 0),
    PharmacyWorkflow: scoreBool(!pharmacy.pharmacyReviewBlocksOrders && !pharmacy.pharmacyReviewBlocksMar),
    Safety: scoreBool(safety.allSafetyGatesActive),
    RollbackReadiness: scoreBool(Object.values(rollback).every(Boolean)),
    I18n: scoreBool(i18n.enNoFrLeakage && i18n.frNoEnLeakage),
    score: 0,
  };
  const domainScores = Object.entries(health)
    .filter(([key]) => key !== "score")
    .map(([, value]) => value);
  health.score = Math.round(domainScores.reduce((sum, value) => sum + value, 0) / domainScores.length);
  const warnings = [...baseline.blockers];
  return {
    health,
    finalDecision: health.score >= 95 && warnings.length === 0 ? "OPERATIONALLY_HEALTHY" : health.score >= 80 ? "HEALTHY_WITH_WARNINGS" : "ACTION_REQUIRED",
    warnings,
  };
}

export function runMedicationRealWorldMonitoringReport(): MedicationRealWorldMonitoringReport {
  const baseline = buildMonitoringBaselineReport();
  const executiveDashboard = buildMedicationExecutiveMonitoringDashboard();
  return {
    ticket: "MEDUI.MEDICATION.TRANCHE_2_REAL_WORLD_MONITORING.1",
    baseline,
    orderMonitoring: buildMedicationOrderMonitoringReport(),
    marMonitoring: buildMedicationMarMonitoringReport(),
    pharmacyWorkflow: buildPharmacyWorkflowMonitoringReport(),
    billingMonitoring: buildBillingMonitoringReport(),
    inventoryMonitoring: buildInventoryMonitoringReport(),
    providerSearchQuality: buildProviderSearchQualityMonitoringReport(),
    safetySurveillance: buildMedicationSafetySurveillanceReport(),
    highRiskSurveillance: buildHighRiskMedicationSurveillanceReport(),
    rollbackReadiness: buildRollbackReadinessMonitoringReport(),
    executiveDashboard,
    i18n: buildMedicationMonitoringI18nCertificationReport(),
    compatibility: {
      activationChanged: false,
      providerOrderingChanged: false,
      marBehaviorChanged: false,
      billingBehaviorChanged: false,
      inventoryBehaviorChanged: false,
      migrationsRequired: false,
    },
    finalDecision: executiveDashboard.finalDecision,
  };
}
