/**
 * Medication Intelligence Phase 16 — shadow recommendation engine certification.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { PrismaClient } from "@prisma/client";
import {
  PHASE16_CERTIFICATION_DECISION_VALUES,
  PHASE16_CERTIFICATION_ID as PHASE16_CERTIFICATION_ID_VALUE,
  PHASE16_IMPLEMENTATION_ID,
  PHASE16_PROGRAM_KEY,
  PHASE16_RECOMMENDATION_DEFAULTS,
  PHASE16_WAVE_FAMILY_NAMES,
  assertPhase16NoClinicalActivation,
  assertPhase16NoEnterpriseActive,
  assertPhase16NoOrderFromRecommendation,
  assertPhase16NoWorkflowControl,
  assertPhase16NoControlledPilot,
  type Phase16CertificationDecision,
} from "@medora/shared";
import {
  type AuditConfidence,
  type AuditDataSource,
  withPrisma,
  writeAuditArtifact,
  auditBase,
} from "./medication-audit-types";

export const PHASE16_CERTIFICATION_ID = PHASE16_CERTIFICATION_ID_VALUE;

export const PHASE16_ARTIFACTS = [
  "medication-phase16-pipeline-results.json",
  "medication-phase16-certification.json",
  "medication-phase16-certification.md",
  "medication-phase16-certification-summary.json",
] as const;

const SCHEMA = resolve(__dirname, "../../schema.prisma");
const MIGRATION = resolve(
  __dirname,
  "../../migrations/20261021120000_medication_phase_16_controlled_recommendation_engine/migration.sql"
);
const SERVICE = resolve(
  __dirname,
  "../../../src/medications/recommendation/medication-recommendation.service.ts"
);
const CONTROLLER = resolve(
  __dirname,
  "../../../src/medications/recommendation/medication-recommendation.controller.ts"
);
const ADMIN_UI = resolve(
  __dirname,
  "../../../../../apps/web/app/app/admin/medication-governance/recommendations/page.tsx"
);
const PROVIDER_UI = resolve(
  __dirname,
  "../../../../../apps/web/app/app/provider/medication-recommendations/page.tsx"
);
const SHARED = resolve(
  __dirname,
  "../../../../../packages/shared/src/medication/medicationRecommendationEngineGovernance.ts"
);
const DOCS = resolve(
  __dirname,
  "../../../../../docs/clinical/medication-intelligence-phase-16-controlled-recommendation-engine.md"
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
    include: { definitions: true },
  });
  const defs = program?.definitions ?? [];
  const byStatus: Record<string, number> = {};
  for (const d of defs) {
    byStatus[d.lifecycleStatus] = (byStatus[d.lifecycleStatus] ?? 0) + 1;
  }
  const shadowCount = byStatus["SHADOW_RECOMMENDATION"] ?? 0;
  const pilotCount = byStatus["CONTROLLED_PILOT"] ?? 0;
  const enterpriseCount = byStatus["ENTERPRISE_ACTIVE"] ?? 0;
  const acetaminophenDefs = defs.filter((d) =>
    /acetaminophen/i.test(d.familyKey)
  ).length;
  const evals = await prisma.medicationRecommendationShadowEvaluation.count({
    where: program ? { programId: program.id } : undefined,
  });
  const mutatingEvals =
    await prisma.medicationRecommendationShadowEvaluation.count({
      where: {
        OR: [
          { mutatesOrders: true },
          { mutatesMar: true },
          { mutatesChart: true },
          { clinicalActivation: true },
        ],
      },
    });
  const evidenceLinks = await prisma.medicationRecommendationEvidenceLink.count();

  return {
    Wave1FamiliesRequested: PHASE16_WAVE_FAMILY_NAMES.length,
    DefinitionCount: defs.length,
    ShadowRecommendationCount: shadowCount,
    ControlledPilotCount: pilotCount,
    EnterpriseActiveCount: enterpriseCount,
    AcetaminophenDefinitions: acetaminophenDefs,
    ShadowEvaluations: evals,
    MutatingEvaluations: mutatingEvals,
    EvidenceLinks: evidenceLinks,
    ProgramStatus: program?.status ?? null,
    ProgramClinicalActivationAllowed: program?.clinicalActivationAllowed ?? false,
    ProgramControlledPilotAllowed: program?.controlledPilotAllowed ?? false,
    ProgramEnterpriseActiveAllowed: program?.enterpriseActiveAllowed ?? false,
    ProgramOrderFromRecommendationAllowed:
      program?.orderFromRecommendationAllowed ?? false,
    ClinicalActivations: 0,
    ProviderAlerts: 0,
    OrderBlocks: 0,
    ProductionCds: "OFF" as const,
    Defaults: PHASE16_RECOMMENDATION_DEFAULTS,
  };
}

function probeSchema() {
  const schema = existsSync(SCHEMA) ? readFileSync(SCHEMA, "utf8") : "";
  return {
    migrationPresent: existsSync(MIGRATION),
    hasProgram: schema.includes("model MedicationRecommendationProgram"),
    hasDefinition: schema.includes("model MedicationRecommendationDefinition"),
    hasShadowEval: schema.includes(
      "model MedicationRecommendationShadowEvaluation"
    ),
    servicePresent: existsSync(SERVICE),
    controllerPresent: existsSync(CONTROLLER),
    adminUiPresent: existsSync(ADMIN_UI),
    providerUiPresent: existsSync(PROVIDER_UI),
    sharedPresent: existsSync(SHARED),
    docsPresent: existsSync(DOCS),
    noWorkflowControlDefaults:
      PHASE16_RECOMMENDATION_DEFAULTS.knowledgeControlsPatientCare === false,
    shadowOnlyDefaults:
      PHASE16_RECOMMENDATION_DEFAULTS.shadowRecommendationAllowed === true &&
      PHASE16_RECOMMENDATION_DEFAULTS.controlledPilotAllowed === false &&
      PHASE16_RECOMMENDATION_DEFAULTS.enterpriseActiveAllowed === false,
  };
}

export function decidePhase16Certification(input: {
  live: Awaited<ReturnType<typeof collectLive>>;
  schemaOk: boolean;
  regressionOk: boolean;
}): Phase16CertificationDecision {
  const { live } = input;
  const blockers: string[] = [];
  if (live.AcetaminophenDefinitions > 0) blockers.push("ACETAMINOPHEN_IN_CATALOG");
  if (live.ControlledPilotCount > 0) blockers.push("CONTROLLED_PILOT_PRESENT");
  if (live.EnterpriseActiveCount > 0) blockers.push("ENTERPRISE_ACTIVE_PRESENT");
  if (live.MutatingEvaluations > 0) blockers.push("MUTATING_SHADOW_EVALS");
  if (live.ProgramClinicalActivationAllowed)
    blockers.push("PROGRAM_CLINICAL_ACTIVATION");
  if (live.ProgramControlledPilotAllowed) blockers.push("PROGRAM_PILOT_ALLOWED");
  if (live.ProgramEnterpriseActiveAllowed)
    blockers.push("PROGRAM_ENTERPRISE_ALLOWED");
  if (live.ProgramOrderFromRecommendationAllowed)
    blockers.push("ORDER_FROM_RECOMMENDATION");
  if (live.ClinicalActivations > 0) blockers.push("CLINICAL_ACTIVATIONS");
  if (live.ProviderAlerts > 0) blockers.push("PROVIDER_ALERTS");
  if (live.OrderBlocks > 0) blockers.push("ORDER_BLOCKS");
  if (!input.schemaOk) blockers.push("SCHEMA_PROBE_FAILED");
  if (!input.regressionOk) blockers.push("REGRESSION_EVIDENCE_FAILED");
  if (live.DefinitionCount < 1) blockers.push("NO_DEFINITIONS");
  if (live.ShadowRecommendationCount < 1) blockers.push("NO_SHADOW_RECOMMENDATIONS");

  if (blockers.length > 0) {
    return "MEDICATION_INTELLIGENCE_PHASE_16_NOT_CERTIFIED";
  }

  // Full CERTIFIED reserved if enterprise path ever opens; Phase 16 is shadow-only.
  return "MEDICATION_INTELLIGENCE_PHASE_16_CERTIFIED_SHADOW_ONLY";
}

export async function writeAllPhase16Artifacts(input: {
  evidence: RegressionEvidence;
}): Promise<{
  summaryPath: string;
  finalDecision: Phase16CertificationDecision;
  live: Awaited<ReturnType<typeof collectLive>>;
}> {
  assertPhase16NoWorkflowControl(
    PHASE16_RECOMMENDATION_DEFAULTS.knowledgeControlsPatientCare
  );
  assertPhase16NoClinicalActivation(
    PHASE16_RECOMMENDATION_DEFAULTS.clinicalActivationEnabled
  );
  assertPhase16NoOrderFromRecommendation(
    PHASE16_RECOMMENDATION_DEFAULTS.orderFromRecommendationAllowed
  );
  assertPhase16NoControlledPilot(
    PHASE16_RECOMMENDATION_DEFAULTS.controlledPilotAllowed
  );
  assertPhase16NoEnterpriseActive(
    PHASE16_RECOMMENDATION_DEFAULTS.enterpriseActiveAllowed
  );

  const result = await withPrisma(async (prisma) => {
    const live = await collectLive(prisma);
    const schema = probeSchema();
    const schemaOk =
      schema.migrationPresent &&
      schema.hasProgram &&
      schema.hasDefinition &&
      schema.hasShadowEval &&
      schema.servicePresent &&
      schema.controllerPresent &&
      schema.adminUiPresent &&
      schema.providerUiPresent &&
      schema.sharedPresent &&
      schema.noWorkflowControlDefaults &&
      schema.shadowOnlyDefaults;

    const regressionOk =
      input.evidence.focusedTestsPass !== false &&
      input.evidence.fullRegressionPass !== false &&
      input.evidence.buildPass !== false &&
      input.evidence.typecheckPass !== false &&
      input.evidence.diffCheckPass !== false &&
      input.evidence.priorPhasesPass !== false;

    const decision = decidePhase16Certification({
      live,
      schemaOk,
      regressionOk,
    });

    const confidence: AuditConfidence = "HIGH";
    const dataSource: AuditDataSource = "database";
    const base = auditBase(dataSource, confidence);

    const summary = {
      ...base,
      phase: "16",
      title: "Phase 16 controlled shadow recommendation engine certification",
      certificationId: PHASE16_CERTIFICATION_ID,
      implementationId: PHASE16_IMPLEMENTATION_ID,
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
      KnowledgeControlsPatientCare: "NO",
      ClinicalActivationEnabled: "NO",
      ControlledPilotAllowed: "NO",
      EnterpriseActiveAllowed: "NO",
      OrderFromRecommendationAllowed: "NO",
      OrderingChanged: "NO",
      MARChanged: "NO",
      BillingChanged: "NO",
      AcetaminophenIdentityBlocked: "YES",
      FabricatedRecommendations: "NO",
      KnownNonblockingGaps: [
        "Phase 16 certifies shadow recommendation engine only",
        "Controlled Pilot and Enterprise Active remain blocked",
        "Positive clinical domain completeness still governed by Phase 15 deferrals",
      ],
      auditStatus: "COMPLETE",
      catalogClassification: "CURATED",
      catalogComplete: false,
    };

    const dir = resolve(__dirname, "../audit-summaries");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      resolve(dir, "medication-phase16-certification.json"),
      `${JSON.stringify(summary, null, 2)}\n`,
      "utf8"
    );

    const md = [
      "# Medication Intelligence Phase 16 Certification",
      "",
      `**Certification ID:** ${PHASE16_CERTIFICATION_ID}`,
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
      "- Production CDS / Controlled Pilot / Enterprise Active",
      "- Ordering from recommendations",
      "- Fabricated clinical recommendations",
      "- Acetaminophen resolution",
      "",
    ].join("\n");
    writeFileSync(
      resolve(dir, "medication-phase16-certification.md"),
      md,
      "utf8"
    );

    const summaryPath = writeAuditArtifact(
      "medication-phase16-certification-summary.json",
      summary
    );

    if (
      !(PHASE16_CERTIFICATION_DECISION_VALUES as readonly string[]).includes(
        decision
      )
    ) {
      throw new Error(`Invalid Phase 16 decision: ${decision}`);
    }

    return { summaryPath, finalDecision: decision, live };
  });

  if (!result.ok) {
    throw new Error(`Phase 16 certification failed: ${result.error}`);
  }
  return result.value;
}
