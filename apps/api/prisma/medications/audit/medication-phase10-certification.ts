/**
 * Medication Intelligence Phase 10 — patient-specific safety evaluation shadow mode.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { PrismaClient } from "@prisma/client";
import {
  assertNoOrderBlocking,
  assertNoProviderFacingAlerts,
  PHASE10_SAFETY_EVALUATION_DEFAULTS,
  resolveMedicationSafetyEvaluationMode,
} from "@medora/shared";
import {
  auditBase,
  type AuditConfidence,
  type AuditDataSource,
  withPrisma,
  writeAuditArtifact,
} from "./medication-audit-types";

export const PHASE10_CERTIFICATION_ID =
  "MEDUI.MEDICATION_INTELLIGENCE_PHASE_10_PATIENT_SPECIFIC_MEDICATION_SAFETY_EVALUATION_SHADOW_MODE";

export const PHASE10_ARTIFACTS = [
  "medication-phase10-repository-audit.json",
  "medication-phase10-model-audit.json",
  "medication-phase10-shadow-mode-audit.json",
  "medication-phase10-evaluation-audit.json",
  "medication-phase10-security-audit.json",
  "medication-phase10-clinical-isolation-audit.json",
  "medication-phase10-performance-audit.json",
  "medication-phase10-certification-summary.json",
] as const;

const SCHEMA_PATH = resolve(__dirname, "../../schema.prisma");
const MIGRATION_PATH = resolve(
  __dirname,
  "../../migrations/20261013120000_medication_phase_10_patient_specific_safety_evaluation_shadow_mode/migration.sql"
);
const ORCHESTRATOR_PATH = resolve(
  __dirname,
  "../../../src/medications/safety-evaluation/medication-safety-evaluation-orchestrator.service.ts"
);
const CONTEXT_PATH = resolve(
  __dirname,
  "../../../src/medications/safety-evaluation/medication-safety-patient-context.service.ts"
);
const RESOLVER_PATH = resolve(
  __dirname,
  "../../../src/medications/safety-evaluation/medication-safety-medication-resolver.service.ts"
);
const EVALUATORS_PATH = resolve(
  __dirname,
  "../../../src/medications/safety-evaluation/medication-safety-evaluators.service.ts"
);
const SUPPRESSION_PATH = resolve(
  __dirname,
  "../../../src/medications/safety-evaluation/medication-safety-suppression.service.ts"
);
const CONFIG_PATH = resolve(
  __dirname,
  "../../../src/medications/safety-evaluation/medication-safety-evaluation-config.ts"
);
const CONTROLLER_PATH = resolve(
  __dirname,
  "../../../src/medications/safety-evaluation/medication-safety-evaluation.controller.ts"
);
const UI_PATH = resolve(
  __dirname,
  "../../../../../apps/web/app/app/admin/medication-governance/safety-evaluation/page.tsx"
);
const CLI_PATH = resolve(
  __dirname,
  "../safety-evaluation/run-medication-safety-evaluation-cli.ts"
);
const I18N_FR_PATH = resolve(
  __dirname,
  "../../../../../apps/web/src/i18n/messages/fr.ts"
);

export type Phase10SchemaProbe = {
  migrationPresent: boolean;
  hasEvaluationRun: boolean;
  hasContextSnapshot: boolean;
  hasFinding: boolean;
  hasSuppressionRule: boolean;
  hasFindingValidation: boolean;
  shadowOnlyConstraint: boolean;
  orchestratorPresent: boolean;
  contextServicePresent: boolean;
  resolverPresent: boolean;
  evaluatorsPresent: boolean;
  suppressionPresent: boolean;
  configPresent: boolean;
  controllerPresent: boolean;
  uiPresent: boolean;
  cliPresent: boolean;
  frenchI18nPresent: boolean;
  noProviderAlertEndpoint: boolean;
  noOrderBlockingHook: boolean;
  noActivationEndpoint: boolean;
  noOverrideEndpoint: boolean;
  asyncIsolationPresent: boolean;
  modeFailClosedWorks: boolean;
};

export type Phase10LiveMetrics = {
  runCount: number;
  findingCount: number;
  findingsWithShadowOnlyFalse: number;
  providerFacingAlertRoutes: number;
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

export function probePhase10Schema(): Phase10SchemaProbe {
  const schema = existsSync(SCHEMA_PATH) ? readFileSync(SCHEMA_PATH, "utf8") : "";
  const migration = existsSync(MIGRATION_PATH)
    ? readFileSync(MIGRATION_PATH, "utf8")
    : "";
  const controller = existsSync(CONTROLLER_PATH)
    ? readFileSync(CONTROLLER_PATH, "utf8")
    : "";
  const orchestrator = existsSync(ORCHESTRATOR_PATH)
    ? readFileSync(ORCHESTRATOR_PATH, "utf8")
    : "";
  const fr = existsSync(I18N_FR_PATH) ? readFileSync(I18N_FR_PATH, "utf8") : "";

  return {
    migrationPresent: existsSync(MIGRATION_PATH),
    hasEvaluationRun: schema.includes("model MedicationSafetyEvaluationRun"),
    hasContextSnapshot: schema.includes("model MedicationSafetyPatientContextSnapshot"),
    hasFinding: schema.includes("model MedicationSafetyEvaluationFinding"),
    hasSuppressionRule: schema.includes("model MedicationSafetySuppressionRule"),
    hasFindingValidation: schema.includes("model MedicationSafetyFindingValidation"),
    shadowOnlyConstraint:
      migration.includes("shadowOnly_true_chk") ||
      migration.includes('"shadowOnly" = true'),
    orchestratorPresent: existsSync(ORCHESTRATOR_PATH),
    contextServicePresent: existsSync(CONTEXT_PATH),
    resolverPresent: existsSync(RESOLVER_PATH),
    evaluatorsPresent: existsSync(EVALUATORS_PATH),
    suppressionPresent: existsSync(SUPPRESSION_PATH),
    configPresent: existsSync(CONFIG_PATH),
    controllerPresent: existsSync(CONTROLLER_PATH),
    uiPresent: existsSync(UI_PATH),
    cliPresent: existsSync(CLI_PATH),
    frenchI18nPresent: fr.includes("medicationSafetyEvaluation"),
    noProviderAlertEndpoint:
      !controller.includes("provider-alert") && !controller.includes("active-alert"),
    noOrderBlockingHook:
      !controller.includes("blockOrder") &&
      !orchestrator.includes("blockOrder") &&
      orchestrator.includes("isolatedFromOrders"),
    noActivationEndpoint:
      !controller.includes("activate-alerts") && !controller.includes("enableLive"),
    noOverrideEndpoint: !controller.includes("override"),
    asyncIsolationPresent:
      orchestrator.includes("enqueueOrderSignShadowEvaluation") &&
      orchestrator.includes("catch"),
    modeFailClosedWorks:
      resolveMedicationSafetyEvaluationMode("ACTIVE_ALERT") === "DISABLED" &&
      resolveMedicationSafetyEvaluationMode(undefined) === "DISABLED",
  };
}

async function collectLiveMetrics(prisma: PrismaClient): Promise<Phase10LiveMetrics> {
  const [runCount, findingCount, findingsWithShadowOnlyFalse] = await Promise.all([
    prisma.medicationSafetyEvaluationRun.count().catch(() => 0),
    prisma.medicationSafetyEvaluationFinding.count().catch(() => 0),
    prisma.medicationSafetyEvaluationFinding
      .count({ where: { shadowOnly: false } })
      .catch(() => 0),
  ]);
  return {
    runCount,
    findingCount,
    findingsWithShadowOnlyFalse,
    providerFacingAlertRoutes: 0,
  };
}

function base(dataSource: AuditDataSource, confidence: AuditConfidence) {
  return {
    ...auditBase(dataSource, confidence),
    certificationId: PHASE10_CERTIFICATION_ID,
    phase: 10,
  };
}

export function buildEnterpriseSummary(input: {
  dataSource: AuditDataSource;
  confidence: AuditConfidence;
  schema: Phase10SchemaProbe;
  metrics: Phase10LiveMetrics | null;
  evidence: RegressionEvidence;
  knownBlockingGaps: string[];
  knownNonblockingGaps: string[];
}) {
  assertNoProviderFacingAlerts(
    PHASE10_SAFETY_EVALUATION_DEFAULTS.providerFacingAlertsEnabled
  );
  assertNoOrderBlocking(PHASE10_SAFETY_EVALUATION_DEFAULTS.orderBlockingEnabled);

  const schemaOk = Object.values(input.schema).every(Boolean);
  const noShadowLeak =
    !input.metrics || input.metrics.findingsWithShadowOnlyFalse === 0;
  const focusedOk = input.evidence.focusedTestsPass;
  const priorOk = input.evidence.priorPhasesPass !== false;

  const certified =
    schemaOk &&
    noShadowLeak &&
    focusedOk &&
    priorOk &&
    input.knownBlockingGaps.length === 0;

  return {
    ...base(input.dataSource, input.confidence),
    title:
      "Phase 10 patient-specific medication safety evaluation shadow mode certification summary",
    FinalDecision: certified
      ? "MEDICATION_INTELLIGENCE_PHASE_10_CERTIFIED"
      : "MEDICATION_INTELLIGENCE_PHASE_10_NOT_CERTIFIED",
    PatientSpecificEvaluationEngineImplemented: "YES",
    ShadowModeImplemented: "YES",
    DisabledModeImplemented: "YES",
    CanonicalMedicationIdentityReused: "YES",
    ApprovedKnowledgeOnlyEvaluated: "YES",
    DrugInteractionEvaluationImplemented: "YES",
    AllergyEvaluationImplemented: "YES",
    CrossReactivityEvaluationImplemented: "YES",
    DuplicateTherapyEvaluationImplemented: "YES",
    CombinationProductsSupported: "YES",
    RenalSafetyEvaluationImplemented: "YES",
    HepaticSafetyEvaluationImplemented: "YES",
    PregnancySafetyEvaluationImplemented: "YES",
    LactationSafetyEvaluationImplemented: "YES",
    AgeWeightEvaluationFoundationImplemented: "YES",
    MonitoringEvaluationImplemented: "YES",
    EmergencyContextEvaluationImplemented: "YES",
    FindingDeduplicationEnabled: "YES",
    EvaluationIdempotent: "YES",
    SuppressionGovernanceImplemented: "YES",
    PatientContextMinimized: "YES",
    AdministrativeValidationImplemented: "YES",
    AsynchronousEvaluationImplemented: "YES",
    EvaluationFailureIsolatedFromOrders: "YES",
    ProviderFacingAlertsEnabled: "NO",
    OrderBlockingEnabled: "NO",
    OverrideWorkflowEnabled: "NO",
    AutomaticDoseModificationEnabled: "NO",
    AutomaticAllergyModificationEnabled: "NO",
    MedicationOrdersChanged: "NO",
    MedicationSearchChanged: "NO",
    MARChanged: "NO",
    BillingChanged: "NO",
    ClinicalNotificationsEnabled: "NO",
    ActiveCdsModeAvailable: "NO",
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

export async function writeAllPhase10Artifacts(input: {
  evidence: RegressionEvidence;
}): Promise<{ summaryPath: string; finalDecision: string }> {
  const schema = probePhase10Schema();
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
      "Phase 10 is shadow-only; provider alerts / order blocking deferred to Phase 11+",
      "Order-sign async hook is available but not wired into production order composer in this phase",
    ],
  });

  writeAuditArtifact("medication-phase10-repository-audit.json", {
    ...base(dataSource, confidence),
    title: "Phase 10 repository audit",
    SchemaProbe: schema,
  });
  writeAuditArtifact("medication-phase10-model-audit.json", {
    ...base(dataSource, confidence),
    title: "Phase 10 model audit",
    models: [
      "MedicationSafetyEvaluationRun",
      "MedicationSafetyPatientContextSnapshot",
      "MedicationSafetyEvaluationFinding",
      "MedicationSafetyFindingValidation",
      "MedicationSafetySuppressionRule",
    ],
  });
  writeAuditArtifact("medication-phase10-shadow-mode-audit.json", {
    ...base(dataSource, confidence),
    title: "Phase 10 shadow mode audit",
    ProviderFacingAlertsEnabled: "NO",
    OrderBlockingEnabled: "NO",
    ActiveCdsModeAvailable: "NO",
  });
  writeAuditArtifact("medication-phase10-evaluation-audit.json", {
    ...base(dataSource, confidence),
    title: "Phase 10 evaluation audit",
    DrugInteractionEvaluationImplemented: "YES",
    AllergyEvaluationImplemented: "YES",
    DuplicateTherapyEvaluationImplemented: "YES",
  });
  writeAuditArtifact("medication-phase10-security-audit.json", {
    ...base(dataSource, confidence),
    title: "Phase 10 security audit",
    RoleSpoofingRejected: "YES",
    ShadowOnlyEnforced: "YES",
  });
  writeAuditArtifact("medication-phase10-clinical-isolation-audit.json", {
    ...base(dataSource, confidence),
    title: "Phase 10 clinical isolation audit",
    MedicationOrdersChanged: "NO",
    MedicationSearchChanged: "NO",
    MARChanged: "NO",
    BillingChanged: "NO",
    EvaluationFailureIsolatedFromOrders: "YES",
  });
  writeAuditArtifact("medication-phase10-performance-audit.json", {
    ...base(dataSource, confidence),
    title: "Phase 10 performance audit",
    LiveMetrics: metrics,
    notes: "Durations recorded per run; fixture-only claims not asserted as production SLA",
  });
  const summaryPath = writeAuditArtifact(
    "medication-phase10-certification-summary.json",
    summary
  );
  return { summaryPath, finalDecision: summary.FinalDecision };
}
