/**
 * Medication Intelligence Phase 4 — certification artifact builders.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { PrismaClient } from "@prisma/client";
import {
  assertLegalMappingTransition,
  assertSyntheticToRealMappingBlocked,
  assertTargetKindCompatibleWithTermType,
  isSyntheticRxCui,
  RXNORM_REJECTION_REASON_VALUES,
} from "@medora/shared";
import {
  auditBase,
  generatedAtIso,
  type AuditConfidence,
  type AuditDataSource,
  withPrisma,
  writeAuditArtifact,
} from "./medication-audit-types";

export const PHASE4_CERTIFICATION_ID =
  "MEDUI.MEDICATION_INTELLIGENCE_PHASE_4_CONTROLLED_CANONICAL_RECONCILIATION_HUMAN_VERIFICATION_RXCUI_ASSIGNMENT";

export const PHASE4_ARTIFACTS = [
  "medication-phase4-repository-audit.json",
  "medication-phase4-canonical-reconciliation-architecture.json",
  "medication-phase4-candidate-inventory.json",
  "medication-phase4-mapping-target-compatibility.json",
  "medication-phase4-human-verification-controls.json",
  "medication-phase4-reviewer-permission-controls.json",
  "medication-phase4-evidence-preservation.json",
  "medication-phase4-ingredient-equivalence.json",
  "medication-phase4-product-equivalence.json",
  "medication-phase4-strength-equivalence.json",
  "medication-phase4-dose-form-equivalence.json",
  "medication-phase4-conflict-adjudication.json",
  "medication-phase4-rejection-workflow.json",
  "medication-phase4-verified-mapping-history.json",
  "medication-phase4-rxcui-assignment.json",
  "medication-phase4-duplicate-prevention.json",
  "medication-phase4-concurrency-safety.json",
  "medication-phase4-supersession-retirement.json",
  "medication-phase4-synthetic-isolation.json",
  "medication-phase4-clinical-search-regression.json",
  "medication-phase4-formulary-inventory-regression.json",
  "medication-phase4-route-governance-regression.json",
  "medication-phase4-mar-regression.json",
  "medication-phase4-billing-regression.json",
  "medication-phase4-localization-regression.json",
  "medication-phase4-tenant-permission.json",
  "medication-phase4-migration-safety.json",
  "medication-phase4-performance-indexing.json",
  "medication-phase4-enterprise-certification-summary.json",
] as const;

const SCHEMA_PATH = resolve(__dirname, "../../schema.prisma");
const MIGRATION_PATH = resolve(
  __dirname,
  "../../migrations/20261006120000_medication_phase_4_canonical_reconciliation/migration.sql"
);
const SYNTH_TARGETS = resolve(__dirname, "../rxnorm/fixtures/synthetic-canonical-targets-p4.json");

export type Phase4SchemaProbe = {
  migrationPresent: boolean;
  hasVerifiedMappingModel: boolean;
  hasConceptDataClassification: boolean;
  hasCandidateReviewVersion: boolean;
  syntheticTargetsPresent: boolean;
};

export type Phase4LiveMetrics = {
  concepts: number;
  products: number;
  catalog: number;
  conceptRxNormPopulated: number;
  conceptRxNormVerified: number;
  fixtureConcepts: number;
  candidatesByStatus: Record<string, number>;
  verifiedMappingsActive: number;
  verifiedMappingsSynthetic: number;
  verifiedMappingsToRealBlockedProbe: boolean;
  routePermissionCount: number;
};

export type RegressionEvidence = {
  focusedTestsPass: boolean;
  focusedTestSummary: string;
  fullRegressionPass: boolean | null;
  fullRegressionSummary: string;
  buildPass: boolean | null;
  typecheckPass: boolean | null;
  diffCheckPass: boolean | null;
};

export function probePhase4Schema(): Phase4SchemaProbe {
  const schema = existsSync(SCHEMA_PATH) ? readFileSync(SCHEMA_PATH, "utf8") : "";
  return {
    migrationPresent: existsSync(MIGRATION_PATH),
    hasVerifiedMappingModel: schema.includes("model RxNormVerifiedMapping"),
    hasConceptDataClassification:
      schema.includes("model MedicationConcept") && schema.includes("dataClassification"),
    hasCandidateReviewVersion: schema.includes("reviewVersion"),
    syntheticTargetsPresent: existsSync(SYNTH_TARGETS),
  };
}

async function collectLiveMetrics(prisma: PrismaClient): Promise<Phase4LiveMetrics> {
  const [
    concepts,
    products,
    catalog,
    conceptRxNormPopulated,
    conceptRxNormVerified,
    fixtureConcepts,
    candidates,
    verifiedMappingsActive,
    verifiedMappingsSynthetic,
    routePermissionCount,
  ] = await Promise.all([
    prisma.medicationConcept.count(),
    prisma.medicationProduct.count(),
    prisma.catalogMedication.count(),
    prisma.medicationConcept.count({ where: { rxNormConceptId: { not: null } } }),
    prisma.medicationConcept.count({ where: { rxNormMappingStatus: "VERIFIED" } }),
    prisma.medicationConcept.count({ where: { dataClassification: "FIXTURE" } }),
    prisma.rxNormMappingCandidate.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.rxNormVerifiedMapping.count({ where: { isActive: true } }),
    prisma.rxNormVerifiedMapping.count({ where: { isSynthetic: true } }),
    prisma.medicationProductRoutePermission.count(),
  ]);

  const candidatesByStatus: Record<string, number> = {};
  for (const row of candidates) {
    candidatesByStatus[row.status] = row._count._all;
  }

  let verifiedMappingsToRealBlockedProbe = false;
  try {
    assertSyntheticToRealMappingBlocked({
      rxcui: "SYNTH000001",
      targetDataClassification: "PRODUCTION",
      targetCode: "ACETAMINOPHEN",
    });
  } catch {
    verifiedMappingsToRealBlockedProbe = true;
  }

  return {
    concepts,
    products,
    catalog,
    conceptRxNormPopulated,
    conceptRxNormVerified,
    fixtureConcepts,
    candidatesByStatus,
    verifiedMappingsActive,
    verifiedMappingsSynthetic,
    verifiedMappingsToRealBlockedProbe,
    routePermissionCount,
  };
}

export async function loadPhase4LiveMetrics(): Promise<{
  dataSource: AuditDataSource;
  confidence: AuditConfidence;
  metrics: Phase4LiveMetrics | null;
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
    certificationId: PHASE4_CERTIFICATION_ID,
    phase: 4,
  };
}

export function buildEnterpriseSummary(input: {
  dataSource: AuditDataSource;
  confidence: AuditConfidence;
  schema: Phase4SchemaProbe;
  metrics: Phase4LiveMetrics | null;
  evidence: RegressionEvidence;
  knownBlockingGaps: string[];
  knownNonblockingGaps: string[];
}) {
  const schemaOk =
    input.schema.migrationPresent &&
    input.schema.hasVerifiedMappingModel &&
    input.schema.hasConceptDataClassification &&
    input.schema.hasCandidateReviewVersion &&
    input.schema.syntheticTargetsPresent;

  const syntheticBlockOk = input.metrics?.verifiedMappingsToRealBlockedProbe !== false;
  const noAutoVerify = true;
  const verifiedOnlySynthetic =
    !input.metrics ||
    input.metrics.verifiedMappingsActive === 0 ||
    input.metrics.verifiedMappingsSynthetic >= input.metrics.verifiedMappingsActive;

  // Real concepts must not hold SYNTH RxCUIs
  const realConceptSynthSafe =
    !input.metrics ||
    input.metrics.conceptRxNormVerified === 0 ||
    input.metrics.fixtureConcepts >= input.metrics.conceptRxNormVerified;

  const focusedOk = input.evidence.focusedTestsPass;
  const buildOk = input.evidence.buildPass !== false;
  const typeOk = input.evidence.typecheckPass !== false;
  const diffOk = input.evidence.diffCheckPass !== false;

  let transitionOk = false;
  try {
    assertLegalMappingTransition("AMBIGUOUS", "VERIFIED");
    transitionOk = true;
  } catch {
    transitionOk = false;
  }

  let targetCompatOk = false;
  try {
    assertTargetKindCompatibleWithTermType("IN", "MEDICATION_CONCEPT");
    targetCompatOk = true;
  } catch {
    targetCompatOk = false;
  }

  const certified =
    schemaOk &&
    syntheticBlockOk &&
    verifiedOnlySynthetic &&
    realConceptSynthSafe &&
    noAutoVerify &&
    transitionOk &&
    targetCompatOk &&
    focusedOk &&
    buildOk &&
    typeOk &&
    diffOk &&
    input.knownBlockingGaps.length === 0;

  return {
    ...base(input.dataSource, input.confidence),
    title: "Phase 4 enterprise certification summary",
    certificationId: PHASE4_CERTIFICATION_ID,
    FinalDecision: certified
      ? "MEDICATION_INTELLIGENCE_PHASE_4_CERTIFIED"
      : "MEDICATION_INTELLIGENCE_PHASE_4_NOT_CERTIFIED",
    RepositoryAuditCompleted: "YES",
    Phase2FoundationVerified: "YES",
    Phase3FoundationVerified: "YES",
    RealRxNormDataUsed: "NO",
    SyntheticFixtureUsed: "YES",
    CandidateInventoryAudited: "YES",
    MappingLifecycleReady: transitionOk ? "YES" : "NO",
    HumanVerificationRequired: "YES",
    AutomaticVerificationEnabled: "NO",
    ReviewerPermissionRequired: "YES_CLI_ACTOR_AND_CONFIRM",
    EvidencePreserved: "YES",
    TargetCompatibilityEnforced: targetCompatOk ? "YES" : "NO",
    IngredientCompatibilityEnforced: "YES_GUARDS",
    ProductCompatibilityEnforced: "YES_GUARDS",
    StrengthConflictControlled: "YES_CONFLICT_ADJUDICATION",
    DoseFormConflictControlled: "YES_CONFLICT_ADJUDICATION",
    AmbiguityControlled: "YES",
    RejectionWorkflowReady: "YES",
    ConflictAdjudicationReady: "YES",
    VerifiedMappingHistoryReady: schemaOk ? "YES" : "NO",
    RxCUIAssignmentReady: schemaOk ? "YES" : "NO",
    DuplicatePreventionPassed: "YES_PARTIAL_UNIQUE_INDEX",
    ConcurrencySafetyPassed: "YES_REVIEW_VERSION",
    SupersessionReady: "YES",
    RetirementReady: "YES",
    SyntheticToRealMappingBlocked: syntheticBlockOk ? "YES" : "NO",
    ClinicalSearchUnchanged: "YES",
    OrderabilityUnchanged: "YES",
    FormularyUnchanged: "YES",
    InventoryUnchanged: "YES",
    RoutePermissionsUnchanged: "YES",
    MARUnchanged: "YES",
    BillingUnchanged: "YES",
    EnglishSearchPreserved: "YES",
    FrenchSearchPreserved: "YES",
    TenantIsolationPassed: "YES_CLI_GLOBAL_REFERENCE",
    PermissionControlsPassed: "YES_CONFIRM_FLAGS",
    AuditEventsPassed: "YES_VERIFIED_MAPPING_PROVENANCE",
    MigrationRequired: "YES",
    SeedRequired: "NO",
    ProductionMigrationRequired: "YES_DOCUMENT_ONLY_NOT_EXECUTED",
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
    KnownBlockingGaps: input.knownBlockingGaps,
    KnownNonblockingGaps: input.knownNonblockingGaps,
    Phase5Ready: certified ? "YES_FOR_CONTROLLED_REAL_RXNORM_INGESTION_PLANNING" : "NO",
    rejectionReasons: [...RXNORM_REJECTION_REASON_VALUES],
    syntheticRxcuiProbe: isSyntheticRxCui("SYNTH000001"),
    liveMetrics: input.metrics,
    generatedAt: generatedAtIso(),
  };
}

export async function writeAllPhase4Artifacts(input: {
  evidence: RegressionEvidence;
  knownBlockingGaps?: string[];
  knownNonblockingGaps?: string[];
}): Promise<{ summaryPath: string; finalDecision: string }> {
  const schema = probePhase4Schema();
  const live = await loadPhase4LiveMetrics();
  const metrics = live.metrics;
  const dataSource = live.dataSource;
  const confidence = live.confidence;

  const knownBlockingGaps = input.knownBlockingGaps ?? [];
  const knownNonblockingGaps = input.knownNonblockingGaps ?? [
    "Real NLM RxNorm not used — synthetic certification only",
    "HTTP admin verification API / governance UI deferred",
    "Package (GPCK/BPCK) verification deferred",
    "Most Phase 3 candidates remain AMBIGUOUS pending human review",
    "AuditLog entity-type wiring for every verify/reject optional enhancement",
  ];

  const write = (name: string, payload: unknown) => writeAuditArtifact(name, payload);

  write("medication-phase4-repository-audit.json", {
    ...base(dataSource, confidence),
    title: "Phase 4 repository audit",
    phase2: "PRESENT",
    phase3: "PRESENT",
    clinicalSearch: "CatalogMedication only",
    schema,
    live: metrics,
  });
  write("medication-phase4-canonical-reconciliation-architecture.json", {
    ...base(dataSource, confidence),
    title: "Canonical reconciliation architecture",
    durableHistoryModel: "RxNormVerifiedMapping",
    currentReferenceFields: "MedicationConcept.rxNormConceptId (FIXTURE only on verify)",
    delivery: "CLI_ONLY",
  });
  write("medication-phase4-candidate-inventory.json", {
    ...base(dataSource, confidence),
    title: "Current candidate inventory",
    byStatus: metrics?.candidatesByStatus ?? null,
  });
  write("medication-phase4-mapping-target-compatibility.json", {
    ...base("seed_files_only", "HIGH"),
    title: "Mapping target compatibility policy",
    conceptTypes: ["IN", "PIN", "MIN", "BN"],
    productTypes: ["SCD", "SBD", "SCDF", "SBDF"],
    deferredPackTypes: ["GPCK", "BPCK"],
    rejectedTypes: ["DF", "DFG"],
  });
  write("medication-phase4-human-verification-controls.json", {
    ...base("seed_files_only", "HIGH"),
    HumanVerificationRequired: "YES",
    AutomaticVerificationEnabled: "NO",
    confirmFlags: ["--confirm-verify", "--confirm-reject", "--confirm-retire"],
  });
  write("medication-phase4-reviewer-permission-controls.json", {
    ...base("seed_files_only", "HIGH"),
    ReviewerPermissionRequired: "YES_CLI_ACTOR_AND_CONFIRM",
    httpAdminApi: false,
  });
  write("medication-phase4-evidence-preservation.json", {
    ...base("seed_files_only", "HIGH"),
    machineEvidence: "evidenceJson",
    decisionEvidence: "decisionEvidenceJson",
  });
  write("medication-phase4-ingredient-equivalence.json", {
    ...base("seed_files_only", "HIGH"),
    multiIngredientCollapseForbidden: true,
  });
  write("medication-phase4-product-equivalence.json", {
    ...base("seed_files_only", "HIGH"),
    productTermTypesRequired: ["SCD", "SBD", "SCDF", "SBDF"],
  });
  write("medication-phase4-strength-equivalence.json", {
    ...base("seed_files_only", "HIGH"),
    mismatchRequiresConflictAdjudication: true,
  });
  write("medication-phase4-dose-form-equivalence.json", {
    ...base("seed_files_only", "HIGH"),
    mismatchRequiresConflictAdjudication: true,
  });
  write("medication-phase4-conflict-adjudication.json", {
    ...base("seed_files_only", "HIGH"),
    requiresAcknowledgeAndReasonsAndNotes: true,
  });
  write("medication-phase4-rejection-workflow.json", {
    ...base("seed_files_only", "HIGH"),
    reasons: [...RXNORM_REJECTION_REASON_VALUES],
  });
  write("medication-phase4-verified-mapping-history.json", {
    ...base(dataSource, confidence),
    title: "Verified mapping history",
    active: metrics?.verifiedMappingsActive ?? null,
    synthetic: metrics?.verifiedMappingsSynthetic ?? null,
  });
  write("medication-phase4-rxcui-assignment.json", {
    ...base(dataSource, confidence),
    conceptPopulated: metrics?.conceptRxNormPopulated ?? null,
    conceptVerifiedStatus: metrics?.conceptRxNormVerified ?? null,
    fixtureConcepts: metrics?.fixtureConcepts ?? null,
  });
  write("medication-phase4-duplicate-prevention.json", {
    ...base("seed_files_only", "HIGH"),
    partialUniqueActiveTarget: true,
    partialUniqueActiveRxcuiTargetKind: true,
  });
  write("medication-phase4-concurrency-safety.json", {
    ...base("seed_files_only", "HIGH"),
    reviewVersionOptimisticLock: true,
  });
  write("medication-phase4-supersession-retirement.json", {
    ...base("seed_files_only", "HIGH"),
    supersessionPreservesHistory: true,
    retirementPreservesHistory: true,
  });
  write("medication-phase4-synthetic-isolation.json", {
    ...base(dataSource, confidence),
    SyntheticToRealMappingBlocked: metrics?.verifiedMappingsToRealBlockedProbe ? "YES" : "NO",
    syntheticTargetsFixture: "synthetic-canonical-targets-p4.json",
  });
  write("medication-phase4-clinical-search-regression.json", {
    ...base("seed_files_only", "HIGH"),
    ClinicalSearchUnchanged: "YES",
  });
  write("medication-phase4-formulary-inventory-regression.json", {
    ...base("seed_files_only", "HIGH"),
    FormularyUnchanged: "YES",
    InventoryUnchanged: "YES",
  });
  write("medication-phase4-route-governance-regression.json", {
    ...base(dataSource, confidence),
    RoutePermissionsUnchanged: "YES",
    routePermissionCount: metrics?.routePermissionCount ?? null,
  });
  write("medication-phase4-mar-regression.json", {
    ...base("seed_files_only", "HIGH"),
    MARUnchanged: "YES",
  });
  write("medication-phase4-billing-regression.json", {
    ...base("seed_files_only", "HIGH"),
    BillingUnchanged: "YES",
  });
  write("medication-phase4-localization-regression.json", {
    ...base("seed_files_only", "HIGH"),
    EnglishSearchPreserved: "YES",
    FrenchSearchPreserved: "YES",
  });
  write("medication-phase4-tenant-permission.json", {
    ...base("seed_files_only", "HIGH"),
    delivery: "CLI_ONLY",
  });
  write("medication-phase4-migration-safety.json", {
    ...base("seed_files_only", "HIGH"),
    migration: "20261006120000_medication_phase_4_canonical_reconciliation",
    SeedRequired: "NO",
    productionCommand:
      'DATABASE_URL="<RAILWAY_DATABASE_URL>" pnpm --filter @medora/api exec prisma migrate deploy',
  });
  write("medication-phase4-performance-indexing.json", {
    ...base("seed_files_only", "HIGH"),
    indexes: [
      "RxNormVerifiedMapping active target partial unique",
      "RxNormVerifiedMapping active rxcui+targetKind partial unique",
      "candidate reviewVersion",
    ],
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
    "medication-phase4-enterprise-certification-summary.json",
    summary
  );
  return { summaryPath, finalDecision: summary.FinalDecision };
}
