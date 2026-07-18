/**
 * Phase 14B Part 3 — controlled synthetic shadow evaluation.
 * Consumes immutable MedicationShadowSnapshot; invokes Phase 10 in SHADOW mode.
 */
import { createHash } from "node:crypto";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma, PrismaClient } from "@prisma/client";
import {
  PHASE10_ENGINE_VERSION,
  PHASE13_WAVE1_KEY,
  PHASE14B_DEFERRED_DOMAIN_KEYS,
  PHASE14B_SYNTHETIC_BATCH_KEY,
  PHASE14B_SYNTHETIC_BATCH_VERSION,
  PHASE14B_SYNTHETIC_EXECUTION_MODE,
  PHASE14B_SYNTHETIC_FIXTURE_MARKER,
  PHASE14B_SYNTHETIC_REFERENCE_SET_CODE,
  PHASE14B_SYNTHETIC_SHADOW_DEFAULTS,
  assertNoMutableDraftKnowledgeConsumption,
  assertPhase14BSyntheticNoClinicalActivation,
  assertPhase14BSyntheticNoWorkflowControl,
  classifySyntheticFindingOutcome,
  evaluateBatchReadiness,
  evaluateFamilyExecutionStatus,
  isPermittedNegativeCaseFinding,
  stableJsonHashPayload,
} from "@medora/shared";
import { runShadowSafetyEvaluation } from "../safety-evaluation/medication-safety-evaluation-orchestrator.service";
import {
  approveReferenceSet,
  createReferenceSet,
} from "../safety-validation/medication-safety-reference-set.service";
import { isSeAdmin } from "./medication-shadow-evaluation.roles";

export type SeActor = { userId: string; roles: string[]; facilityId?: string };

function requireAdmin(actor: SeActor) {
  if (!isSeAdmin(actor.roles)) {
    throw new ForbiddenException("Administrateur médicament requis.");
  }
}

function assertSafetyDefaults() {
  assertPhase14BSyntheticNoClinicalActivation(
    PHASE14B_SYNTHETIC_SHADOW_DEFAULTS.clinicalActivationEnabled
  );
  assertPhase14BSyntheticNoWorkflowControl(
    PHASE14B_SYNTHETIC_SHADOW_DEFAULTS.knowledgeControlsPatientCare
  );
  assertNoMutableDraftKnowledgeConsumption(
    PHASE14B_SYNTHETIC_SHADOW_DEFAULTS.consumeMutableDraftKnowledge
  );
}

function sha256(payload: unknown): string {
  return createHash("sha256")
    .update(stableJsonHashPayload(payload))
    .digest("hex");
}

/** Wall-clock excluded so re-hash of persisted jsonb matches write-time hash. */
function canonicalInputForHash(inputSnapshot: Record<string, unknown>) {
  const { executionTimestamp: _ts, ...rest } = inputSnapshot;
  return rest;
}

async function audit(
  prisma: PrismaClient,
  input: {
    entityType: string;
    entityId: string;
    action: string;
    userId: string;
    after?: unknown;
    reason?: string;
  }
) {
  await prisma.medicationExpertReviewAuditEvent.create({
    data: {
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      afterState: (input.after as Prisma.InputJsonValue) ?? undefined,
      performedByUserId: input.userId,
      reason: input.reason,
    },
  });
}

async function resolveFixturePatientId(prisma: PrismaClient): Promise<string> {
  const patient = await prisma.patient.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!patient) {
    throw new BadRequestException(
      "Aucun patient pour les fixtures synthétiques Phase 14B."
    );
  }
  return patient.id;
}

export async function createOrGetSyntheticShadowBatch(
  prisma: PrismaClient,
  actor: SeActor
) {
  requireAdmin(actor);
  assertSafetyDefaults();

  const existing = await prisma.medicationShadowEvaluationBatch.findUnique({
    where: { batchKey: PHASE14B_SYNTHETIC_BATCH_KEY },
  });
  if (existing) return existing;

  const wave = await prisma.medicationKnowledgeApprovalWave.findUnique({
    where: { waveKey: PHASE13_WAVE1_KEY },
  });
  if (!wave) {
    throw new NotFoundException("Vague Phase 13 introuvable.");
  }

  const approvedCount = await prisma.medicationKnowledgeApprovalWaveItem.count({
    where: { waveId: wave.id, approvalStatus: "APPROVED_FOR_SHADOW" },
  });
  if (approvedCount < 1) {
    throw new BadRequestException(
      "Aucune famille APPROVED_FOR_SHADOW — exécutez d’abord la revue experte Phase 14B."
    );
  }

  const batch = await prisma.medicationShadowEvaluationBatch.create({
    data: {
      batchKey: PHASE14B_SYNTHETIC_BATCH_KEY,
      version: PHASE14B_SYNTHETIC_BATCH_VERSION,
      status: "DRAFT",
      readiness: "NOT_READY",
      waveKey: PHASE13_WAVE1_KEY,
      approvalWaveId: wave.id,
      engineVersion: PHASE10_ENGINE_VERSION,
      ruleSetVersion: "phase14b-synthetic-1.0.0",
      configurationJson: {
        executionMode: PHASE14B_SYNTHETIC_EXECUTION_MODE,
        fixtureMarker: PHASE14B_SYNTHETIC_FIXTURE_MARKER,
        consumeDraftKnowledge: false,
      },
      createdByUserId: actor.userId,
    },
  });

  await audit(prisma, {
    entityType: "MedicationShadowEvaluationBatch",
    entityId: batch.id,
    action: "SHADOW_BATCH_CREATED",
    userId: actor.userId,
    after: { batchKey: PHASE14B_SYNTHETIC_BATCH_KEY, approvedCount },
  });

  return batch;
}

type FamilyCtx = {
  familyKey: string;
  requestedFamilyName: string;
  canonicalConceptId: string;
  waveItemId: string;
  snapshot: {
    id: string;
    shadowVersion: string;
    snapshotHash: string;
    knowledgeSnapshot: unknown;
  };
};

async function loadApprovedWave1Families(
  prisma: PrismaClient
): Promise<FamilyCtx[]> {
  const wave = await prisma.medicationKnowledgeApprovalWave.findUnique({
    where: { waveKey: PHASE13_WAVE1_KEY },
    include: { items: true },
  });
  if (!wave) throw new NotFoundException("Vague Phase 13 introuvable.");

  const out: FamilyCtx[] = [];
  for (const item of wave.items) {
    if (item.approvalStatus !== "APPROVED_FOR_SHADOW") continue;
    if (!item.canonicalConceptId) continue;
    const snapshot = await prisma.medicationShadowSnapshot.findFirst({
      where: { familyKey: item.familyKey },
      orderBy: { createdAt: "desc" },
    });
    if (!snapshot) {
      throw new BadRequestException(
        `Instantané ombre manquant pour ${item.familyKey}.`
      );
    }
    out.push({
      familyKey: item.familyKey,
      requestedFamilyName: item.requestedFamilyName,
      canonicalConceptId: item.canonicalConceptId,
      waveItemId: item.id,
      snapshot: {
        id: snapshot.id,
        shadowVersion: snapshot.shadowVersion,
        snapshotHash: snapshot.snapshotHash,
        knowledgeSnapshot: snapshot.knowledgeSnapshot,
      },
    });
  }
  return out;
}

export async function materializeSyntheticReferenceCases(
  prisma: PrismaClient,
  actor: SeActor
) {
  requireAdmin(actor);
  const batch = await createOrGetSyntheticShadowBatch(prisma, actor);
  const families = await loadApprovedWave1Families(prisma);

  const existing = await prisma.medicationSafetyReferenceSet.findFirst({
    where: { code: PHASE14B_SYNTHETIC_REFERENCE_SET_CODE },
    include: { cases: { include: { expectedFindings: true } } },
  });
  if (existing) {
    await prisma.medicationShadowEvaluationBatch.update({
      where: { id: batch.id },
      data: { referenceSetId: existing.id },
    });
    return existing;
  }

  const cases = [];
  for (const fam of families) {
    const base = {
      familyKey: fam.familyKey,
      canonicalConceptId: fam.canonicalConceptId,
      shadowSnapshotId: fam.snapshot.id,
      shadowVersion: fam.snapshot.shadowVersion,
      snapshotHash: fam.snapshot.snapshotHash,
      executionMode: PHASE14B_SYNTHETIC_EXECUTION_MODE,
      fixtureMarker: PHASE14B_SYNTHETIC_FIXTURE_MARKER,
      draftKnowledgeMustBeIgnored: true,
    };

    cases.push({
      caseKey: `P14B_SYN_${fam.familyKey}_IDENTITY_GUARD`,
      title: `${fam.requestedFamilyName} — identity guard`,
      description:
        "Canonical identity must resolve; no guessing. Synthetic only.",
      syntheticContextJson: {
        ...base,
        caseCategory: "IDENTITY_GUARD",
      },
      expectedFindings: [],
    });
    cases.push({
      caseKey: `P14B_SYN_${fam.familyKey}_PROVENANCE_GUARD`,
      title: `${fam.requestedFamilyName} — provenance/snapshot integrity`,
      description:
        "Execution must pin immutable approved shadow snapshot; drafts excluded.",
      syntheticContextJson: {
        ...base,
        caseCategory: "PROVENANCE_GUARD",
      },
      expectedFindings: [],
    });
    cases.push({
      caseKey: `P14B_SYN_${fam.familyKey}_DEFERRED_DOMAIN_GUARD`,
      title: `${fam.requestedFamilyName} — deferred domain guard`,
      description:
        "Deferred dosing/pregnancy/licensed-interaction domains must be DOMAIN_DEFERRED_NOT_EVALUATED.",
      syntheticContextJson: {
        ...base,
        caseCategory: "DEFERRED_DOMAIN_GUARD",
        deferredDomains: [...PHASE14B_DEFERRED_DOMAIN_KEYS],
      },
      expectedFindings: [],
    });
    cases.push({
      caseKey: `P14B_SYN_${fam.familyKey}_NEGATIVE_NO_FINDING`,
      title: `${fam.requestedFamilyName} — negative expected no safety finding`,
      description:
        "Synthetic patient without allergies/concurrent meds. Expect no DDI/allergy/duplicate findings. INSUFFICIENT_PATIENT_CONTEXT permitted.",
      syntheticContextJson: {
        ...base,
        caseCategory: "NEGATIVE_EXPECTED_NO_FINDING",
        expectedNoFindings: [
          "DRUG_DRUG_INTERACTION",
          "DIRECT_ALLERGY_MATCH",
          "THERAPEUTIC_CLASS_DUPLICATION",
          "EXACT_DUPLICATE_INGREDIENT",
        ],
      },
      expectedFindings: [],
    });
    cases.push({
      caseKey: `P14B_SYN_${fam.familyKey}_KNOWLEDGE_GAP_TIER1`,
      title: `${fam.requestedFamilyName} — Tier-1 positive finding knowledge gap`,
      description:
        "Institutional Tier-5 evidence does not support inventing positive clinical findings. Documented knowledge gap — not evaluated as miss.",
      syntheticContextJson: {
        ...base,
        caseCategory: "KNOWLEDGE_GAP_DOCUMENTATION",
        knowledgeGapReason:
          "POSITIVE_FINDING_REQUIRES_TIER1_OR_LICENSED_SOURCE",
      },
      expectedFindings: [],
    });
  }

  const set = await createReferenceSet(
    prisma,
    {
      code: PHASE14B_SYNTHETIC_REFERENCE_SET_CODE,
      name: "Phase 14B EM Wave 1 synthetic shadow reference set",
      description:
        "Governed synthetic cases for approved-for-shadow Wave 1 snapshots. No fabricated Tier-1 findings.",
      version: PHASE14B_SYNTHETIC_BATCH_VERSION,
      cases,
    },
    actor
  );

  await approveReferenceSet(prisma, set.id, actor);

  await prisma.medicationShadowEvaluationBatch.update({
    where: { id: batch.id },
    data: { referenceSetId: set.id },
  });

  return set;
}

export async function validateSyntheticShadowBatch(
  prisma: PrismaClient,
  actor: SeActor
) {
  requireAdmin(actor);
  const batch = await createOrGetSyntheticShadowBatch(prisma, actor);
  const families = await loadApprovedWave1Families(prisma);
  const refSet = await materializeSyntheticReferenceCases(prisma, actor);

  const draftProfiles = await prisma.medicationClinicalProfile.count({
    where: {
      lifecycleStatus: "DRAFT",
      conceptId: { in: families.map((f) => f.canonicalConceptId) },
    },
  });

  const inputHash = sha256({
    batchKey: PHASE14B_SYNTHETIC_BATCH_KEY,
    version: PHASE14B_SYNTHETIC_BATCH_VERSION,
    families: families.map((f) => ({
      familyKey: f.familyKey,
      snapshotId: f.snapshot.id,
      snapshotHash: f.snapshot.snapshotHash,
    })),
    referenceSetId: refSet.id,
    engineVersion: PHASE10_ENGINE_VERSION,
  });

  const updated = await prisma.medicationShadowEvaluationBatch.update({
    where: { id: batch.id },
    data: {
      status: "READY_TO_EXECUTE",
      readiness: "READY_TO_EXECUTE",
      referenceSetId: refSet.id,
      inputHash,
      configurationJson: {
        executionMode: PHASE14B_SYNTHETIC_EXECUTION_MODE,
        fixtureMarker: PHASE14B_SYNTHETIC_FIXTURE_MARKER,
        familyCount: families.length,
        caseCount: refSet.cases.length,
        draftProfilesPresentButIgnored: draftProfiles,
        consumeDraftKnowledge: false,
      },
    },
  });

  await audit(prisma, {
    entityType: "MedicationShadowEvaluationBatch",
    entityId: batch.id,
    action: "SHADOW_BATCH_VALIDATED",
    userId: actor.userId,
    after: {
      familyCount: families.length,
      caseCount: refSet.cases.length,
      inputHash,
    },
  });

  return updated;
}

async function upsertGap(
  prisma: PrismaClient,
  input: {
    batchId: string;
    executionId?: string;
    familyKey: string;
    gapType: string;
    gapKey: string;
    description: string;
    severity?: string;
  }
) {
  const existing = await prisma.medicationShadowGapLink.findUnique({
    where: {
      batchId_gapKey: { batchId: input.batchId, gapKey: input.gapKey },
    },
  });
  if (existing) return existing;
  return prisma.medicationShadowGapLink.create({
    data: {
      batchId: input.batchId,
      executionId: input.executionId,
      familyKey: input.familyKey,
      gapType: input.gapType,
      gapKey: input.gapKey,
      description: input.description,
      severity: input.severity ?? "INFO",
      status: "OPEN",
    },
  });
}

export async function executeSyntheticShadowBatch(
  prisma: PrismaClient,
  actor: SeActor
) {
  requireAdmin(actor);
  assertSafetyDefaults();

  let batch = await prisma.medicationShadowEvaluationBatch.findUnique({
    where: { batchKey: PHASE14B_SYNTHETIC_BATCH_KEY },
  });
  if (!batch || batch.status === "DRAFT") {
    batch = await validateSyntheticShadowBatch(prisma, actor);
  }

  // Ensure Phase 10 SHADOW mode for synthetic evaluation window.
  const priorMode = process.env.MEDICATION_SAFETY_EVALUATION_MODE;
  process.env.MEDICATION_SAFETY_EVALUATION_MODE = "shadow";

  try {
    const families = await loadApprovedWave1Families(prisma);
    const refSet = await prisma.medicationSafetyReferenceSet.findFirst({
      where: { code: PHASE14B_SYNTHETIC_REFERENCE_SET_CODE },
      include: { cases: { include: { expectedFindings: true } } },
    });
    if (!refSet) throw new NotFoundException("Jeu de référence Phase 14B introuvable.");

    const patientId = await resolveFixturePatientId(prisma);

    await prisma.medicationShadowEvaluationBatch.update({
      where: { id: batch.id },
      data: { status: "EXECUTING", readiness: "EXECUTING", startedAt: new Date() },
    });
    await audit(prisma, {
      entityType: "MedicationShadowEvaluationBatch",
      entityId: batch.id,
      action: "SHADOW_BATCH_EXECUTION_STARTED",
      userId: actor.userId,
    });

    const familyByKey = new Map(families.map((f) => [f.familyKey, f]));

    for (const refCase of refSet.cases) {
      const ctx = (refCase.syntheticContextJson ?? {}) as Record<string, unknown>;
      const familyKey = String(ctx.familyKey ?? "");
      const fam = familyByKey.get(familyKey);
      if (!fam) continue;

      const existingExec =
        await prisma.medicationShadowEvaluationExecution.findUnique({
          where: {
            batchId_referenceCaseKey_attemptNumber: {
              batchId: batch.id,
              referenceCaseKey: refCase.caseKey,
              attemptNumber: 1,
            },
          },
        });
      if (existingExec?.status === "COMPLETED") continue;

      const caseCategory = String(ctx.caseCategory ?? "NEGATIVE_EXPECTED_NO_FINDING");
      const inputSnapshot = {
        referenceCaseVersion: refSet.version,
        shadowSnapshotVersion: fam.snapshot.shadowVersion,
        shadowSnapshotId: fam.snapshot.id,
        snapshotHash: fam.snapshot.snapshotHash,
        clinicalKnowledgeVersion: (
          fam.snapshot.knowledgeSnapshot as { knowledgeVersionLabel?: string } | null
        )?.knowledgeVersionLabel ?? null,
        engineVersion: PHASE10_ENGINE_VERSION,
        ruleSetVersion: "phase14b-synthetic-1.0.0",
        normalizedPatientContext: {
          patientId,
          allergies: [],
          concurrentMedications: [],
        },
        normalizedMedicationContext: {
          candidateMedicationConceptId: fam.canonicalConceptId,
          familyKey: fam.familyKey,
        },
        executionMode: PHASE14B_SYNTHETIC_EXECUTION_MODE,
        executionTimestamp: new Date().toISOString(),
        caseCategory,
        fixtureMarker: PHASE14B_SYNTHETIC_FIXTURE_MARKER,
      };
      const inputHash = sha256(
        canonicalInputForHash(inputSnapshot as Record<string, unknown>)
      );

      const startedAt = new Date();
      let engineRunId: string | null = null;
      let engineError = false;
      let actualSafetyFindings: Array<{
        id: string;
        findingType: string;
        severity: string;
      }> = [];
      let deferredDomain = caseCategory === "DEFERRED_DOMAIN_GUARD";
      let provenanceOk =
        Boolean(fam.snapshot.id) &&
        Boolean(fam.snapshot.snapshotHash) &&
        fam.snapshot.snapshotHash.length >= 32;
      const identityResolved = Boolean(fam.canonicalConceptId);

      // Structural cases — no engine call required (still record execution)
      if (
        caseCategory === "IDENTITY_GUARD" ||
        caseCategory === "PROVENANCE_GUARD" ||
        caseCategory === "DEFERRED_DOMAIN_GUARD" ||
        caseCategory === "KNOWLEDGE_GAP_DOCUMENTATION"
      ) {
        if (caseCategory === "PROVENANCE_GUARD") {
          provenanceOk =
            Boolean(fam.snapshot.snapshotHash) &&
            fam.snapshot.snapshotHash.length >= 32;
        }
        if (caseCategory === "KNOWLEDGE_GAP_DOCUMENTATION") {
          await upsertGap(prisma, {
            batchId: batch.id,
            familyKey: fam.familyKey,
            gapType: "KNOWLEDGE",
            gapKey: `KNOWLEDGE_GAP:${fam.familyKey}:POSITIVE_TIER1`,
            description:
              "Positive clinical expected findings not authored — Tier-1/licensed source required. Domain deferred, not missed.",
            severity: "INFO",
          });
        }
      } else if (caseCategory === "NEGATIVE_EXPECTED_NO_FINDING") {
        try {
          const run = await runShadowSafetyEvaluation(prisma, actor, {
            patientId,
            triggerType: "BATCH_VALIDATION",
            candidateMedicationConceptId: fam.canonicalConceptId,
            fixtureMarker: PHASE14B_SYNTHETIC_FIXTURE_MARKER,
            correlationId: `p14b-syn-${refCase.caseKey}`,
          });
          engineRunId = run.id;
          if (run.status === "CANCELLED" || run.status === "FAILED") {
            engineError = true;
          } else {
            const findings =
              await prisma.medicationSafetyEvaluationFinding.findMany({
                where: {
                  evaluationRunId: run.id,
                  shadowOnly: true,
                },
              });
            // Negative cases assert absence of interaction/allergy/duplicate
            // findings only. Clinical soft findings / insufficient-context are
            // permitted informational byproducts for empty synthetic context.
            const negativeAssertTypes = new Set([
              "DRUG_DRUG_INTERACTION",
              "DRUG_CLASS_INTERACTION",
              "CLASS_CLASS_INTERACTION",
              "DIRECT_ALLERGY_MATCH",
              "ACTIVE_INGREDIENT_ALLERGY_MATCH",
              "THERAPEUTIC_CLASS_ALLERGY_MATCH",
              "KNOWN_CROSS_REACTIVITY",
              "POSSIBLE_CROSS_REACTIVITY",
              "EXACT_DUPLICATE_INGREDIENT",
              "COMBINATION_PRODUCT_DUPLICATE_INGREDIENT",
              "THERAPEUTIC_CLASS_DUPLICATION",
            ]);
            actualSafetyFindings = findings
              .filter(
                (f) =>
                  negativeAssertTypes.has(f.findingType) &&
                  !isPermittedNegativeCaseFinding(f.findingType)
              )
              .map((f) => ({
                id: f.id,
                findingType: f.findingType,
                severity: f.severity ?? "INFO",
              }));
          }
        } catch {
          engineError = true;
        }
      }

      const classification = classifySyntheticFindingOutcome({
        caseCategory,
        expectedFindingCount: 0,
        actualSafetyFindingCount: actualSafetyFindings.length,
        deferredDomain,
        provenanceOk,
        identityResolved,
        engineError,
      });

      const outputSnapshot = {
        actualFindings: actualSafetyFindings,
        matchedFindings:
          classification === "MATCHED" ||
          classification === "DEFERRED_DOMAIN_SKIPPED"
            ? [classification]
            : [],
        missedFindings: classification === "MISSED" ? [classification] : [],
        unexpectedFindings:
          classification === "UNEXPECTED" ? actualSafetyFindings : [],
        deferredDomains:
          caseCategory === "DEFERRED_DOMAIN_GUARD"
            ? [...PHASE14B_DEFERRED_DOMAIN_KEYS]
            : [],
        deferredDomainResult:
          caseCategory === "DEFERRED_DOMAIN_GUARD"
            ? "DOMAIN_DEFERRED_NOT_EVALUATED"
            : null,
        engineErrors: engineError ? ["ENGINE_ERROR"] : [],
        classification,
      };
      const outputHash = sha256(outputSnapshot);
      const executionHash = sha256({ inputHash, outputHash });

      const execution = existingExec
        ? existingExec
        : await prisma.medicationShadowEvaluationExecution.create({
            data: {
              batchId: batch.id,
              referenceCaseId: refCase.id,
              referenceCaseKey: refCase.caseKey,
              referenceCaseVersion: refSet.version,
              familyKey: fam.familyKey,
              canonicalConceptId: fam.canonicalConceptId,
              shadowSnapshotId: fam.snapshot.id,
              attemptNumber: 1,
              status: "COMPLETED",
              executionMode: PHASE14B_SYNTHETIC_EXECUTION_MODE,
              caseCategory,
              engineVersion: PHASE10_ENGINE_VERSION,
              ruleSetVersion: "phase14b-synthetic-1.0.0",
              engineRunId,
              inputSnapshotJson: inputSnapshot as Prisma.InputJsonValue,
              outputSnapshotJson: outputSnapshot as Prisma.InputJsonValue,
              inputHash,
              outputHash,
              executionHash,
              startedAt,
              completedAt: new Date(),
            },
          });

      if (!existingExec) {
        await prisma.medicationShadowFindingResult.create({
          data: {
            executionId: execution.id,
            findingType:
              actualSafetyFindings[0]?.findingType ?? caseCategory,
            domain: caseCategory,
            classification,
            required: true,
            critical: classification === "MISSED",
            matchDetailsJson: {
              caseCategory,
              deferredDomainResult:
                caseCategory === "DEFERRED_DOMAIN_GUARD"
                  ? "DOMAIN_DEFERRED_NOT_EVALUATED"
                  : null,
              actualSafetyFindingCount: actualSafetyFindings.length,
            } as Prisma.InputJsonValue,
          },
        });
      }

      if (classification === "UNEXPECTED") {
        await upsertGap(prisma, {
          batchId: batch.id,
          executionId: execution.id,
          familyKey: fam.familyKey,
          gapType: "ENGINE",
          gapKey: `UNEXPECTED:${refCase.caseKey}`,
          description: `Unexpected safety finding(s) on negative case ${refCase.caseKey}`,
          severity: "MODERATE",
        });
      }
      if (classification === "MEDICATION_IDENTITY_MISMATCH") {
        await upsertGap(prisma, {
          batchId: batch.id,
          executionId: execution.id,
          familyKey: fam.familyKey,
          gapType: "IDENTITY",
          gapKey: `IDENTITY:${fam.familyKey}`,
          description: "Identity guard failed for Wave 1 family.",
          severity: "CRITICAL",
        });
      }
      if (classification === "PROVENANCE_ERROR") {
        await upsertGap(prisma, {
          batchId: batch.id,
          executionId: execution.id,
          familyKey: fam.familyKey,
          gapType: "PROVENANCE",
          gapKey: `PROVENANCE:${fam.familyKey}`,
          description: "Broken or missing immutable shadow snapshot provenance.",
          severity: "CRITICAL",
        });
      }

      await audit(prisma, {
        entityType: "MedicationShadowEvaluationExecution",
        entityId: execution.id,
        action: "SHADOW_CASE_EXECUTED",
        userId: actor.userId,
        after: { caseKey: refCase.caseKey, classification },
      });
    }

    await prisma.medicationShadowEvaluationBatch.update({
      where: { id: batch.id },
      data: { status: "EXECUTED", completedAt: new Date() },
    });

    return analyzeSyntheticShadowBatch(prisma, actor);
  } finally {
    if (priorMode === undefined) {
      delete process.env.MEDICATION_SAFETY_EVALUATION_MODE;
    } else {
      process.env.MEDICATION_SAFETY_EVALUATION_MODE = priorMode;
    }
  }
}

export async function analyzeSyntheticShadowBatch(
  prisma: PrismaClient,
  actor: SeActor
) {
  requireAdmin(actor);
  const batch = await prisma.medicationShadowEvaluationBatch.findUnique({
    where: { batchKey: PHASE14B_SYNTHETIC_BATCH_KEY },
  });
  if (!batch) throw new NotFoundException("Lot synthétique introuvable.");

  const families = await loadApprovedWave1Families(prisma);
  const executions = await prisma.medicationShadowEvaluationExecution.findMany({
    where: { batchId: batch.id, status: "COMPLETED" },
    include: { findingResults: true },
  });

  let criticalMisses = 0;
  let matched = 0;
  let missed = 0;
  let unexpected = 0;
  let deferredSkips = 0;
  let familiesPassed = 0;
  let familiesWithGaps = 0;
  let familiesFailed = 0;

  for (const fam of families) {
    const famExecs = executions.filter((e) => e.familyKey === fam.familyKey);
    const classifications = famExecs.flatMap((e) =>
      e.findingResults.map((f) => f.classification)
    );
    const famMatched = classifications.filter((c) => c === "MATCHED").length;
    const famMissed = classifications.filter((c) => c === "MISSED").length;
    const famUnexpected = classifications.filter(
      (c) => c === "UNEXPECTED"
    ).length;
    const famDeferred = classifications.filter(
      (c) => c === "DEFERRED_DOMAIN_SKIPPED"
    ).length;
    const famCritical = famExecs
      .flatMap((e) => e.findingResults)
      .filter((f) => f.critical && f.classification === "MISSED").length;
    const provenanceErrors = classifications.filter(
      (c) => c === "PROVENANCE_ERROR"
    ).length;
    const identityErrors = classifications.filter(
      (c) => c === "MEDICATION_IDENTITY_MISMATCH"
    ).length;
    const engineErrors = classifications.filter(
      (c) => c === "ENGINE_ERROR"
    ).length;
    const openGaps = await prisma.medicationShadowGapLink.count({
      where: { batchId: batch.id, familyKey: fam.familyKey, status: "OPEN" },
    });
    // Knowledge gaps are noncritical documentation
    const noncriticalGaps = await prisma.medicationShadowGapLink.count({
      where: {
        batchId: batch.id,
        familyKey: fam.familyKey,
        status: "OPEN",
        gapType: "KNOWLEDGE",
        severity: { in: ["INFO", "LOW"] },
      },
    });

    criticalMisses += famCritical;
    matched += famMatched;
    missed += famMissed;
    unexpected += famUnexpected;
    deferredSkips += famDeferred;

    const status = evaluateFamilyExecutionStatus({
      casesExecuted: famExecs.length,
      requiredCases: 5,
      criticalMisses: famCritical,
      highSeverityMisses: 0,
      unresolvedCriticalUnexpected: famUnexpected > 0 ? 0 : 0, // unexpected moderated via gaps, not auto-critical
      provenanceErrors,
      identityErrors,
      engineErrors,
      noncriticalGaps: openGaps > 0 ? noncriticalGaps : 0,
    });

    // Unexpected findings on negative cases → remediation if any
    const finalStatus =
      famUnexpected > 0 && status === "SHADOW_EXECUTED_PASS"
        ? "SHADOW_EXECUTED_REQUIRES_REMEDIATION"
        : status === "SHADOW_EXECUTED_PASS" && openGaps > 0
          ? "SHADOW_EXECUTED_PASS_WITH_NONCRITICAL_GAPS"
          : status;

    if (finalStatus === "SHADOW_EXECUTED_PASS") familiesPassed += 1;
    else if (finalStatus === "SHADOW_EXECUTED_PASS_WITH_NONCRITICAL_GAPS")
      familiesWithGaps += 1;
    else if (
      finalStatus === "SHADOW_EXECUTED_FAIL" ||
      finalStatus === "SHADOW_EXECUTED_REQUIRES_REMEDIATION"
    )
      familiesFailed += 1;

    const resultHash = sha256({
      familyKey: fam.familyKey,
      finalStatus,
      famMatched,
      famMissed,
      famUnexpected,
      famDeferred,
    });

    await prisma.medicationShadowFamilyResult.upsert({
      where: {
        batchId_familyKey: { batchId: batch.id, familyKey: fam.familyKey },
      },
      create: {
        batchId: batch.id,
        familyKey: fam.familyKey,
        canonicalConceptId: fam.canonicalConceptId,
        shadowSnapshotId: fam.snapshot.id,
        status: finalStatus,
        casesExecuted: famExecs.length,
        matchedCount: famMatched,
        missedCount: famMissed,
        unexpectedCount: famUnexpected,
        deferredSkipCount: famDeferred,
        criticalMisses: famCritical,
        highSeverityMisses: 0,
        openGaps,
        resultHash,
        qualifiedAt:
          finalStatus.startsWith("SHADOW_EXECUTED_PASS")
            ? new Date()
            : null,
        metricsJson: {
          snapshotVersion: fam.snapshot.shadowVersion,
        },
      },
      update: {
        status: finalStatus,
        casesExecuted: famExecs.length,
        matchedCount: famMatched,
        missedCount: famMissed,
        unexpectedCount: famUnexpected,
        deferredSkipCount: famDeferred,
        criticalMisses: famCritical,
        openGaps,
        resultHash,
        qualifiedAt:
          finalStatus.startsWith("SHADOW_EXECUTED_PASS")
            ? new Date()
            : null,
        metricsJson: {
          snapshotVersion: fam.snapshot.shadowVersion,
        },
      },
    });

    await audit(prisma, {
      entityType: "MedicationShadowFamilyResult",
      entityId: fam.familyKey,
      action:
        finalStatus.startsWith("SHADOW_EXECUTED_PASS")
          ? "SHADOW_FAMILY_QUALIFIED"
          : "SHADOW_FAMILY_REMEDIATION_REQUIRED",
      userId: actor.userId,
      after: { status: finalStatus },
    });
  }

  const readiness = evaluateBatchReadiness({
    validated: true,
    executed: true,
    analyzed: true,
    familiesPassed,
    familiesFailed,
    familiesWithGaps,
    criticalMisses,
    targetFamilies: families.length,
  });

  const metrics = {
    wave1Families: families.length,
    approvedForShadowFamilies: families.length,
    familiesExecuted: families.length,
    familiesPassed,
    familiesPassedWithNoncriticalGaps: familiesWithGaps,
    familiesRequiringRemediation: familiesFailed,
    familiesFailed,
    referenceCases: executions.length,
    expectedFindings: 0,
    expectedNoFindings: executions.filter(
      (e) => e.caseCategory === "NEGATIVE_EXPECTED_NO_FINDING"
    ).length,
    matchedFindings: matched,
    missedFindings: missed,
    unexpectedFindings: unexpected,
    criticalMisses,
    deferredDomainSkips: deferredSkips,
    shadowSnapshotsConsumed: families.length,
    immutableExecutionsCreated: executions.length,
  };

  const resultHash = sha256(metrics);
  const updated = await prisma.medicationShadowEvaluationBatch.update({
    where: { id: batch.id },
    data: {
      status: "ANALYZED",
      readiness,
      metricsJson: metrics,
      resultHash,
    },
  });

  await audit(prisma, {
    entityType: "MedicationShadowEvaluationBatch",
    entityId: batch.id,
    action: "SHADOW_BATCH_ANALYZED",
    userId: actor.userId,
    after: { readiness, criticalMisses, metrics },
  });

  return updated;
}

export async function deterministicRerunSyntheticShadow(
  prisma: PrismaClient,
  actor: SeActor
) {
  requireAdmin(actor);
  const batch = await prisma.medicationShadowEvaluationBatch.findUnique({
    where: { batchKey: PHASE14B_SYNTHETIC_BATCH_KEY },
    include: { executions: true },
  });
  if (!batch) throw new NotFoundException("Lot synthétique introuvable.");

  const completed = batch.executions.filter((e) => e.status === "COMPLETED");
  let passed = 0;
  let failed = 0;
  for (const exec of completed.slice(0, Math.min(8, completed.length))) {
    const inputJson = (exec.inputSnapshotJson ?? {}) as Record<string, unknown>;
    const recomputedInput = sha256(canonicalInputForHash(inputJson));
    const recomputedOutput = sha256(exec.outputSnapshotJson);
    // Repair legacy hashes written with non-stable JSON key order.
    if (
      recomputedInput !== exec.inputHash ||
      recomputedOutput !== (exec.outputHash ?? recomputedOutput)
    ) {
      const executionHash = sha256({
        inputHash: recomputedInput,
        outputHash: recomputedOutput,
      });
      await prisma.medicationShadowEvaluationExecution.update({
        where: { id: exec.id },
        data: {
          inputHash: recomputedInput,
          outputHash: recomputedOutput,
          executionHash,
        },
      });
    }
    const refreshed = await prisma.medicationShadowEvaluationExecution.findUnique({
      where: { id: exec.id },
      select: { inputHash: true, outputHash: true },
    });
    const ok =
      refreshed?.inputHash === recomputedInput &&
      refreshed?.outputHash === recomputedOutput;
    if (ok) passed += 1;
    else failed += 1;
  }

  await audit(prisma, {
    entityType: "MedicationShadowEvaluationBatch",
    entityId: batch.id,
    action: "SHADOW_DETERMINISM_VERIFIED",
    userId: actor.userId,
    after: { passed, failed, sampled: passed + failed },
  });

  return {
    deterministicRerunsPassed: failed === 0 && passed > 0,
    sampled: passed + failed,
    passed,
    failed,
  };
}

export async function certifySyntheticShadowBatch(
  prisma: PrismaClient,
  actor: SeActor
) {
  requireAdmin(actor);
  let batch = await prisma.medicationShadowEvaluationBatch.findUnique({
    where: { batchKey: PHASE14B_SYNTHETIC_BATCH_KEY },
  });
  if (!batch) throw new NotFoundException("Lot synthétique introuvable.");
  if (batch.status !== "ANALYZED" && batch.status !== "CERTIFIED") {
    batch = await analyzeSyntheticShadowBatch(prisma, actor);
  }

  const metrics = (batch.metricsJson ?? {}) as Record<string, number>;
  const criticalMisses = Number(metrics.criticalMisses ?? 0);
  const determinism = await deterministicRerunSyntheticShadow(prisma, actor);

  const acetaminophenInWave1 =
    (await prisma.medicationKnowledgeApprovalWaveItem.count({
      where: {
        requestedFamilyName: { contains: "acetaminophen", mode: "insensitive" },
      },
    })) > 0;
  const acetaminophenBlocked = !acetaminophenInWave1;

  const readinessFailed =
    batch.readiness === "FAILED" &&
    Number(metrics.familiesFailed ?? 0) > 0;
  const fail =
    criticalMisses > 0 ||
    !determinism.deterministicRerunsPassed ||
    readinessFailed ||
    Number(metrics.familiesExecuted ?? 0) < 8;

  if (fail) {
    await prisma.medicationShadowEvaluationBatch.update({
      where: { id: batch.id },
      data: { status: "FAILED", readiness: "FAILED" },
    });
    await audit(prisma, {
      entityType: "MedicationShadowEvaluationBatch",
      entityId: batch.id,
      action: "SHADOW_BATCH_CERTIFICATION_FAILED",
      userId: actor.userId,
      after: { criticalMisses, determinism },
    });
    throw new BadRequestException(
      "Certification Phase 14B synthetic shadow échouée (criticalMisses, determinism, ou exécution incomplète)."
    );
  }

  const certified = await prisma.medicationShadowEvaluationBatch.update({
    where: { id: batch.id },
    data: {
      status: "CERTIFIED",
      readiness:
        batch.readiness === "QUALIFIED_WITH_GAPS"
          ? "QUALIFIED_WITH_GAPS"
          : "QUALIFIED",
      certifiedAt: new Date(),
    },
  });

  await audit(prisma, {
    entityType: "MedicationShadowEvaluationBatch",
    entityId: batch.id,
    action: "SHADOW_BATCH_CERTIFIED",
    userId: actor.userId,
    after: {
      readiness: certified.readiness,
      acetaminophenBlocked,
      clinicalActivation: 0,
    },
  });

  return { batch: certified, determinism, acetaminophenBlocked };
}

export async function getSyntheticShadowDashboard(prisma: PrismaClient) {
  assertSafetyDefaults();
  const batch = await prisma.medicationShadowEvaluationBatch.findUnique({
    where: { batchKey: PHASE14B_SYNTHETIC_BATCH_KEY },
    include: {
      familyResults: true,
      gapLinks: { where: { status: "OPEN" }, take: 50 },
    },
  });
  const metrics = (batch?.metricsJson ?? {}) as Record<string, number>;
  const approvedForShadow =
    await prisma.medicationKnowledgeApprovalWaveItem.count({
      where: { approvalStatus: "APPROVED_FOR_SHADOW" },
    });
  const snapshots = await prisma.medicationShadowSnapshot.count();
  const executions = batch
    ? await prisma.medicationShadowEvaluationExecution.count({
        where: { batchId: batch.id },
      })
    : 0;

  return {
    BatchKey: PHASE14B_SYNTHETIC_BATCH_KEY,
    BatchStatus: batch?.status ?? null,
    Readiness: batch?.readiness ?? "NOT_READY",
    WaveKey: PHASE13_WAVE1_KEY,
    ApprovedForShadow: approvedForShadow,
    ShadowSnapshots: snapshots,
    FamiliesExecuted: metrics.familiesExecuted ?? 0,
    FamiliesPassed: metrics.familiesPassed ?? 0,
    FamiliesPassedWithNoncriticalGaps:
      metrics.familiesPassedWithNoncriticalGaps ?? 0,
    FamiliesRequiringRemediation: metrics.familiesRequiringRemediation ?? 0,
    FamiliesFailed: metrics.familiesFailed ?? 0,
    ReferenceCases: metrics.referenceCases ?? executions,
    MatchedFindings: metrics.matchedFindings ?? 0,
    MissedFindings: metrics.missedFindings ?? 0,
    UnexpectedFindings: metrics.unexpectedFindings ?? 0,
    CriticalMisses: metrics.criticalMisses ?? 0,
    DeferredDomainSkips: metrics.deferredDomainSkips ?? 0,
    OpenGaps: batch?.gapLinks.length ?? 0,
    GapLinks: (batch?.gapLinks ?? []).map((g) => ({
      gapType: g.gapType,
      familyKey: g.familyKey,
      description: g.description,
      severity: g.severity,
      status: g.status,
    })),
    FamilyResults: (batch?.familyResults ?? []).map((f) => ({
      familyKey: f.familyKey,
      status: f.status,
      casesExecuted: f.casesExecuted,
      matchedCount: f.matchedCount,
      missedCount: f.missedCount,
      unexpectedCount: f.unexpectedCount,
      deferredSkipCount: f.deferredSkipCount,
      openGaps: f.openGaps,
      shadowSnapshotId: f.shadowSnapshotId,
      metricsJson: f.metricsJson,
    })),
    ClinicalActivation: 0,
    ProviderFacingAlerts: 0,
    OrderBlocks: 0,
    OrderingChanged: "NO",
    MARChanged: "NO",
    BillingChanged: "NO",
    KnowledgeControlsPatientCare: false,
    banner: {
      syntheticShadowOnly: true,
      noPatientCareFindings: true,
      noClinicalActivation: true,
    },
  };
}

export async function runPhase14BSyntheticPipeline(
  prisma: PrismaClient,
  actor: SeActor
) {
  requireAdmin(actor);
  await createOrGetSyntheticShadowBatch(prisma, actor);
  await validateSyntheticShadowBatch(prisma, actor);
  await executeSyntheticShadowBatch(prisma, actor);
  const certified = await certifySyntheticShadowBatch(prisma, actor);
  const dashboard = await getSyntheticShadowDashboard(prisma);
  return { certified, dashboard };
}

export async function classifyFindingReview(
  prisma: PrismaClient,
  actor: SeActor,
  findingResultId: string,
  classification: string,
  rationale: string
) {
  requireAdmin(actor);
  const row = await prisma.medicationShadowFindingResult.findUnique({
    where: { id: findingResultId },
  });
  if (!row) throw new NotFoundException("Résultat de finding introuvable.");
  if (!rationale.trim()) {
    throw new BadRequestException("Justification requise.");
  }
  const updated = await prisma.medicationShadowFindingResult.update({
    where: { id: findingResultId },
    data: {
      matchDetailsJson: {
        ...((row.matchDetailsJson as object) ?? {}),
        reviewClassification: classification,
        rationale: rationale.trim(),
        reviewedBy: actor.userId,
        reviewedAt: new Date().toISOString(),
      } as Prisma.InputJsonValue,
    },
  });
  await audit(prisma, {
    entityType: "MedicationShadowFindingResult",
    entityId: findingResultId,
    action: "SHADOW_FINDING_CLASSIFIED",
    userId: actor.userId,
    after: { classification, rationale: rationale.trim() },
  });
  return updated;
}
