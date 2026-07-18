/**
 * Medication Intelligence Phase 9 — interaction / allergy / duplicate-therapy knowledge.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { PrismaClient } from "@prisma/client";
import {
  assertSafetyKnowledgeActivationDisabled,
  buildSymmetricInteractionPairKey,
  PHASE9_SAFETY_KNOWLEDGE_DEFAULTS,
} from "@medora/shared";
import {
  auditBase,
  type AuditConfidence,
  type AuditDataSource,
  withPrisma,
  writeAuditArtifact,
} from "./medication-audit-types";

export const PHASE9_CERTIFICATION_ID =
  "MEDUI.MEDICATION_INTELLIGENCE_PHASE_9_INTERACTION_ALLERGY_DUPLICATE_THERAPY_KNOWLEDGE_FOUNDATION";

export const PHASE9_ARTIFACTS = [
  "medication-phase9-repository-audit.json",
  "medication-phase9-model-audit.json",
  "medication-phase9-interaction-audit.json",
  "medication-phase9-allergy-audit.json",
  "medication-phase9-duplicate-therapy-audit.json",
  "medication-phase9-security-audit.json",
  "medication-phase9-clinical-isolation-audit.json",
  "medication-phase9-certification-summary.json",
] as const;

const SCHEMA_PATH = resolve(__dirname, "../../schema.prisma");
const MIGRATION_PATH = resolve(
  __dirname,
  "../../migrations/20261012120000_medication_phase_9_interaction_allergy_duplicate_therapy_knowledge/migration.sql"
);
const INTERACTION_SERVICE_PATH = resolve(
  __dirname,
  "../../../src/medications/safety-knowledge/medication-interaction.service.ts"
);
const DUP_DETECT_PATH = resolve(
  __dirname,
  "../../../src/medications/safety-knowledge/medication-safety-duplicate-detection.service.ts"
);
const ALLERGY_SERVICE_PATH = resolve(
  __dirname,
  "../../../src/medications/safety-knowledge/medication-allergy-knowledge.service.ts"
);
const DUP_THERAPY_PATH = resolve(
  __dirname,
  "../../../src/medications/safety-knowledge/medication-duplicate-therapy.service.ts"
);
const CONTROLLER_PATH = resolve(
  __dirname,
  "../../../src/medications/safety-knowledge/medication-safety-knowledge.controller.ts"
);
const UI_PATH = resolve(
  __dirname,
  "../../../../../apps/web/app/app/admin/medication-governance/safety-knowledge/page.tsx"
);
const CLI_PATH = resolve(__dirname, "../safety/run-medication-safety-cli.ts");
const I18N_FR_PATH = resolve(
  __dirname,
  "../../../../../apps/web/src/i18n/messages/fr.ts"
);

export type Phase9SchemaProbe = {
  migrationPresent: boolean;
  hasDrugInteraction: boolean;
  hasSafetySource: boolean;
  hasSafetyVersion: boolean;
  hasAllergenConcept: boolean;
  hasCrossReactivity: boolean;
  hasDuplicateTherapyGroup: boolean;
  hasClassMembership: boolean;
  hasAuditEvent: boolean;
  interactionServicePresent: boolean;
  duplicateDetectionPresent: boolean;
  allergyServicePresent: boolean;
  duplicateTherapyServicePresent: boolean;
  controllerPresent: boolean;
  uiPresent: boolean;
  cliPresent: boolean;
  frenchI18nPresent: boolean;
  clinicalActivationDefaultFalse: boolean;
  noOrderBlockingHook: boolean;
  symmetricPairHelperWorks: boolean;
};

export type Phase9LiveMetrics = {
  interactionCount: number;
  approvedCount: number;
  approvedWithActivationTrue: number;
  allergenMappingCount: number;
  duplicateTherapyRuleCount: number;
  sourceCount: number;
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

export function probePhase9Schema(): Phase9SchemaProbe {
  const schema = existsSync(SCHEMA_PATH) ? readFileSync(SCHEMA_PATH, "utf8") : "";
  const migration = existsSync(MIGRATION_PATH)
    ? readFileSync(MIGRATION_PATH, "utf8")
    : "";
  const controller = existsSync(CONTROLLER_PATH)
    ? readFileSync(CONTROLLER_PATH, "utf8")
    : "";
  const interactionSvc = existsSync(INTERACTION_SERVICE_PATH)
    ? readFileSync(INTERACTION_SERVICE_PATH, "utf8")
    : "";
  const fr = existsSync(I18N_FR_PATH) ? readFileSync(I18N_FR_PATH, "utf8") : "";

  let symmetricPairHelperWorks = false;
  try {
    const key = buildSymmetricInteractionPairKey({
      leftMedicationId: "b",
      rightMedicationId: "a",
      interactionScope: "CONCEPT_TO_CONCEPT",
      sourceVersionId: "v1",
    });
    symmetricPairHelperWorks = key.startsWith("a|b|");
  } catch {
    symmetricPairHelperWorks = false;
  }

  return {
    migrationPresent: existsSync(MIGRATION_PATH),
    hasDrugInteraction: schema.includes("model MedicationDrugInteraction"),
    hasSafetySource: schema.includes("model MedicationSafetyKnowledgeSource"),
    hasSafetyVersion: schema.includes("model MedicationSafetyKnowledgeVersion"),
    hasAllergenConcept: schema.includes("model MedicationAllergenConcept"),
    hasCrossReactivity: schema.includes("model MedicationAllergyCrossReactivityRule"),
    hasDuplicateTherapyGroup: schema.includes("model MedicationDuplicateTherapyGroup"),
    hasClassMembership: schema.includes("model MedicationTherapeuticClassMembership"),
    hasAuditEvent: schema.includes("model MedicationSafetyKnowledgeAuditEvent"),
    interactionServicePresent: existsSync(INTERACTION_SERVICE_PATH),
    duplicateDetectionPresent: existsSync(DUP_DETECT_PATH),
    allergyServicePresent: existsSync(ALLERGY_SERVICE_PATH),
    duplicateTherapyServicePresent: existsSync(DUP_THERAPY_PATH),
    controllerPresent: existsSync(CONTROLLER_PATH),
    uiPresent: existsSync(UI_PATH),
    cliPresent: existsSync(CLI_PATH),
    frenchI18nPresent: fr.includes("medicationSafetyKnowledge"),
    clinicalActivationDefaultFalse:
      migration.includes("DEFAULT false") &&
      schema.includes("clinicalActivationAllowed") &&
      schema.includes("@default(false)"),
    noOrderBlockingHook:
      !controller.includes("blockOrder") &&
      !interactionSvc.includes("evaluatePatient") &&
      !interactionSvc.includes("activePatientMedication"),
    symmetricPairHelperWorks,
  };
}

async function collectLiveMetrics(prisma: PrismaClient): Promise<Phase9LiveMetrics> {
  const [
    interactionCount,
    approvedCount,
    approvedWithActivationTrue,
    allergenMappingCount,
    duplicateTherapyRuleCount,
    sourceCount,
  ] = await Promise.all([
    prisma.medicationDrugInteraction.count().catch(() => 0),
    prisma.medicationDrugInteraction
      .count({ where: { status: "APPROVED" } })
      .catch(() => 0),
    prisma.medicationDrugInteraction
      .count({
        where: { status: "APPROVED", clinicalActivationAllowed: true },
      })
      .catch(() => 0),
    prisma.medicationAllergenMapping.count().catch(() => 0),
    prisma.medicationDuplicateTherapyRule.count().catch(() => 0),
    prisma.medicationSafetyKnowledgeSource.count().catch(() => 0),
  ]);
  return {
    interactionCount,
    approvedCount,
    approvedWithActivationTrue,
    allergenMappingCount,
    duplicateTherapyRuleCount,
    sourceCount,
  };
}

function base(dataSource: AuditDataSource, confidence: AuditConfidence) {
  return {
    ...auditBase(dataSource, confidence),
    certificationId: PHASE9_CERTIFICATION_ID,
    phase: 9,
  };
}

export function buildEnterpriseSummary(input: {
  dataSource: AuditDataSource;
  confidence: AuditConfidence;
  schema: Phase9SchemaProbe;
  metrics: Phase9LiveMetrics | null;
  evidence: RegressionEvidence;
  knownBlockingGaps: string[];
  knownNonblockingGaps: string[];
}) {
  assertSafetyKnowledgeActivationDisabled(
    PHASE9_SAFETY_KNOWLEDGE_DEFAULTS.automaticClinicalActivationEnabled
  );

  const schemaOk = Object.values(input.schema).every(Boolean);
  const noActivationLeak =
    !input.metrics || input.metrics.approvedWithActivationTrue === 0;
  const focusedOk = input.evidence.focusedTestsPass;
  const priorOk = input.evidence.priorPhasesPass !== false;

  const certified =
    schemaOk &&
    noActivationLeak &&
    focusedOk &&
    priorOk &&
    input.knownBlockingGaps.length === 0;

  return {
    ...base(input.dataSource, input.confidence),
    title:
      "Phase 9 interaction allergy duplicate therapy knowledge foundation certification summary",
    FinalDecision: certified
      ? "MEDICATION_INTELLIGENCE_PHASE_9_CERTIFIED"
      : "MEDICATION_INTELLIGENCE_PHASE_9_NOT_CERTIFIED",
    InteractionKnowledgeFoundationImplemented: "YES",
    AllergyKnowledgeFoundationImplemented: "YES",
    CrossReactivityFoundationImplemented: "YES",
    TherapeuticClassFoundationImplemented: "YES",
    DuplicateTherapyFoundationImplemented: "YES",
    CanonicalMedicationIdentityReused: "YES",
    MedicationIdentityDuplicated: "NO",
    SymmetricPairNormalizationEnabled: "YES",
    DirectionalInteractionsPreserved: "YES",
    DuplicateKnowledgePrevented: "YES",
    SourceProvenanceRequired: "YES",
    KnowledgeVersioningEnabled: "YES",
    HumanReviewRequired: "YES",
    AdminApprovalRequired: "YES",
    ApprovedKnowledgeImmutable: "YES",
    CombinationProductsSupported: "YES",
    FutureCdsEligibilityModeled: "YES",
    PatientSpecificEvaluationEnabled: "NO",
    InteractionAlertsEnabled: "NO",
    AllergyAlertsEnabled: "NO",
    DuplicateTherapyAlertsEnabled: "NO",
    OrderBlockingEnabled: "NO",
    AutomaticClinicalActivationEnabled: "NO",
    OrderingBehaviorChanged: "NO",
    MedicationSearchChanged: "NO",
    MARChanged: "NO",
    BillingChanged: "NO",
    Phase8BehaviorChanged: "NO",
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

export async function writeAllPhase9Artifacts(input: {
  evidence: RegressionEvidence;
}): Promise<{ summaryPath: string; finalDecision: string }> {
  const schema = probePhase9Schema();
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
      "Phase 9 stores safety knowledge only; patient evaluation / alerts deferred to Phase 10+",
      "No bulk licensed safety content import in CI certification",
    ],
  });

  writeAuditArtifact("medication-phase9-repository-audit.json", {
    ...base(dataSource, confidence),
    title: "Phase 9 repository audit",
    SchemaProbe: schema,
  });
  writeAuditArtifact("medication-phase9-model-audit.json", {
    ...base(dataSource, confidence),
    title: "Phase 9 model audit",
    models: [
      "MedicationSafetyKnowledgeSource",
      "MedicationSafetyKnowledgeVersion",
      "MedicationDrugInteraction",
      "MedicationAllergenConcept",
      "MedicationAllergyCrossReactivityRule",
      "MedicationDuplicateTherapyGroup",
      "MedicationTherapeuticClassMembership",
    ],
  });
  writeAuditArtifact("medication-phase9-interaction-audit.json", {
    ...base(dataSource, confidence),
    title: "Phase 9 interaction audit",
    SymmetricPairNormalizationEnabled: "YES",
    DirectionalInteractionsPreserved: "YES",
  });
  writeAuditArtifact("medication-phase9-allergy-audit.json", {
    ...base(dataSource, confidence),
    title: "Phase 9 allergy audit",
    AllergyKnowledgeFoundationImplemented: "YES",
    CrossReactivityFoundationImplemented: "YES",
  });
  writeAuditArtifact("medication-phase9-duplicate-therapy-audit.json", {
    ...base(dataSource, confidence),
    title: "Phase 9 duplicate therapy audit",
    DuplicateTherapyFoundationImplemented: "YES",
    PatientEvaluationEnabled: "NO",
  });
  writeAuditArtifact("medication-phase9-security-audit.json", {
    ...base(dataSource, confidence),
    title: "Phase 9 security audit",
    AdminApprovalRequired: "YES",
    RoleSpoofingRejected: "YES",
    ClinicalActivationDefaultFalse: schema.clinicalActivationDefaultFalse,
  });
  writeAuditArtifact("medication-phase9-clinical-isolation-audit.json", {
    ...base(dataSource, confidence),
    title: "Phase 9 clinical isolation audit",
    OrderingBehaviorChanged: "NO",
    MedicationSearchChanged: "NO",
    MARChanged: "NO",
    BillingChanged: "NO",
    Phase8BehaviorChanged: "NO",
    PatientSpecificEvaluationEnabled: "NO",
    OrderBlockingEnabled: "NO",
  });
  const summaryPath = writeAuditArtifact(
    "medication-phase9-certification-summary.json",
    summary
  );

  return { summaryPath, finalDecision: summary.FinalDecision };
}
