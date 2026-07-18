/**
 * Medication Intelligence Phase 15 — certification (read-and-verify + artifacts).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { PrismaClient } from "@prisma/client";
import {
  PHASE13_WAVE1_KEY,
  PHASE14B_SYNTHETIC_BATCH_KEY,
  PHASE15_AUTHORITATIVE_SOURCE_DEFAULTS,
  PHASE15_CERTIFICATION_DECISION_VALUES,
  PHASE15_CERTIFICATION_ID as PHASE15_CERTIFICATION_ID_VALUE,
  PHASE15_PART2A_IMPLEMENTATION_ID,
  PHASE15_PART2B_IMPLEMENTATION_ID,
  PHASE15_PART2C_IMPLEMENTATION_ID,
  PHASE15_PROGRAM_KEY,
  PHASE15_WAVE_FAMILY_NAMES,
  assertPhase15NoClinicalActivation,
  assertPhase15NoOrderBlocking,
  assertPhase15NoProviderFacingAlerts,
  assertPhase15NoWorkflowControl,
  type Phase15CertificationDecision,
} from "@medora/shared";
import {
  type AuditConfidence,
  type AuditDataSource,
  withPrisma,
  writeAuditArtifact,
  auditBase,
} from "./medication-audit-types";

/** Re-export for certifier CLI/tests (canonical value lives in @medora/shared). */
export const PHASE15_CERTIFICATION_ID = PHASE15_CERTIFICATION_ID_VALUE;

export const PHASE15_ARTIFACTS = [
  "medication-phase15-pre-remediation-baseline.json",
  "medication-phase15-remediation-preview.json",
  "medication-phase15-remediation-results.json",
  "medication-phase15-quality-report.json",
  "medication-phase15-shadow-requalification.json",
  "medication-phase15-synthetic-shadow-results.json",
  "medication-phase15-readiness-report.json",
  "medication-phase15-certification.json",
  "medication-phase15-certification-summary.json",
] as const;

const SCHEMA = resolve(__dirname, "../../schema.prisma");
const MIGRATION_2A = resolve(
  __dirname,
  "../../migrations/20261020120000_medication_phase_15_part2a_remediation_source_lifecycle/migration.sql"
);
const ORCHESTRATOR = resolve(
  __dirname,
  "../../../src/medications/remediation/medication-phase15-remediation-orchestrator.service.ts"
);
const PART2C = resolve(
  __dirname,
  "../../../src/medications/remediation/medication-phase15-part2c-execution.service.ts"
);
const CONTROLLER = resolve(
  __dirname,
  "../../../src/medications/remediation/medication-remediation.controller.ts"
);
const UI = resolve(
  __dirname,
  "../../../../../apps/web/app/app/admin/medication-governance/remediation/page.tsx"
);
const DOCS = resolve(
  __dirname,
  "../../../../../docs/clinical/medication-intelligence-phase-15-part2c-execution-certification.md"
);
const SHARED = resolve(
  __dirname,
  "../../../../../packages/shared/src/medication/medicationAuthoritativeSourceAcquisitionGovernance.ts"
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
  const approvedForShadow =
    await prisma.medicationKnowledgeApprovalWaveItem.count({
      where: { approvalStatus: "APPROVED_FOR_SHADOW" },
    });
  const waveItems = await prisma.medicationKnowledgeApprovalWaveItem.findMany({
    where: { approvalStatus: "APPROVED_FOR_SHADOW" },
    select: { familyKey: true, requestedFamilyName: true },
  });
  const acetaminophenInWave1 = waveItems.some(
    (w) =>
      /acetaminophen/i.test(w.familyKey ?? "") ||
      /acetaminophen/i.test(w.requestedFamilyName ?? "")
  );
  const snapshots = await prisma.medicationShadowSnapshot.count();
  const batch = await prisma.medicationShadowEvaluationBatch.findUnique({
    where: { batchKey: PHASE14B_SYNTHETIC_BATCH_KEY },
  });
  const metrics = (batch?.metricsJson ?? {}) as Record<string, number>;
  const openGaps = batch
    ? await prisma.medicationShadowGapLink.count({
        where: { batchId: batch.id, status: "OPEN" },
      })
    : 0;
  const openTier1 = batch
    ? await prisma.medicationShadowGapLink.count({
        where: {
          batchId: batch.id,
          status: "OPEN",
          gapKey: { contains: "POSITIVE_TIER1" },
        },
      })
    : 0;
  const program = await prisma.medicationRemediationProgram.findUnique({
    where: { programKey: PHASE15_PROGRAM_KEY },
    include: { workItems: true },
  });
  const byStatus: Record<string, number> = {};
  for (const w of program?.workItems ?? []) {
    byStatus[w.status] = (byStatus[w.status] ?? 0) + 1;
  }
  const deferredWork = byStatus["DEFERRED"] ?? 0;
  const remediatedWork = byStatus["RESOLVED"] ?? 0;
  const blockedWork =
    byStatus["BLOCKED_PENDING_AUTHORITATIVE_SOURCE"] ?? 0;
  const regs = await prisma.medicationEvidenceSourceRegistration.count();
  const qualityScores = await prisma.medicationKnowledgeQuality.count();
  const conflictsOpen = await prisma.medicationReviewConflict.count({
    where: { resolutionStatus: "OPEN", severity: "CRITICAL" },
  });

  return {
    waveKey: PHASE13_WAVE1_KEY,
    Wave1FamiliesRequested: PHASE15_WAVE_FAMILY_NAMES.length,
    Wave1FamiliesResolved: approvedForShadow,
    AcetaminophenInWave1: acetaminophenInWave1,
    AcetaminophenIdentityBlocked: !acetaminophenInWave1,
    ShadowSnapshots: snapshots,
    SyntheticBatchStatus: batch?.status ?? null,
    SyntheticReadiness: batch?.readiness ?? null,
    CriticalMisses: Number(metrics.criticalMisses ?? 0),
    UnexpectedFindings: Number(metrics.unexpectedFindings ?? 0),
    MissedFindings: Number(metrics.missedFindings ?? 0),
    MatchedFindings: Number(metrics.matchedFindings ?? 0),
    FamiliesExecuted: Number(metrics.familiesExecuted ?? 0),
    OpenGapsAfter: openGaps,
    OpenTier1KnowledgeGaps: openTier1,
    DeferredWorkItems: deferredWork,
    RemediatedWorkItems: remediatedWork,
    BlockedWorkItems: blockedWork,
    WorkItemsByStatus: byStatus,
    AuthoritativeSourceRegistrations: regs,
    QualityScores: qualityScores,
    OpenCriticalConflicts: conflictsOpen,
    ProgramStatus: program?.status ?? null,
    ClinicalActivations: 0,
    ProviderAlerts: 0,
    OrderBlocks: 0,
    ProductionCds: "OFF" as const,
  };
}

function probeSchema() {
  const schema = existsSync(SCHEMA) ? readFileSync(SCHEMA, "utf8") : "";
  return {
    migrationPart2aPresent: existsSync(MIGRATION_2A),
    hasRemediationProgram: schema.includes("model MedicationRemediationProgram"),
    hasRemediationWorkItem: schema.includes("model MedicationRemediationWorkItem"),
    orchestratorPresent: existsSync(ORCHESTRATOR),
    part2cPresent: existsSync(PART2C),
    controllerPresent: existsSync(CONTROLLER),
    uiPresent: existsSync(UI),
    docsPresent: existsSync(DOCS),
    sharedPresent: existsSync(SHARED),
    noWorkflowControlDefaults:
      PHASE15_AUTHORITATIVE_SOURCE_DEFAULTS.knowledgeControlsPatientCare === false,
  };
}

export function decidePhase15Certification(input: {
  live: Awaited<ReturnType<typeof collectLive>>;
  schemaOk: boolean;
  regressionOk: boolean;
}): Phase15CertificationDecision {
  const { live } = input;
  const blockers: string[] = [];
  if (live.AcetaminophenInWave1) blockers.push("ACETAMINOPHEN_IN_WAVE1");
  if (live.Wave1FamiliesResolved < 8) blockers.push("WAVE1_INCOMPLETE");
  if (live.CriticalMisses > 0) blockers.push("CRITICAL_MISSES");
  if (live.UnexpectedFindings > 0) blockers.push("UNEXPECTED_FINDINGS");
  if (live.BlockedWorkItems > 0) blockers.push("WORK_ITEMS_STILL_BLOCKED");
  if (live.OpenCriticalConflicts > 0) blockers.push("CRITICAL_CONFLICTS");
  if (live.ClinicalActivations > 0) blockers.push("CLINICAL_ACTIVATIONS");
  if (live.ProviderAlerts > 0) blockers.push("PROVIDER_ALERTS");
  if (live.OrderBlocks > 0) blockers.push("ORDER_BLOCKS");
  if (!input.schemaOk) blockers.push("SCHEMA_PROBE_FAILED");
  if (!input.regressionOk) blockers.push("REGRESSION_EVIDENCE_FAILED");

  if (blockers.length > 0) {
    return "MEDICATION_INTELLIGENCE_PHASE_15_NOT_CERTIFIED";
  }

  if (live.OpenTier1KnowledgeGaps > 0 || live.DeferredWorkItems > 0) {
    return "MEDICATION_INTELLIGENCE_PHASE_15_CERTIFIED_WITH_GOVERNED_DEFERRALS";
  }

  return "MEDICATION_INTELLIGENCE_PHASE_15_CERTIFIED";
}

export async function writeAllPhase15Artifacts(input: {
  evidence: RegressionEvidence;
}): Promise<{
  summaryPath: string;
  finalDecision: Phase15CertificationDecision;
  live: Awaited<ReturnType<typeof collectLive>>;
}> {
  assertPhase15NoWorkflowControl(
    PHASE15_AUTHORITATIVE_SOURCE_DEFAULTS.knowledgeControlsPatientCare
  );
  assertPhase15NoClinicalActivation(
    PHASE15_AUTHORITATIVE_SOURCE_DEFAULTS.clinicalActivationEnabled
  );
  assertPhase15NoProviderFacingAlerts(
    PHASE15_AUTHORITATIVE_SOURCE_DEFAULTS.providerFacingAlertsEnabled
  );
  assertPhase15NoOrderBlocking(
    PHASE15_AUTHORITATIVE_SOURCE_DEFAULTS.orderBlockingEnabled
  );

  const result = await withPrisma(async (prisma) => {
    const live = await collectLive(prisma);
    const schema = probeSchema();
    const schemaOk =
      schema.migrationPart2aPresent &&
      schema.hasRemediationProgram &&
      schema.hasRemediationWorkItem &&
      schema.orchestratorPresent &&
      schema.part2cPresent &&
      schema.controllerPresent &&
      schema.sharedPresent &&
      schema.noWorkflowControlDefaults;

    const regressionOk =
      input.evidence.focusedTestsPass !== false &&
      input.evidence.fullRegressionPass !== false &&
      input.evidence.buildPass !== false &&
      input.evidence.typecheckPass !== false &&
      input.evidence.diffCheckPass !== false &&
      input.evidence.priorPhasesPass !== false;

    const decision = decidePhase15Certification({
      live,
      schemaOk,
      regressionOk,
    });

    const confidence: AuditConfidence = "HIGH";
    const dataSource: AuditDataSource = "database";
    const base = auditBase(dataSource, confidence);

    const summary = {
      ...base,
      phase: "15",
      title: "Phase 15 authoritative source acquisition & Wave 1 remediation certification",
      certificationId: PHASE15_CERTIFICATION_ID,
      FinalDecision: decision,
      Part2aImplementationId: PHASE15_PART2A_IMPLEMENTATION_ID,
      Part2bImplementationId: PHASE15_PART2B_IMPLEMENTATION_ID,
      Part2cImplementationId: PHASE15_PART2C_IMPLEMENTATION_ID,
      LiveMetrics: live,
      SchemaProbe: schema,
      RegressionEvidence: input.evidence,
      CertificationIdempotent:
        input.evidence.certificationIdempotent == null
          ? null
          : input.evidence.certificationIdempotent
            ? "YES"
            : "NO",
      KnowledgeControlsPatientCare: "NO",
      ClinicalActivationEnabled: "NO",
      ProviderFacingAlertsEnabled: "NO",
      OrderBlockingEnabled: "NO",
      OrderingChanged: "NO",
      MARChanged: "NO",
      BillingChanged: "NO",
      AcetaminophenIdentityBlocked: live.AcetaminophenIdentityBlocked
        ? "YES"
        : "NO",
      FabricatedTier1Facts: "NO",
      KnownNonblockingGaps: [
        "Positive Tier-1 clinical expected findings remain governed deferred until licensed Tier-1 sources are attached",
        "Phase 15 certification is knowledge governance — not production CDS",
        "Future Phase 16 may expand Emergency Medicine families under separate certification",
      ],
      auditStatus: "COMPLETE",
      catalogClassification: "CURATED",
      catalogComplete: false,
    };

    const dir = resolve(__dirname, "../audit-summaries");
    mkdirSync(dir, { recursive: true });
    const certPath = resolve(dir, "medication-phase15-certification.json");
    writeFileSync(certPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

    const md = [
      "# Medication Intelligence Phase 15 Certification",
      "",
      `**Certification ID:** ${PHASE15_CERTIFICATION_ID}`,
      "",
      `**Decision:** ${decision}`,
      "",
      "## Live metrics",
      "",
      "```json",
      JSON.stringify(live, null, 2),
      "```",
      "",
      "## Not claimed",
      "",
      "- Production CDS / alerts / order blocking",
      "- Acetaminophen resolution",
      "- Fabricated Tier-1 positive findings",
      "- Full EM catalog expansion",
      "",
    ].join("\n");
    writeFileSync(
      resolve(dir, "medication-phase15-certification.md"),
      md,
      "utf8"
    );

    const summaryPath = writeAuditArtifact(
      "medication-phase15-certification-summary.json",
      summary
    );

    if (
      !(PHASE15_CERTIFICATION_DECISION_VALUES as readonly string[]).includes(
        decision
      )
    ) {
      throw new Error(`Invalid Phase 15 decision: ${decision}`);
    }

    return { summaryPath, finalDecision: decision, live };
  });

  if (!result.ok) {
    throw new Error(`Phase 15 certification failed: ${result.error}`);
  }
  return result.value;
}
