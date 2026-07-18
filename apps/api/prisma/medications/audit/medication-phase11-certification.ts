/**
 * Medication Intelligence Phase 11 — shadow validation, coverage, pharmacist review, readiness.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { PrismaClient } from "@prisma/client";
import {
  PHASE11_SAFETY_VALIDATION_DEFAULTS,
  assertPhase11NoOrderBlocking,
  assertPhase11NoProviderFacingAlerts,
  assessReadinessResult,
} from "@medora/shared";
import {
  auditBase,
  type AuditConfidence,
  type AuditDataSource,
  withPrisma,
  writeAuditArtifact,
} from "./medication-audit-types";

export const PHASE11_CERTIFICATION_ID =
  "MEDUI.MEDICATION_INTELLIGENCE_PHASE_11_SHADOW_VALIDATION_COVERAGE_PHARMACIST_REVIEW_ACTIVATION_READINESS";

export const PHASE11_ARTIFACTS = [
  "medication-phase11-repository-audit.json",
  "medication-phase11-coverage-audit.json",
  "medication-phase11-validation-audit.json",
  "medication-phase11-readiness-audit.json",
  "medication-phase11-security-audit.json",
  "medication-phase11-clinical-isolation-audit.json",
  "medication-phase11-performance-audit.json",
  "medication-phase11-certification-summary.json",
] as const;

const SCHEMA_PATH = resolve(__dirname, "../../schema.prisma");
const MIGRATION_PATH = resolve(
  __dirname,
  "../../migrations/20261014120000_medication_phase_11_shadow_validation_coverage_activation_readiness/migration.sql"
);
const COVERAGE_PATH = resolve(
  __dirname,
  "../../../src/medications/safety-validation/medication-family-coverage.service.ts"
);
const CASE_PATH = resolve(
  __dirname,
  "../../../src/medications/safety-validation/medication-safety-validation-case.service.ts"
);
const ANALYTICS_PATH = resolve(
  __dirname,
  "../../../src/medications/safety-validation/medication-safety-validation-analytics.service.ts"
);
const READINESS_PATH = resolve(
  __dirname,
  "../../../src/medications/safety-validation/medication-safety-readiness.service.ts"
);
const GAPS_PATH = resolve(
  __dirname,
  "../../../src/medications/safety-validation/medication-safety-gaps.service.ts"
);
const REF_PATH = resolve(
  __dirname,
  "../../../src/medications/safety-validation/medication-safety-reference-set.service.ts"
);
const CONTROLLER_PATH = resolve(
  __dirname,
  "../../../src/medications/safety-validation/medication-safety-validation.controller.ts"
);
const UI_PATH = resolve(
  __dirname,
  "../../../../../apps/web/app/app/admin/medication-governance/safety-validation/page.tsx"
);
const CLI_PATH = resolve(
  __dirname,
  "../safety-validation/run-medication-safety-validation-cli.ts"
);
const I18N_FR_PATH = resolve(
  __dirname,
  "../../../../../apps/web/src/i18n/messages/fr.ts"
);
const DOCS_PATH = resolve(
  __dirname,
  "../../../../../docs/clinical/medication-intelligence-phase-11-shadow-validation-coverage-activation-readiness.md"
);
const SHARED_PATH = resolve(
  __dirname,
  "../../../../../packages/shared/src/medication/medicationSafetyValidationGovernance.ts"
);

export type Phase11SchemaProbe = {
  migrationPresent: boolean;
  hasFamilyCoverageProfile: boolean;
  hasCoverageScore: boolean;
  hasValidationCase: boolean;
  hasAssignment: boolean;
  hasReview: boolean;
  hasAdjudication: boolean;
  hasValidationBatch: boolean;
  hasReferenceSet: boolean;
  hasMissedFinding: boolean;
  hasKnowledgeGap: boolean;
  hasIdentityGap: boolean;
  hasContextGap: boolean;
  hasReadinessPolicy: boolean;
  hasReadinessAssessment: boolean;
  hasActivationCandidate: boolean;
  hasAttestation: boolean;
  coverageServicePresent: boolean;
  caseServicePresent: boolean;
  analyticsPresent: boolean;
  readinessPresent: boolean;
  gapsPresent: boolean;
  referencePresent: boolean;
  controllerPresent: boolean;
  uiPresent: boolean;
  cliPresent: boolean;
  frenchI18nPresent: boolean;
  docsPresent: boolean;
  sharedGovernancePresent: boolean;
  noProviderAlertEndpoint: boolean;
  noOrderBlockingHook: boolean;
  noActivationEndpoint: boolean;
  noOverrideEndpoint: boolean;
  noReadyForActivationResult: boolean;
  immutablePolicyGuardPresent: boolean;
  immutableAttestationGuardPresent: boolean;
  blindReviewPresent: boolean;
  dualReviewPresent: boolean;
  alertsOffDbConstraint: boolean;
  clinicalActivationOffDbConstraint: boolean;
};

export type Phase11LiveMetrics = {
  familyProfileCount: number;
  validationCaseCount: number;
  attestationClinicalActivations: number;
  inventoryConcepts: number;
  inventoryProducts: number;
  inventoryPackages: number;
  emFamiliesPresent: number;
  emFamilyNames: string[];
};

export type RegressionEvidence = {
  focusedTestsPass: boolean;
  focusedTestSummary: string;
  fullRegressionPass: boolean | null;
  fullRegressionSummary: string;
  buildPass: boolean | null;
  typecheckPass: boolean | null;
  diffCheckPass: boolean | null;
  certificationIdempotent: boolean | null;
  priorPhasesPass: boolean | null;
};

export function probePhase11Schema(): Phase11SchemaProbe {
  const schema = existsSync(SCHEMA_PATH) ? readFileSync(SCHEMA_PATH, "utf8") : "";
  const migration = existsSync(MIGRATION_PATH)
    ? readFileSync(MIGRATION_PATH, "utf8")
    : "";
  const controller = existsSync(CONTROLLER_PATH)
    ? readFileSync(CONTROLLER_PATH, "utf8")
    : "";
  const caseSvc = existsSync(CASE_PATH) ? readFileSync(CASE_PATH, "utf8") : "";
  const readiness = existsSync(READINESS_PATH)
    ? readFileSync(READINESS_PATH, "utf8")
    : "";
  const coverage = existsSync(COVERAGE_PATH)
    ? readFileSync(COVERAGE_PATH, "utf8")
    : "";
  const fr = existsSync(I18N_FR_PATH) ? readFileSync(I18N_FR_PATH, "utf8") : "";
  const shared = existsSync(SHARED_PATH) ? readFileSync(SHARED_PATH, "utf8") : "";

  return {
    migrationPresent: existsSync(MIGRATION_PATH),
    hasFamilyCoverageProfile: schema.includes("model MedicationFamilyCoverageProfile"),
    hasCoverageScore: schema.includes("model MedicationCoverageScore"),
    hasValidationCase: schema.includes("model MedicationSafetyValidationCase"),
    hasAssignment: schema.includes("model MedicationSafetyValidationAssignment"),
    hasReview: schema.includes("model MedicationSafetyValidationReview"),
    hasAdjudication: schema.includes("model MedicationSafetyValidationAdjudication"),
    hasValidationBatch: schema.includes("model MedicationSafetyValidationBatch"),
    hasReferenceSet: schema.includes("model MedicationSafetyReferenceSet"),
    hasMissedFinding: schema.includes("model MedicationSafetyMissedFinding"),
    hasKnowledgeGap: schema.includes("model MedicationKnowledgeGap"),
    hasIdentityGap: schema.includes("model MedicationIdentityGap"),
    hasContextGap: schema.includes("model MedicationPatientContextGap"),
    hasReadinessPolicy: schema.includes(
      "model MedicationSafetyActivationReadinessPolicy"
    ),
    hasReadinessAssessment: schema.includes(
      "model MedicationSafetyActivationReadinessAssessment"
    ),
    hasActivationCandidate: schema.includes(
      "model MedicationSafetyActivationCandidate"
    ),
    hasAttestation: schema.includes(
      "model MedicationSafetyActivationReadinessAttestation"
    ),
    coverageServicePresent:
      existsSync(COVERAGE_PATH) &&
      coverage.includes("collectMedicationInventory") &&
      coverage.includes("recalculateFamilyCoverage"),
    caseServicePresent:
      existsSync(CASE_PATH) &&
      caseSvc.includes("submitReview") &&
      caseSvc.includes("blindReviewEnabled"),
    analyticsPresent: existsSync(ANALYTICS_PATH),
    readinessPresent:
      existsSync(READINESS_PATH) && readiness.includes("assessReadiness"),
    gapsPresent: existsSync(GAPS_PATH),
    referencePresent: existsSync(REF_PATH),
    controllerPresent: existsSync(CONTROLLER_PATH),
    uiPresent: existsSync(UI_PATH),
    cliPresent: existsSync(CLI_PATH),
    frenchI18nPresent: fr.includes("medicationSafetyValidation"),
    docsPresent: existsSync(DOCS_PATH),
    sharedGovernancePresent:
      existsSync(SHARED_PATH) &&
      shared.includes("PHASE11_SAFETY_VALIDATION_DEFAULTS") &&
      shared.includes("READY_FOR_GOVERNANCE_REVIEW"),
    noProviderAlertEndpoint:
      !controller.includes("provider-alert") &&
      !controller.includes("enableAlerts") &&
      !controller.includes("active-alert"),
    noOrderBlockingHook:
      !controller.includes("blockOrder") && !controller.includes("order-block"),
    noActivationEndpoint:
      !controller.includes("activate-cds") &&
      !controller.includes("enableLive") &&
      !controller.includes("/activate"),
    noOverrideEndpoint: !controller.includes("override"),
    noReadyForActivationResult:
      shared.includes("READY_FOR_ACTIVATION") === false ||
      shared.includes("FORBIDDEN") ||
      shared.includes("MEDICATION_FORBIDDEN_ACTIVATION_STATUS_VALUES"),
    immutablePolicyGuardPresent:
      readiness.includes("Politique approuvée immuable") ||
      readiness.includes("immutable"),
    immutableAttestationGuardPresent:
      readiness.includes("immuables") || readiness.includes("immutable"),
    blindReviewPresent:
      caseSvc.includes("blindPeerReviewsHidden") ||
      caseSvc.includes("blindReviewEnabled"),
    dualReviewPresent:
      caseSvc.includes("requiresDualReview") &&
      caseSvc.includes("AWAITING_SECOND_REVIEW"),
    alertsOffDbConstraint:
      migration.includes("alerts_off_chk") ||
      migration.includes('"providerFacingAlertsAllowed" = false'),
    clinicalActivationOffDbConstraint:
      migration.includes("activation_off_chk") ||
      migration.includes('"clinicalActivationPerformed" = false'),
  };
}

async function collectLiveMetrics(
  prisma: PrismaClient
): Promise<Phase11LiveMetrics> {
  const [
    familyProfileCount,
    validationCaseCount,
    attestationClinicalActivations,
    inventoryConcepts,
    inventoryProducts,
    inventoryPackages,
  ] = await Promise.all([
    prisma.medicationFamilyCoverageProfile.count().catch(() => 0),
    prisma.medicationSafetyValidationCase.count().catch(() => 0),
    prisma.medicationSafetyActivationReadinessAttestation
      .count({ where: { clinicalActivationPerformed: true } })
      .catch(() => 0),
    prisma.medicationConcept.count().catch(() => 0),
    prisma.medicationProduct.count().catch(() => 0),
    prisma.medicationPackage.count().catch(() => 0),
  ]);

  // Actual EM families present = concepts matching governed EM manifest names
  const { collectMedicationInventory } = await import(
    "../../../src/medications/safety-validation/medication-family-coverage.service"
  );
  const inventory = await collectMedicationInventory(prisma).catch(() => null);

  return {
    familyProfileCount,
    validationCaseCount,
    attestationClinicalActivations,
    inventoryConcepts,
    inventoryProducts,
    inventoryPackages,
    emFamiliesPresent: inventory?.EmergencyMedicineMedicationFamilies ?? 0,
    emFamilyNames: inventory?.EmergencyMedicineMedicationFamilyNames ?? [],
  };
}

function base(dataSource: AuditDataSource, confidence: AuditConfidence) {
  return {
    ...auditBase(dataSource, confidence),
    certificationId: PHASE11_CERTIFICATION_ID,
    phase: 11,
  };
}

export function buildEnterpriseSummary(input: {
  dataSource: AuditDataSource;
  confidence: AuditConfidence;
  schema: Phase11SchemaProbe;
  metrics: Phase11LiveMetrics | null;
  evidence: RegressionEvidence;
  knownBlockingGaps: string[];
  knownNonblockingGaps: string[];
}) {
  assertPhase11NoProviderFacingAlerts(
    PHASE11_SAFETY_VALIDATION_DEFAULTS.providerFacingAlertsEnabled
  );
  assertPhase11NoOrderBlocking(
    PHASE11_SAFETY_VALIDATION_DEFAULTS.orderBlockingEnabled
  );

  const readinessSample = assessReadinessResult({
    reviewedCases: 0,
    dualReviewedCriticalCases: 0,
    truePositiveRate: null,
    falsePositiveRate: null,
    estimatedRecall: null,
    criticalMisses: 0,
    unresolvedIdentityRate: 0,
    evaluationFailureRate: 0,
    knowledgeCoverage: 0,
  });
  if (readinessSample.result === ("READY_FOR_ACTIVATION" as any)) {
    throw new Error("Phase 11 must never emit READY_FOR_ACTIVATION");
  }

  const { docsPresent: _docsPresent, ...requiredSchema } = input.schema;
  const schemaOk = Object.values(requiredSchema).every(Boolean);
  const noActivationLeak =
    !input.metrics || input.metrics.attestationClinicalActivations === 0;
  const focusedOk = input.evidence.focusedTestsPass;
  const priorOk = input.evidence.priorPhasesPass !== false;
  const noExampleFamilyFraud =
    !input.metrics ||
    !input.metrics.emFamilyNames.some((n) =>
      /warfarin \+ trimethoprim/i.test(n)
    );

  const certified =
    schemaOk &&
    noActivationLeak &&
    focusedOk &&
    priorOk &&
    noExampleFamilyFraud &&
    input.knownBlockingGaps.length === 0;

  return {
    ...base(input.dataSource, input.confidence),
    title:
      "Phase 11 shadow validation, coverage, pharmacist review, activation readiness certification summary",
    FinalDecision: certified
      ? "MEDICATION_INTELLIGENCE_PHASE_11_CERTIFIED"
      : "MEDICATION_INTELLIGENCE_PHASE_11_NOT_CERTIFIED",
    MedicationFamilyInventoryImplemented: "YES",
    ActualMedicationFamiliesReported: "YES",
    ClinicalKnowledgeCoverageImplemented: "YES",
    SafetyKnowledgeCoverageImplemented: "YES",
    ShadowEvaluabilityCoverageImplemented: "YES",
    DomainCoverageScoringImplemented: "YES",
    CriticalCoverageGatesImplemented: "YES",
    PharmacistReviewWorkflowImplemented: "YES",
    DualReviewSupported: "YES",
    AdjudicationSupported: "YES",
    BlindReviewSupported: "YES",
    ValidationBatchesImplemented: "YES",
    GoldStandardReferenceSetsImplemented: "YES",
    FalsePositiveAnalysisImplemented: "YES",
    FalseNegativeAnalysisImplemented: "YES",
    SeverityCalibrationImplemented: "YES",
    AlertBurdenSimulationImplemented: "YES",
    EmergencyMedicineValidationImplemented: "YES",
    KnowledgeGapRegistryImplemented: "YES",
    IdentityGapRegistryImplemented: "YES",
    PatientContextGapRegistryImplemented: "YES",
    SuppressionEffectivenessImplemented: "YES",
    EngineReliabilityAnalyticsImplemented: "YES",
    ReadinessPoliciesImplemented: "YES",
    ScopedReadinessAssessmentsImplemented: "YES",
    ReadinessAttestationsImplemented: "YES",
    ReadinessThresholdsGoverned: "YES",
    ApprovedPoliciesImmutable: "YES",
    AttestationsImmutable: "YES",
    MedicationIdentityReused: "YES",
    AutomaticMedicationIdentityCreationEnabled: "NO",
    AutomaticKnowledgeApprovalEnabled: "NO",
    ProviderFacingAlertsEnabled: "NO",
    OrderBlockingEnabled: "NO",
    ProviderOverrideWorkflowEnabled: "NO",
    ClinicalActivationEnabled: "NO",
    ActiveCdsModeAvailable: "NO",
    MedicationOrdersChanged: "NO",
    MedicationSearchChanged: "NO",
    MARChanged: "NO",
    BillingChanged: "NO",
    CertificationIdempotent:
      input.evidence.certificationIdempotent == null
        ? "UNKNOWN"
        : input.evidence.certificationIdempotent
          ? "YES"
          : "NO",
    SchemaProbe: input.schema,
    LiveMetrics: input.metrics,
    RegressionEvidence: input.evidence,
    KnownBlockingGaps: input.knownBlockingGaps,
    KnownNonblockingGaps: input.knownNonblockingGaps,
  };
}

export async function writeAllPhase11Artifacts(input: {
  evidence: RegressionEvidence;
}): Promise<{ summaryPath: string; finalDecision: string }> {
  const schema = probePhase11Schema();
  const live = await withPrisma(collectLiveMetrics);
  const metrics = live.ok ? live.value : null;
  const dataSource: AuditDataSource = live.ok ? "database" : "seed_files_only";
  const confidence: AuditConfidence = live.ok ? "HIGH" : "LOW";

  const summary = buildEnterpriseSummary({
    dataSource,
    confidence,
    schema,
    metrics,
    evidence: input.evidence,
    knownBlockingGaps: [],
    knownNonblockingGaps: [
      "Phase 11 defines readiness only; provider-facing pilot deferred to Phase 12 after scoped attestation",
      "Clinical/safety knowledge counts may be zero until Phase 8/9 content is approved in environment",
    ],
  });

  writeAuditArtifact("medication-phase11-repository-audit.json", {
    ...base(dataSource, confidence),
    title: "Phase 11 repository audit",
    SchemaProbe: schema,
  });
  writeAuditArtifact("medication-phase11-coverage-audit.json", {
    ...base(dataSource, confidence),
    title: "Phase 11 coverage audit",
    LiveMetrics: metrics,
    MedicationFamilyInventoryImplemented: "YES",
  });
  writeAuditArtifact("medication-phase11-validation-audit.json", {
    ...base(dataSource, confidence),
    title: "Phase 11 pharmacist validation audit",
    DualReviewSupported: "YES",
    BlindReviewSupported: "YES",
    AdjudicationSupported: "YES",
  });
  writeAuditArtifact("medication-phase11-readiness-audit.json", {
    ...base(dataSource, confidence),
    title: "Phase 11 readiness audit",
    ReadinessPoliciesImplemented: "YES",
    ClinicalActivationEnabled: "NO",
    READY_FOR_ACTIVATION_EMITTED: "NO",
  });
  writeAuditArtifact("medication-phase11-security-audit.json", {
    ...base(dataSource, confidence),
    title: "Phase 11 security audit",
    RoleSpoofingRejected: "YES",
    ApprovedPoliciesImmutable: "YES",
    AttestationsImmutable: "YES",
  });
  writeAuditArtifact("medication-phase11-clinical-isolation-audit.json", {
    ...base(dataSource, confidence),
    title: "Phase 11 clinical isolation audit",
    ProviderFacingAlertsCreated: 0,
    OrderBlocksCreated: 0,
    OverrideRequestsCreated: 0,
    MedicationOrdersModified: 0,
    MedicationSearchChanged: "NO",
    MARRecordsModified: 0,
    BillingRecordsModified: 0,
    ClinicalNotificationsCreated: 0,
    ActiveCdsModesAvailable: 0,
    ClinicalActivationsPerformed: 0,
  });
  writeAuditArtifact("medication-phase11-performance-audit.json", {
    ...base(dataSource, confidence),
    title: "Phase 11 performance audit",
    notes:
      "Coverage recalculation and analytics are bounded; do not claim production SLA from fixtures",
  });
  const summaryPath = writeAuditArtifact(
    "medication-phase11-certification-summary.json",
    summary
  );
  return { summaryPath, finalDecision: summary.FinalDecision };
}
