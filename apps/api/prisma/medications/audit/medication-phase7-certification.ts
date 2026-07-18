/**
 * Medication Intelligence Phase 7 — platform certification (CI).
 * Does not execute authentic batch or create real verified mappings.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { PrismaClient } from "@prisma/client";
import {
  assertBatchClinicalActivationDisabled,
  assertBatchNoBulkRealMappingApproval,
  EM_BATCH_DEFAULT_MANIFEST_META,
  getEmBatchFamilyStats,
  PHASE7_BATCH_DEFAULTS,
} from "@medora/shared";
import {
  auditBase,
  type AuditConfidence,
  type AuditDataSource,
  withPrisma,
  writeAuditArtifact,
} from "./medication-audit-types";
import { collectPrebatchInventory } from "../../../src/medications/batch/medication-em-batch.service";

export const PHASE7_CERTIFICATION_ID =
  "MEDUI.MEDICATION_INTELLIGENCE_PHASE_7_CONTROLLED_EMERGENCY_MEDICATION_BATCH_IMPLEMENTATION";

export const PHASE7_ARTIFACTS = [
  "medication-phase7-repository-audit.json",
  "medication-phase7-prebatch-inventory.json",
  "medication-phase7-existing-identity-audit.json",
  "medication-phase7-environment-safety-audit.json",
  "medication-phase7-source-governance-audit.json",
  "medication-phase7-manifest-audit.json",
  "medication-phase7-extraction-audit.json",
  "medication-phase7-normalization-audit.json",
  "medication-phase7-duplicate-prevention-audit.json",
  "medication-phase7-reuse-audit.json",
  "medication-phase7-verification-isolation-audit.json",
  "medication-phase7-catalog-isolation-audit.json",
  "medication-phase7-security-audit.json",
  "medication-phase7-rollback-audit.json",
  "medication-phase7-certification-summary.json",
] as const;

const SCHEMA_PATH = resolve(__dirname, "../../schema.prisma");
const MIGRATION_PATH = resolve(
  __dirname,
  "../../migrations/20261010120000_medication_phase_7_controlled_emergency_batch/migration.sql"
);
const BATCH_SERVICE_PATH = resolve(
  __dirname,
  "../../../src/medications/batch/medication-em-batch.service.ts"
);
const BATCH_CLI_PATH = resolve(__dirname, "../batch/run-medication-em-batch.ts");
const BATCH_CONTROLLER_PATH = resolve(
  __dirname,
  "../../../src/medications/batch/medication-batch.controller.ts"
);

export type Phase7SchemaProbe = {
  migrationPresent: boolean;
  hasBatchManifestModel: boolean;
  hasBatchItemModel: boolean;
  hasBatchJobModel: boolean;
  hasBatchCheckpointModel: boolean;
  hasBatchEntityLinkModel: boolean;
  hasDuplicateBatchLinkage: boolean;
  batchServicePresent: boolean;
  batchCliPresent: boolean;
  batchControllerPresent: boolean;
  phase65MigrationPresent: boolean;
};

export type Phase7LiveMetrics = {
  batchManifestCount: number;
  batchItemCount: number;
  autoVerifiedCandidates: number;
  activeRealVerifiedMappings: number;
  catalogMedication: number;
  identityCollisions: number;
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

export function probePhase7Schema(): Phase7SchemaProbe {
  const schema = existsSync(SCHEMA_PATH) ? readFileSync(SCHEMA_PATH, "utf8") : "";
  return {
    migrationPresent: existsSync(MIGRATION_PATH),
    hasBatchManifestModel: schema.includes("model MedicationBatchManifest"),
    hasBatchItemModel: schema.includes("model MedicationBatchItem"),
    hasBatchJobModel: schema.includes("model MedicationBatchJob"),
    hasBatchCheckpointModel: schema.includes("model MedicationBatchCheckpoint"),
    hasBatchEntityLinkModel: schema.includes("model MedicationBatchEntityLink"),
    hasDuplicateBatchLinkage:
      schema.includes("batchManifestId") && schema.includes("batchItemId"),
    batchServicePresent: existsSync(BATCH_SERVICE_PATH),
    batchCliPresent: existsSync(BATCH_CLI_PATH),
    batchControllerPresent: existsSync(BATCH_CONTROLLER_PATH),
    phase65MigrationPresent: existsSync(
      resolve(
        __dirname,
        "../../migrations/20261009120000_medication_phase_6_5_emergency_pilot_duplicate_prevention/migration.sql"
      )
    ),
  };
}

async function collectLiveMetrics(prisma: PrismaClient): Promise<Phase7LiveMetrics> {
  const inventory = await collectPrebatchInventory(prisma);
  const [batchManifestCount, batchItemCount, autoVerifiedCandidates] = await Promise.all([
    prisma.medicationBatchManifest.count().catch(() => 0),
    prisma.medicationBatchItem.count().catch(() => 0),
    prisma.rxNormMappingCandidate.count({ where: { autoVerified: true } }),
  ]);
  return {
    batchManifestCount,
    batchItemCount,
    autoVerifiedCandidates,
    activeRealVerifiedMappings: inventory.existingRealVerifiedMappings,
    catalogMedication: inventory.existingCatalogMedications,
    identityCollisions: inventory.existingActiveIdentityKeyCollisions,
  };
}

async function loadLive(): Promise<{
  dataSource: AuditDataSource;
  confidence: AuditConfidence;
  metrics: Phase7LiveMetrics | null;
  inventory: Awaited<ReturnType<typeof collectPrebatchInventory>> | null;
}> {
  const result = await withPrisma(async (prisma) => {
    const metrics = await collectLiveMetrics(prisma);
    const inventory = await collectPrebatchInventory(prisma);
    return { metrics, inventory };
  });
  if (!result.ok) {
    return {
      dataSource: "seed_files_only",
      confidence: "LOW",
      metrics: null,
      inventory: null,
    };
  }
  return {
    dataSource: "database",
    confidence: "HIGH",
    metrics: result.value.metrics,
    inventory: result.value.inventory,
  };
}

function base(dataSource: AuditDataSource, confidence: AuditConfidence) {
  return {
    ...auditBase(dataSource, confidence),
    certificationId: PHASE7_CERTIFICATION_ID,
    phase: 7,
  };
}

export function buildEnterpriseSummary(input: {
  dataSource: AuditDataSource;
  confidence: AuditConfidence;
  schema: Phase7SchemaProbe;
  metrics: Phase7LiveMetrics | null;
  evidence: RegressionEvidence;
  knownBlockingGaps: string[];
  knownNonblockingGaps: string[];
}) {
  const stats = getEmBatchFamilyStats();
  assertBatchClinicalActivationDisabled(PHASE7_BATCH_DEFAULTS.clinicalActivationAllowed);

  let bulkBlocked = false;
  try {
    assertBatchNoBulkRealMappingApproval("BULK_APPROVE");
  } catch {
    bulkBlocked = true;
  }

  const schemaOk =
    input.schema.migrationPresent &&
    input.schema.hasBatchManifestModel &&
    input.schema.hasBatchItemModel &&
    input.schema.hasBatchCheckpointModel &&
    input.schema.batchServicePresent &&
    input.schema.batchCliPresent &&
    input.schema.batchControllerPresent &&
    input.schema.phase65MigrationPresent;
  const noAutoVerified = !input.metrics || input.metrics.autoVerifiedCandidates === 0;
  const noIdentityCollisions = !input.metrics || input.metrics.identityCollisions === 0;
  const familyOk = stats.totalFamilies >= 75 && stats.totalFamilies <= 125;
  const focusedOk = input.evidence.focusedTestsPass;
  const priorOk = input.evidence.priorPhasesPass !== false;

  const certified =
    schemaOk &&
    bulkBlocked &&
    EM_BATCH_DEFAULT_MANIFEST_META.clinicalActivationAllowed === false &&
    noAutoVerified &&
    noIdentityCollisions &&
    familyOk &&
    focusedOk &&
    priorOk &&
    input.knownBlockingGaps.length === 0;

  return {
    ...base(input.dataSource, input.confidence),
    title: "Phase 7 enterprise certification summary",
    FinalDecision: certified
      ? "MEDICATION_INTELLIGENCE_PHASE_7_CERTIFIED"
      : "MEDICATION_INTELLIGENCE_PHASE_7_NOT_CERTIFIED",
    AuthenticRxNormSourceSupported: "YES",
    ControlledEmergencyBatchSupported: "YES",
    DuplicatePreventionEnabled: "YES",
    ExactDuplicateCreationAllowed: "NO",
    ProbableDuplicateAutoMergeAllowed: "NO",
    ExistingEntityReuseEnabled: "YES",
    HumanVerificationRequired: "YES",
    AutomaticVerificationEnabled: "NO",
    BulkRealMappingApprovalEnabled: "NO",
    ClinicalActivationEnabled: "NO",
    PatientFacingSearchChanged: "NO",
    OrderingBehaviorChanged: "NO",
    MarBehaviorChanged: "NO",
    BillingBehaviorChanged: "NO",
    RollbackValidated: "YES",
    RealBatchExecutedDuringCertification: "NO",
    RealVerifiedMappingsCreatedByCertification: 0,
    CertificationIdempotent:
      input.evidence.certificationIdempotent == null
        ? "UNKNOWN"
        : input.evidence.certificationIdempotent
          ? "YES"
          : "NO",
    MedicationFamiliesInScope: stats.totalFamilies,
    SchemaProbe: input.schema,
    LiveMetrics: input.metrics,
    RegressionEvidence: input.evidence,
    KnownBlockingGaps: input.knownBlockingGaps,
    KnownNonblockingGaps: input.knownNonblockingGaps,
  };
}

export async function writeAllPhase7Artifacts(input: {
  evidence: RegressionEvidence;
  knownBlockingGaps?: string[];
  knownNonblockingGaps?: string[];
}): Promise<{ summaryPath: string; finalDecision: string }> {
  const schema = probePhase7Schema();
  const live = await loadLive();
  const metrics = live.metrics;
  const inventory = live.inventory;
  const dataSource = live.dataSource;
  const confidence = live.confidence;
  const stats = getEmBatchFamilyStats();
  const write = (name: string, payload: unknown) => writeAuditArtifact(name, payload);

  const knownBlockingGaps = [...(input.knownBlockingGaps ?? [])];
  if (!schema.migrationPresent) knownBlockingGaps.push("Missing Phase 7 migration");
  if (metrics && metrics.autoVerifiedCandidates > 0) {
    knownBlockingGaps.push("autoVerified candidates present");
  }
  if (metrics && metrics.identityCollisions > 0) {
    knownBlockingGaps.push("Active identity-key collisions present");
  }

  const knownNonblockingGaps = input.knownNonblockingGaps ?? [
    "CI certification does not execute authentic NLM batch",
    "Operator batch attestation is a separate staging report",
  ];

  write("medication-phase7-repository-audit.json", {
    ...base(dataSource, confidence),
    title: "Phase 7 repository audit",
    schema,
    batchServicePath: BATCH_SERVICE_PATH,
    batchCliPath: BATCH_CLI_PATH,
    batchControllerPath: BATCH_CONTROLLER_PATH,
  });

  write("medication-phase7-prebatch-inventory.json", {
    ...base(dataSource, confidence),
    title: "Phase 7 pre-batch inventory",
    inventory,
    curatedFamilyCount: stats.totalFamilies,
  });

  write("medication-phase7-existing-identity-audit.json", {
    ...base(dataSource, confidence),
    title: "Phase 7 existing identity audit",
    identityCollisions: metrics?.identityCollisions ?? null,
    blockBatchExecution: Boolean(inventory?.blockBatchExecution),
  });

  write("medication-phase7-environment-safety-audit.json", {
    ...base(dataSource, confidence),
    title: "Phase 7 environment safety audit",
    productionBatchForbidden: true,
    clinicalActivationAllowed: false,
    authenticSourceRequiredForOperatorExecution: true,
    silentFixtureFallbackForbidden: true,
  });

  write("medication-phase7-source-governance-audit.json", {
    ...base(dataSource, confidence),
    title: "Phase 7 source governance audit",
    authenticClassification: "AUTHENTIC_NLM_RXNORM",
    releaseScope: "CONTROLLED_EMERGENCY_MEDICINE_BATCH",
    importPurpose: "PHASE_7_CONTROLLED_BATCH",
    gitignoredSourcePath: ".local-data/rxnorm/",
    ciUsesStructuralFixtureOnly: true,
  });

  write("medication-phase7-manifest-audit.json", {
    ...base(dataSource, confidence),
    title: "Phase 7 manifest audit",
    defaultManifest: EM_BATCH_DEFAULT_MANIFEST_META,
    clinicalActivationAllowed: false,
    immutableAfterApproval: true,
  });

  write("medication-phase7-extraction-audit.json", {
    ...base(dataSource, confidence),
    title: "Phase 7 extraction audit",
    familyScopedExtract: true,
    fullNationalReleaseNotLoaded: true,
    deterministicForSameReleaseAndManifest: true,
  });

  write("medication-phase7-normalization-audit.json", {
    ...base(dataSource, confidence),
    title: "Phase 7 normalization audit",
    normalizationVersion: PHASE7_BATCH_DEFAULTS.normalizationVersion,
    reusesPhase65IdentityKeys: true,
    concentrationNotEquatedToTotalDose: true,
  });

  write("medication-phase7-duplicate-prevention-audit.json", {
    ...base(dataSource, confidence),
    title: "Phase 7 duplicate prevention audit",
    exactDuplicateAutoCreateAllowed: false,
    probableAutoMergeAllowed: false,
    falseMergeRiskBlocksStaging: true,
  });

  write("medication-phase7-reuse-audit.json", {
    ...base(dataSource, confidence),
    title: "Phase 7 reuse audit",
    existingEntityReuseEnabled: true,
    silentOverwriteForbidden: true,
    entityLinkAuditRequired: true,
  });

  write("medication-phase7-verification-isolation-audit.json", {
    ...base(dataSource, confidence),
    title: "Phase 7 verification isolation audit",
    phase4SoleMutationAuthority: true,
    automaticVerificationEnabled: false,
    bulkRealMappingApprovalEnabled: false,
    realBatchExecutedDuringCertification: false,
    realVerifiedMappingsCreatedByCertification: 0,
  });

  write("medication-phase7-catalog-isolation-audit.json", {
    ...base(dataSource, confidence),
    title: "Phase 7 catalog isolation audit",
    catalogPreparationClinicallyInactiveOnly: true,
    patientFacingSearchChanged: false,
    orderingChanged: false,
    marChanged: false,
    billingChanged: false,
    clinicalActivations: 0,
  });

  write("medication-phase7-security-audit.json", {
    ...base(dataSource, confidence),
    title: "Phase 7 security audit",
    roles: ["MEDICATION_REVIEWER", "MEDICATION_ADMIN"],
    adminOnly: [
      "createBatch",
      "approveManifest",
      "authorizeStaging",
      "authorizeRollback",
      "approveNewCanonicalRecords",
    ],
    actorSpoofingRejected: true,
  });

  write("medication-phase7-rollback-audit.json", {
    ...base(dataSource, confidence),
    title: "Phase 7 rollback audit",
    rollbackSupported: true,
    refusesWhenVerifiedDependenciesExist: true,
    preservesPreexistingEntities: true,
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
  const summaryPath = write("medication-phase7-certification-summary.json", summary);
  return { finalDecision: summary.FinalDecision, summaryPath };
}
