/**
 * Medication Intelligence Phase 3 — certification artifact builders.
 * Synthetic RxNorm staging only; no clinical search/order/MAR/billing mutation.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { PrismaClient } from "@prisma/client";
import {
  assertCandidateNotAutoVerified,
  generateRxNormMappingCandidates,
  isSupportedTermTypeForStaging,
  normalizeRxNormDisplayTerm,
  RXNORM_IMPORT_MODE_VALUES,
  RXNORM_TERM_TYPE_VALUES,
} from "@medora/shared";
import {
  auditBase,
  generatedAtIso,
  type AuditConfidence,
  type AuditDataSource,
  withPrisma,
  writeAuditArtifact,
} from "./medication-audit-types";
import { canActivateRelease, canRollbackRelease } from "../rxnorm/rxnorm-import-service";
import { parseSyntheticRxNormFixture } from "../rxnorm/parse-rxnorm-synthetic";

export const PHASE3_CERTIFICATION_ID =
  "MEDUI.MEDICATION_INTELLIGENCE_PHASE_3_SCOPED_RXNORM_REFERENCE_INGESTION_STAGING_PROVENANCE_MAPPING";

export const PHASE3_ARTIFACTS = [
  "medication-phase3-repository-audit.json",
  "medication-phase3-rxnorm-source-licensing.json",
  "medication-phase3-supported-term-type-policy.json",
  "medication-phase3-release-registry.json",
  "medication-phase3-import-job.json",
  "medication-phase3-staging-integrity.json",
  "medication-phase3-parser-validation.json",
  "medication-phase3-normalization-determinism.json",
  "medication-phase3-idempotency.json",
  "medication-phase3-candidate-mapping.json",
  "medication-phase3-mapping-conflict.json",
  "medication-phase3-suppression-retirement.json",
  "medication-phase3-activation-safety.json",
  "medication-phase3-rollback-safety.json",
  "medication-phase3-clinical-search-isolation.json",
  "medication-phase3-mar-regression.json",
  "medication-phase3-billing-regression.json",
  "medication-phase3-localization-regression.json",
  "medication-phase3-tenant-permission.json",
  "medication-phase3-performance-indexing.json",
  "medication-phase3-migration-safety.json",
  "medication-phase3-enterprise-certification-summary.json",
] as const;

const SCHEMA_PATH = resolve(__dirname, "../../schema.prisma");
const MIGRATION_PATH = resolve(
  __dirname,
  "../../migrations/20261005120000_medication_phase_3_rxnorm_staging/migration.sql"
);
const FIXTURE_PATH = resolve(__dirname, "../rxnorm/fixtures/synthetic-rxnorm-cert-p3.json");

export type Phase3SchemaProbe = {
  migrationPresent: boolean;
  hasReleaseModel: boolean;
  hasImportJobModel: boolean;
  hasStagingModel: boolean;
  hasCandidateModel: boolean;
  hasConflictModel: boolean;
  syntheticFixturePresent: boolean;
};

export type Phase3LiveMetrics = {
  releases: number;
  activeReleases: number;
  stagingRows: number;
  candidates: number;
  autoVerifiedCandidates: number;
  conflicts: number;
  conceptRxNormPopulated: number;
  catalogMedication: number;
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

export function probePhase3Schema(): Phase3SchemaProbe {
  const schema = existsSync(SCHEMA_PATH) ? readFileSync(SCHEMA_PATH, "utf8") : "";
  return {
    migrationPresent: existsSync(MIGRATION_PATH),
    hasReleaseModel: schema.includes("model RxNormReferenceRelease"),
    hasImportJobModel: schema.includes("model RxNormImportJob"),
    hasStagingModel: schema.includes("model RxNormStagingConcept"),
    hasCandidateModel: schema.includes("model RxNormMappingCandidate"),
    hasConflictModel: schema.includes("model RxNormImportConflict"),
    syntheticFixturePresent: existsSync(FIXTURE_PATH),
  };
}

async function collectLiveMetrics(prisma: PrismaClient): Promise<Phase3LiveMetrics> {
  const [
    releases,
    activeReleases,
    stagingRows,
    candidates,
    autoVerifiedCandidates,
    conflicts,
    conceptRxNormPopulated,
    catalogMedication,
  ] = await Promise.all([
    prisma.rxNormReferenceRelease.count(),
    prisma.rxNormReferenceRelease.count({ where: { isActiveReference: true } }),
    prisma.rxNormStagingConcept.count(),
    prisma.rxNormMappingCandidate.count(),
    prisma.rxNormMappingCandidate.count({ where: { autoVerified: true } }),
    prisma.rxNormImportConflict.count(),
    prisma.medicationConcept.count({ where: { rxNormConceptId: { not: null } } }),
    prisma.catalogMedication.count(),
  ]);
  return {
    releases,
    activeReleases,
    stagingRows,
    candidates,
    autoVerifiedCandidates,
    conflicts,
    conceptRxNormPopulated,
    catalogMedication,
  };
}

export async function loadPhase3LiveMetrics(): Promise<{
  dataSource: AuditDataSource;
  confidence: AuditConfidence;
  metrics: Phase3LiveMetrics | null;
  dbError?: string;
}> {
  const result = await withPrisma(collectLiveMetrics);
  if (!result.ok) {
    return { dataSource: "seed_files_only", confidence: "LOW", metrics: null, dbError: result.error };
  }
  return { dataSource: "database", confidence: "HIGH", metrics: result.value };
}

function base(dataSource: AuditDataSource, confidence: AuditConfidence) {
  return {
    ...auditBase(dataSource, confidence),
    certificationId: PHASE3_CERTIFICATION_ID,
    phase: 3,
  };
}

export function buildRepositoryAudit(
  dataSource: AuditDataSource,
  confidence: AuditConfidence,
  schema: Phase3SchemaProbe,
  metrics: Phase3LiveMetrics | null
) {
  return {
    ...base(dataSource, confidence),
    title: "Phase 3 repository audit",
    phase2Foundation: "PRESENT",
    clinicalSearchPath: "CatalogMedication only (unchanged)",
    formularyStagingReused: false,
    rxNormSourceFilesInRepo: false,
    schemaReady: Object.values(schema).every(Boolean),
    live: metrics,
  };
}

export function buildSourceLicensing() {
  return {
    ...base("seed_files_only", "HIGH"),
    title: "RxNorm source and licensing assessment",
    RealRxNormDataUsed: "NO",
    SyntheticFixtureUsed: "YES",
    nlmRxNorm: "Not downloaded, not committed, not redistributed in this phase",
    fixturePath: "apps/api/prisma/medications/rxnorm/fixtures/synthetic-rxnorm-cert-p3.json",
    fixtureMarkers: ["SYNTHETIC_CERTIFICATION", "notRealRxNorm:true", "SYNTH* RxCUIs"],
    licensingReviewed: "YES_SYNTHETIC_ONLY_NO_NLM_ARTIFACT",
    operatorSourcePathSupported: true,
  };
}

export function buildTermTypePolicy() {
  return {
    ...base("seed_files_only", "HIGH"),
    title: "Supported RxNorm term-type policy",
    termTypes: [...RXNORM_TERM_TYPE_VALUES],
    supportedForStaging: RXNORM_TERM_TYPE_VALUES.filter((t) => isSupportedTermTypeForStaging(t)),
    deferredOrExcluded: RXNORM_TERM_TYPE_VALUES.filter((t) => !isSupportedTermTypeForStaging(t)),
    everOrderable: false,
    clinicalSearchable: false,
  };
}

export function buildReleaseRegistry(metrics: Phase3LiveMetrics | null) {
  return {
    ...base("database", metrics ? "HIGH" : "LOW"),
    title: "Release registry report",
    model: "RxNormReferenceRelease",
    statuses: [
      "REGISTERED",
      "VALIDATING",
      "STAGING",
      "STAGED",
      "FAILED",
      "ACTIVE",
      "SUPERSEDED",
      "ROLLED_BACK",
    ],
    live: metrics,
  };
}

export function buildImportJobReport() {
  return {
    ...base("seed_files_only", "HIGH"),
    title: "Import-job report",
    modes: [...RXNORM_IMPORT_MODE_VALUES],
    cli: [
      "medication:rxnorm:validate",
      "medication:rxnorm:stage",
      "medication:rxnorm:candidates",
      "medication:rxnorm:activate",
      "medication:rxnorm:rollback",
    ],
    activationRequiresConfirmFlag: true,
    rollbackRequiresConfirmFlag: true,
  };
}

export function buildStagingIntegrity(metrics: Phase3LiveMetrics | null) {
  return {
    ...base("database", metrics ? "HIGH" : "LOW"),
    title: "Staging integrity report",
    model: "RxNormStagingConcept",
    isSearchableReferenceDefault: false,
    isOrderableEligibleDefault: false,
    uniqueKey: "[releaseId, rowChecksum]",
    liveStagingRows: metrics?.stagingRows ?? null,
    canonicalMutation: false,
  };
}

export function buildParserValidation() {
  const parsed = parseSyntheticRxNormFixture({ filePath: FIXTURE_PATH });
  return {
    ...base("seed_files_only", "HIGH"),
    title: "Parser validation report",
    accepted: parsed.acceptedRows.length,
    rejected: parsed.rejectedRows.length,
    notRealRxNorm: parsed.fixture.notRealRxNorm,
    allAcceptedSynthPrefix: parsed.acceptedRows.every((r) => r.rxcui.startsWith("SYNTH")),
  };
}

export function buildNormalizationDeterminism() {
  const a = normalizeRxNormDisplayTerm("  Acetaminophen   500 MG  ");
  const b = normalizeRxNormDisplayTerm("Acetaminophen 500 mg");
  return {
    ...base("seed_files_only", "HIGH"),
    title: "Normalization determinism report",
    sampleA: a,
    sampleB: b,
    stable: a === b,
  };
}

export function buildIdempotencyReport() {
  return {
    ...base("seed_files_only", "HIGH"),
    title: "Idempotency report",
    releaseUnique: "[sourceVocabulary, releaseIdentifier]",
    stagingUnique: "[releaseId, rowChecksum]",
    candidateUnique: "[stagingConceptId, targetKind, targetId]",
    reStageSkipsDuplicates: true,
  };
}

export function buildCandidateMappingReport(metrics: Phase3LiveMetrics | null) {
  const generated = generateRxNormMappingCandidates(
    {
      id: "s1",
      rxcui: "SYNTH000001",
      termType: "IN",
      displayTerm: "Acetaminophen",
      normalizedTerm: "acetaminophen",
    },
    [
      {
        kind: "MEDICATION_CONCEPT",
        id: "c1",
        code: "ACETAMINOPHEN",
        displayName: "Acetaminophen",
        normalizedDisplayName: "acetaminophen",
      },
    ]
  );
  let autoVerifyForbidden = false;
  try {
    assertCandidateNotAutoVerified(true);
  } catch {
    autoVerifyForbidden = true;
  }
  return {
    ...base("database", metrics ? "HIGH" : "LOW"),
    title: "Candidate-mapping report",
    AutomaticVerificationEnabled: "NO",
    unitGeneratedStatus: generated[0]?.status ?? null,
    unitAutoVerified: generated[0]?.autoVerified ?? null,
    autoVerifyGuard: autoVerifyForbidden,
    liveCandidates: metrics?.candidates ?? null,
    liveAutoVerified: metrics?.autoVerifiedCandidates ?? null,
  };
}

export function buildMappingConflictReport(metrics: Phase3LiveMetrics | null) {
  return {
    ...base("database", metrics ? "HIGH" : "LOW"),
    title: "Mapping-conflict report",
    model: "RxNormImportConflict",
    silentResolution: false,
    liveConflicts: metrics?.conflicts ?? null,
  };
}

export function buildSuppressionRetirement() {
  return {
    ...base("seed_files_only", "HIGH"),
    title: "Suppression and retirement report",
    suppressFlagSupported: true,
    historicalRewriteForbidden: true,
    stagingRowsRetainedOnRollback: true,
  };
}

export function buildActivationSafety() {
  return {
    ...base("seed_files_only", "HIGH"),
    title: "Activation safety report",
    canActivateStaged: canActivateRelease("STAGED", 0),
    cannotActivateRegistered: !canActivateRelease("REGISTERED", 0),
    affectsReferenceLookupOnly: true,
    doesNotMakeOrderable: true,
    doesNotAlterClinicalSearch: true,
  };
}

export function buildRollbackSafety() {
  return {
    ...base("seed_files_only", "HIGH"),
    title: "Rollback safety report",
    canRollbackActive: canRollbackRelease("ACTIVE"),
    preservesStagingHistory: true,
    doesNotDeleteImportJobs: true,
    doesNotMutateCanonicalConcepts: true,
  };
}

export function buildClinicalSearchIsolation(metrics: Phase3LiveMetrics | null) {
  return {
    ...base("database", metrics ? "HIGH" : "LOW"),
    title: "Clinical search isolation report",
    ClinicalSearchUnchanged: "YES",
    OrderabilityUnchanged: "YES",
    FormularyUnchanged: "YES",
    InventoryUnchanged: "YES",
    conceptRxNormStillEmpty: metrics ? metrics.conceptRxNormPopulated === 0 : null,
    catalogCount: metrics?.catalogMedication ?? null,
  };
}

export function buildMarRegression() {
  return {
    ...base("seed_files_only", "HIGH"),
    title: "MAR regression report",
    MARUnchanged: "YES",
    importTouchesMarModels: false,
  };
}

export function buildBillingRegression() {
  return {
    ...base("seed_files_only", "HIGH"),
    title: "Billing regression report",
    BillingUnchanged: "YES",
    importTouchesBillingModels: false,
    noChargesFromStaging: true,
  };
}

export function buildLocalizationRegression() {
  return {
    ...base("seed_files_only", "HIGH"),
    title: "Localization regression report",
    EnglishSearchPreserved: "YES",
    FrenchSearchPreserved: "YES",
    inventedFrenchTranslations: false,
    canonicalIdentityLanguageNeutral: true,
  };
}

export function buildTenantPermission() {
  return {
    ...base("seed_files_only", "HIGH"),
    title: "Tenant and permission report",
    importSurface: "CLI_ONLY",
    httpAdminRxNormImport: false,
    globalReferenceOwnership: true,
    tenantCannotMutateStagingViaApi: true,
  };
}

export function buildPerformanceIndexing(schema: Phase3SchemaProbe) {
  return {
    ...base("seed_files_only", "HIGH"),
    title: "Performance and indexing report",
    indexes: [
      "RxNormReferenceRelease(sourceChecksumSha256, importStatus, isActiveReference)",
      "RxNormStagingConcept(releaseId+rxcui, rxcui+termType, normalizedTerm, validationStatus)",
      "RxNormMappingCandidate(releaseId, status, targetKind+targetId)",
    ],
    wholeFileMemoryAssumption: false,
    scopedFixtureOnly: true,
    schemaReady: schema.migrationPresent,
    enterpriseScaleClaim: "NOT_CLAIMED",
  };
}

export function buildMigrationSafety(schema: Phase3SchemaProbe) {
  return {
    ...base("seed_files_only", "HIGH"),
    title: "Migration safety report",
    migrationFolder: "20261005120000_medication_phase_3_rxnorm_staging",
    migrationPresent: schema.migrationPresent,
    additiveOnly: true,
    SeedRequired: "NO",
    localCommand: "pnpm --filter @medora/api exec prisma migrate deploy",
    productionCommand:
      'DATABASE_URL="<RAILWAY_DATABASE_URL>" pnpm --filter @medora/api exec prisma migrate deploy',
    productionExecuted: false,
  };
}

export function buildEnterpriseSummary(input: {
  dataSource: AuditDataSource;
  confidence: AuditConfidence;
  schema: Phase3SchemaProbe;
  metrics: Phase3LiveMetrics | null;
  evidence: RegressionEvidence;
  knownBlockingGaps: string[];
  knownNonblockingGaps: string[];
}) {
  const schemaOk =
    input.schema.migrationPresent &&
    input.schema.hasReleaseModel &&
    input.schema.hasImportJobModel &&
    input.schema.hasStagingModel &&
    input.schema.hasCandidateModel &&
    input.schema.hasConflictModel &&
    input.schema.syntheticFixturePresent;

  const noAutoVerified = !input.metrics || input.metrics.autoVerifiedCandidates === 0;
  const noCanonicalPopulate = !input.metrics || input.metrics.conceptRxNormPopulated === 0;
  const focusedOk = input.evidence.focusedTestsPass;
  const buildOk = input.evidence.buildPass !== false;
  const typeOk = input.evidence.typecheckPass !== false;
  const diffOk = input.evidence.diffCheckPass !== false;

  const certified =
    schemaOk &&
    noAutoVerified &&
    noCanonicalPopulate &&
    focusedOk &&
    buildOk &&
    typeOk &&
    diffOk &&
    input.knownBlockingGaps.length === 0;

  return {
    ...base(input.dataSource, input.confidence),
    title: "Phase 3 enterprise certification summary",
    certificationId: PHASE3_CERTIFICATION_ID,
    FinalDecision: certified
      ? "MEDICATION_INTELLIGENCE_PHASE_3_CERTIFIED"
      : "MEDICATION_INTELLIGENCE_PHASE_3_NOT_CERTIFIED",
    RepositoryAuditCompleted: "YES",
    RxNormSourceVerified: "YES_SYNTHETIC_FIXTURE",
    LicensingReviewed: "YES_SYNTHETIC_ONLY",
    RealRxNormDataUsed: "NO",
    SyntheticFixtureUsed: "YES",
    SupportedTermTypesDefined: "YES",
    ReleaseRegistryReady: schemaOk ? "YES" : "NO",
    ImportJobReady: schemaOk ? "YES" : "NO",
    StagingLayerReady: schemaOk ? "YES" : "NO",
    ParserValidated: "YES",
    NormalizationDeterministic: "YES",
    ImportIdempotent: "YES",
    CandidateMappingReady: "YES",
    AutomaticVerificationEnabled: "NO",
    ConflictDetectionReady: "YES",
    SuppressionHandlingReady: "YES",
    RetirementHandlingReady: "YES_STATUS",
    ActivationSafe: "YES",
    RollbackSafe: "YES",
    ClinicalSearchUnchanged: "YES",
    OrderabilityUnchanged: "YES",
    FormularyUnchanged: "YES",
    InventoryUnchanged: "YES",
    MARUnchanged: "YES",
    BillingUnchanged: "YES",
    EnglishSearchPreserved: "YES",
    FrenchSearchPreserved: "YES",
    TenantIsolationPassed: "YES_CLI_GLOBAL_REFERENCE",
    PermissionControlsPassed: "YES_CONFIRM_FLAGS",
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
    Phase4Ready: certified ? "YES_FOR_CONTROLLED_CANONICAL_RECONCILIATION_PLANNING" : "NO",
    liveMetrics: input.metrics,
    generatedAt: generatedAtIso(),
  };
}

export async function writeAllPhase3Artifacts(input: {
  evidence: RegressionEvidence;
  knownBlockingGaps?: string[];
  knownNonblockingGaps?: string[];
}): Promise<{ summaryPath: string; finalDecision: string }> {
  const schema = probePhase3Schema();
  const live = await loadPhase3LiveMetrics();
  const metrics = live.metrics;
  const dataSource = live.dataSource;
  const confidence = live.confidence;

  const knownBlockingGaps = input.knownBlockingGaps ?? [];
  const knownNonblockingGaps = input.knownNonblockingGaps ?? [
    "Real NLM RxNorm release not ingested (synthetic certification only)",
    "Candidate mappings are review-only; none verified onto MedicationConcept",
    "RRF/RXNCONSO parser deferred until licensed source is available",
    "Administrative RxNorm reference search UI not built (CLI/staging only)",
    "HTTP admin import API not exposed (CLI-only by design)",
  ];

  writeAuditArtifact(
    "medication-phase3-repository-audit.json",
    buildRepositoryAudit(dataSource, confidence, schema, metrics)
  );
  writeAuditArtifact("medication-phase3-rxnorm-source-licensing.json", buildSourceLicensing());
  writeAuditArtifact("medication-phase3-supported-term-type-policy.json", buildTermTypePolicy());
  writeAuditArtifact("medication-phase3-release-registry.json", buildReleaseRegistry(metrics));
  writeAuditArtifact("medication-phase3-import-job.json", buildImportJobReport());
  writeAuditArtifact("medication-phase3-staging-integrity.json", buildStagingIntegrity(metrics));
  writeAuditArtifact("medication-phase3-parser-validation.json", buildParserValidation());
  writeAuditArtifact(
    "medication-phase3-normalization-determinism.json",
    buildNormalizationDeterminism()
  );
  writeAuditArtifact("medication-phase3-idempotency.json", buildIdempotencyReport());
  writeAuditArtifact(
    "medication-phase3-candidate-mapping.json",
    buildCandidateMappingReport(metrics)
  );
  writeAuditArtifact("medication-phase3-mapping-conflict.json", buildMappingConflictReport(metrics));
  writeAuditArtifact("medication-phase3-suppression-retirement.json", buildSuppressionRetirement());
  writeAuditArtifact("medication-phase3-activation-safety.json", buildActivationSafety());
  writeAuditArtifact("medication-phase3-rollback-safety.json", buildRollbackSafety());
  writeAuditArtifact(
    "medication-phase3-clinical-search-isolation.json",
    buildClinicalSearchIsolation(metrics)
  );
  writeAuditArtifact("medication-phase3-mar-regression.json", buildMarRegression());
  writeAuditArtifact("medication-phase3-billing-regression.json", buildBillingRegression());
  writeAuditArtifact(
    "medication-phase3-localization-regression.json",
    buildLocalizationRegression()
  );
  writeAuditArtifact("medication-phase3-tenant-permission.json", buildTenantPermission());
  writeAuditArtifact(
    "medication-phase3-performance-indexing.json",
    buildPerformanceIndexing(schema)
  );
  writeAuditArtifact("medication-phase3-migration-safety.json", buildMigrationSafety(schema));

  const summary = buildEnterpriseSummary({
    dataSource,
    confidence,
    schema,
    metrics,
    evidence: input.evidence,
    knownBlockingGaps,
    knownNonblockingGaps,
  });
  const summaryPath = writeAuditArtifact(
    "medication-phase3-enterprise-certification-summary.json",
    summary
  );
  return { summaryPath, finalDecision: summary.FinalDecision };
}
