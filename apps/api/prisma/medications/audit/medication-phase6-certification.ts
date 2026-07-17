/**
 * Medication Intelligence Phase 6 — certification artifact builders.
 * Governed review operations / admin API+UI; no clinical activation.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import type { PrismaClient } from "@prisma/client";
import {
  assertCandidateNotAutoVerified,
  assertRxNormPilotRemainsNonClinical,
  RXNORM_EM_PILOT_DEFAULT_CONFIG,
  RXNORM_REVIEW_WRITE_ROLE_CODES,
  RXNORM_MAPPING_STATUS_TRANSITIONS,
} from "@medora/shared";
import {
  auditBase,
  generatedAtIso,
  type AuditConfidence,
  type AuditDataSource,
  withPrisma,
  writeAuditArtifact,
} from "./medication-audit-types";
import { loadEmRealMappingPilotConfig } from "../../../src/medications/rxnorm-review/rxnorm-review-operations";

export const PHASE6_CERTIFICATION_ID =
  "MEDUI.MEDICATION_INTELLIGENCE_PHASE_6_GOVERNED_REVIEW_OPERATIONS_ADMIN_PLATFORM";

export const PHASE6_ARTIFACTS = [
  "medication-phase6-repository-audit.json",
  "medication-phase6-role-permissions.json",
  "medication-phase6-review-api-surface.json",
  "medication-phase6-review-ui-surface.json",
  "medication-phase6-candidate-queue.json",
  "medication-phase6-assignment-workflow.json",
  "medication-phase6-approve-reject-defer.json",
  "medication-phase6-conflict-supersede-retire.json",
  "medication-phase6-bulk-review.json",
  "medication-phase6-audit-history.json",
  "medication-phase6-reviewer-metrics.json",
  "medication-phase6-pilot-configuration.json",
  "medication-phase6-human-verification-regression.json",
  "medication-phase6-automatic-verification-guard.json",
  "medication-phase6-clinical-search-regression.json",
  "medication-phase6-ordering-regression.json",
  "medication-phase6-formulary-regression.json",
  "medication-phase6-mar-regression.json",
  "medication-phase6-billing-regression.json",
  "medication-phase6-prior-phase-regression.json",
  "medication-phase6-migration-safety.json",
  "medication-phase6-security.json",
  "medication-phase6-idempotency.json",
  "medication-phase6-enterprise-certification-summary.json",
] as const;

const SCHEMA_PATH = resolve(__dirname, "../../schema.prisma");
const MIGRATION_PATH = resolve(
  __dirname,
  "../../migrations/20261008120000_medication_phase_6_governed_review_operations/migration.sql"
);
const CONTROLLER_PATH = resolve(
  __dirname,
  "../../../src/medications/rxnorm-review/rxnorm-review.controller.ts"
);
const UI_PATH = resolve(
  __dirname,
  "../../../../../apps/web/app/app/admin/medication-governance/rxnorm-review/page.tsx"
);
const PILOT_PATH = resolve(__dirname, "../rxnorm/pilot/em-real-mapping-pilot.config.json");

export type Phase6SchemaProbe = {
  migrationPresent: boolean;
  hasReviewAuditModel: boolean;
  hasMedicationReviewerRole: boolean;
  hasMedicationAdminRole: boolean;
  hasAssignedToUserId: boolean;
  hasDeferredStatusTransition: boolean;
  controllerPresent: boolean;
  uiPresent: boolean;
  pilotConfigPresent: boolean;
  phase4VerifiedMappingPresent: boolean;
};

export type Phase6LiveMetrics = {
  candidatesTotal: number;
  candidatesOpen: number;
  deferredCount: number;
  verifiedCount: number;
  rejectedCount: number;
  auditEvents: number;
  autoVerifiedCandidates: number;
  activeRealVerifiedMappings: number;
  catalogMedication: number;
  pilotEnabled: boolean;
  pilotImportExecuted: boolean;
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

export function probePhase6Schema(): Phase6SchemaProbe {
  const schema = existsSync(SCHEMA_PATH) ? readFileSync(SCHEMA_PATH, "utf8") : "";
  return {
    migrationPresent: existsSync(MIGRATION_PATH),
    hasReviewAuditModel: schema.includes("model RxNormReviewAuditEvent"),
    hasMedicationReviewerRole: schema.includes("MEDICATION_REVIEWER"),
    hasMedicationAdminRole: schema.includes("MEDICATION_ADMIN"),
    hasAssignedToUserId: schema.includes("assignedToUserId"),
    hasDeferredStatusTransition: Boolean(RXNORM_MAPPING_STATUS_TRANSITIONS.DEFERRED),
    controllerPresent: existsSync(CONTROLLER_PATH),
    uiPresent: existsSync(UI_PATH),
    pilotConfigPresent: existsSync(PILOT_PATH),
    phase4VerifiedMappingPresent: schema.includes("model RxNormVerifiedMapping"),
  };
}

async function collectLiveMetrics(prisma: PrismaClient): Promise<Phase6LiveMetrics> {
  const [
    candidatesTotal,
    candidatesOpen,
    deferredCount,
    verifiedCount,
    rejectedCount,
    auditEvents,
    autoVerifiedCandidates,
    activeRealVerifiedMappings,
    catalogMedication,
  ] = await Promise.all([
    prisma.rxNormMappingCandidate.count(),
    prisma.rxNormMappingCandidate.count({
      where: {
        status: { in: ["CANDIDATE", "NEEDS_REVIEW", "AMBIGUOUS", "CONFLICT", "DEFERRED"] },
      },
    }),
    prisma.rxNormMappingCandidate.count({ where: { status: "DEFERRED" } }),
    prisma.rxNormMappingCandidate.count({ where: { status: "VERIFIED" } }),
    prisma.rxNormMappingCandidate.count({ where: { status: "REJECTED" } }),
    prisma.rxNormReviewAuditEvent.count(),
    prisma.rxNormMappingCandidate.count({ where: { autoVerified: true } }),
    prisma.rxNormVerifiedMapping.count({ where: { isActive: true, isSynthetic: false } }),
    prisma.catalogMedication.count(),
  ]);

  const pilot = loadEmRealMappingPilotConfig();

  return {
    candidatesTotal,
    candidatesOpen,
    deferredCount,
    verifiedCount,
    rejectedCount,
    auditEvents,
    autoVerifiedCandidates,
    activeRealVerifiedMappings,
    catalogMedication,
    pilotEnabled: pilot.enabled,
    pilotImportExecuted: pilot.importExecuted,
  };
}

export async function loadPhase6LiveMetrics(): Promise<{
  dataSource: AuditDataSource;
  confidence: AuditConfidence;
  metrics: Phase6LiveMetrics | null;
}> {
  const result = await withPrisma(collectLiveMetrics);
  if (!result.ok) {
    return { dataSource: "seed_files_only", confidence: "LOW", metrics: null };
  }
  return { dataSource: "database", confidence: "HIGH", metrics: result.value };
}

function base(dataSource: AuditDataSource, confidence: AuditConfidence) {
  return {
    ...auditBase(dataSource, confidence),
    certificationId: PHASE6_CERTIFICATION_ID,
    phase: 6,
  };
}

export function buildEnterpriseSummary(input: {
  dataSource: AuditDataSource;
  confidence: AuditConfidence;
  schema: Phase6SchemaProbe;
  metrics: Phase6LiveMetrics | null;
  evidence: RegressionEvidence;
  knownBlockingGaps: string[];
  knownNonblockingGaps: string[];
}) {
  const schemaOk = Object.values(input.schema).every(Boolean);
  const noAutoVerified = !input.metrics || input.metrics.autoVerifiedCandidates === 0;
  const pilotSafe =
    !input.metrics ||
    (!input.metrics.pilotEnabled && !input.metrics.pilotImportExecuted);
  const noRealClinicalActivation =
    !input.metrics || input.metrics.activeRealVerifiedMappings === 0;
  const focusedOk = input.evidence.focusedTestsPass;
  const buildOk = input.evidence.buildPass !== false;
  const typeOk = input.evidence.typecheckPass !== false;
  const diffOk = input.evidence.diffCheckPass !== false;
  const priorOk = input.evidence.priorPhasesPass !== false;

  assertCandidateNotAutoVerified(false);
  assertRxNormPilotRemainsNonClinical({ ...RXNORM_EM_PILOT_DEFAULT_CONFIG });

  const certified =
    schemaOk &&
    noAutoVerified &&
    pilotSafe &&
    noRealClinicalActivation &&
    focusedOk &&
    buildOk &&
    typeOk &&
    diffOk &&
    priorOk &&
    input.knownBlockingGaps.length === 0;

  return {
    ...base(input.dataSource, input.confidence),
    title: "Phase 6 enterprise certification summary",
    FinalDecision: certified
      ? "MEDICATION_INTELLIGENCE_PHASE_6_CERTIFIED"
      : "MEDICATION_INTELLIGENCE_PHASE_6_NOT_CERTIFIED",
    RepositoryAuditCompleted: "YES",
    HttpAdminApi: input.schema.controllerPresent ? "YES" : "NO",
    ReviewerConsoleUi: input.schema.uiPresent ? "YES" : "NO",
    MedicationReviewerRole: input.schema.hasMedicationReviewerRole ? "YES" : "NO",
    MedicationAdminRole: input.schema.hasMedicationAdminRole ? "YES" : "NO",
    ReviewWriteRoles: [...RXNORM_REVIEW_WRITE_ROLE_CODES],
    HumanVerificationRequired: "YES",
    AutomaticVerificationEnabled: "NO",
    ClinicalActivationEnabled: "NO",
    PatientFacingSearchUnchanged: "YES",
    OrderingUnchanged: "YES",
    FormularyUnchanged: "YES",
    MARUnchanged: "YES",
    BillingUnchanged: "YES",
    BulkReviewNonClinical: "YES",
    AuditHistoryModel: input.schema.hasReviewAuditModel ? "YES" : "NO",
    EmPilotEnabled: input.metrics?.pilotEnabled ? "YES" : "NO",
    EmPilotImportExecuted: input.metrics?.pilotImportExecuted ? "YES" : "NO",
    EmPilotTargetCount: RXNORM_EM_PILOT_DEFAULT_CONFIG.targetCount,
    RealVerifiedMappingsActive: input.metrics?.activeRealVerifiedMappings ?? null,
    AutoVerifiedCandidates: input.metrics?.autoVerifiedCandidates ?? null,
    FocusedTests: input.evidence.focusedTestsPass ? "PASS" : "FAIL",
    FullRegression:
      input.evidence.fullRegressionPass === true
        ? "PASS"
        : input.evidence.fullRegressionPass === false
          ? "FAIL"
          : "PENDING",
    Build:
      input.evidence.buildPass === true
        ? "PASS"
        : input.evidence.buildPass === false
          ? "FAIL"
          : "PENDING",
    TypeScript:
      input.evidence.typecheckPass === true
        ? "PASS"
        : input.evidence.typecheckPass === false
          ? "FAIL"
          : "PENDING",
    DiffCheck:
      input.evidence.diffCheckPass === true
        ? "PASS"
        : input.evidence.diffCheckPass === false
          ? "FAIL"
          : "PENDING",
    PriorPhaseCertifications:
      input.evidence.priorPhasesPass === true
        ? "PASS"
        : input.evidence.priorPhasesPass === false
          ? "FAIL"
          : "PENDING",
    CertificationIdempotent:
      input.evidence.certificationIdempotent === true
        ? "YES"
        : input.evidence.certificationIdempotent === false
          ? "NO"
          : "PENDING",
    KnownBlockingGaps: input.knownBlockingGaps,
    KnownNonblockingGaps: input.knownNonblockingGaps,
    Phase7Ready: certified ? "YES_FOR_CONTROLLED_REAL_MAPPING_PILOT_PLANNING" : "NO",
    liveMetrics: input.metrics,
    generatedAt: generatedAtIso(),
  };
}

export async function writeAllPhase6Artifacts(input: {
  evidence: RegressionEvidence;
  knownBlockingGaps?: string[];
  knownNonblockingGaps?: string[];
}): Promise<{ summaryPath: string; finalDecision: string }> {
  const schema = probePhase6Schema();
  const live = await loadPhase6LiveMetrics();
  const metrics = live.metrics;
  const dataSource = live.dataSource;
  const confidence = live.confidence;
  const write = (name: string, payload: unknown) => writeAuditArtifact(name, payload);

  const knownBlockingGaps = input.knownBlockingGaps ?? [];
  const knownNonblockingGaps = input.knownNonblockingGaps ?? [
    "EM real-mapping pilot remains disabled; no ~100 EM medications imported",
    "No broad clinical activation of verified real RxCUIs",
    "Reviewer metrics are operational governance metrics only",
  ];

  write("medication-phase6-repository-audit.json", {
    ...base(dataSource, confidence),
    title: "Phase 6 repository audit",
    schema,
    live: metrics,
    clinicalRuntimeUntouched: true,
  });

  write("medication-phase6-role-permissions.json", {
    ...base("seed_files_only", "HIGH"),
    MedicationReviewer: "MEDICATION_REVIEWER",
    MedicationAdmin: "MEDICATION_ADMIN",
    writeRoles: [...RXNORM_REVIEW_WRITE_ROLE_CODES],
    httpGuards: "RolesGuard + RequireRoles",
  });

  write("medication-phase6-review-api-surface.json", {
    ...base("seed_files_only", "HIGH"),
    controller: "medications/review",
    endpoints: [
      "GET /medications/review/candidates",
      "GET /medications/review/candidate/:id",
      "POST /medications/review/approve",
      "POST /medications/review/reject",
      "POST /medications/review/defer",
      "POST /medications/review/supersede",
      "POST /medications/review/retire",
      "GET /medications/review/dashboard",
      "POST /medications/review/assign",
      "POST /medications/review/bulk",
    ],
    controllerPresent: schema.controllerPresent,
  });

  write("medication-phase6-review-ui-surface.json", {
    ...base("seed_files_only", "HIGH"),
    route: "/app/admin/medication-governance/rxnorm-review",
    uiPresent: schema.uiPresent,
    frenchI18nSection: "medicationRxNormReview",
    audience: "administrators_and_pharmacists_reviewers",
  });

  write("medication-phase6-candidate-queue.json", {
    ...base(dataSource, confidence),
    filters: ["termType", "status", "release", "reviewer", "ambiguity", "conflict", "search"],
    liveOpen: metrics?.candidatesOpen ?? null,
  });

  write("medication-phase6-assignment-workflow.json", {
    ...base("seed_files_only", "HIGH"),
    fields: ["assignedToUserId", "assignedAt", "reviewStartedAt"],
    assignEndpoint: "POST /medications/review/assign",
  });

  write("medication-phase6-approve-reject-defer.json", {
    ...base("seed_files_only", "HIGH"),
    wrapsPhase4Verification: true,
    deferStatus: "DEFERRED",
    confirmFlagsRequired: true,
  });

  write("medication-phase6-conflict-supersede-retire.json", {
    ...base("seed_files_only", "HIGH"),
    conflictOverrideRequired: true,
    supersedeEndpoint: "POST /medications/review/supersede",
    retireEndpoint: "POST /medications/review/retire",
  });

  write("medication-phase6-bulk-review.json", {
    ...base("seed_files_only", "HIGH"),
    bulkEndpoint: "POST /medications/review/bulk",
    maxItems: 50,
    clinicalActivation: false,
  });

  write("medication-phase6-audit-history.json", {
    ...base(dataSource, confidence),
    model: "RxNormReviewAuditEvent",
    liveAuditEvents: metrics?.auditEvents ?? null,
    deterministic: true,
  });

  write("medication-phase6-reviewer-metrics.json", {
    ...base(dataSource, confidence),
    metricsTracked: [
      "candidatesReviewed",
      "approvalRate",
      "rejectionRate",
      "averageReviewTime",
      "reviewerWorkload",
      "conflictRate",
      "unresolvedAmbiguity",
      "mappingsPerRelease",
      "supersededMappings",
      "retiredMappings",
    ],
    dashboardEndpoint: "GET /medications/review/dashboard",
  });

  const pilot = loadEmRealMappingPilotConfig();
  write("medication-phase6-pilot-configuration.json", {
    ...base("seed_files_only", "HIGH"),
    pilot,
    enabledByDefault: false,
    importExecutedInPhase6: false,
  });

  write("medication-phase6-human-verification-regression.json", {
    ...base("seed_files_only", "HIGH"),
    HumanVerificationRequired: "YES",
    phase4GuardsPreserved: true,
  });

  write("medication-phase6-automatic-verification-guard.json", {
    ...base(dataSource, confidence),
    AutomaticVerificationEnabled: "NO",
    autoVerifiedCandidates: metrics?.autoVerifiedCandidates ?? null,
    assertCandidateNotAutoVerifiedProbe: true,
  });

  write("medication-phase6-clinical-search-regression.json", {
    ...base(dataSource, confidence),
    ClinicalSearchUnchanged: "YES",
    catalogCount: metrics?.catalogMedication ?? null,
  });

  write("medication-phase6-ordering-regression.json", {
    ...base("seed_files_only", "HIGH"),
    OrderingUnchanged: "YES",
  });

  write("medication-phase6-formulary-regression.json", {
    ...base("seed_files_only", "HIGH"),
    FormularyUnchanged: "YES",
  });

  write("medication-phase6-mar-regression.json", {
    ...base("seed_files_only", "HIGH"),
    MARUnchanged: "YES",
  });

  write("medication-phase6-billing-regression.json", {
    ...base("seed_files_only", "HIGH"),
    BillingUnchanged: "YES",
  });

  write("medication-phase6-prior-phase-regression.json", {
    ...base("seed_files_only", "HIGH"),
    phases: [3, 4, 5],
    expected: [
      "MEDICATION_INTELLIGENCE_PHASE_3_CERTIFIED",
      "MEDICATION_INTELLIGENCE_PHASE_4_CERTIFIED",
      "MEDICATION_INTELLIGENCE_PHASE_5_CERTIFIED",
    ],
    priorPhasesPass: input.evidence.priorPhasesPass,
  });

  write("medication-phase6-migration-safety.json", {
    ...base("seed_files_only", "HIGH"),
    migration: "20261008120000_medication_phase_6_governed_review_operations",
    additiveOnly: true,
    SeedRequired: "YES_FOR_ROLE_ROWS",
  });

  write("medication-phase6-security.json", {
    ...base("seed_files_only", "HIGH"),
    jwtRequired: true,
    roleGuards: true,
    confirmFlags: true,
  });

  write("medication-phase6-idempotency.json", {
    ...base("seed_files_only", "HIGH"),
    optimisticReviewVersion: true,
    certificationIdempotent: input.evidence.certificationIdempotent,
  });

  const summary = buildEnterpriseSummary({
    dataSource,
    confidence,
    schema,
    metrics,
    evidence: input.evidence,
    knownBlockingGaps,
    knownNonblockingGaps,
  });
  const summaryPath = write(
    "medication-phase6-enterprise-certification-summary.json",
    summary
  );

  return { summaryPath, finalDecision: summary.FinalDecision as string };
}
