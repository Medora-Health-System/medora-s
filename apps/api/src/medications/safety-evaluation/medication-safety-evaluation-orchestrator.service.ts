/**
 * Phase 10 — shadow evaluation orchestrator.
 * Never mutates orders/MAR/billing; never emits provider alerts.
 */
import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import {
  assertShadowOnlyFinding,
  PHASE10_ENGINE_VERSION,
  PHASE10_SAFETY_EVALUATION_DEFAULTS,
  type MedicationSafetyEvaluationTrigger,
} from "@medora/shared";
import {
  assertEvaluationModeAllowsShadowRun,
  getMedicationSafetyEvaluationMode,
} from "./medication-safety-evaluation-config";
import { assemblePatientContextSnapshot } from "./medication-safety-patient-context.service";
import { resolveMedicationIdentity } from "./medication-safety-medication-resolver.service";
import {
  evaluateAllergyAndCrossReactivity,
  evaluateClinicalKnowledgeSafety,
  evaluateDrugInteractions,
  evaluateDuplicateTherapy,
  evaluateInsufficientContext,
  type ShadowFindingDraft,
} from "./medication-safety-evaluators.service";
import { applySuppressionRules } from "./medication-safety-suppression.service";

export type SafetyEvaluationActor = { userId: string; roles: string[]; facilityId?: string };

function requireOperator(actor: SafetyEvaluationActor): void {
  const allowed = ["MEDICATION_ADMIN", "MEDICATION_REVIEWER", "MEDORA_SUPER_ADMIN", "ADMIN"];
  if (!actor.roles.some((r) => allowed.includes(r))) {
    throw new Error("Unauthorized safety evaluation operator.");
  }
}

async function writeEvalAudit(
  prisma: PrismaClient,
  input: {
    entityType: string;
    entityId: string;
    action: string;
    performedByUserId: string;
    reason?: string;
    correlationId?: string;
    afterState?: Prisma.InputJsonValue;
  }
) {
  await prisma.medicationSafetyEvaluationAuditEvent.create({
    data: {
      id: randomUUID(),
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      performedByUserId: input.performedByUserId,
      reason: input.reason,
      correlationId: input.correlationId,
      afterState: input.afterState,
    },
  });
}

async function persistFindingsIdempotent(
  prisma: PrismaClient,
  runId: string,
  patientId: string,
  encounterId: string | undefined,
  drafts: ShadowFindingDraft[],
  fixtureMarker?: string
): Promise<{ created: number; deduplicated: number }> {
  let created = 0;
  let deduplicated = 0;
  for (const draft of drafts) {
    assertShadowOnlyFinding(true);
    const existing = await prisma.medicationSafetyEvaluationFinding.findUnique({
      where: { deduplicationKey: draft.deduplicationKey },
    });
    if (existing) {
      deduplicated += 1;
      continue;
    }
    try {
      await prisma.medicationSafetyEvaluationFinding.create({
        data: {
          id: randomUUID(),
          evaluationRunId: runId,
          patientId,
          encounterId,
          findingType: draft.findingType,
          severity: draft.severity,
          clinicalSignificance: draft.clinicalSignificance,
          ruleId: draft.ruleId,
          knowledgeEntityType: draft.knowledgeEntityType,
          knowledgeEntityId: draft.knowledgeEntityId,
          sourceVersionId: draft.sourceVersionId,
          title: draft.title,
          summary: draft.summary,
          mechanism: draft.mechanism,
          recommendedFutureAction: draft.recommendedFutureAction,
          monitoringRecommendation: draft.monitoringRecommendation,
          evidenceLevel: draft.evidenceLevel,
          relatedAllergyId: draft.relatedAllergyId,
          futureAlertEligible: false,
          shadowOnly: true,
          deduplicationKey: draft.deduplicationKey,
          requiresClinicalValidation: draft.requiresClinicalValidation ?? false,
          emergencyContextTagsJson: draft.emergencyContextTags as
            | Prisma.InputJsonValue
            | undefined,
          calculationTraceJson: draft.calculationTrace as Prisma.InputJsonValue | undefined,
          fixtureMarker,
        },
      });
      created += 1;
    } catch {
      deduplicated += 1;
    }
  }
  return { created, deduplicated };
}

/**
 * Non-blocking shadow evaluation entrypoint.
 * Order workflows must call this asynchronously and ignore failures.
 */
export async function runShadowSafetyEvaluation(
  prisma: PrismaClient,
  actor: SafetyEvaluationActor,
  input: {
    patientId: string;
    encounterId?: string;
    triggerType?: MedicationSafetyEvaluationTrigger;
    candidateMedicationConceptId?: string;
    candidateMedicationProductId?: string;
    candidateMedicationOrderId?: string;
    relatedMedicationConceptIds?: string[];
    emergencyContextTags?: string[];
    pregnancyStatus?: string;
    lactationStatus?: string;
    estimatedGfr?: number;
    creatinineClearance?: number;
    hepaticFunctionClassification?: string;
    weightKg?: number;
    fixtureMarker?: string;
    correlationId?: string;
  }
) {
  requireOperator(actor);
  const mode = getMedicationSafetyEvaluationMode();
  const correlationId = input.correlationId ?? randomUUID();
  const triggerType = input.triggerType ?? "MANUAL_ADMIN_TEST";

  if (mode === "DISABLED") {
    const cancelled = await prisma.medicationSafetyEvaluationRun.create({
      data: {
        id: randomUUID(),
        patientId: input.patientId,
        encounterId: input.encounterId,
        triggerType,
        operatingMode: "DISABLED",
        status: "CANCELLED",
        requestedByUserId: actor.userId,
        engineVersion: PHASE10_ENGINE_VERSION,
        correlationId,
        fixtureMarker: input.fixtureMarker,
        errorsJson: {
          reason: "EVALUATION_DISABLED",
          providerFacingAlerts: 0,
          orderBlocks: 0,
        } as Prisma.InputJsonValue,
        completedAt: new Date(),
      },
    });
    await writeEvalAudit(prisma, {
      entityType: "MedicationSafetyEvaluationRun",
      entityId: cancelled.id,
      action: "SHADOW_RUN_CANCELLED_DISABLED",
      performedByUserId: actor.userId,
      correlationId,
    });
    return cancelled;
  }

  assertEvaluationModeAllowsShadowRun(mode);
  assertShadowOnlyFinding(PHASE10_SAFETY_EVALUATION_DEFAULTS.shadowOnlyRequired);

  const started = Date.now();
  const run = await prisma.medicationSafetyEvaluationRun.create({
    data: {
      id: randomUUID(),
      patientId: input.patientId,
      encounterId: input.encounterId,
      triggerType,
      operatingMode: "SHADOW",
      status: "RUNNING",
      requestedByUserId: actor.userId,
      startedAt: new Date(),
      engineVersion: PHASE10_ENGINE_VERSION,
      correlationId,
      candidateMedicationConceptId: input.candidateMedicationConceptId,
      candidateMedicationProductId: input.candidateMedicationProductId,
      candidateMedicationOrderId: input.candidateMedicationOrderId,
      fixtureMarker: input.fixtureMarker,
    },
  });

  try {
    const contextStarted = Date.now();
    const { snapshotId, context } = await assemblePatientContextSnapshot(prisma, {
      patientId: input.patientId,
      encounterId: input.encounterId,
      facilityId: actor.facilityId,
      emergencyContextTags: input.emergencyContextTags,
      pregnancyStatus: input.pregnancyStatus,
      lactationStatus: input.lactationStatus,
      estimatedGfr: input.estimatedGfr,
      creatinineClearance: input.creatinineClearance,
      hepaticFunctionClassification: input.hepaticFunctionClassification,
      weightKg: input.weightKg,
      fixtureMarker: input.fixtureMarker,
    });

    const candidate = await resolveMedicationIdentity(prisma, {
      conceptId: input.candidateMedicationConceptId,
      productId: input.candidateMedicationProductId,
      orderItemId: input.candidateMedicationOrderId,
    });

    const knowledgeStarted = Date.now();
    const knowledgeRetrievalMs = knowledgeStarted - contextStarted;

    let rulesConsidered = 0;
    let rulesEvaluated = 0;
    const drafts: ShadowFindingDraft[] = [];

    if (!candidate.resolved) {
      drafts.push({
        findingType: "UNRESOLVED_MEDICATION_IDENTITY",
        severity: "MODERATE",
        title: "Shadow unresolved medication identity",
        summary: candidate.unresolvedReason ?? "Unresolved medication identity.",
        requiresClinicalValidation: true,
        deduplicationKey: [
          input.patientId,
          input.encounterId ?? "",
          candidate.identityKey,
          "UNRESOLVED_MEDICATION_IDENTITY",
          candidate.unresolvedReason ?? "unknown",
        ]
          .join("|")
          .toLowerCase(),
      });
      rulesEvaluated += 1;
    } else {
      const relatedConceptIds = input.relatedMedicationConceptIds ?? [];
      const ddi = await evaluateDrugInteractions(prisma, {
        patientId: input.patientId,
        encounterId: input.encounterId,
        candidate,
        relatedConceptIds,
      });
      const allergy = await evaluateAllergyAndCrossReactivity(prisma, {
        patientId: input.patientId,
        encounterId: input.encounterId,
        candidate,
        allergyIds: context.activeAllergyIds,
      });
      const dup = await evaluateDuplicateTherapy(prisma, {
        patientId: input.patientId,
        encounterId: input.encounterId,
        candidate,
        relatedConceptIds,
        emergencyContextTags: context.emergencyContextTags,
      });
      const clinical = await evaluateClinicalKnowledgeSafety(prisma, {
        patientId: input.patientId,
        encounterId: input.encounterId,
        candidate,
        context,
      });
      const insufficient = evaluateInsufficientContext({
        patientId: input.patientId,
        encounterId: input.encounterId,
        candidate,
        context,
      });

      rulesConsidered =
        ddi.rulesConsidered +
        allergy.rulesConsidered +
        dup.rulesConsidered +
        clinical.rulesConsidered;
      drafts.push(
        ...ddi.findings,
        ...allergy.findings,
        ...dup.findings,
        ...clinical.findings,
        ...insufficient
      );
      rulesEvaluated = drafts.length;
    }

    const ruleEvaluationMs = Date.now() - knowledgeStarted;
    const { findings: afterSuppression, suppressed } = await applySuppressionRules(
      prisma,
      drafts,
      context.emergencyContextTags
    );

    const persistStarted = Date.now();
    const { created, deduplicated } = await persistFindingsIdempotent(
      prisma,
      run.id,
      input.patientId,
      input.encounterId,
      afterSuppression,
      input.fixtureMarker
    );
    const findingPersistenceMs = Date.now() - persistStarted;
    const durationMs = Date.now() - started;

    const updated = await prisma.medicationSafetyEvaluationRun.update({
      where: { id: run.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        patientContextSnapshotId: snapshotId,
        rulesConsidered,
        rulesEvaluated,
        findingsCreated: created,
        findingsSuppressed: suppressed,
        findingsDeduplicated: deduplicated,
        durationMs,
        knowledgeRetrievalMs,
        ruleEvaluationMs,
        findingPersistenceMs,
        knowledgeVersionIdsJson: [] as Prisma.InputJsonValue,
      },
      include: { findings: true, contextSnapshot: true },
    });

    await writeEvalAudit(prisma, {
      entityType: "MedicationSafetyEvaluationRun",
      entityId: run.id,
      action: "SHADOW_RUN_COMPLETED",
      performedByUserId: actor.userId,
      correlationId,
      afterState: {
        findingsCreated: created,
        findingsSuppressed: suppressed,
        findingsDeduplicated: deduplicated,
        providerFacingAlerts: 0,
        orderBlocks: 0,
        orderMutations: 0,
        shadowOnly: true,
      },
    });

    return updated;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Evaluation failed";
    const failed = await prisma.medicationSafetyEvaluationRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        failedAt: new Date(),
        completedAt: new Date(),
        errorsJson: {
          message,
          isolatedFromOrders: true,
          providerFacingAlerts: 0,
          orderBlocks: 0,
        } as Prisma.InputJsonValue,
        durationMs: Date.now() - started,
      },
    });
    await writeEvalAudit(prisma, {
      entityType: "MedicationSafetyEvaluationRun",
      entityId: run.id,
      action: "SHADOW_RUN_FAILED",
      performedByUserId: actor.userId,
      correlationId,
      reason: message,
      afterState: { isolatedFromOrders: true },
    });
    // Failure isolation: rethrow for admin callers, but order hooks must catch.
    throw Object.assign(new Error(message), { evaluationRun: failed, isolatedFromOrders: true });
  }
}

/** Order-path hook: fire-and-forget; never throws to caller. */
export function enqueueOrderSignShadowEvaluation(
  prisma: PrismaClient,
  input: {
    patientId: string;
    encounterId?: string;
    orderItemId?: string;
    facilityId?: string;
  }
): void {
  const mode = getMedicationSafetyEvaluationMode();
  if (mode !== "SHADOW") return;
  void runShadowSafetyEvaluation(
    prisma,
    {
      userId: "system-shadow",
      roles: ["MEDICATION_ADMIN"],
      facilityId: input.facilityId,
    },
    {
      patientId: input.patientId,
      encounterId: input.encounterId,
      triggerType: "ORDER_SIGN_SHADOW",
      candidateMedicationOrderId: input.orderItemId,
      correlationId: randomUUID(),
    }
  ).catch(() => {
    // Intentionally swallow — evaluation failure must not affect orders.
  });
}
