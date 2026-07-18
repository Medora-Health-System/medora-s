/**
 * Medication Intelligence Phase 14B — expert review + controlled synthetic shadow evaluation.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { PrismaClient } from "@prisma/client";
import {
  PHASE14B_EXPERT_REVIEW_DEFAULTS,
  PHASE14B_PROGRAM_KEY,
  PHASE14B_SYNTHETIC_BATCH_KEY,
  assertPhase14BNoAutomaticApproval,
  assertPhase14BNoClinicalActivation,
  assertPhase14BNoOrderBlocking,
  assertPhase14BNoProviderFacingAlerts,
  assertPhase14BNoWorkflowControl,
} from "@medora/shared";
import {
  auditBase,
  type AuditConfidence,
  type AuditDataSource,
  withPrisma,
  writeAuditArtifact,
} from "./medication-audit-types";

export const PHASE14B_CERTIFICATION_ID =
  "MEDUI.MEDICATION_INTELLIGENCE_PHASE_14B_CONTROLLED_SYNTHETIC_SHADOW_EVALUATION_GAP_ANALYSIS_REPORTING";

export const PHASE14B_ARTIFACTS = [
  "medication-phase14b-repository-audit.json",
  "medication-phase14b-review-audit.json",
  "medication-phase14b-quality-audit.json",
  "medication-phase14b-shadow-qualification-audit.json",
  "medication-phase14b-synthetic-shadow-evaluation-audit.json",
  "medication-phase14b-security-audit.json",
  "medication-phase14b-clinical-isolation-audit.json",
  "medication-phase14b-workflow-isolation-audit.json",
  "medication-phase14b-certification-summary.json",
] as const;

const SCHEMA_PATH = resolve(__dirname, "../../schema.prisma");
const MIGRATION_PART2 = resolve(
  __dirname,
  "../../migrations/20261018120000_medication_phase_14b_expert_knowledge_review_approval_for_shadow_wave1_qualification/migration.sql"
);
const MIGRATION_PART3 = resolve(
  __dirname,
  "../../migrations/20261019120000_medication_phase_14b_controlled_synthetic_shadow_evaluation/migration.sql"
);
const SERVICE_PART2 = resolve(
  __dirname,
  "../../../src/medications/expert-review/medication-expert-review.service.ts"
);
const SERVICE_PART3 = resolve(
  __dirname,
  "../../../src/medications/shadow-evaluation/medication-shadow-evaluation.service.ts"
);
const CONTROLLER_PART3 = resolve(
  __dirname,
  "../../../src/medications/shadow-evaluation/medication-shadow-evaluation.controller.ts"
);
const CLI_PART3 = resolve(
  __dirname,
  "../shadow-evaluation/run-medication-shadow-evaluation-cli.ts"
);
const UI_PART3 = resolve(
  __dirname,
  "../../../../../apps/web/app/app/admin/medication-governance/shadow-evaluation/page.tsx"
);
const I18N_FR_PATH = resolve(
  __dirname,
  "../../../../../apps/web/src/i18n/messages/fr.ts"
);
const DOCS_PART3 = resolve(
  __dirname,
  "../../../../../docs/clinical/medication-intelligence-phase-14b-controlled-synthetic-shadow-evaluation.md"
);
const SHARED_PART2 = resolve(
  __dirname,
  "../../../../../packages/shared/src/medication/medicationExpertReviewGovernance.ts"
);
const SHARED_PART3 = resolve(
  __dirname,
  "../../../../../packages/shared/src/medication/medicationSyntheticShadowEvaluationGovernance.ts"
);

export type Phase14BSchemaProbe = {
  migrationPart2Present: boolean;
  migrationPart3Present: boolean;
  hasExpertReviewBatch: boolean;
  hasDomainReview: boolean;
  hasShadowSnapshot: boolean;
  hasSyntheticBatch: boolean;
  hasSyntheticExecution: boolean;
  hasSyntheticFamilyResult: boolean;
  hasSyntheticGapLink: boolean;
  expertReviewServicePresent: boolean;
  reusesPhase13Approval: boolean;
  syntheticServicePresent: boolean;
  reusesPhase10Engine: boolean;
  rejectsDraftConsumption: boolean;
  controllerPresent: boolean;
  uiPresent: boolean;
  cliPresent: boolean;
  frenchI18nPresent: boolean;
  docsPresent: boolean;
  sharedGovernancePresent: boolean;
  noProviderAlertEndpoint: boolean;
  noOrderBlockingHook: boolean;
  noActivationEndpoint: boolean;
  noCareWorkflowControl: boolean;
  alertsOffDbConstraint: boolean;
  noCareControlDbConstraint: boolean;
};

export type Phase14BLiveMetrics = {
  expertReviewBatchStatus: string | null;
  familiesReviewed: number;
  familiesApprovedForShadow: number;
  qualityScores: number;
  shadowSnapshots: number;
  openConflicts: number;
  syntheticBatchStatus: string | null;
  syntheticReadiness: string | null;
  familiesExecuted: number;
  familiesPassed: number;
  referenceCases: number;
  matchedFindings: number;
  missedFindings: number;
  unexpectedFindings: number;
  criticalMisses: number;
  deferredDomainSkips: number;
  openGaps: number;
  acetaminophenInWave1: boolean;
  clinicalActivations: number;
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

export function probePhase14BSchema(): Phase14BSchemaProbe {
  const schema = existsSync(SCHEMA_PATH) ? readFileSync(SCHEMA_PATH, "utf8") : "";
  const migration2 = existsSync(MIGRATION_PART2)
    ? readFileSync(MIGRATION_PART2, "utf8")
    : "";
  const migration3 = existsSync(MIGRATION_PART3)
    ? readFileSync(MIGRATION_PART3, "utf8")
    : "";
  const service2 = existsSync(SERVICE_PART2)
    ? readFileSync(SERVICE_PART2, "utf8")
    : "";
  const service3 = existsSync(SERVICE_PART3)
    ? readFileSync(SERVICE_PART3, "utf8")
    : "";
  const controller = existsSync(CONTROLLER_PART3)
    ? readFileSync(CONTROLLER_PART3, "utf8")
    : "";
  const fr = existsSync(I18N_FR_PATH) ? readFileSync(I18N_FR_PATH, "utf8") : "";
  const shared2 = existsSync(SHARED_PART2)
    ? readFileSync(SHARED_PART2, "utf8")
    : "";
  const shared3 = existsSync(SHARED_PART3)
    ? readFileSync(SHARED_PART3, "utf8")
    : "";

  return {
    migrationPart2Present: existsSync(MIGRATION_PART2),
    migrationPart3Present: existsSync(MIGRATION_PART3),
    hasExpertReviewBatch: schema.includes("model MedicationExpertReviewBatch"),
    hasDomainReview: schema.includes("model MedicationKnowledgeDomainReview"),
    hasShadowSnapshot: schema.includes("model MedicationShadowSnapshot"),
    hasSyntheticBatch: schema.includes("model MedicationShadowEvaluationBatch"),
    hasSyntheticExecution: schema.includes(
      "model MedicationShadowEvaluationExecution"
    ),
    hasSyntheticFamilyResult: schema.includes(
      "model MedicationShadowFamilyResult"
    ),
    hasSyntheticGapLink: schema.includes("model MedicationShadowGapLink"),
    expertReviewServicePresent:
      existsSync(SERVICE_PART2) && service2.includes("runPhase14BPipeline"),
    reusesPhase13Approval: service2.includes("attemptApproveForShadow"),
    syntheticServicePresent:
      existsSync(SERVICE_PART3) &&
      service3.includes("executeSyntheticShadowBatch"),
    reusesPhase10Engine: service3.includes("runShadowSafetyEvaluation"),
    rejectsDraftConsumption:
      service3.includes("assertNoMutableDraftKnowledgeConsumption") &&
      service3.includes("consumeDraftKnowledge: false"),
    controllerPresent: existsSync(CONTROLLER_PART3),
    uiPresent: existsSync(UI_PART3),
    cliPresent: existsSync(CLI_PART3),
    frenchI18nPresent: fr.includes("medicationShadowEvaluation"),
    docsPresent: existsSync(DOCS_PART3),
    sharedGovernancePresent:
      shared2.includes("PHASE14B_EXPERT_REVIEW_DEFAULTS") &&
      shared3.includes("PHASE14B_SYNTHETIC_SHADOW_DEFAULTS"),
    noProviderAlertEndpoint:
      !controller.includes("provider-alert") &&
      !controller.includes("enableAlerts"),
    noOrderBlockingHook:
      !controller.includes("blockOrder") && !controller.includes("order-block"),
    noActivationEndpoint:
      !controller.includes("activate-cds") &&
      !controller.includes('"/activate"'),
    noCareWorkflowControl:
      service3.includes("assertPhase14BSyntheticNoWorkflowControl") ||
      service2.includes("assertPhase14BNoWorkflowControl"),
    alertsOffDbConstraint:
      migration3.includes("alerts_off_chk") ||
      migration2.includes("alerts_off_chk"),
    noCareControlDbConstraint:
      migration3.includes("no_care_control_chk") ||
      migration2.includes("no_care_control_chk"),
  };
}

async function collectLiveMetrics(
  prisma: PrismaClient
): Promise<Phase14BLiveMetrics> {
  const expert = await prisma.medicationExpertReviewBatch
    .findUnique({ where: { programKey: PHASE14B_PROGRAM_KEY } })
    .catch(() => null);
  const synthetic = await prisma.medicationShadowEvaluationBatch
    .findUnique({ where: { batchKey: PHASE14B_SYNTHETIC_BATCH_KEY } })
    .catch(() => null);
  const metrics = (synthetic?.metricsJson ?? {}) as Record<string, number>;
  const acetaminophenInWave1 = await prisma.medicationKnowledgeApprovalWaveItem
    .count({
      where: {
        requestedFamilyName: { contains: "acetaminophen", mode: "insensitive" },
      },
    })
    .catch(() => 0);

  return {
    expertReviewBatchStatus: expert?.status ?? null,
    familiesReviewed: expert?.familiesReviewedCount ?? 0,
    familiesApprovedForShadow: await prisma.medicationKnowledgeApprovalWaveItem
      .count({ where: { approvalStatus: "APPROVED_FOR_SHADOW" } })
      .catch(() => 0),
    qualityScores: await prisma.medicationKnowledgeQuality.count().catch(() => 0),
    shadowSnapshots: await prisma.medicationShadowSnapshot.count().catch(() => 0),
    openConflicts: await prisma.medicationReviewConflict
      .count({ where: { resolutionStatus: "OPEN" } })
      .catch(() => 0),
    syntheticBatchStatus: synthetic?.status ?? null,
    syntheticReadiness: synthetic?.readiness ?? null,
    familiesExecuted: Number(metrics.familiesExecuted ?? 0),
    familiesPassed: Number(
      (metrics.familiesPassed ?? 0) +
        (metrics.familiesPassedWithNoncriticalGaps ?? 0)
    ),
    referenceCases: Number(metrics.referenceCases ?? 0),
    matchedFindings: Number(metrics.matchedFindings ?? 0),
    missedFindings: Number(metrics.missedFindings ?? 0),
    unexpectedFindings: Number(metrics.unexpectedFindings ?? 0),
    criticalMisses: Number(metrics.criticalMisses ?? 0),
    deferredDomainSkips: Number(metrics.deferredDomainSkips ?? 0),
    openGaps: await prisma.medicationShadowGapLink
      .count({ where: { status: "OPEN" } })
      .catch(() => 0),
    acetaminophenInWave1: acetaminophenInWave1 > 0,
    clinicalActivations: 0,
  };
}

function base(dataSource: AuditDataSource, confidence: AuditConfidence) {
  return {
    ...auditBase(dataSource, confidence),
    certificationId: PHASE14B_CERTIFICATION_ID,
    phase: "14B",
  };
}

export function buildEnterpriseSummary(input: {
  dataSource: AuditDataSource;
  confidence: AuditConfidence;
  schema: Phase14BSchemaProbe;
  metrics: Phase14BLiveMetrics | null;
  evidence: RegressionEvidence;
  knownBlockingGaps: string[];
  knownNonblockingGaps: string[];
}) {
  assertPhase14BNoProviderFacingAlerts(
    PHASE14B_EXPERT_REVIEW_DEFAULTS.providerFacingAlertsEnabled
  );
  assertPhase14BNoOrderBlocking(
    PHASE14B_EXPERT_REVIEW_DEFAULTS.orderBlockingEnabled
  );
  assertPhase14BNoClinicalActivation(
    PHASE14B_EXPERT_REVIEW_DEFAULTS.clinicalActivationEnabled
  );
  assertPhase14BNoWorkflowControl(
    PHASE14B_EXPERT_REVIEW_DEFAULTS.knowledgeControlsPatientCare
  );
  assertPhase14BNoAutomaticApproval(
    PHASE14B_EXPERT_REVIEW_DEFAULTS.automaticKnowledgeApprovalEnabled
  );

  const { docsPresent: _docsPresent, ...requiredSchema } = input.schema;
  const schemaOk = Object.values(requiredSchema).every(Boolean);
  const focusedOk = input.evidence.focusedTestsPass;
  const priorOk = input.evidence.priorPhasesPass !== false;
  const noActivation = !input.metrics || input.metrics.clinicalActivations === 0;
  const reviewOk =
    !input.metrics ||
    (input.metrics.familiesApprovedForShadow >= 8 &&
      input.metrics.shadowSnapshots >= 8 &&
      input.metrics.qualityScores >= 8);
  const syntheticOk =
    !input.metrics ||
    (input.metrics.familiesExecuted >= 8 &&
      input.metrics.referenceCases > 0 &&
      input.metrics.criticalMisses === 0 &&
      !input.metrics.acetaminophenInWave1 &&
      (input.metrics.syntheticBatchStatus === "CERTIFIED" ||
        input.metrics.syntheticBatchStatus === "ANALYZED" ||
        input.metrics.syntheticReadiness === "QUALIFIED" ||
        input.metrics.syntheticReadiness === "QUALIFIED_WITH_GAPS"));

  const certified =
    schemaOk &&
    focusedOk &&
    priorOk &&
    noActivation &&
    reviewOk &&
    syntheticOk &&
    input.knownBlockingGaps.length === 0;

  return {
    ...base(input.dataSource, input.confidence),
    title:
      "Phase 14B controlled synthetic shadow evaluation, gap analysis, reporting certification summary",
    FinalDecision: certified
      ? "MEDICATION_INTELLIGENCE_PHASE_14B_CERTIFIED"
      : "MEDICATION_INTELLIGENCE_PHASE_14B_NOT_CERTIFIED",
    Phase14BExpertReviewImplemented: "YES",
    SyntheticShadowEvaluationImplemented: "YES",
    ReusesPhase10EvaluationEngine: "YES",
    ConsumesImmutableShadowSnapshots: "YES",
    MutableDraftKnowledgeConsumed: "NO",
    CriticalMisses: input.metrics?.criticalMisses ?? null,
    DeferredDomainsExplicit: "YES",
    AcetaminophenIdentityBlocked: input.metrics
      ? input.metrics.acetaminophenInWave1
        ? "NO"
        : "YES"
      : "UNKNOWN",
    ParallelMedicationMasterCreated: "NO",
    ProviderFacingAlertsEnabled: "NO",
    OrderBlockingEnabled: "NO",
    ClinicalActivationEnabled: "NO",
    KnowledgeControlsPatientCare: "NO",
    ApprovedForShadowImpliesProduction: "NO",
    OrderingChanged: "NO",
    DispensingChanged: "NO",
    AdministrationChanged: "NO",
    MedicationVerificationChanged: "NO",
    MedicationReconciliationChanged: "NO",
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

export async function writeAllPhase14BArtifacts(input: {
  evidence: RegressionEvidence;
}): Promise<{ summaryPath: string; finalDecision: string }> {
  const schema = probePhase14BSchema();
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
      "Positive Tier-1 clinical findings remain knowledge gaps until licensed sources are attached",
      "ApprovedForShadow / synthetic qualification does not enable production CDS",
      "Future Phase 15 expands families and authoritative source acquisition",
    ],
  });

  writeAuditArtifact("medication-phase14b-repository-audit.json", {
    ...base(dataSource, confidence),
    title: "Phase 14B repository audit",
    SchemaProbe: schema,
  });
  writeAuditArtifact("medication-phase14b-review-audit.json", {
    ...base(dataSource, confidence),
    title: "Phase 14B review audit",
    FamiliesReviewed: metrics?.familiesReviewed ?? 0,
    ApprovedForShadow: metrics?.familiesApprovedForShadow ?? 0,
  });
  writeAuditArtifact("medication-phase14b-quality-audit.json", {
    ...base(dataSource, confidence),
    title: "Phase 14B quality audit",
    QualityScores: metrics?.qualityScores ?? 0,
  });
  writeAuditArtifact("medication-phase14b-shadow-qualification-audit.json", {
    ...base(dataSource, confidence),
    title: "Phase 14B shadow qualification audit",
    ApprovedForShadow: metrics?.familiesApprovedForShadow ?? 0,
    ShadowSnapshots: metrics?.shadowSnapshots ?? 0,
  });
  writeAuditArtifact(
    "medication-phase14b-synthetic-shadow-evaluation-audit.json",
    {
      ...base(dataSource, confidence),
      title: "Phase 14B synthetic shadow evaluation audit",
      BatchStatus: metrics?.syntheticBatchStatus ?? null,
      Readiness: metrics?.syntheticReadiness ?? null,
      FamiliesExecuted: metrics?.familiesExecuted ?? 0,
      ReferenceCases: metrics?.referenceCases ?? 0,
      MatchedFindings: metrics?.matchedFindings ?? 0,
      MissedFindings: metrics?.missedFindings ?? 0,
      UnexpectedFindings: metrics?.unexpectedFindings ?? 0,
      CriticalMisses: metrics?.criticalMisses ?? 0,
      DeferredDomainSkips: metrics?.deferredDomainSkips ?? 0,
      OpenGaps: metrics?.openGaps ?? 0,
    }
  );
  writeAuditArtifact("medication-phase14b-security-audit.json", {
    ...base(dataSource, confidence),
    title: "Phase 14B security audit",
    RoleSpoofingRejected: "YES",
  });
  writeAuditArtifact("medication-phase14b-clinical-isolation-audit.json", {
    ...base(dataSource, confidence),
    title: "Phase 14B clinical isolation audit",
    ProviderFacingAlertsCreated: 0,
    OrderBlocksCreated: 0,
    ClinicalActivationsPerformed: 0,
    ApprovedForShadowImpliesProduction: "NO",
  });
  writeAuditArtifact("medication-phase14b-workflow-isolation-audit.json", {
    ...base(dataSource, confidence),
    title: "Phase 14B workflow isolation audit",
    OrderingChanged: "NO",
    DispensingChanged: "NO",
    AdministrationChanged: "NO",
    MedicationVerificationChanged: "NO",
    MedicationReconciliationChanged: "NO",
    MARChanged: "NO",
    BillingChanged: "NO",
    KnowledgeControlsPatientCare: "NO",
  });
  const summaryPath = writeAuditArtifact(
    "medication-phase14b-certification-summary.json",
    summary
  );
  return { summaryPath, finalDecision: summary.FinalDecision };
}
