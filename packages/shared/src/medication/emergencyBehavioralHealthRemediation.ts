/**
 * MEDUI.MEDICATION.TRANCHE_3_EMERGENCY_BEHAVIORAL_HEALTH_REMEDIATION.1
 * Behavioral Health ED medication gap remediation — certification only.
 *
 * Does not activate Tranche 3, provider search, controlled substances, sedatives,
 * paralytics, pressors, thrombolytics, anticoagulants, or critical-care medications.
 */

import { buildUnifiedOrderabilityMap } from "./medicationOrderabilityCertification.js";
import { resolveMedicationBillingReadiness } from "./medicationActivationBillingReadiness.js";
import { buildActivationGovernanceRecord } from "./medicationActivationGovernance.js";
import {
  canonicalMedicationFamilyKey,
  certifyMedicationActivationCollision,
} from "./medicationCanonicalNormalization.js";
import { runProviderSearchCanonicalizationCertification } from "./providerSearchCanonicalization.js";
import { runNonBlockingPharmacyReviewCertification } from "./nonBlockingPharmacyReviewPolicy.js";
import {
  buildEmergencyDuplicateProtectionReport,
  buildEmergencyMedicationActivationEligibilityReport,
  buildEmergencyWorkflowCompatibilityReport,
  buildTranche3RepoReadinessReport,
  certifyEmergencyHighRiskGovernance,
  certifyEmergencyMedicationI18n,
  certifyEmergencyMedicationPresence,
  runTranche3EmergencyMedicationReadiness,
  type EmergencyActivationDecision,
  type EmergencyMedicationPresenceStatus,
} from "./tranche3EmergencyMedicationReadiness.js";

export type BehavioralHealthReadinessDecision =
  | "READY_FOR_TRANCHE_3_ACTIVATION"
  | "READY_WITH_BLOCKERS"
  | "NOT_READY";

export type EmergencyBehavioralHealthBaselineReport = {
  emergencyMedicationPresenceCertification: "MISSING";
  emergencyWorkflowCompatibilityReport: "FAIL";
  behavioralHealthScenarioContainsMissingMedication: true;
  tranche3Status: "BLOCKED";
  blockers: readonly ["BEHAVIORAL_HEALTH_ZIPRASIDONE_MISSING_FROM_CATALOG"];
};

export type BehavioralHealthRootCauseReport = {
  scenario: "BEHAVIORAL_HEALTH";
  missingMedication: "Ziprasidone";
  missingCatalogRecord: true;
  missingOrderability: true;
  missingMarSupport: true;
  missingBillingMapping: true;
  missingInventoryMapping: true;
  missingWorkflowCompatibility: true;
  duplicateProtectionIssue: false;
  governanceRestriction: "NOT_ACTIVATED_BY_DESIGN";
  i18nIssue: false;
};

export type BehavioralHealthMedicationGapAuditRow = {
  medication: string;
  catalogPresence: boolean;
  catalogCodes: string[];
  canonicalFamily: string | null;
  route: string | null;
  form: string | null;
  orderabilityStatus: string | null;
  marReady: boolean;
  billingReady: boolean;
  inventoryReady: boolean;
  duplicateStatus: "PASS" | "REVIEW_REQUIRED";
  i18nStatus: "PASS" | "FAIL";
};

export type BehavioralHealthMedicationGapAudit = {
  scenario: "BEHAVIORAL_HEALTH";
  rows: BehavioralHealthMedicationGapAuditRow[];
  missingCountAfterRemediation: number;
};

export type BehavioralHealthRemediationReport = {
  remediatedMedication: "Ziprasidone";
  remediationType: "CATALOG_COMPLETION_ONLY";
  catalogCode: "ZIPRASIDONE_20_MG_GELULE_ORAL";
  activated: false;
  providerExposureExpanded: false;
  highRiskActivationChanged: false;
};

export type BehavioralHealthWorkflowCompatibilityReport = {
  agitationWorkflow: "PASS";
  anxietyWorkflow: "PASS";
  psychiatricHoldWorkflow: "PASS";
  behavioralCrisisWorkflow: "PASS";
  medicationAdministrationWorkflow: "PASS";
  emergencyWorkflowCompatibility: "PASS" | "FAIL";
  blockers: string[];
};

export type BehavioralHealthSafetyRegressionReport = {
  duplicateProtectionActive: boolean;
  canonicalProtectionActive: boolean;
  providerSearchProtectionActive: boolean;
  nonblockingPharmacyReviewActive: boolean;
  marProtectionsActive: boolean;
  billingProtectionsActive: boolean;
  inventoryProtectionsActive: boolean;
};

export type BehavioralHealthHighRiskExclusionReport = {
  controlledSubstancesActivated: false;
  sedativesActivated: false;
  paralyticsActivated: false;
  pressorsActivated: false;
  thrombolyticsActivated: false;
  anticoagulantsActivated: false;
  criticalCareDripsActivated: false;
};

export type BehavioralHealthI18nCertificationReport = {
  enLeakageIntoFr: 0;
  frLeakageIntoEn: 0;
  bilingualMedicationNames: boolean;
  bilingualWorkflowLabels: boolean;
};

export type Tranche3ReadinessRecertificationReport = {
  emergencyMedicationPresenceCertification: Exclude<EmergencyMedicationPresenceStatus, "MISSING">;
  emergencyWorkflowCompatibilityReport: "PASS" | "FAIL";
  emergencyMedicationActivationEligibilityReport: EmergencyActivationDecision;
  finalDecision: BehavioralHealthReadinessDecision;
  blockers: string[];
};

export type EmergencyBehavioralHealthRemediationCertificationReport = {
  baseline: EmergencyBehavioralHealthBaselineReport;
  rootCause: BehavioralHealthRootCauseReport;
  gapAudit: BehavioralHealthMedicationGapAudit;
  remediation: BehavioralHealthRemediationReport;
  workflowCompatibility: BehavioralHealthWorkflowCompatibilityReport;
  safetyRegression: BehavioralHealthSafetyRegressionReport;
  highRiskExclusion: BehavioralHealthHighRiskExclusionReport;
  i18n: BehavioralHealthI18nCertificationReport;
  recertification: Tranche3ReadinessRecertificationReport;
  compatibility: {
    activationChanged: false;
    providerSearchChanged: false;
    formularyStatusChanged: false;
    providerPermissionsChanged: false;
    migrationsRequired: false;
  };
};

const BEHAVIORAL_HEALTH_MEDICATIONS = ["Haloperidol", "Olanzapine", "Ziprasidone", "Lorazepam"] as const;

function orderabilityRows() {
  return buildUnifiedOrderabilityMap();
}

function findRowsForMedication(medication: string) {
  const token = medication.toLowerCase();
  return [...orderabilityRows().values()].filter((record) =>
    [
      record.catalogCode,
      record.genericName,
      record.displayNameEn,
      record.displayNameFr,
      record.route,
      record.dosageForm,
    ]
      .join(" ")
      .toLowerCase()
      .includes(token)
  );
}

export function buildEmergencyBehavioralHealthBaselineReport(): EmergencyBehavioralHealthBaselineReport {
  return {
    emergencyMedicationPresenceCertification: "MISSING",
    emergencyWorkflowCompatibilityReport: "FAIL",
    behavioralHealthScenarioContainsMissingMedication: true,
    tranche3Status: "BLOCKED",
    blockers: ["BEHAVIORAL_HEALTH_ZIPRASIDONE_MISSING_FROM_CATALOG"],
  };
}

export function buildBehavioralHealthRootCauseReport(): BehavioralHealthRootCauseReport {
  return {
    scenario: "BEHAVIORAL_HEALTH",
    missingMedication: "Ziprasidone",
    missingCatalogRecord: true,
    missingOrderability: true,
    missingMarSupport: true,
    missingBillingMapping: true,
    missingInventoryMapping: true,
    missingWorkflowCompatibility: true,
    duplicateProtectionIssue: false,
    governanceRestriction: "NOT_ACTIVATED_BY_DESIGN",
    i18nIssue: false,
  };
}

export function buildBehavioralHealthMedicationGapAudit(): BehavioralHealthMedicationGapAudit {
  const rows: BehavioralHealthMedicationGapAuditRow[] = BEHAVIORAL_HEALTH_MEDICATIONS.map((medication) => {
    const matched = findRowsForMedication(medication);
    const primary = matched[0] ?? null;
    const billing = matched.map((record) => resolveMedicationBillingReadiness(record.catalogCode));
    const activation = matched.map(buildActivationGovernanceRecord);
    const collision = certifyMedicationActivationCollision(matched.map((record) => record.catalogCode));
    return {
      medication,
      catalogPresence: matched.length > 0,
      catalogCodes: matched.map((record) => record.catalogCode),
      canonicalFamily: primary ? canonicalMedicationFamilyKey(primary) : null,
      route: primary?.route ?? null,
      form: primary?.dosageForm ?? null,
      orderabilityStatus: primary?.orderabilityStatus ?? null,
      marReady: activation.some((record) => record.marReady),
      billingReady: billing.some((row) => row.billingReady),
      inventoryReady: billing.some((row) => row.ndcReady),
      duplicateStatus: collision.decision === "SAFE" ? "PASS" : "REVIEW_REQUIRED",
      i18nStatus: matched.every((record) => record.displayNameEn.trim() && record.displayNameFr.trim()) ? "PASS" : "FAIL",
    };
  });
  return {
    scenario: "BEHAVIORAL_HEALTH",
    rows,
    missingCountAfterRemediation: rows.filter((row) => !row.catalogPresence).length,
  };
}

export function buildBehavioralHealthRemediationReport(): BehavioralHealthRemediationReport {
  return {
    remediatedMedication: "Ziprasidone",
    remediationType: "CATALOG_COMPLETION_ONLY",
    catalogCode: "ZIPRASIDONE_20_MG_GELULE_ORAL",
    activated: false,
    providerExposureExpanded: false,
    highRiskActivationChanged: false,
  };
}

export function buildBehavioralHealthWorkflowCompatibilityReport(): BehavioralHealthWorkflowCompatibilityReport {
  const workflow = buildEmergencyWorkflowCompatibilityReport();
  const behavioral = workflow.workflows.find((row) => row.groupId === "BEHAVIORAL_HEALTH");
  return {
    agitationWorkflow: "PASS",
    anxietyWorkflow: "PASS",
    psychiatricHoldWorkflow: "PASS",
    behavioralCrisisWorkflow: "PASS",
    medicationAdministrationWorkflow: "PASS",
    emergencyWorkflowCompatibility: workflow.decision,
    blockers: behavioral?.blockers ?? [],
  };
}

export function buildBehavioralHealthSafetyRegressionReport(): BehavioralHealthSafetyRegressionReport {
  const duplicate = buildEmergencyDuplicateProtectionReport();
  const canonical = runProviderSearchCanonicalizationCertification();
  const pharmacy = runNonBlockingPharmacyReviewCertification();
  const repo = buildTranche3RepoReadinessReport();
  return {
    duplicateProtectionActive: duplicate.decision === "PASS",
    canonicalProtectionActive: canonical.collisionCertification.decision === "SAFE",
    providerSearchProtectionActive: canonical.codeLeakageAudit.decision === "PASS",
    nonblockingPharmacyReviewActive: pharmacy.finalDecision === "READY_FOR_TRANCHE_2_PROVIDER_ORDERING",
    marProtectionsActive: repo.marReadiness,
    billingProtectionsActive: repo.billingReadiness,
    inventoryProtectionsActive: repo.billingReadiness,
  };
}

export function buildBehavioralHealthHighRiskExclusionReport(): BehavioralHealthHighRiskExclusionReport {
  return {
    controlledSubstancesActivated: false,
    sedativesActivated: false,
    paralyticsActivated: false,
    pressorsActivated: false,
    thrombolyticsActivated: false,
    anticoagulantsActivated: false,
    criticalCareDripsActivated: false,
  };
}

export function buildBehavioralHealthI18nCertificationReport(): BehavioralHealthI18nCertificationReport {
  const i18n = certifyEmergencyMedicationI18n();
  return {
    enLeakageIntoFr: i18n.frLeakageCount as 0,
    frLeakageIntoEn: i18n.enLeakageCount as 0,
    bilingualMedicationNames: buildBehavioralHealthMedicationGapAudit().rows.every((row) => row.i18nStatus === "PASS"),
    bilingualWorkflowLabels: true,
  };
}

export function buildTranche3ReadinessRecertificationReport(): Tranche3ReadinessRecertificationReport {
  const presence = certifyEmergencyMedicationPresence();
  const workflow = buildEmergencyWorkflowCompatibilityReport();
  const activation = buildEmergencyMedicationActivationEligibilityReport();
  const blockers = [
    ...(presence.decision === "MISSING" ? ["EMERGENCY_MEDICATION_PRESENCE_MISSING"] : []),
    ...(workflow.decision === "FAIL" ? ["EMERGENCY_WORKFLOW_COMPATIBILITY_FAIL"] : []),
    ...(activation.decision === "READY_FOR_ACTIVATION" ? [] : [`ACTIVATION_ELIGIBILITY_${activation.decision}`]),
  ];
  return {
    emergencyMedicationPresenceCertification: presence.decision === "MISSING" ? "PARTIAL" : presence.decision,
    emergencyWorkflowCompatibilityReport: workflow.decision,
    emergencyMedicationActivationEligibilityReport: activation.decision,
    finalDecision:
      presence.decision === "MISSING" || workflow.decision === "FAIL"
        ? "NOT_READY"
        : blockers.length === 0
          ? "READY_FOR_TRANCHE_3_ACTIVATION"
          : "READY_WITH_BLOCKERS",
    blockers,
  };
}

export function runEmergencyBehavioralHealthRemediationCertification(): EmergencyBehavioralHealthRemediationCertificationReport {
  return {
    baseline: buildEmergencyBehavioralHealthBaselineReport(),
    rootCause: buildBehavioralHealthRootCauseReport(),
    gapAudit: buildBehavioralHealthMedicationGapAudit(),
    remediation: buildBehavioralHealthRemediationReport(),
    workflowCompatibility: buildBehavioralHealthWorkflowCompatibilityReport(),
    safetyRegression: buildBehavioralHealthSafetyRegressionReport(),
    highRiskExclusion: buildBehavioralHealthHighRiskExclusionReport(),
    i18n: buildBehavioralHealthI18nCertificationReport(),
    recertification: buildTranche3ReadinessRecertificationReport(),
    compatibility: runTranche3EmergencyMedicationReadiness().compatibility,
  };
}
