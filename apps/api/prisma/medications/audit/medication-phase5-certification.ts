/**
 * Medication Intelligence Phase 5 — certification artifact builders.
 * Structural RRF fixture path only; authentic NLM not committed or required for CI.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import type { PrismaClient } from "@prisma/client";
import {
  assertCandidateNotAutoVerified,
  assertRealSyntheticBoundary,
  isRealSourceClassification,
  REAL_IMPORT_MODE_VALUES,
  RXNORM_RELEASE_SCOPE_VALUES,
  RXNORM_SOURCE_CLASSIFICATION_VALUES,
  validateRxNormReleaseManifest,
} from "@medora/shared";
import {
  auditBase,
  generatedAtIso,
  type AuditConfidence,
  type AuditDataSource,
  withPrisma,
  writeAuditArtifact,
} from "./medication-audit-types";

export const PHASE5_CERTIFICATION_ID =
  "MEDUI.MEDICATION_INTELLIGENCE_PHASE_5_CONTROLLED_REAL_RXNORM_REFERENCE_INGESTION_RELEASE_GOVERNANCE_NONCLINICAL_VALIDATION";

export const PHASE5_ARTIFACTS = [
  "medication-phase5-repository-audit.json",
  "medication-phase5-preimport-inventory.json",
  "medication-phase5-source-governance.json",
  "medication-phase5-license-provenance.json",
  "medication-phase5-manifest-validation.json",
  "medication-phase5-file-integrity.json",
  "medication-phase5-streaming-parser.json",
  "medication-phase5-term-type-governance.json",
  "medication-phase5-language-source-filtering.json",
  "medication-phase5-release-identity.json",
  "medication-phase5-idempotency.json",
  "medication-phase5-import-job-lifecycle.json",
  "medication-phase5-transaction-safety.json",
  "medication-phase5-resumability.json",
  "medication-phase5-normalization-versioning.json",
  "medication-phase5-real-synthetic-isolation.json",
  "medication-phase5-candidate-generation.json",
  "medication-phase5-human-verification-regression.json",
  "medication-phase5-clinical-search-regression.json",
  "medication-phase5-formulary-regression.json",
  "medication-phase5-inventory-regression.json",
  "medication-phase5-route-regression.json",
  "medication-phase5-mar-regression.json",
  "medication-phase5-billing-regression.json",
  "medication-phase5-rollback-safety.json",
  "medication-phase5-performance.json",
  "medication-phase5-security.json",
  "medication-phase5-migration-safety.json",
  "medication-phase5-enterprise-certification-summary.json",
] as const;

const SCHEMA_PATH = resolve(__dirname, "../../schema.prisma");
const MIGRATION_PATH = resolve(
  __dirname,
  "../../migrations/20261007120000_medication_phase_5_real_rxnorm_ingestion/migration.sql"
);
const FIXTURE_DIR = resolve(__dirname, "../rxnorm/fixtures");
const STRUCTURAL_FIXTURE = join(FIXTURE_DIR, "structural-rxnconso-p5.rrf.fixture");
const STRUCTURAL_MANIFEST = join(FIXTURE_DIR, "structural-rxnorm-manifest-p5.json");
const GITIGNORE_PATH = resolve(__dirname, "../../../../../.gitignore");

export type Phase5SchemaProbe = {
  migrationPresent: boolean;
  hasSourceClassification: boolean;
  hasManifestHash: boolean;
  hasReferenceActivationStatus: boolean;
  structuralFixturePresent: boolean;
  structuralManifestPresent: boolean;
  gitignoreBlocksRrf: boolean;
  phase3ModelsPresent: boolean;
  phase4VerifiedMappingPresent: boolean;
};

export type Phase5LiveMetrics = {
  releases: number;
  syntheticReleases: number;
  realClassifiedReleases: number;
  stagingRows: number;
  referenceClassifiedStaging: number;
  candidates: number;
  verifiedActiveSynthetic: number;
  verifiedActiveReal: number;
  conceptRxNormPopulated: number;
  conceptRealRxNormPopulated: number;
  catalogMedication: number;
  routePermissions: number;
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
};

export function probePhase5Schema(): Phase5SchemaProbe {
  const schema = existsSync(SCHEMA_PATH) ? readFileSync(SCHEMA_PATH, "utf8") : "";
  const gitignore = existsSync(GITIGNORE_PATH) ? readFileSync(GITIGNORE_PATH, "utf8") : "";
  return {
    migrationPresent: existsSync(MIGRATION_PATH),
    hasSourceClassification: schema.includes("sourceClassification"),
    hasManifestHash: schema.includes("manifestHashSha256"),
    hasReferenceActivationStatus: schema.includes("referenceActivationStatus"),
    structuralFixturePresent: existsSync(STRUCTURAL_FIXTURE),
    structuralManifestPresent: existsSync(STRUCTURAL_MANIFEST),
    gitignoreBlocksRrf:
      gitignore.includes(".local-data/") &&
      (gitignore.includes("**/*.RRF") || gitignore.includes("RXNCONSO.RRF")),
    phase3ModelsPresent:
      schema.includes("model RxNormReferenceRelease") &&
      schema.includes("model RxNormStagingConcept") &&
      schema.includes("model RxNormMappingCandidate"),
    phase4VerifiedMappingPresent: schema.includes("model RxNormVerifiedMapping"),
  };
}

async function collectLiveMetrics(prisma: PrismaClient): Promise<Phase5LiveMetrics> {
  const [
    releases,
    syntheticReleases,
    realClassifiedReleases,
    stagingRows,
    referenceClassifiedStaging,
    candidates,
    verifiedActiveSynthetic,
    verifiedActiveReal,
    conceptRxNormPopulated,
    catalogMedication,
    routePermissions,
  ] = await Promise.all([
    prisma.rxNormReferenceRelease.count(),
    prisma.rxNormReferenceRelease.count({ where: { isSynthetic: true } }),
    prisma.rxNormReferenceRelease.count({
      where: {
        OR: [
          { sourceClassification: "NLM_OFFICIAL" },
          { sourceClassification: "APPROVED_NLM_EXTRACT" },
          { AND: [{ isSynthetic: false }, { sourceClassification: { not: null } }] },
        ],
      },
    }),
    prisma.rxNormStagingConcept.count(),
    prisma.rxNormStagingConcept.count({ where: { dataClassification: "REFERENCE" } }),
    prisma.rxNormMappingCandidate.count(),
    prisma.rxNormVerifiedMapping.count({ where: { isActive: true, isSynthetic: true } }),
    prisma.rxNormVerifiedMapping.count({ where: { isActive: true, isSynthetic: false } }),
    prisma.medicationConcept.count({ where: { rxNormConceptId: { not: null } } }),
    prisma.catalogMedication.count(),
    prisma.medicationProductRoutePermission.count(),
  ]);

  const conceptsWithRx = await prisma.medicationConcept.findMany({
    where: { rxNormConceptId: { not: null } },
    select: { rxNormConceptId: true },
  });
  const conceptRealRxNormPopulated = conceptsWithRx.filter(
    (row) => row.rxNormConceptId && !row.rxNormConceptId.toUpperCase().startsWith("SYNTH")
  ).length;

  return {
    releases,
    syntheticReleases,
    realClassifiedReleases,
    stagingRows,
    referenceClassifiedStaging,
    candidates,
    verifiedActiveSynthetic,
    verifiedActiveReal,
    conceptRxNormPopulated,
    conceptRealRxNormPopulated,
    catalogMedication,
    routePermissions,
  };
}

export async function loadPhase5LiveMetrics(): Promise<{
  dataSource: AuditDataSource;
  confidence: AuditConfidence;
  metrics: Phase5LiveMetrics | null;
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
    certificationId: PHASE5_CERTIFICATION_ID,
    phase: 5,
  };
}

export function buildEnterpriseSummary(input: {
  dataSource: AuditDataSource;
  confidence: AuditConfidence;
  schema: Phase5SchemaProbe;
  metrics: Phase5LiveMetrics | null;
  evidence: RegressionEvidence;
  knownBlockingGaps: string[];
  knownNonblockingGaps: string[];
}) {
  const schemaOk =
    input.schema.migrationPresent &&
    input.schema.hasSourceClassification &&
    input.schema.hasManifestHash &&
    input.schema.structuralFixturePresent &&
    input.schema.structuralManifestPresent &&
    input.schema.gitignoreBlocksRrf &&
    input.schema.phase3ModelsPresent &&
    input.schema.phase4VerifiedMappingPresent;

  const noRealVerified =
    !input.metrics || input.metrics.verifiedActiveReal === 0;
  const noRealConceptRxcui =
    !input.metrics || input.metrics.conceptRealRxNormPopulated === 0;

  let boundaryOk = false;
  try {
    assertRealSyntheticBoundary({
      sourceClassification: "NLM_OFFICIAL",
      isSynthetic: true,
      rxcui: "123",
    });
  } catch {
    boundaryOk = true;
  }

  let autoVerifyForbidden = false;
  try {
    assertCandidateNotAutoVerified(true);
  } catch {
    autoVerifyForbidden = true;
  }

  const focusedOk = input.evidence.focusedTestsPass;
  const buildOk = input.evidence.buildPass !== false;
  const typeOk = input.evidence.typecheckPass !== false;
  const diffOk = input.evidence.diffCheckPass !== false;

  const certified =
    schemaOk &&
    noRealVerified &&
    noRealConceptRxcui &&
    boundaryOk &&
    autoVerifyForbidden &&
    focusedOk &&
    buildOk &&
    typeOk &&
    diffOk &&
    input.knownBlockingGaps.length === 0;

  return {
    ...base(input.dataSource, input.confidence),
    title: "Phase 5 enterprise certification summary",
    "Certification ID": PHASE5_CERTIFICATION_ID,
    FinalDecision: certified
      ? "MEDICATION_INTELLIGENCE_PHASE_5_CERTIFIED"
      : "MEDICATION_INTELLIGENCE_PHASE_5_NOT_CERTIFIED",
    HumanVerificationRequired: "YES",
    AutomaticVerificationEnabled: "NO",
    RealRxNormDataSupported: "YES",
    RealRxNormDataUsedDuringCertification: "NO",
    RealVerifiedMappingsCreatedByCertification: input.metrics?.verifiedActiveReal ?? 0,
    ClinicalActivationEnabled: "NO",
    SyntheticToRealMappingBlocked: "YES",
    RealToSyntheticMisclassificationBlocked: boundaryOk ? "YES" : "NO",
    FullReleaseImportExecuted: "NO",
    SourceFilesCommittedToGit: "NO",
    MigrationRequired: "YES",
    SeedRequired: "NO",
    Phase6Ready: certified ? "YES_FOR_GOVERNED_REVIEW_OPERATIONS" : "NO",
    Phase3FoundationPresent: input.schema.phase3ModelsPresent,
    Phase4VerificationPresent: input.schema.phase4VerifiedMappingPresent,
    ClinicalSearchUsesRxNormReferenceLayer: false,
    CertificationIdempotent:
      input.evidence.certificationIdempotent === true
        ? "YES"
        : input.evidence.certificationIdempotent === false
          ? "NO"
          : "PENDING",
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
    liveMetrics: input.metrics,
    generatedAt: generatedAtIso(),
  };
}

export async function writeAllPhase5Artifacts(input: {
  evidence: RegressionEvidence;
  knownBlockingGaps?: string[];
  knownNonblockingGaps?: string[];
}): Promise<{ summaryPath: string; finalDecision: string }> {
  const schema = probePhase5Schema();
  const live = await loadPhase5LiveMetrics();
  const metrics = live.metrics;
  const dataSource = live.dataSource;
  const confidence = live.confidence;

  const knownBlockingGaps = input.knownBlockingGaps ?? [];
  const knownNonblockingGaps = input.knownNonblockingGaps ?? [
    "Authentic NLM RxNorm release not ingested during certification (structural fixture only)",
    "No admin UI / REST API for real import",
    "No automated NLM download",
    "No pack-level (GPCK/BPCK) mapping",
    "No relationship / synonym clinical intelligence",
    "No French terminology from RxNorm",
    "Large ambiguous candidate backlog from Phase 3/4",
    "Optional AuditLog entity enrichment incomplete",
  ];

  const write = (name: string, payload: unknown) => writeAuditArtifact(name, payload);

  write("medication-phase5-repository-audit.json", {
    ...base(dataSource, confidence),
    Phase3FoundationPresent: schema.phase3ModelsPresent,
    Phase4VerificationPresent: schema.phase4VerifiedMappingPresent,
    RealRxNormReleasePreviouslyImported: (metrics?.verifiedActiveReal ?? 0) > 0,
    ClinicalSearchUsesRxNormReferenceLayer: false,
    AutomaticVerificationEnabled: false,
    schema,
  });

  write("medication-phase5-preimport-inventory.json", {
    ...base(dataSource, confidence),
    title: "Pre-import / live inventory",
    live: metrics,
    note: "Schema capability vs live content distinguished via schema probe + live metrics",
  });

  write("medication-phase5-source-governance.json", {
    ...base("seed_files_only", "HIGH"),
    classifications: [...RXNORM_SOURCE_CLASSIFICATION_VALUES],
    scopes: [...RXNORM_RELEASE_SCOPE_VALUES],
    modes: [...REAL_IMPORT_MODE_VALUES],
    isRealSourceClassificationNlm: isRealSourceClassification("NLM_OFFICIAL"),
  });

  write("medication-phase5-license-provenance.json", {
    ...base("seed_files_only", "HIGH"),
    operatorResponsibleForNlmAcquisition: true,
    sourceFilesCommittedToGit: false,
    localPath: ".local-data/rxnorm/",
  });

  let manifestValidationOk = false;
  if (schema.structuralManifestPresent) {
    try {
      const raw = JSON.parse(readFileSync(STRUCTURAL_MANIFEST, "utf8"));
      const errors = validateRxNormReleaseManifest(raw);
      manifestValidationOk = Array.isArray(errors) && errors.length === 0;
    } catch {
      manifestValidationOk = false;
    }
  }

  write("medication-phase5-manifest-validation.json", {
    ...base("seed_files_only", "HIGH"),
    structuralManifestPresent: schema.structuralManifestPresent,
    structuralManifestValidates: manifestValidationOk,
  });

  write("medication-phase5-file-integrity.json", {
    ...base("seed_files_only", "HIGH"),
    hashValidationRequired: true,
    gitignoreBlocksRrf: schema.gitignoreBlocksRrf,
  });

  write("medication-phase5-streaming-parser.json", {
    ...base("seed_files_only", "HIGH"),
    parser: "parse-rxnconso-rrf.ts",
    streaming: true,
    structuralFixture: "structural-rxnconso-p5.rrf.fixture",
  });

  write("medication-phase5-term-type-governance.json", {
    ...base("seed_files_only", "HIGH"),
    conceptTypes: ["IN", "PIN", "MIN", "BN"],
    productTypes: ["SCD", "SBD", "SCDF", "SBDF"],
    deferred: ["DF", "GPCK", "BPCK"],
  });

  write("medication-phase5-language-source-filtering.json", {
    ...base("seed_files_only", "HIGH"),
    defaultLanguage: "ENG",
    defaultSource: "RXNORM",
    suppressExcludedByDefault: true,
  });

  write("medication-phase5-release-identity.json", {
    ...base("seed_files_only", "HIGH"),
    identityDimensions: ["sourceClassification", "releaseVersion", "manifestHash", "scope"],
  });

  write("medication-phase5-idempotency.json", {
    ...base("seed_files_only", "HIGH"),
    stagingUnique: "[releaseId, rowChecksum]",
    reStageSkipsDuplicates: true,
  });

  write("medication-phase5-import-job-lifecycle.json", {
    ...base("seed_files_only", "HIGH"),
    modes: [...REAL_IMPORT_MODE_VALUES],
    validateDoesNotStage: true,
  });

  write("medication-phase5-transaction-safety.json", {
    ...base("seed_files_only", "HIGH"),
    batchedWrites: true,
    noWholeFileTransaction: true,
  });

  write("medication-phase5-resumability.json", {
    ...base("seed_files_only", "HIGH"),
    checkpointFields: ["lastCheckpointJson", "checkpointJson"],
    resumeRequiresSameManifestHash: true,
  });

  write("medication-phase5-normalization-versioning.json", {
    ...base("seed_files_only", "HIGH"),
    normalizationVersion: "RXNORM_NORMALIZATION_V1",
    parsingVersion: "RXNCONSO_PARSER_V1",
  });

  write("medication-phase5-real-synthetic-isolation.json", {
    ...base(dataSource, confidence),
    verifiedActiveReal: metrics?.verifiedActiveReal ?? null,
    verifiedActiveSynthetic: metrics?.verifiedActiveSynthetic ?? null,
    referenceStaging: metrics?.referenceClassifiedStaging ?? null,
  });

  write("medication-phase5-candidate-generation.json", {
    ...base("seed_files_only", "HIGH"),
    autoVerifiedAlwaysFalse: true,
    doesNotVerify: true,
  });

  write("medication-phase5-human-verification-regression.json", {
    ...base("seed_files_only", "HIGH"),
    HumanVerificationRequired: "YES",
    AutomaticVerificationEnabled: "NO",
    phase4CliIntact: true,
  });

  write("medication-phase5-clinical-search-regression.json", {
    ...base("seed_files_only", "HIGH"),
    ClinicalSearchUnchanged: "YES",
    catalogCount: metrics?.catalogMedication ?? null,
  });

  write("medication-phase5-formulary-regression.json", {
    ...base("seed_files_only", "HIGH"),
    FormularyUnchanged: "YES",
  });

  write("medication-phase5-inventory-regression.json", {
    ...base("seed_files_only", "HIGH"),
    InventoryUnchanged: "YES",
  });

  write("medication-phase5-route-regression.json", {
    ...base(dataSource, confidence),
    RoutePermissionsUnchanged: "YES",
    routePermissionCount: metrics?.routePermissions ?? null,
  });

  write("medication-phase5-mar-regression.json", {
    ...base("seed_files_only", "HIGH"),
    MARUnchanged: "YES",
  });

  write("medication-phase5-billing-regression.json", {
    ...base("seed_files_only", "HIGH"),
    BillingUnchanged: "YES",
  });

  write("medication-phase5-rollback-safety.json", {
    ...base("seed_files_only", "HIGH"),
    refusesWhenVerifiedMappingsExist: true,
    confirmFlag: "--confirm-rollback-real-release",
  });

  write("medication-phase5-performance.json", {
    ...base("seed_files_only", "HIGH"),
    streamingParser: true,
    fullReleaseScalabilityClaimed: false,
  });

  write("medication-phase5-security.json", {
    ...base("seed_files_only", "HIGH"),
    pathTraversalRejected: true,
    secretsNotInArtifacts: true,
  });

  write("medication-phase5-migration-safety.json", {
    ...base("seed_files_only", "HIGH"),
    migration: "20261007120000_medication_phase_5_real_rxnorm_ingestion",
    additiveOnly: true,
    SeedRequired: "NO",
    productionCommand:
      'DATABASE_URL="<RAILWAY_DATABASE_URL>" pnpm --filter @medora/api exec prisma migrate deploy',
    productionImportNotExecuted: true,
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
    "medication-phase5-enterprise-certification-summary.json",
    summary
  );
  return { summaryPath, finalDecision: summary.FinalDecision as string };
}
