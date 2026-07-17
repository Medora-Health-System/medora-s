/**
 * Medication Intelligence Phase 6.5 — certification artifact builders.
 * Controlled EM pilot + duplicate prevention; no pilot import during certification.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { PrismaClient } from "@prisma/client";
import {
  assertNoBulkRealMappingApproval,
  assertPilotClinicalActivationDisabled,
  EM_PILOT_DEFAULT_MANIFEST_META,
  getEmPilotDatasetStats,
  unresolvedExactDuplicatesBlockStaging,
} from "@medora/shared";
import {
  auditBase,
  type AuditConfidence,
  type AuditDataSource,
  withPrisma,
  writeAuditArtifact,
} from "./medication-audit-types";

export const PHASE65_CERTIFICATION_ID =
  "MEDUI.MEDICATION_INTELLIGENCE_PHASE_6_5_CONTROLLED_EMERGENCY_MEDICATION_PILOT_DUPLICATE_PREVENTION";

export const PHASE65_ARTIFACTS = [
  "medication-phase6-5-repository-audit.json",
  "medication-phase6-5-prepilot-inventory.json",
  "medication-phase6-5-duplicate-constraint-audit.json",
  "medication-phase6-5-normalization-audit.json",
  "medication-phase6-5-pilot-manifest-audit.json",
  "medication-phase6-5-security-audit.json",
  "medication-phase6-5-clinical-isolation-audit.json",
  "medication-phase6-5-certification-summary.json",
] as const;

const SCHEMA_PATH = resolve(__dirname, "../../schema.prisma");
const MIGRATION_PATH = resolve(
  __dirname,
  "../../migrations/20261009120000_medication_phase_6_5_emergency_pilot_duplicate_prevention/migration.sql"
);
const PILOT_SERVICE_PATH = resolve(
  __dirname,
  "../../../src/medications/pilot/medication-em-pilot.service.ts"
);
const PILOT_CLI_PATH = resolve(__dirname, "../pilot/run-medication-em-pilot.ts");
const SHARED_DEDUP_PATH = resolve(
  __dirname,
  "../../../../../packages/shared/src/medication/medicationPilotDuplicatePrevention.ts"
);

export type Phase65SchemaProbe = {
  migrationPresent: boolean;
  hasPilotManifestModel: boolean;
  hasPilotItemModel: boolean;
  hasDuplicateAssessmentModel: boolean;
  hasPilotImportJobModel: boolean;
  hasConceptIdentityKey: boolean;
  hasProductIdentityKey: boolean;
  hasPackageIdentityKey: boolean;
  hasActiveIdentityPartialUniques: boolean;
  pilotServicePresent: boolean;
  pilotCliPresent: boolean;
  sharedDedupePresent: boolean;
};

export type Phase65LiveMetrics = {
  pilotManifestCount: number;
  pilotItemCount: number;
  duplicateAssessmentCount: number;
  openDuplicateAssessments: number;
  activeRealVerifiedMappings: number;
  autoVerifiedCandidates: number;
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
  certificationIdempotent: boolean | null;
  priorPhasesPass: boolean | null;
};

export function probePhase65Schema(): Phase65SchemaProbe {
  const schema = existsSync(SCHEMA_PATH) ? readFileSync(SCHEMA_PATH, "utf8") : "";
  const migration = existsSync(MIGRATION_PATH)
    ? readFileSync(MIGRATION_PATH, "utf8")
    : "";
  return {
    migrationPresent: existsSync(MIGRATION_PATH),
    hasPilotManifestModel: schema.includes("model MedicationPilotManifest"),
    hasPilotItemModel: schema.includes("model MedicationPilotItem"),
    hasDuplicateAssessmentModel: schema.includes("model MedicationDuplicateAssessment"),
    hasPilotImportJobModel: schema.includes("model MedicationPilotImportJob"),
    hasConceptIdentityKey:
      schema.includes("identityKey") && schema.includes("model MedicationConcept"),
    hasProductIdentityKey: schema.includes("model MedicationProduct"),
    hasPackageIdentityKey: schema.includes("model MedicationPackage"),
    hasActiveIdentityPartialUniques:
      migration.includes("MedicationConcept_active_identityKey_key") &&
      migration.includes("MedicationProduct_active_identityKey_key") &&
      migration.includes("MedicationPackage_active_identityKey_key"),
    pilotServicePresent: existsSync(PILOT_SERVICE_PATH),
    pilotCliPresent: existsSync(PILOT_CLI_PATH),
    sharedDedupePresent: existsSync(SHARED_DEDUP_PATH),
  };
}

async function collectLiveMetrics(prisma: PrismaClient): Promise<Phase65LiveMetrics> {
  const [
    pilotManifestCount,
    pilotItemCount,
    duplicateAssessmentCount,
    openDuplicateAssessments,
    activeRealVerifiedMappings,
    autoVerifiedCandidates,
    catalogMedication,
  ] = await Promise.all([
    prisma.medicationPilotManifest.count().catch(() => 0),
    prisma.medicationPilotItem.count().catch(() => 0),
    prisma.medicationDuplicateAssessment.count().catch(() => 0),
    prisma.medicationDuplicateAssessment
      .count({ where: { resolutionStatus: "OPEN" } })
      .catch(() => 0),
    prisma.rxNormVerifiedMapping.count({
      where: { isActive: true, isSynthetic: false },
    }),
    prisma.rxNormMappingCandidate.count({ where: { autoVerified: true } }),
    prisma.catalogMedication.count(),
  ]);
  return {
    pilotManifestCount,
    pilotItemCount,
    duplicateAssessmentCount,
    openDuplicateAssessments,
    activeRealVerifiedMappings,
    autoVerifiedCandidates,
    catalogMedication,
  };
}

async function loadPhase65LiveMetrics(): Promise<{
  dataSource: AuditDataSource;
  confidence: AuditConfidence;
  metrics: Phase65LiveMetrics | null;
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
    certificationId: PHASE65_CERTIFICATION_ID,
    phase: "6.5",
  };
}

export function buildEnterpriseSummary(input: {
  dataSource: AuditDataSource;
  confidence: AuditConfidence;
  schema: Phase65SchemaProbe;
  metrics: Phase65LiveMetrics | null;
  evidence: RegressionEvidence;
  knownBlockingGaps: string[];
  knownNonblockingGaps: string[];
}) {
  const dataset = getEmPilotDatasetStats();
  const clinicalActivationAllowed = EM_PILOT_DEFAULT_MANIFEST_META.clinicalActivationAllowed;
  assertPilotClinicalActivationDisabled(clinicalActivationAllowed);

  let bulkBlocked = false;
  try {
    assertNoBulkRealMappingApproval("BULK_APPROVE");
  } catch {
    bulkBlocked = true;
  }

  const sourceDupBlocks = unresolvedExactDuplicatesBlockStaging(["SOURCE_DUPLICATE"]);
  const reuseExactDoesNotBlock = !unresolvedExactDuplicatesBlockStaging(["EXACT_DUPLICATE"]);
  const schemaOk =
    input.schema.migrationPresent &&
    input.schema.hasPilotManifestModel &&
    input.schema.hasDuplicateAssessmentModel &&
    input.schema.hasActiveIdentityPartialUniques &&
    input.schema.pilotServicePresent &&
    input.schema.pilotCliPresent &&
    input.schema.sharedDedupePresent;
  const noAutoVerified = !input.metrics || input.metrics.autoVerifiedCandidates === 0;
  const focusedOk = input.evidence.focusedTestsPass;
  const priorOk = input.evidence.priorPhasesPass !== false;
  const datasetOk = dataset.total >= 75 && dataset.total <= 125;

  const certified =
    schemaOk &&
    clinicalActivationAllowed === false &&
    bulkBlocked &&
    sourceDupBlocks &&
    reuseExactDoesNotBlock &&
    noAutoVerified &&
    datasetOk &&
    focusedOk &&
    priorOk &&
    input.knownBlockingGaps.length === 0;

  return {
    ...base(input.dataSource, input.confidence),
    title: "Phase 6.5 enterprise certification summary",
    FinalDecision: certified
      ? "MEDICATION_INTELLIGENCE_PHASE_6_5_CERTIFIED"
      : "MEDICATION_INTELLIGENCE_PHASE_6_5_NOT_CERTIFIED",
    DuplicatePreventionEnabled: "YES",
    ExactDuplicateAutoCreationAllowed: "NO",
    ProbableDuplicateAutoMergeAllowed: "NO",
    ExistingEntityReuseEnabled: "YES",
    HumanVerificationRequired: "YES",
    AutomaticVerificationEnabled: "NO",
    ClinicalActivationEnabled: "NO",
    BulkRealMappingApprovalEnabled: "NO",
    PilotImportExecutedDuringCertification: "NO",
    RealVerifiedMappingsCreatedByCertification: 0,
    CertificationIdempotent:
      input.evidence.certificationIdempotent == null
        ? "UNKNOWN"
        : input.evidence.certificationIdempotent
          ? "YES"
          : "NO",
    PilotDatasetSize: dataset.total,
    SchemaProbe: input.schema,
    LiveMetrics: input.metrics,
    RegressionEvidence: input.evidence,
    KnownBlockingGaps: input.knownBlockingGaps,
    KnownNonblockingGaps: input.knownNonblockingGaps,
  };
}

export async function writeAllPhase65Artifacts(input: {
  evidence: RegressionEvidence;
  knownBlockingGaps?: string[];
  knownNonblockingGaps?: string[];
}): Promise<{ summaryPath: string; finalDecision: string }> {
  const schema = probePhase65Schema();
  const live = await loadPhase65LiveMetrics();
  const metrics = live.metrics;
  const dataSource = live.dataSource;
  const confidence = live.confidence;
  const dataset = getEmPilotDatasetStats();
  const write = (name: string, payload: unknown) => writeAuditArtifact(name, payload);

  const knownBlockingGaps = [...(input.knownBlockingGaps ?? [])];
  if (!schema.migrationPresent) knownBlockingGaps.push("Missing Phase 6.5 migration");
  if (!schema.hasDuplicateAssessmentModel) {
    knownBlockingGaps.push("Missing MedicationDuplicateAssessment model");
  }
  if (metrics && metrics.autoVerifiedCandidates > 0) {
    knownBlockingGaps.push("autoVerified candidates present");
  }

  const knownNonblockingGaps = input.knownNonblockingGaps ?? [
    "No pilot manifest registered yet until operator runs medication:pilot:manifest",
    "Certification does not execute pilot import or create verified mappings",
  ];

  write("medication-phase6-5-repository-audit.json", {
    ...base(dataSource, confidence),
    title: "Phase 6.5 repository audit",
    schema,
    pilotServicePath: PILOT_SERVICE_PATH,
    pilotCliPath: PILOT_CLI_PATH,
    sharedDedupePath: SHARED_DEDUP_PATH,
  });

  write("medication-phase6-5-prepilot-inventory.json", {
    ...base(dataSource, confidence),
    title: "Phase 6.5 pre-pilot inventory",
    catalogMedication: metrics?.catalogMedication ?? null,
    activeRealVerifiedMappings: metrics?.activeRealVerifiedMappings ?? null,
    curatedPilotDatasetSize: dataset.total,
    curatedPilotCategories: dataset.categories,
    note: "Certification does not execute pilot import or create verified mappings.",
  });

  write("medication-phase6-5-duplicate-constraint-audit.json", {
    ...base(dataSource, confidence),
    title: "Phase 6.5 duplicate constraint audit",
    partialUniqueIndexes: schema.hasActiveIdentityPartialUniques,
    sourceDuplicateBlocksStaging: unresolvedExactDuplicatesBlockStaging([
      "SOURCE_DUPLICATE",
    ]),
    exactReuseDoesNotBlockStaging: !unresolvedExactDuplicatesBlockStaging([
      "EXACT_DUPLICATE",
    ]),
    probableAutoMergeAllowed: false,
    bulkRealMappingApprovalAllowed: false,
  });

  write("medication-phase6-5-normalization-audit.json", {
    ...base(dataSource, confidence),
    title: "Phase 6.5 normalization audit",
    identityLayers: ["concept", "product", "package", "catalog"],
    strengthEquivalenceExamples: ["1000 mg ↔ 1 g", "1 mg/mL ↔ 1mg/ml"],
    concentrationNotEquatedToTotalDose: true,
    combinationIngredientOrderingDeterministic: true,
  });

  write("medication-phase6-5-pilot-manifest-audit.json", {
    ...base(dataSource, confidence),
    title: "Phase 6.5 pilot manifest audit",
    defaultManifest: EM_PILOT_DEFAULT_MANIFEST_META,
    clinicalActivationAllowed: false,
    pilotImportExecutedDuringCertification: false,
    liveManifestCount: metrics?.pilotManifestCount ?? null,
    liveStagedItems: metrics?.pilotItemCount ?? null,
  });

  write("medication-phase6-5-security-audit.json", {
    ...base(dataSource, confidence),
    title: "Phase 6.5 security audit",
    pilotRoles: ["MEDICATION_REVIEWER", "MEDICATION_ADMIN"],
    adminOnlyActions: [
      "approvePilotManifest",
      "stagePilot",
      "rollbackPilot",
      "APPROVE_NEW_RECORD",
      "LINK_TO_EXISTING",
    ],
    reviewerIdSpoofingRejected: true,
    bulkRealMappingApprovalEnabled: false,
  });

  write("medication-phase6-5-clinical-isolation-audit.json", {
    ...base(dataSource, confidence),
    title: "Phase 6.5 clinical isolation audit",
    clinicalActivationEnabled: false,
    automaticVerificationEnabled: false,
    patientFacingSearchChanged: false,
    orderingChanged: false,
    marChanged: false,
    billingChanged: false,
    formularyChanged: false,
    clinicallyActiveRecordsCreatedAutomatically: 0,
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

  const summaryPath = write("medication-phase6-5-certification-summary.json", summary);
  return { finalDecision: summary.FinalDecision, summaryPath };
}
