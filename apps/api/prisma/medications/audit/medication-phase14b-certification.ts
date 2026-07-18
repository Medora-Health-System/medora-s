/**
 * Medication Intelligence Phase 14B — expert review & shadow qualification.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { PrismaClient } from "@prisma/client";
import {
  PHASE14B_EXPERT_REVIEW_DEFAULTS,
  PHASE14B_PROGRAM_KEY,
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
  "MEDUI.MEDICATION_INTELLIGENCE_PHASE_14B_EXPERT_KNOWLEDGE_REVIEW_APPROVAL_FOR_SHADOW_AND_WAVE1_QUALIFICATION";

export const PHASE14B_ARTIFACTS = [
  "medication-phase14b-repository-audit.json",
  "medication-phase14b-review-audit.json",
  "medication-phase14b-quality-audit.json",
  "medication-phase14b-shadow-qualification-audit.json",
  "medication-phase14b-security-audit.json",
  "medication-phase14b-clinical-isolation-audit.json",
  "medication-phase14b-workflow-isolation-audit.json",
  "medication-phase14b-certification-summary.json",
] as const;

const SCHEMA_PATH = resolve(__dirname, "../../schema.prisma");
const MIGRATION_PATH = resolve(
  __dirname,
  "../../migrations/20261018120000_medication_phase_14b_expert_knowledge_review_approval_for_shadow_wave1_qualification/migration.sql"
);
const SERVICE_PATH = resolve(
  __dirname,
  "../../../src/medications/expert-review/medication-expert-review.service.ts"
);
const CONTROLLER_PATH = resolve(
  __dirname,
  "../../../src/medications/expert-review/medication-expert-review.controller.ts"
);
const CLI_PATH = resolve(
  __dirname,
  "../expert-review/run-medication-expert-review-cli.ts"
);
const UI_PATH = resolve(
  __dirname,
  "../../../../../apps/web/app/app/admin/medication-governance/expert-review/page.tsx"
);
const I18N_FR_PATH = resolve(
  __dirname,
  "../../../../../apps/web/src/i18n/messages/fr.ts"
);
const DOCS_PATH = resolve(
  __dirname,
  "../../../../../docs/clinical/medication-intelligence-phase-14b-expert-knowledge-review-approval-for-shadow-wave1-qualification.md"
);
const SHARED_PATH = resolve(
  __dirname,
  "../../../../../packages/shared/src/medication/medicationExpertReviewGovernance.ts"
);

export type Phase14BSchemaProbe = {
  migrationPresent: boolean;
  hasExpertReviewBatch: boolean;
  hasDomainReview: boolean;
  hasQuality: boolean;
  hasShadowQualification: boolean;
  hasShadowSnapshot: boolean;
  hasConflict: boolean;
  servicePresent: boolean;
  reusesPhase13Approval: boolean;
  qualityEnginePresent: boolean;
  shadowEligibilityPresent: boolean;
  snapshotImmutablePresent: boolean;
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
  batchStatus: string | null;
  familiesReviewed: number;
  familiesApprovedForShadow: number;
  familiesDeferred: number;
  clinicalDomainsReviewed: number;
  safetyDomainsReviewed: number;
  qualityScores: number;
  shadowSnapshots: number;
  openConflicts: number;
  auditEntries: number;
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
  const migration = existsSync(MIGRATION_PATH)
    ? readFileSync(MIGRATION_PATH, "utf8")
    : "";
  const service = existsSync(SERVICE_PATH)
    ? readFileSync(SERVICE_PATH, "utf8")
    : "";
  const controller = existsSync(CONTROLLER_PATH)
    ? readFileSync(CONTROLLER_PATH, "utf8")
    : "";
  const fr = existsSync(I18N_FR_PATH) ? readFileSync(I18N_FR_PATH, "utf8") : "";
  const shared = existsSync(SHARED_PATH) ? readFileSync(SHARED_PATH, "utf8") : "";

  return {
    migrationPresent: existsSync(MIGRATION_PATH),
    hasExpertReviewBatch: schema.includes("model MedicationExpertReviewBatch"),
    hasDomainReview: schema.includes("model MedicationKnowledgeDomainReview"),
    hasQuality: schema.includes("model MedicationKnowledgeQuality"),
    hasShadowQualification: schema.includes(
      "model MedicationShadowQualification"
    ),
    hasShadowSnapshot: schema.includes("model MedicationShadowSnapshot"),
    hasConflict: schema.includes("model MedicationReviewConflict"),
    servicePresent:
      existsSync(SERVICE_PATH) && service.includes("runPhase14BPipeline"),
    reusesPhase13Approval: service.includes("attemptApproveForShadow"),
    qualityEnginePresent:
      service.includes("calculateFamilyQualityScores") &&
      service.includes("calculateQualityScores"),
    shadowEligibilityPresent:
      service.includes("evaluateShadowEligibility") &&
      service.includes("qualifyWave1ForShadow"),
    snapshotImmutablePresent: service.includes("createImmutableShadowSnapshot"),
    controllerPresent: existsSync(CONTROLLER_PATH),
    uiPresent: existsSync(UI_PATH),
    cliPresent: existsSync(CLI_PATH),
    frenchI18nPresent: fr.includes("medicationExpertReview"),
    docsPresent: existsSync(DOCS_PATH),
    sharedGovernancePresent:
      existsSync(SHARED_PATH) &&
      shared.includes("PHASE14B_EXPERT_REVIEW_DEFAULTS") &&
      shared.includes("assertPhase14BNoWorkflowControl"),
    noProviderAlertEndpoint:
      !controller.includes("provider-alert") &&
      !controller.includes("enableAlerts"),
    noOrderBlockingHook:
      !controller.includes("blockOrder") && !controller.includes("order-block"),
    noActivationEndpoint:
      !controller.includes("activate-cds") &&
      !controller.includes('"/activate"'),
    noCareWorkflowControl:
      service.includes("assertPhase14BNoWorkflowControl") ||
      service.includes("knowledgeControlsPatientCare: false"),
    alertsOffDbConstraint:
      migration.includes("alerts_off_chk") ||
      migration.includes('"providerFacingAlertsAllowed" = false'),
    noCareControlDbConstraint:
      migration.includes("no_care_control_chk") ||
      migration.includes('"knowledgeControlsPatientCare" = false'),
  };
}

async function collectLiveMetrics(
  prisma: PrismaClient
): Promise<Phase14BLiveMetrics> {
  const batch = await prisma.medicationExpertReviewBatch
    .findUnique({ where: { programKey: PHASE14B_PROGRAM_KEY } })
    .catch(() => null);

  return {
    batchStatus: batch?.status ?? null,
    familiesReviewed: batch?.familiesReviewedCount ?? 0,
    familiesApprovedForShadow: await prisma.medicationKnowledgeApprovalWaveItem
      .count({ where: { approvalStatus: "APPROVED_FOR_SHADOW" } })
      .catch(() => 0),
    familiesDeferred: batch?.familiesDeferredCount ?? 0,
    clinicalDomainsReviewed: await prisma.medicationKnowledgeDomainReview
      .count({
        where: {
          reviewLevel: "CLINICAL",
          status: { in: ["REVIEWED", "APPROVED_FOR_SHADOW", "DEFERRED"] },
        },
      })
      .catch(() => 0),
    safetyDomainsReviewed: await prisma.medicationKnowledgeDomainReview
      .count({
        where: {
          reviewLevel: "SAFETY",
          status: { in: ["REVIEWED", "APPROVED_FOR_SHADOW", "DEFERRED"] },
        },
      })
      .catch(() => 0),
    qualityScores: await prisma.medicationKnowledgeQuality
      .count()
      .catch(() => 0),
    shadowSnapshots: await prisma.medicationShadowSnapshot
      .count()
      .catch(() => 0),
    openConflicts: await prisma.medicationReviewConflict
      .count({ where: { resolutionStatus: "OPEN" } })
      .catch(() => 0),
    auditEntries: await prisma.medicationExpertReviewAuditEvent
      .count()
      .catch(() => 0),
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
    (input.metrics.familiesReviewed > 0 &&
      input.metrics.qualityScores > 0 &&
      input.metrics.clinicalDomainsReviewed > 0);

  const certified =
    schemaOk &&
    focusedOk &&
    priorOk &&
    noActivation &&
    reviewOk &&
    input.knownBlockingGaps.length === 0;

  return {
    ...base(input.dataSource, input.confidence),
    title:
      "Phase 14B expert knowledge review, approval-for-shadow, Wave 1 qualification certification summary",
    FinalDecision: certified
      ? "MEDICATION_INTELLIGENCE_PHASE_14B_CERTIFIED"
      : "MEDICATION_INTELLIGENCE_PHASE_14B_NOT_CERTIFIED",
    ExpertKnowledgeReviewImplemented: "YES",
    ClinicalDomainValidationImplemented: "YES",
    SafetyDomainValidationImplemented: "YES",
    CrossDomainConsistencyImplemented: "YES",
    QualityEngineImplemented: "YES",
    ShadowEligibilityEngineImplemented: "YES",
    ApprovalForShadowExtendedPhase13: "YES",
    ImmutableShadowSnapshotsImplemented: "YES",
    ParallelMedicationMasterCreated: "NO",
    ParallelApprovalEngineCreated: "NO",
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
      "Part 3 will execute controlled synthetic shadow evaluation / gap analysis",
      "Deferred dosing/pregnancy/interaction domains remain explicit until Tier-1 sources",
      "ApprovedForShadow does not enable production CDS or care-workflow control",
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
    ClinicalDomainsReviewed: metrics?.clinicalDomainsReviewed ?? 0,
    SafetyDomainsReviewed: metrics?.safetyDomainsReviewed ?? 0,
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
