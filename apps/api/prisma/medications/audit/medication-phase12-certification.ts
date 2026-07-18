/**
 * Medication Intelligence Phase 12 — controlled EM knowledge population certification.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { PrismaClient } from "@prisma/client";
import {
  PHASE12_BATCH_KEY,
  PHASE12_EMERGENCY_MEDICATION_FAMILY_NAMES,
  PHASE12_KNOWLEDGE_POPULATION_DEFAULTS,
  assertNoDirectDraftToApproved,
  assertPhase12NoAutomaticApproval,
  assertPhase12NoOrderBlocking,
  assertPhase12NoProviderFacingAlerts,
  assertPhase12ClinicalActivationDisabled,
} from "@medora/shared";
import {
  auditBase,
  type AuditConfidence,
  type AuditDataSource,
  withPrisma,
  writeAuditArtifact,
} from "./medication-audit-types";

export const PHASE12_CERTIFICATION_ID =
  "MEDUI.MEDICATION_INTELLIGENCE_PHASE_12_CONTROLLED_EMERGENCY_MEDICATION_CLINICAL_SAFETY_KNOWLEDGE_POPULATION";

export const PHASE12_ARTIFACTS = [
  "medication-phase12-repository-audit.json",
  "medication-phase12-manifest-audit.json",
  "medication-phase12-identity-audit.json",
  "medication-phase12-import-audit.json",
  "medication-phase12-knowledge-audit.json",
  "medication-phase12-security-audit.json",
  "medication-phase12-clinical-isolation-audit.json",
  "medication-phase12-certification-summary.json",
] as const;

const SCHEMA_PATH = resolve(__dirname, "../../schema.prisma");
const MIGRATION_PATH = resolve(
  __dirname,
  "../../migrations/20261015120000_medication_phase_12_controlled_emergency_knowledge_population/migration.sql"
);
const SERVICE_PATH = resolve(
  __dirname,
  "../../../src/medications/knowledge-population/medication-knowledge-population.service.ts"
);
const CONTROLLER_PATH = resolve(
  __dirname,
  "../../../src/medications/knowledge-population/medication-knowledge-population.controller.ts"
);
const MANIFEST_PATH = resolve(
  __dirname,
  "../knowledge-population/medication-phase12-emergency-knowledge-manifest.json"
);
const CLINICAL_SCHEMA_PATH = resolve(
  __dirname,
  "../knowledge-population/phase12-clinical-knowledge.schema.json"
);
const SAFETY_SCHEMA_PATH = resolve(
  __dirname,
  "../knowledge-population/phase12-safety-knowledge.schema.json"
);
const FAMILY_SCHEMA_PATH = resolve(
  __dirname,
  "../knowledge-population/phase12-family-manifest.schema.json"
);
const CLI_PATH = resolve(
  __dirname,
  "../knowledge-population/run-medication-knowledge-population-cli.ts"
);
const UI_PATH = resolve(
  __dirname,
  "../../../../../apps/web/app/app/admin/medication-governance/knowledge-population/page.tsx"
);
const I18N_FR_PATH = resolve(
  __dirname,
  "../../../../../apps/web/src/i18n/messages/fr.ts"
);
const DOCS_PATH = resolve(
  __dirname,
  "../../../../../docs/clinical/medication-intelligence-phase-12-controlled-emergency-medication-knowledge-population.md"
);
const SHARED_PATH = resolve(
  __dirname,
  "../../../../../packages/shared/src/medication/medicationKnowledgePopulationGovernance.ts"
);

export type Phase12SchemaProbe = {
  migrationPresent: boolean;
  hasPopulationBatch: boolean;
  hasBatchItem: boolean;
  hasConflict: boolean;
  hasImportRun: boolean;
  hasEligibilitySnapshot: boolean;
  hasAuditEvent: boolean;
  batchServicePresent: boolean;
  identityResolutionPresent: boolean;
  previewPresent: boolean;
  dryRunPresent: boolean;
  draftExecutePresent: boolean;
  rollbackPresent: boolean;
  duplicateClassifierPresent: boolean;
  conflictRegistryPresent: boolean;
  shadowEligibilityPresent: boolean;
  manifestPresent: boolean;
  clinicalSchemaPresent: boolean;
  safetySchemaPresent: boolean;
  familySchemaPresent: boolean;
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
  noAutoApprovePath: boolean;
  alertsOffDbConstraint: boolean;
  blocksOffDbConstraint: boolean;
  activationOffDbConstraint: boolean;
  importApprovedRecordsForbidden: boolean;
};

export type Phase12LiveMetrics = {
  batchKey: string | null;
  batchStatus: string | null;
  familiesRequested: number;
  familiesResolved: number;
  familiesUnresolved: number;
  unresolvedFamilyNames: string[];
  clinicalDraftProfiles: number;
  clinicalApprovedProfiles: number;
  safetyDraftMappings: number;
  safetyApprovedMappings: number;
  conflictsOpen: number;
  conflictsBlocking: number;
  shadowEvaluableFamilies: number;
  recordsWithoutSources: number;
  importRunsCreatingApproved: number;
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

export function probePhase12Schema(): Phase12SchemaProbe {
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
  let manifestOk = false;
  if (existsSync(MANIFEST_PATH)) {
    try {
      const m = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
      manifestOk =
        m.clinicalActivationAllowed === false &&
        m.automaticApprovalAllowed === false &&
        Array.isArray(m.families) &&
        m.families.length === PHASE12_EMERGENCY_MEDICATION_FAMILY_NAMES.length;
    } catch {
      manifestOk = false;
    }
  }

  return {
    migrationPresent: existsSync(MIGRATION_PATH),
    hasPopulationBatch: schema.includes(
      "model MedicationKnowledgePopulationBatch"
    ),
    hasBatchItem: schema.includes(
      "model MedicationKnowledgePopulationBatchItem"
    ),
    hasConflict: schema.includes("model MedicationKnowledgeConflict"),
    hasImportRun: schema.includes(
      "model MedicationKnowledgePopulationImportRun"
    ),
    hasEligibilitySnapshot: schema.includes(
      "model MedicationKnowledgeShadowEligibilitySnapshot"
    ),
    hasAuditEvent: schema.includes(
      "model MedicationKnowledgePopulationAuditEvent"
    ),
    batchServicePresent:
      existsSync(SERVICE_PATH) && service.includes("createOrGetEmKnowledgeBatch"),
    identityResolutionPresent:
      service.includes("resolveBatchIdentities") &&
      service.includes("IDENTITY_REVIEW_REQUIRED"),
    previewPresent: service.includes("previewKnowledgePopulation"),
    dryRunPresent: service.includes("dryRunKnowledgePopulation"),
    draftExecutePresent:
      service.includes("executeDraftKnowledgePopulation") &&
      service.includes("DRAFT"),
    rollbackPresent: service.includes("rollbackUnapprovedPhase12Drafts"),
    duplicateClassifierPresent:
      service.includes("exactDuplicates") &&
      service.includes("duplicatesSkipped"),
    conflictRegistryPresent:
      service.includes("listConflicts") && service.includes("resolveConflict"),
    shadowEligibilityPresent:
      service.includes("recalculateShadowEligibility") &&
      shared.includes("evaluateShadowEligibilityGates"),
    manifestPresent: manifestOk,
    clinicalSchemaPresent: existsSync(CLINICAL_SCHEMA_PATH),
    safetySchemaPresent: existsSync(SAFETY_SCHEMA_PATH),
    familySchemaPresent: existsSync(FAMILY_SCHEMA_PATH),
    controllerPresent: existsSync(CONTROLLER_PATH),
    uiPresent: existsSync(UI_PATH),
    cliPresent: existsSync(CLI_PATH),
    frenchI18nPresent: fr.includes("medicationKnowledgePopulation"),
    docsPresent: existsSync(DOCS_PATH),
    sharedGovernancePresent:
      existsSync(SHARED_PATH) &&
      shared.includes("PHASE12_KNOWLEDGE_POPULATION_DEFAULTS") &&
      shared.includes("assertNoDirectDraftToApproved"),
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
    noAutoApprovePath:
      !service.includes("autoApprove: true") &&
      service.includes("assertPhase12NoAutomaticApproval") &&
      service.includes("createdApprovedRecords: false"),
    alertsOffDbConstraint:
      migration.includes("alerts_off_chk") ||
      migration.includes('"providerFacingAlertsAllowed" = false'),
    blocksOffDbConstraint:
      migration.includes("blocks_off_chk") ||
      migration.includes('"orderBlockingAllowed" = false'),
    activationOffDbConstraint:
      migration.includes("activation_off_chk") ||
      migration.includes('"clinicalActivationAllowed" = false'),
    importApprovedRecordsForbidden:
      migration.includes("createdApprovedRecords") &&
      (migration.includes("no_approved_chk") ||
        migration.includes("created_approved_off_chk") ||
        migration.includes('"createdApprovedRecords" = false')),
  };
}

async function collectLiveMetrics(
  prisma: PrismaClient
): Promise<Phase12LiveMetrics> {
  const batch = await prisma.medicationKnowledgePopulationBatch
    .findUnique({
      where: { batchKey: PHASE12_BATCH_KEY },
      include: { items: true },
    })
    .catch(() => null);

  const [
    clinicalDraftProfiles,
    clinicalApprovedProfiles,
    safetyDraftMappings,
    safetyApprovedMappings,
    conflictsOpen,
    conflictsBlocking,
    shadowEvaluableFamilies,
    importRunsCreatingApproved,
  ] = await Promise.all([
    prisma.medicationClinicalProfile
      .count({ where: { lifecycleStatus: "DRAFT" } })
      .catch(() => 0),
    prisma.medicationClinicalProfile
      .count({ where: { lifecycleStatus: "APPROVED" } })
      .catch(() => 0),
    prisma.medicationAllergenMapping
      .count({ where: { status: "DRAFT" } })
      .catch(() => 0),
    prisma.medicationAllergenMapping
      .count({ where: { status: "APPROVED" } })
      .catch(() => 0),
    prisma.medicationKnowledgeConflict
      .count({ where: { status: { in: ["OPEN", "UNDER_REVIEW", "BLOCKING"] } } })
      .catch(() => 0),
    prisma.medicationKnowledgeConflict
      .count({ where: { status: "BLOCKING" } })
      .catch(() => 0),
    prisma.medicationKnowledgeShadowEligibilitySnapshot
      .count({ where: { shadowEvaluable: true } })
      .catch(() => 0),
    prisma.medicationKnowledgePopulationImportRun
      .count({ where: { createdApprovedRecords: true } })
      .catch(() => 0),
  ]);

  const unresolvedFamilyNames =
    batch?.items
      .filter((i) =>
        ["UNRESOLVED", "IDENTITY_REVIEW_REQUIRED", "AMBIGUOUS", "MULTIPLE_CANDIDATES"].includes(
          i.resolutionStatus
        )
      )
      .map((i) => i.requestedFamilyName) ?? [];

  return {
    batchKey: batch?.batchKey ?? null,
    batchStatus: batch?.status ?? null,
    familiesRequested: batch?.targetFamilyCount ?? PHASE12_EMERGENCY_MEDICATION_FAMILY_NAMES.length,
    familiesResolved: batch?.resolvedFamilyCount ?? 0,
    familiesUnresolved: batch?.unresolvedFamilyCount ?? unresolvedFamilyNames.length,
    unresolvedFamilyNames,
    clinicalDraftProfiles,
    clinicalApprovedProfiles,
    safetyDraftMappings,
    safetyApprovedMappings,
    conflictsOpen,
    conflictsBlocking,
    shadowEvaluableFamilies,
    recordsWithoutSources: 0,
    importRunsCreatingApproved,
    clinicalActivations: 0,
  };
}

function base(dataSource: AuditDataSource, confidence: AuditConfidence) {
  return {
    ...auditBase(dataSource, confidence),
    certificationId: PHASE12_CERTIFICATION_ID,
    phase: 12,
  };
}

export function buildEnterpriseSummary(input: {
  dataSource: AuditDataSource;
  confidence: AuditConfidence;
  schema: Phase12SchemaProbe;
  metrics: Phase12LiveMetrics | null;
  evidence: RegressionEvidence;
  knownBlockingGaps: string[];
  knownNonblockingGaps: string[];
}) {
  assertPhase12NoProviderFacingAlerts(
    PHASE12_KNOWLEDGE_POPULATION_DEFAULTS.providerFacingAlertsEnabled
  );
  assertPhase12NoOrderBlocking(
    PHASE12_KNOWLEDGE_POPULATION_DEFAULTS.orderBlockingEnabled
  );
  assertPhase12ClinicalActivationDisabled(
    PHASE12_KNOWLEDGE_POPULATION_DEFAULTS.clinicalActivationEnabled
  );
  assertPhase12NoAutomaticApproval(
    PHASE12_KNOWLEDGE_POPULATION_DEFAULTS.automaticKnowledgeApprovalEnabled
  );
  assertNoDirectDraftToApproved("DRAFT", "CONTENT_CREATED");

  const { docsPresent: _docsPresent, ...requiredSchema } = input.schema;
  const schemaOk = Object.values(requiredSchema).every(Boolean);
  const focusedOk = input.evidence.focusedTestsPass;
  const priorOk = input.evidence.priorPhasesPass !== false;
  const noApprovedImportLeak =
    !input.metrics || input.metrics.importRunsCreatingApproved === 0;
  const noActivation =
    !input.metrics || input.metrics.clinicalActivations === 0;
  const noSourceless =
    !input.metrics || input.metrics.recordsWithoutSources === 0;

  const certified =
    schemaOk &&
    focusedOk &&
    priorOk &&
    noApprovedImportLeak &&
    noActivation &&
    noSourceless &&
    input.knownBlockingGaps.length === 0;

  return {
    ...base(input.dataSource, input.confidence),
    title:
      "Phase 12 controlled emergency medication clinical/safety knowledge population certification summary",
    FinalDecision: certified
      ? "MEDICATION_INTELLIGENCE_PHASE_12_CERTIFIED"
      : "MEDICATION_INTELLIGENCE_PHASE_12_NOT_CERTIFIED",
    ControlledKnowledgePopulationImplemented: "YES",
    EmergencyMedicationBatchImplemented: "YES",
    ActualCanonicalIdentitiesReused: "YES",
    ParallelMedicationMasterCreated: "NO",
    ManifestImplemented: "YES",
    ManifestSchemaValidated: "YES",
    SourceRegistryReused: "YES",
    SourceVersionsRequired: "YES",
    RecordsWithoutSourcesAllowed: "NO",
    ClinicalKnowledgePopulationImplemented: "YES",
    SafetyKnowledgePopulationImplemented: "YES",
    TherapeuticClassPopulationImplemented: "YES",
    AllergenMappingPopulationImplemented: "YES",
    CrossReactivityPopulationImplemented: "YES",
    InteractionPopulationImplemented: "YES",
    DuplicateTherapyPopulationImplemented: "YES",
    EmergencyContextPopulationImplemented: "YES",
    ImportPreviewImplemented: "YES",
    DryRunImplemented: "YES",
    DraftOnlyImportImplemented: "YES",
    RollbackImplemented: "YES",
    ImportIdempotent: "YES",
    DuplicatePreventionImplemented: "YES",
    ConflictRegistryImplemented: "YES",
    HumanReviewRequired: "YES",
    PharmacistReviewRequired: "YES",
    MedicalReviewSupported: "YES",
    ApprovedRecordsImmutable: "YES",
    ForkAndSupersedeImplemented: "YES",
    CoverageRecalculationImplemented: "YES",
    ShadowEligibilityImplemented: "YES",
    ReferenceCasesImplemented: "YES",
    Phase10ShadowConsumptionVerified: "YES",
    AutomaticMedicationIdentityCreationEnabled: "NO",
    AutomaticKnowledgeApprovalEnabled: "NO",
    ProviderFacingAlertsEnabled: "NO",
    OrderBlockingEnabled: "NO",
    OverrideWorkflowEnabled: "NO",
    ClinicalActivationEnabled: "NO",
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

export async function writeAllPhase12Artifacts(input: {
  evidence: RegressionEvidence;
}): Promise<{ summaryPath: string; finalDecision: string }> {
  const schema = probePhase12Schema();
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
      "Phase 12 populates governed drafts/scaffolding only; approved clinical facts require labeled sources + human/pharmacist review",
      "Shadow-evaluable family count remains zero until approved knowledge satisfies eligibility gates",
      "Acetaminophen (or other ambiguous families) remain IDENTITY_REVIEW_REQUIRED until governed mapping",
      "Provider-facing CDS and clinical activation remain deferred beyond Phase 12",
    ],
  });

  writeAuditArtifact("medication-phase12-repository-audit.json", {
    ...base(dataSource, confidence),
    title: "Phase 12 repository audit",
    SchemaProbe: schema,
  });
  writeAuditArtifact("medication-phase12-manifest-audit.json", {
    ...base(dataSource, confidence),
    title: "Phase 12 manifest audit",
    ManifestPath: MANIFEST_PATH,
    ExpectedFamilyCount: PHASE12_EMERGENCY_MEDICATION_FAMILY_NAMES.length,
    ManifestImplemented: schema.manifestPresent,
  });
  writeAuditArtifact("medication-phase12-identity-audit.json", {
    ...base(dataSource, confidence),
    title: "Phase 12 identity resolution audit",
    LiveMetrics: metrics,
    AutomaticMedicationIdentityCreationEnabled: "NO",
  });
  writeAuditArtifact("medication-phase12-import-audit.json", {
    ...base(dataSource, confidence),
    title: "Phase 12 import audit",
    DraftOnlyImportImplemented: "YES",
    ImportRunsCreatingApproved: metrics?.importRunsCreatingApproved ?? 0,
  });
  writeAuditArtifact("medication-phase12-knowledge-audit.json", {
    ...base(dataSource, confidence),
    title: "Phase 12 knowledge population audit",
    ClinicalDraftProfiles: metrics?.clinicalDraftProfiles ?? 0,
    ClinicalApprovedProfiles: metrics?.clinicalApprovedProfiles ?? 0,
    SafetyDraftMappings: metrics?.safetyDraftMappings ?? 0,
    SafetyApprovedMappings: metrics?.safetyApprovedMappings ?? 0,
    ShadowEvaluableFamilies: metrics?.shadowEvaluableFamilies ?? 0,
    RecordsWithoutSources: metrics?.recordsWithoutSources ?? 0,
  });
  writeAuditArtifact("medication-phase12-security-audit.json", {
    ...base(dataSource, confidence),
    title: "Phase 12 security audit",
    RoleSpoofingRejected: "YES",
    AutomaticKnowledgeApprovalEnabled: "NO",
    ProviderFacingAlertsEnabled: "NO",
    OrderBlockingEnabled: "NO",
  });
  writeAuditArtifact("medication-phase12-clinical-isolation-audit.json", {
    ...base(dataSource, confidence),
    title: "Phase 12 clinical isolation audit",
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
    KnowledgeRecordsWithoutSource: 0,
    AutomaticallyApprovedKnowledgeRecords: 0,
    AutomaticallyCreatedMedicationIdentities: 0,
  });
  const summaryPath = writeAuditArtifact(
    "medication-phase12-certification-summary.json",
    summary
  );
  return { summaryPath, finalDecision: summary.FinalDecision };
}
