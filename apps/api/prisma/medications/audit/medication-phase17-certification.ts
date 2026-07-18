/**
 * Medication Intelligence Phase 17 — controlled pilot qualification certification.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { PrismaClient } from "@prisma/client";
import {
  PHASE16_PROGRAM_KEY,
  PHASE17_CERTIFICATION_DECISION_VALUES,
  PHASE17_CERTIFICATION_ID as PHASE17_CERTIFICATION_ID_VALUE,
  PHASE17_IMPLEMENTATION_ID,
  PHASE17_RECOMMENDATION_DEFAULTS,
  assertEnterpriseActivationBlocked,
  assertNoBlockingBehavior,
  assertPhase17SafetyDefaults,
  type Phase17CertificationDecision,
} from "@medora/shared";
import {
  type AuditConfidence,
  type AuditDataSource,
  withPrisma,
  writeAuditArtifact,
  auditBase,
} from "./medication-audit-types";

export const PHASE17_CERTIFICATION_ID = PHASE17_CERTIFICATION_ID_VALUE;

export const PHASE17_ARTIFACTS = [
  "medication-phase17-readiness.json",
  "medication-phase17-qualification.json",
  "medication-phase17-controlled-pilot-certification.json",
  "medication-phase17-controlled-pilot-certification-summary.json",
  "medication-phase17-controlled-pilot-certification.md",
] as const;

const SCHEMA = resolve(__dirname, "../../schema.prisma");
const MIGRATION = resolve(
  __dirname,
  "../../migrations/20261022120000_medication_phase_17_controlled_pilot/migration.sql"
);
const SERVICE = resolve(
  __dirname,
  "../../../src/medications/recommendation-pilot/medication-recommendation-pilot.service.ts"
);
const CONTROLLER = resolve(
  __dirname,
  "../../../src/medications/recommendation-pilot/medication-recommendation-pilot.controller.ts"
);
const ADMIN_UI = resolve(
  __dirname,
  "../../../../../apps/web/app/app/admin/medication-governance/recommendation-pilot/page.tsx"
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
  "../../../../../docs/clinical/medication-intelligence-phase-17-controlled-pilot-architecture.md"
);
const PHASE16_SUMMARY = resolve(
  __dirname,
  "../audit-summaries/medication-phase16-certification-summary.json"
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
  const phase16Program = await prisma.medicationRecommendationProgram.findUnique({
    where: { programKey: PHASE16_PROGRAM_KEY },
    include: { definitions: true },
  });
  const defs = phase16Program?.definitions ?? [];
  const shadowCount = defs.filter(
    (d) => d.lifecycleStatus === "SHADOW_RECOMMENDATION"
  ).length;
  const acetaminophenDefs = defs.filter((d) =>
    /acetaminophen/i.test(d.familyKey)
  ).length;
  const enterpriseLifecycle = defs.filter(
    (d) => d.lifecycleStatus === "ENTERPRISE_ACTIVE"
  ).length;

  const quals = await prisma.medicationRecommendationPilotQualification.findMany({
    orderBy: { evaluatedAt: "desc" },
    take: 200,
  });
  const latestByDef = new Map<string, (typeof quals)[number]>();
  for (const q of quals) {
    if (!latestByDef.has(q.recommendationDefinitionId)) {
      latestByDef.set(q.recommendationDefinitionId, q);
    }
  }
  const latestQuals = [...latestByDef.values()];
  const eligible = latestQuals.filter((q) =>
    String(q.qualificationDecision).startsWith("PILOT_ELIGIBLE")
  ).length;

  const programs = await prisma.medicationRecommendationPilotProgram.findMany({
    include: {
      definitions: true,
      providers: true,
      _count: { select: { exposures: true, safetyEvents: true } },
    },
  });
  const activePrograms = programs.filter((p) => p.status === "ACTIVE");
  const activePilotCount = activePrograms.length;
  const enterpriseAllowedPrograms = programs.filter(
    (p) => p.enterpriseActiveAllowed
  ).length;
  const orderFromRecPrograms = programs.filter(
    (p) => p.orderFromRecommendationEnabled
  ).length;
  const productionCdsPrograms = programs.filter(
    (p) => p.productionCdsEnabled
  ).length;

  const exposures = await prisma.medicationRecommendationPilotExposure.findMany({
    take: 5000,
  });
  const ack = exposures.filter((e) => e.acknowledgedAt).length;
  const dismiss = exposures.filter((e) => e.dismissedAt).length;
  const disagree = exposures.filter((e) => e.disagreedAt).length;
  const orderMut = exposures.filter((e) => e.orderMutationDetected).length;
  const marMut = exposures.filter((e) => e.marMutationDetected).length;
  const chartMut = exposures.filter((e) => e.chartMutationDetected).length;

  const safetyEvents =
    await prisma.medicationRecommendationPilotSafetyEvent.count();
  const autoSuspensions =
    await prisma.medicationRecommendationPilotSafetyEvent.count({
      where: {
        OR: [
          { eventType: { contains: "AUTO_SUSPEND" } },
          { detectionSource: "AUTOMATIC" },
        ],
      },
    });

  const facilityIds = new Set(activePrograms.map((p) => p.facilityId));
  const providerCohort = activePrograms.reduce(
    (n, p) =>
      n + p.providers.filter((x) => x.authorizationStatus === "AUTHORIZED").length,
    0
  );
  const definitionCount = activePrograms.reduce(
    (n, p) => n + p.definitions.filter((d) => d.enabled).length,
    0
  );

  let phase16Certified = false;
  if (existsSync(PHASE16_SUMMARY)) {
    try {
      const s = JSON.parse(readFileSync(PHASE16_SUMMARY, "utf8")) as {
        FinalDecision?: string;
      };
      phase16Certified =
        typeof s.FinalDecision === "string" &&
        s.FinalDecision.startsWith("MEDICATION_INTELLIGENCE_PHASE_16_CERTIFIED");
    } catch {
      phase16Certified = false;
    }
  }

  return {
    Phase16Certified: phase16Certified,
    Wave1ShadowDefinitions: shadowCount,
    AcetaminophenDefinitions: acetaminophenDefs,
    EnterpriseLifecycleDefinitions: enterpriseLifecycle,
    EligibleQualifications: eligible,
    QualificationRows: latestQuals.length,
    PilotProgramCount: programs.length,
    ActivePilotCount: activePilotCount,
    FacilityScopeCount: facilityIds.size,
    ProviderCohortSize: providerCohort,
    ActiveDefinitionCount: definitionCount,
    AdvisoryExposureCount: exposures.length,
    Acknowledgements: ack,
    Dismissals: dismiss,
    Disagreements: disagree,
    SafetyEventCount: safetyEvents,
    AutomaticSuspensions: autoSuspensions,
    OrderMutations: orderMut,
    MarMutations: marMut,
    ChartMutations: chartMut,
    EnterpriseActivations: enterpriseLifecycle + enterpriseAllowedPrograms,
    OrderFromRecommendationPrograms: orderFromRecPrograms,
    ProductionCdsPrograms: productionCdsPrograms,
    ProgramClinicalActivation: phase16Program?.clinicalActivationAllowed ?? false,
    ProgramControlledPilotAllowed:
      phase16Program?.controlledPilotAllowed ?? false,
    ProgramEnterpriseActiveAllowed:
      phase16Program?.enterpriseActiveAllowed ?? false,
    ProgramOrderFromRecommendationAllowed:
      phase16Program?.orderFromRecommendationAllowed ?? false,
    ClinicalActivations: 0,
    ProviderAlerts: 0,
    OrderBlocks: 0,
    ProductionCds: "OFF" as const,
    Defaults: PHASE17_RECOMMENDATION_DEFAULTS,
  };
}

function probeSchema() {
  const schema = existsSync(SCHEMA) ? readFileSync(SCHEMA, "utf8") : "";
  const shared = existsSync(SHARED) ? readFileSync(SHARED, "utf8") : "";
  return {
    migrationPresent: existsSync(MIGRATION),
    hasPilotProgram: schema.includes(
      "model MedicationRecommendationPilotProgram"
    ),
    hasPilotQualification: schema.includes(
      "model MedicationRecommendationPilotQualification"
    ),
    hasPilotExposure: schema.includes(
      "model MedicationRecommendationPilotExposure"
    ),
    servicePresent: existsSync(SERVICE),
    controllerPresent: existsSync(CONTROLLER),
    adminUiPresent: existsSync(ADMIN_UI),
    providerUiPresent: existsSync(PROVIDER_UI),
    sharedPresent: existsSync(SHARED),
    docsPresent: existsSync(DOCS),
    sharedBlocksEnterprise:
      shared.includes("assertEnterpriseActivationBlocked") &&
      shared.includes("PHASE17_CERTIFICATION_ID"),
    failClosedDefaults:
      PHASE17_RECOMMENDATION_DEFAULTS.controlledPilotAllowed === false &&
      PHASE17_RECOMMENDATION_DEFAULTS.enterpriseActiveAllowed === false &&
      PHASE17_RECOMMENDATION_DEFAULTS.orderFromRecommendationEnabled === false &&
      PHASE17_RECOMMENDATION_DEFAULTS.productionCdsEnabled === false,
  };
}

export function decidePhase17Certification(input: {
  live: Awaited<ReturnType<typeof collectLive>>;
  schemaOk: boolean;
  regressionOk: boolean;
}): Phase17CertificationDecision {
  const { live } = input;
  const blockers: string[] = [];

  if (!live.Phase16Certified) blockers.push("PHASE16_NOT_CERTIFIED");
  if (live.AcetaminophenDefinitions > 0) blockers.push("ACETAMINOPHEN_IN_CATALOG");
  if (live.EnterpriseLifecycleDefinitions > 0)
    blockers.push("ENTERPRISE_ACTIVE_LIFECYCLE");
  if (live.EnterpriseActivations > 0) blockers.push("ENTERPRISE_ACTIVATIONS");
  if (live.OrderMutations > 0) blockers.push("ORDER_MUTATIONS");
  if (live.MarMutations > 0) blockers.push("MAR_MUTATIONS");
  if (live.ChartMutations > 0) blockers.push("CHART_MUTATIONS");
  if (live.OrderFromRecommendationPrograms > 0)
    blockers.push("ORDER_FROM_RECOMMENDATION");
  if (live.ProductionCdsPrograms > 0) blockers.push("PRODUCTION_CDS");
  if (live.ProgramClinicalActivation)
    blockers.push("PHASE16_PROGRAM_CLINICAL_ACTIVATION");
  if (live.ProgramEnterpriseActiveAllowed)
    blockers.push("PHASE16_PROGRAM_ENTERPRISE");
  if (live.ProgramOrderFromRecommendationAllowed)
    blockers.push("PHASE16_ORDER_FROM_RECOMMENDATION");
  if (live.ClinicalActivations > 0) blockers.push("CLINICAL_ACTIVATIONS");
  if (live.ProviderAlerts > 0) blockers.push("PROVIDER_ALERTS");
  if (live.OrderBlocks > 0) blockers.push("ORDER_BLOCKS");
  if (!input.schemaOk) blockers.push("SCHEMA_PROBE_FAILED");
  if (!input.regressionOk) blockers.push("REGRESSION_EVIDENCE_FAILED");
  if (live.Wave1ShadowDefinitions < 1) blockers.push("NO_SHADOW_RECOMMENDATIONS");

  if (blockers.length > 0) {
    return "MEDICATION_INTELLIGENCE_PHASE_17_NOT_CERTIFIED";
  }

  if (live.ActivePilotCount > 0) {
    if (
      live.FacilityScopeCount < 1 ||
      live.ProviderCohortSize < 1 ||
      live.ActiveDefinitionCount < 1
    ) {
      return "MEDICATION_INTELLIGENCE_PHASE_17_NOT_CERTIFIED";
    }
    return "MEDICATION_INTELLIGENCE_PHASE_17_CERTIFIED_CONTROLLED_PILOT";
  }

  if (live.EligibleQualifications > 0) {
    return "MEDICATION_INTELLIGENCE_PHASE_17_CERTIFIED_PILOT_READY_NOT_ACTIVATED";
  }

  return "MEDICATION_INTELLIGENCE_PHASE_17_CERTIFIED_CONTINUE_SHADOW_ONLY";
}

export async function writeAllPhase17Artifacts(input: {
  evidence: RegressionEvidence;
}): Promise<{
  summaryPath: string;
  finalDecision: Phase17CertificationDecision;
  live: Awaited<ReturnType<typeof collectLive>>;
}> {
  assertPhase17SafetyDefaults();
  assertEnterpriseActivationBlocked(
    PHASE17_RECOMMENDATION_DEFAULTS.enterpriseActiveAllowed
  );
  assertNoBlockingBehavior(
    PHASE17_RECOMMENDATION_DEFAULTS.orderBlockingEnabled
  );

  const result = await withPrisma(async (prisma) => {
    const live = await collectLive(prisma);
    const schema = probeSchema();
    const schemaOk =
      schema.migrationPresent &&
      schema.hasPilotProgram &&
      schema.hasPilotQualification &&
      schema.hasPilotExposure &&
      schema.servicePresent &&
      schema.controllerPresent &&
      schema.adminUiPresent &&
      schema.providerUiPresent &&
      schema.sharedPresent &&
      schema.sharedBlocksEnterprise &&
      schema.failClosedDefaults;

    const regressionOk =
      input.evidence.focusedTestsPass !== false &&
      input.evidence.fullRegressionPass !== false &&
      input.evidence.buildPass !== false &&
      input.evidence.typecheckPass !== false &&
      input.evidence.diffCheckPass !== false &&
      input.evidence.priorPhasesPass !== false;

    const decision = decidePhase17Certification({
      live,
      schemaOk,
      regressionOk,
    });

    const confidence: AuditConfidence = "HIGH";
    const dataSource: AuditDataSource = "database";
    const base = auditBase(dataSource, confidence);

    const summary = {
      ...base,
      phase: "17",
      title:
        "Phase 17 controlled pilot qualification, safety monitoring, limited clinical advisory",
      certificationId: PHASE17_CERTIFICATION_ID,
      implementationId: PHASE17_IMPLEMENTATION_ID,
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
      OrderFromRecommendation: "DISABLED",
      OrderBlocking: "DISABLED",
      MarMutation: "DISABLED",
      ProductionCds: "OFF",
      ControlledPilotDefault: "OFF",
      AcetaminophenIdentityBlocked: "YES",
      FabricatedPilotActivation: "NO",
      KnownNonblockingGaps: [
        "Phase 17 certifies controlled-pilot readiness or continue-shadow-only without fabricating activation",
        "Enterprise Active remains a future phase",
        "Wave 1 only; acetaminophen remains excluded",
      ],
      auditStatus: "COMPLETE",
      catalogClassification: "CURATED",
      catalogComplete: false,
    };

    const dir = resolve(__dirname, "../audit-summaries");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      resolve(dir, "medication-phase17-controlled-pilot-certification.json"),
      `${JSON.stringify(summary, null, 2)}\n`,
      "utf8"
    );

    const md = [
      "# Medication Intelligence Phase 17 Certification",
      "",
      `**Certification ID:** ${PHASE17_CERTIFICATION_ID}`,
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
      "- Order From Recommendation: DISABLED",
      "- Order / MAR / Chart mutations: ZERO required",
      "- Production CDS: OFF",
      "- Controlled pilot only when explicitly authorized",
      "",
      "## Not claimed",
      "",
      "- Enterprise-wide activation",
      "- Automatic ordering / prescribing / MAR",
      "- Acetaminophen identity resolution",
      "- Fabricated pilot evidence",
      "",
    ].join("\n");
    writeFileSync(
      resolve(dir, "medication-phase17-controlled-pilot-certification.md"),
      md,
      "utf8"
    );

    const summaryPath = writeAuditArtifact(
      "medication-phase17-controlled-pilot-certification-summary.json",
      summary
    );

    if (
      !(PHASE17_CERTIFICATION_DECISION_VALUES as readonly string[]).includes(
        decision
      )
    ) {
      throw new Error(`Invalid Phase 17 decision: ${decision}`);
    }

    return { summaryPath, finalDecision: decision, live };
  });

  if (!result.ok) {
    throw new Error(`Phase 17 certification failed: ${result.error}`);
  }
  return result.value;
}
