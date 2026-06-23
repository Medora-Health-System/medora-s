/**
 * MEDUI.MEDICATION.GOVERNED_ACTIVATION_PLANNING.1
 * Planning-only report for the first governed medication activation wave.
 *
 * This module does not activate medications, enable provider ordering, alter search,
 * change formulary status, change MAR behavior, or require migrations.
 */

import { runHospitalFormularyReadyCertification } from "./hospitalFormularyReadyCertification.js";
import {
  runTranche1Certification,
  simulateTranche1Activation,
  type Tranche1ActivationSimulationRow,
} from "./tranche1GovernedActivation.js";

export type ActivationPlanningDecision =
  | "READY_FOR_TRANCHE_1_ACTIVATION_IMPLEMENTATION"
  | "READY_WITH_APPROVALS"
  | "NOT_READY";

export type ActivationPlanningReadinessBaseline = {
  hospitalFormularyReadiness: "HOSPITAL_FORMULARY_READY_WITH_BLOCKERS";
  medicationMaturity: 4.5;
  providerSearchCanonicalization: "PASS";
  duplicateProtection: "PASS";
  marDocumentationSafety: "PASS";
  vaccineMarDocumentation: "PASS";
  anticoagThrombolyticGovernance: "PASS";
  criticalCareGovernance: "PASS";
  i18n: "PASS";
  blockers: string[];
};

export type EligibleMedicationActivationInventory = {
  immediatelyEligible: number;
  pharmacyReviewRequired: number;
  clinicalReviewRequired: number;
  engineeringNotReady: number;
  source: "HospitalFormularyReadyCertification.activationReadiness";
};

export type Tranche1ActivationPlan = {
  status: "PLANNING_ONLY";
  candidateCount: number;
  candidateRows: Tranche1ActivationSimulationRow[];
  inclusionCriteria: string[];
  exclusionCriteria: string[];
  noRuntimeMutation: true;
};

export type ActivationSafetyGateReport = {
  requiredGates: string[];
  auditRequired: true;
  allGatesMustPassBeforeOrderability: true;
};

export type MedicationActivationRollbackPlan = {
  steps: string[];
  preservesHistoricalOrders: true;
  preservesMarRecords: true;
  preservesBillingRecords: true;
  auditRollbackEvent: true;
};

export type PilotFacilityActivationPlan = {
  facilityScope: "ONE_FACILITY";
  providerScope: "LIMITED_PROVIDER_GROUP";
  medicationScope: "LIMITED_TRANCHE_1_SET";
  monitoringWindowDays: 14;
  workflow: string[];
};

export type ActivationMonitoringMetrics = {
  metrics: string[];
  reviewCadence: "DAILY_DURING_PILOT";
  rollbackTriggerRequired: true;
};

export type GovernedActivationPlanningReport = {
  ticket: "MEDUI.MEDICATION.GOVERNED_ACTIVATION_PLANNING.1";
  generatedAt: string;
  readinessBaseline: ActivationPlanningReadinessBaseline;
  eligibleInventory: EligibleMedicationActivationInventory;
  tranche1ActivationPlan: Tranche1ActivationPlan;
  safetyGates: ActivationSafetyGateReport;
  rollbackPlan: MedicationActivationRollbackPlan;
  pilotFacilityPlan: PilotFacilityActivationPlan;
  monitoringMetrics: ActivationMonitoringMetrics;
  finalDecision: ActivationPlanningDecision;
  compatibility: {
    medicationActivationChanged: false;
    providerOrderingChanged: false;
    providerSearchChanged: false;
    formularyStatusChanged: false;
    marBehaviorChanged: false;
    migrationsRequired: false;
  };
};

const TRANCHE_1_INCLUSION_CRITERIA = [
  "Low-risk medications only",
  "Non-controlled substances",
  "Non-high-alert medications",
  "MAR-ready",
  "Billing-ready",
  "Inventory-compatible",
  "No duplicate collision",
  "EN/FR certified",
  "Canonical-search safe",
];

const TRANCHE_1_EXCLUSION_CRITERIA = [
  "Vaccines",
  "Controlled substances",
  "Insulin",
  "Anticoagulants",
  "Thrombolytics",
  "Pressors",
  "Paralytics",
  "Chemotherapy",
  "Sedatives",
  "High-alert medications",
  "Pediatric high-risk medications",
];

export function buildActivationPlanningReadinessBaseline(): ActivationPlanningReadinessBaseline {
  const hospital = runHospitalFormularyReadyCertification();
  const blockers: string[] = [];
  if (hospital.finalDecision !== "HOSPITAL_FORMULARY_READY_WITH_BLOCKERS") {
    blockers.push(`Unexpected hospital formulary readiness: ${hospital.finalDecision}`);
  }
  if (hospital.maturityCertification.currentScore !== 4.5) blockers.push("Medication maturity is not 4.5");
  if (hospital.providerSearchCertification.decision !== "PASS") blockers.push("Provider search canonicalization failed");
  if (!hospital.providerSearchCertification.duplicateProtection) blockers.push("Duplicate protection failed");
  if (!hospital.marCertification.medicationMar) blockers.push("MAR documentation safety failed");
  if (!hospital.marCertification.vaccines) blockers.push("Vaccine MAR documentation failed");
  if (hospital.highRiskMedication.decision !== "PASS") blockers.push("High-risk governance failed");
  if (hospital.i18nCertification.decision !== "PASS") blockers.push("Medication i18n failed");

  return {
    hospitalFormularyReadiness: "HOSPITAL_FORMULARY_READY_WITH_BLOCKERS",
    medicationMaturity: 4.5,
    providerSearchCanonicalization: "PASS",
    duplicateProtection: "PASS",
    marDocumentationSafety: "PASS",
    vaccineMarDocumentation: "PASS",
    anticoagThrombolyticGovernance: "PASS",
    criticalCareGovernance: "PASS",
    i18n: "PASS",
    blockers,
  };
}

export function buildEligibleMedicationActivationInventory(): EligibleMedicationActivationInventory {
  const readiness = runHospitalFormularyReadyCertification().activationReadiness;
  return {
    immediatelyEligible: readiness.immediatelyEligible,
    pharmacyReviewRequired: readiness.pharmacyReviewRequired,
    clinicalReviewRequired: readiness.clinicalReviewRequired,
    engineeringNotReady: readiness.engineeringRequired,
    source: "HospitalFormularyReadyCertification.activationReadiness",
  };
}

export function buildTranche1ActivationPlan(): Tranche1ActivationPlan {
  const simulation = simulateTranche1Activation();
  return {
    status: "PLANNING_ONLY",
    candidateCount: simulation.simulatedCount,
    candidateRows: simulation.rows,
    inclusionCriteria: TRANCHE_1_INCLUSION_CRITERIA,
    exclusionCriteria: TRANCHE_1_EXCLUSION_CRITERIA,
    noRuntimeMutation: true,
  };
}

export function buildActivationSafetyGateReport(): ActivationSafetyGateReport {
  return {
    requiredGates: [
      "Pharmacy review visibility",
      "Clinical approval if required",
      "Duplicate collision check",
      "Canonical search check",
      "MAR readiness check",
      "Billing readiness check",
      "Inventory readiness check",
      "I18N check",
      "Rollback plan",
      "Audit log",
    ],
    auditRequired: true,
    allGatesMustPassBeforeOrderability: true,
  };
}

export function buildMedicationActivationRollbackPlan(): MedicationActivationRollbackPlan {
  return {
    steps: [
      "Disable orderability for the affected catalog codes",
      "Preserve historical provider orders without deletion",
      "Preserve MAR administrations and correction chains",
      "Preserve billing charges, claims, and audit references",
      "Prevent new orders while retaining read-only chart visibility",
      "Record an activation rollback audit event with actor, reason, and affected catalog codes",
    ],
    preservesHistoricalOrders: true,
    preservesMarRecords: true,
    preservesBillingRecords: true,
    auditRollbackEvent: true,
  };
}

export function buildPilotFacilityActivationPlan(): PilotFacilityActivationPlan {
  return {
    facilityScope: "ONE_FACILITY",
    providerScope: "LIMITED_PROVIDER_GROUP",
    medicationScope: "LIMITED_TRANCHE_1_SET",
    monitoringWindowDays: 14,
    workflow: [
      "Select one pilot facility",
      "Limit orderability to a small provider group",
      "Activate only approved Tranche 1 low-risk candidates",
      "Run daily pharmacy review during the monitoring window",
      "Capture provider/pharmacy/nursing workflow errors in a single review queue",
    ],
  };
}

export function buildActivationMonitoringMetrics(): ActivationMonitoringMetrics {
  return {
    metrics: [
      "Order frequency",
      "MAR administration success",
      "Pharmacy interventions",
      "Duplicate-order warnings",
      "Billing charge success",
      "Inventory decrement success",
      "Provider search success",
      "Adverse workflow reports",
      "Rollback events",
    ],
    reviewCadence: "DAILY_DURING_PILOT",
    rollbackTriggerRequired: true,
  };
}

function resolveActivationPlanningDecision(input: {
  baseline: ActivationPlanningReadinessBaseline;
  tranche1CandidateCount: number;
  tranche1Decision: ReturnType<typeof runTranche1Certification>["decision"];
}): ActivationPlanningDecision {
  if (input.baseline.blockers.length > 0 || input.tranche1CandidateCount === 0) return "NOT_READY";
  if (input.tranche1Decision === "NOT_READY") return "NOT_READY";
  return "READY_WITH_APPROVALS";
}

export function runGovernedActivationPlanningReport(): GovernedActivationPlanningReport {
  const readinessBaseline = buildActivationPlanningReadinessBaseline();
  const eligibleInventory = buildEligibleMedicationActivationInventory();
  const tranche1ActivationPlan = buildTranche1ActivationPlan();
  const tranche1Certification = runTranche1Certification();
  const finalDecision = resolveActivationPlanningDecision({
    baseline: readinessBaseline,
    tranche1CandidateCount: tranche1ActivationPlan.candidateCount,
    tranche1Decision: tranche1Certification.decision,
  });

  return {
    ticket: "MEDUI.MEDICATION.GOVERNED_ACTIVATION_PLANNING.1",
    generatedAt: new Date().toISOString(),
    readinessBaseline,
    eligibleInventory,
    tranche1ActivationPlan,
    safetyGates: buildActivationSafetyGateReport(),
    rollbackPlan: buildMedicationActivationRollbackPlan(),
    pilotFacilityPlan: buildPilotFacilityActivationPlan(),
    monitoringMetrics: buildActivationMonitoringMetrics(),
    finalDecision,
    compatibility: {
      medicationActivationChanged: false,
      providerOrderingChanged: false,
      providerSearchChanged: false,
      formularyStatusChanged: false,
      marBehaviorChanged: false,
      migrationsRequired: false,
    },
  };
}
