/**
 * Phase 15 Part 2A — quality recalculation orchestrator.
 * Reuses Phase 14A completeness + Phase 14B expert-review quality engines.
 */
import { ForbiddenException } from "@nestjs/common";
import type { PrismaClient } from "@prisma/client";
import {
  PHASE15_AUTHORITATIVE_SOURCE_DEFAULTS,
  assertPhase15NoClinicalActivation,
  assertPhase15NoWorkflowControl,
} from "@medora/shared";
import { recalculateCompletenessScores } from "../evidence-governance/medication-evidence-governance.service";
import { calculateFamilyQualityScores } from "../expert-review/medication-expert-review.service";
import { isRemediationAdmin } from "./medication-remediation.roles";
import type { RemediationActor } from "./medication-source-lifecycle.service";

function requireAdmin(actor: RemediationActor) {
  if (!isRemediationAdmin(actor.roles)) {
    throw new ForbiddenException("Administrateur médicament requis.");
  }
}

/**
 * Recalculate completeness (14A) then quality scores (14B).
 * Does not invent domain facts; scores reflect current governed state.
 */
export async function recalculateWave1QualityAfterRemediation(
  prisma: PrismaClient,
  actor: RemediationActor
) {
  requireAdmin(actor);
  assertPhase15NoWorkflowControl(
    PHASE15_AUTHORITATIVE_SOURCE_DEFAULTS.knowledgeControlsPatientCare
  );
  assertPhase15NoClinicalActivation(
    PHASE15_AUTHORITATIVE_SOURCE_DEFAULTS.clinicalActivationEnabled
  );

  const completeness = await recalculateCompletenessScores(prisma, actor);
  const quality = await calculateFamilyQualityScores(prisma, actor);

  await prisma.medicationRemediationAuditEvent.create({
    data: {
      entityType: "MedicationRemediationProgram",
      entityId: "QUALITY_RECALC",
      action: "QUALITY_RECALCULATED",
      afterState: {
        completenessCount: completeness.length,
        qualityCount: quality.qualityScoresCalculated,
      },
      performedByUserId: actor.userId,
      reason: "Phase 15 Part 2A reuse of Phase 14A/14B scoring engines",
    },
  });

  return { completeness, quality };
}
