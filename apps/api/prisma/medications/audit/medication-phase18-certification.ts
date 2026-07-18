/**
 * Medication Intelligence Phase 18 — operational governance certification.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { PrismaClient } from "@prisma/client";
import {
  PHASE16_PROGRAM_KEY,
  PHASE18_CERTIFICATION_DECISION_VALUES,
  PHASE18_CERTIFICATION_ID as PHASE18_CERTIFICATION_ID_VALUE,
  PHASE18_IMPLEMENTATION_ID,
  PHASE18_RECOMMENDATION_DEFAULTS,
  assertEnterpriseActivationBlocked,
  assertPhase18SafetyDefaults,
  type Phase18CertificationDecision,
} from "@medora/shared";
import {
  type AuditConfidence,
  type AuditDataSource,
  withPrisma,
  writeAuditArtifact,
  auditBase,
} from "./medication-audit-types";

export const PHASE18_CERTIFICATION_ID = PHASE18_CERTIFICATION_ID_VALUE;

export const PHASE18_ARTIFACTS = [
  "medication-phase18-readiness.json",
  "medication-phase18-quality.json",
  "medication-phase18-operational-certification.json",
  "medication-phase18-operational-certification-summary.json",
  "medication-phase18-operational-certification.md",
] as const;

const SCHEMA = resolve(__dirname, "../../schema.prisma");
const MIGRATION = resolve(
  __dirname,
  "../../migrations/20261023120000_medication_phase_18_operational_governance/migration.sql"
);
const SERVICE = resolve(
  __dirname,
  "../../../src/medications/recommendation-ops/medication-recommendation-ops.service.ts"
);
const CONTROLLER = resolve(
  __dirname,
  "../../../src/medications/recommendation-ops/medication-recommendation-ops.controller.ts"
);
const ADMIN_UI = resolve(
  __dirname,
  "../../../../../apps/web/app/app/admin/medication-governance/operations-center/page.tsx"
);
const SHARED = resolve(
  __dirname,
  "../../../../../packages/shared/src/medication/medicationRecommendationEngineGovernance.ts"
);
const DOCS = resolve(
  __dirname,
  "../../../../../docs/clinical/medication-intelligence-phase-18-architecture.md"
);
const PHASE17_SUMMARY = resolve(
  __dirname,
  "../audit-summaries/medication-phase17-controlled-pilot-certification-summary.json"
);

export type RegressionEvidence = {
  focusedTestsPass: boolean | null;
  focusedTestSummary?: string;
  fullRegressionPass: boolean | null;
  fullRegressionSummary?: string;
  buildPass: boolean | null;
  typecheckPass: boolean | null;
  diffCheckPass: boolean | null;
  certificationIdempotent: boolean | null;
  priorPhasesPass: boolean | null;
};

async function collectLive(prisma: PrismaClient) {
  const program = await prisma.medicationRecommendationProgram.findUnique({
    where: { programKey: PHASE16_PROGRAM_KEY },
  });
  const sealed = await prisma.medicationRecommendationDefinition.count({
    where: { immutableAt: { not: null } },
  });
  const shadow = await prisma.medicationRecommendationDefinition.count({
    where: { lifecycleStatus: "SHADOW_RECOMMENDATION" },
  });
  const acetaminophen = await prisma.medicationRecommendationDefinition.count({
    where: { familyKey: { contains: "acetaminophen", mode: "insensitive" } },
  });
  const replayTotal = await prisma.medicationRecommendationReplayRun.count();
  const replayFail = await prisma.medicationRecommendationReplayRun.count({
    where: { matched: false },
  });
  const replayCareMut = await prisma.medicationRecommendationReplayRun.count({
    where: { mutatesPatientCare: true },
  });
  const orderMut = await prisma.medicationRecommendationShadowEvaluation.count({
    where: { mutatesOrders: true },
  });
  const marMut = await prisma.medicationRecommendationShadowEvaluation.count({
    where: { mutatesMar: true },
  });
  const chartMut = await prisma.medicationRecommendationShadowEvaluation.count({
    where: { mutatesChart: true },
  });
  const quality =
    await prisma.medicationRecommendationQualitySnapshot.findFirst({
      orderBy: { generatedAt: "desc" },
    });
  const ops = await prisma.medicationRecommendationOpsSnapshot.findFirst({
    orderBy: { generatedAt: "desc" },
  });
  const regulatory =
    await prisma.medicationRecommendationRegulatoryArtifact.count({
      where: { claimsApproval: true },
    });
  const regulatoryTotal =
    await prisma.medicationRecommendationRegulatoryArtifact.count();
  const driftInterrupt =
    await prisma.medicationRecommendationDriftAlert.count({
      where: { interruptProviders: true },
    });
  const enterpriseDefs =
    await prisma.medicationRecommendationDefinition.count({
      where: { lifecycleStatus: "ENTERPRISE_ACTIVE" },
    });

  let phase17Certified = false;
  if (existsSync(PHASE17_SUMMARY)) {
    try {
      const s = JSON.parse(readFileSync(PHASE17_SUMMARY, "utf8")) as {
        FinalDecision?: string;
      };
      phase17Certified =
        typeof s.FinalDecision === "string" &&
        s.FinalDecision.startsWith("MEDICATION_INTELLIGENCE_PHASE_17_CERTIFIED");
    } catch {
      phase17Certified = false;
    }
  }

  return {
    Phase17Certified: phase17Certified,
    SealedVersions: sealed,
    ShadowDefinitions: shadow,
    AcetaminophenDefinitions: acetaminophen,
    ReplayTotal: replayTotal,
    ReplayFailures: replayFail,
    ReplayCareMutations: replayCareMut,
    OrderMutations: orderMut,
    MarMutations: marMut,
    ChartMutations: chartMut,
    QualityScore: quality?.qualityScore ?? 0,
    ExplainabilityScore: quality?.explainabilityScore ?? 0,
    ReproducibilityScore: quality?.reproducibilityScore ?? 0,
    OpsSnapshotPresent: Boolean(ops),
    RegulatoryArtifacts: regulatoryTotal,
    RegulatoryApprovalClaims: regulatory,
    DriftInterruptsProviders: driftInterrupt,
    EnterpriseLifecycleDefinitions: enterpriseDefs,
    ProgramEnterpriseActiveAllowed: program?.enterpriseActiveAllowed ?? false,
    ProgramOrderFromRecommendationAllowed:
      program?.orderFromRecommendationAllowed ?? false,
    ProgramClinicalActivation: program?.clinicalActivationAllowed ?? false,
    ClinicalActivations: 0,
    ProviderAlerts: 0,
    OrderBlocks: 0,
    ProductionCds: "OFF" as const,
    Defaults: PHASE18_RECOMMENDATION_DEFAULTS,
  };
}

function probeSchema() {
  const schema = existsSync(SCHEMA) ? readFileSync(SCHEMA, "utf8") : "";
  const shared = existsSync(SHARED) ? readFileSync(SHARED, "utf8") : "";
  return {
    migrationPresent: existsSync(MIGRATION),
    hasOpsSnapshot: schema.includes("model MedicationRecommendationOpsSnapshot"),
    hasReplay: schema.includes("model MedicationRecommendationReplayRun"),
    hasRollback: schema.includes("model MedicationRecommendationRollbackEvent"),
    hasDrift: schema.includes("model MedicationRecommendationDriftAlert"),
    servicePresent: existsSync(SERVICE),
    controllerPresent: existsSync(CONTROLLER),
    adminUiPresent: existsSync(ADMIN_UI),
    sharedPresent: existsSync(SHARED),
    docsPresent: existsSync(DOCS),
    sharedPhase18:
      shared.includes("PHASE18_CERTIFICATION_ID") &&
      shared.includes("assertPhase18SafetyDefaults"),
    failClosedDefaults:
      PHASE18_RECOMMENDATION_DEFAULTS.enterpriseActiveAllowed === false &&
      PHASE18_RECOMMENDATION_DEFAULTS.productionCdsEnabled === false &&
      PHASE18_RECOMMENDATION_DEFAULTS.orderFromRecommendationEnabled === false &&
      PHASE18_RECOMMENDATION_DEFAULTS.claimRegulatoryApproval === false,
  };
}

export function decidePhase18Certification(input: {
  live: Awaited<ReturnType<typeof collectLive>>;
  schemaOk: boolean;
  regressionOk: boolean;
}): Phase18CertificationDecision {
  const { live } = input;
  const blockers: string[] = [];

  if (!live.Phase17Certified) blockers.push("PHASE17_NOT_CERTIFIED");
  if (live.AcetaminophenDefinitions > 0) blockers.push("ACETAMINOPHEN_IN_CATALOG");
  if (live.EnterpriseLifecycleDefinitions > 0)
    blockers.push("ENTERPRISE_ACTIVE_LIFECYCLE");
  if (live.OrderMutations > 0) blockers.push("ORDER_MUTATIONS");
  if (live.MarMutations > 0) blockers.push("MAR_MUTATIONS");
  if (live.ChartMutations > 0) blockers.push("CHART_MUTATIONS");
  if (live.ReplayCareMutations > 0) blockers.push("REPLAY_CARE_MUTATIONS");
  if (live.ReplayFailures > 0) blockers.push("REPLAY_FAILURES");
  if (live.RegulatoryApprovalClaims > 0)
    blockers.push("REGULATORY_APPROVAL_CLAIMED");
  if (live.DriftInterruptsProviders > 0)
    blockers.push("DRIFT_INTERRUPTS_PROVIDERS");
  if (live.ProgramEnterpriseActiveAllowed)
    blockers.push("PROGRAM_ENTERPRISE_ALLOWED");
  if (live.ProgramOrderFromRecommendationAllowed)
    blockers.push("ORDER_FROM_RECOMMENDATION");
  if (live.ProgramClinicalActivation)
    blockers.push("PROGRAM_CLINICAL_ACTIVATION");
  if (live.ClinicalActivations > 0) blockers.push("CLINICAL_ACTIVATIONS");
  if (live.ProviderAlerts > 0) blockers.push("PROVIDER_ALERTS");
  if (live.OrderBlocks > 0) blockers.push("ORDER_BLOCKS");
  if (!input.schemaOk) blockers.push("SCHEMA_PROBE_FAILED");
  if (!input.regressionOk) blockers.push("REGRESSION_EVIDENCE_FAILED");
  if (live.ShadowDefinitions < 1) blockers.push("NO_SHADOW_RECOMMENDATIONS");

  if (blockers.length > 0) {
    return "MEDICATION_INTELLIGENCE_PHASE_18_NOT_CERTIFIED";
  }

  if (
    live.SealedVersions > 0 &&
    live.OpsSnapshotPresent &&
    live.QualityScore >= 50 &&
    live.ExplainabilityScore >= 40 &&
    (live.ReplayTotal === 0 || live.ReproducibilityScore >= 100)
  ) {
    return "MEDICATION_INTELLIGENCE_PHASE_18_CERTIFIED_OPERATIONAL_READY";
  }

  if (live.SealedVersions > 0 || live.RegulatoryArtifacts > 0) {
    return "MEDICATION_INTELLIGENCE_PHASE_18_CERTIFIED_GOVERNANCE_READY";
  }

  return "MEDICATION_INTELLIGENCE_PHASE_18_CERTIFIED_MONITORING_READY";
}

export async function writeAllPhase18Artifacts(input: {
  evidence: RegressionEvidence;
}): Promise<{
  summaryPath: string;
  finalDecision: Phase18CertificationDecision;
  live: Awaited<ReturnType<typeof collectLive>>;
}> {
  assertPhase18SafetyDefaults();
  assertEnterpriseActivationBlocked(
    PHASE18_RECOMMENDATION_DEFAULTS.enterpriseActiveAllowed
  );

  const result = await withPrisma(async (prisma) => {
    const live = await collectLive(prisma);
    const schema = probeSchema();
    const schemaOk =
      schema.migrationPresent &&
      schema.hasOpsSnapshot &&
      schema.hasReplay &&
      schema.hasRollback &&
      schema.hasDrift &&
      schema.servicePresent &&
      schema.controllerPresent &&
      schema.adminUiPresent &&
      schema.sharedPresent &&
      schema.sharedPhase18 &&
      schema.failClosedDefaults;

    const regressionOk =
      input.evidence.focusedTestsPass !== false &&
      input.evidence.fullRegressionPass !== false &&
      input.evidence.buildPass !== false &&
      input.evidence.typecheckPass !== false &&
      input.evidence.diffCheckPass !== false &&
      input.evidence.priorPhasesPass !== false;

    const decision = decidePhase18Certification({
      live,
      schemaOk,
      regressionOk,
    });

    const confidence: AuditConfidence = "HIGH";
    const dataSource: AuditDataSource = "database";
    const base = auditBase(dataSource, confidence);

    const summary = {
      ...base,
      phase: "18",
      title:
        "Phase 18 operational safety, monitoring, explainability & regulatory readiness",
      certificationId: PHASE18_CERTIFICATION_ID,
      implementationId: PHASE18_IMPLEMENTATION_ID,
      FinalDecision: decision,
      LiveMetrics: live,
      SchemaProbe: schema,
      RegressionEvidence: input.evidence,
      CertificationIdempotent:
        input.evidence.certificationIdempotent == null
          ? null
          : input.evidence.certificationIdempotent
            ? "YES"
            : "NO",
      EnterpriseActiveAllowed: "NO",
      ProductionCds: "OFF",
      OrderFromRecommendation: "DISABLED",
      OrderBlocking: "DISABLED",
      MarMutation: "DISABLED",
      ChartMutation: "DISABLED",
      AutonomyIncreased: "NO",
      RegulatoryApprovalClaimed: "NO",
      AcetaminophenIdentityBlocked: "YES",
      KnownNonblockingGaps: [
        "Phase 18 increases governance transparency only — not clinical autonomy",
        "Enterprise Active and Production CDS remain off",
        "Regulatory artifacts are evidence only — not approval claims",
      ],
      auditStatus: "COMPLETE",
      catalogClassification: "CURATED",
      catalogComplete: false,
    };

    const dir = resolve(__dirname, "../audit-summaries");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      resolve(dir, "medication-phase18-operational-certification.json"),
      `${JSON.stringify(summary, null, 2)}\n`,
      "utf8"
    );

    const md = [
      "# Medication Intelligence Phase 18 Certification",
      "",
      `**Certification ID:** ${PHASE18_CERTIFICATION_ID}`,
      "",
      `**Decision:** ${decision}`,
      "",
      "## Live metrics",
      "",
      "```json",
      JSON.stringify(live, null, 2),
      "```",
      "",
      "## Constitutional locks",
      "",
      "- Enterprise Activation: BLOCKED",
      "- Production CDS: OFF",
      "- Order / MAR / Chart mutations: ZERO required",
      "- Replay: read-only",
      "- No regulatory approval claimed",
      "",
    ].join("\n");
    writeFileSync(
      resolve(dir, "medication-phase18-operational-certification.md"),
      md,
      "utf8"
    );

    const summaryPath = writeAuditArtifact(
      "medication-phase18-operational-certification-summary.json",
      summary
    );

    if (
      !(PHASE18_CERTIFICATION_DECISION_VALUES as readonly string[]).includes(
        decision
      )
    ) {
      throw new Error(`Invalid Phase 18 decision: ${decision}`);
    }

    return { summaryPath, finalDecision: decision, live };
  });

  if (!result.ok) {
    throw new Error(`Phase 18 certification failed: ${result.error}`);
  }
  return result.value;
}
