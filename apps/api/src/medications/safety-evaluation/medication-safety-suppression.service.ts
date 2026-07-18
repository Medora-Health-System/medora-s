/**
 * Phase 10 — suppression governance (shadow-only; admin-approved rules).
 */
import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import {
  assertApprovedSuppressionImmutable,
  assertLegalSafetyKnowledgeLifecycleTransition,
  assertOnlyAdminMayApproveSuppression,
  type MedicationSafetyKnowledgeLifecycle,
} from "@medora/shared";
import type { ShadowFindingDraft } from "./medication-safety-evaluators.service";
import type { SafetyEvaluationActor } from "./medication-safety-evaluation-orchestrator.service";

function requireOperator(actor: SafetyEvaluationActor): void {
  const allowed = ["MEDICATION_ADMIN", "MEDICATION_REVIEWER", "MEDORA_SUPER_ADMIN", "ADMIN"];
  if (!actor.roles.some((r) => allowed.includes(r))) {
    throw new Error("Unauthorized suppression operator.");
  }
}

export async function applySuppressionRules(
  prisma: PrismaClient,
  drafts: ShadowFindingDraft[],
  emergencyContextTags: string[]
): Promise<{ findings: ShadowFindingDraft[]; suppressed: number }> {
  const rules = await prisma.medicationSafetySuppressionRule.findMany({
    where: { status: "APPROVED", shadowOnly: true, clinicalActivationAllowed: false },
    take: 200,
  });
  if (rules.length === 0) return { findings: drafts, suppressed: 0 };

  const kept: ShadowFindingDraft[] = [];
  let suppressed = 0;
  for (const draft of drafts) {
    const match = rules.find((r) => {
      if (r.findingType && r.findingType !== draft.findingType) return false;
      if (
        r.emergencyContext &&
        !emergencyContextTags.includes(r.emergencyContext) &&
        !(draft.emergencyContextTags ?? []).includes(r.emergencyContext)
      ) {
        return false;
      }
      if (
        r.normalizedRuleIdentity &&
        draft.ruleId &&
        r.normalizedRuleIdentity !== draft.ruleId &&
        !draft.deduplicationKey.includes(r.normalizedRuleIdentity.toLowerCase())
      ) {
        return false;
      }
      return Boolean(r.findingType || r.emergencyContext || r.normalizedRuleIdentity);
    });
    if (match) {
      suppressed += 1;
      continue;
    }
    kept.push(draft);
  }
  return { findings: kept, suppressed };
}

export async function createSuppressionRule(
  prisma: PrismaClient,
  actor: SafetyEvaluationActor,
  input: {
    code: string;
    suppressionReason: string;
    summary: string;
    findingType?: string;
    emergencyContext?: string;
    normalizedRuleIdentity?: string;
  }
) {
  requireOperator(actor);
  return prisma.medicationSafetySuppressionRule.create({
    data: {
      id: randomUUID(),
      code: input.code,
      suppressionReason: input.suppressionReason,
      summary: input.summary,
      findingType: input.findingType,
      emergencyContext: input.emergencyContext,
      normalizedRuleIdentity: input.normalizedRuleIdentity,
      status: "DRAFT",
      shadowOnly: true,
      clinicalActivationAllowed: false,
      reviewedByUserId: actor.userId,
    },
  });
}

export async function transitionSuppressionRule(
  prisma: PrismaClient,
  actor: SafetyEvaluationActor,
  input: { id: string; toStatus: MedicationSafetyKnowledgeLifecycle; rationale: string }
) {
  requireOperator(actor);
  const existing = await prisma.medicationSafetySuppressionRule.findUniqueOrThrow({
    where: { id: input.id },
  });
  if (
    existing.status === "APPROVED" &&
    input.toStatus !== "SUPERSEDED" &&
    input.toStatus !== "RETIRED"
  ) {
    assertApprovedSuppressionImmutable(existing.status);
  }
  assertLegalSafetyKnowledgeLifecycleTransition(
    existing.status as MedicationSafetyKnowledgeLifecycle,
    input.toStatus
  );
  if (input.toStatus === "APPROVED") {
    assertOnlyAdminMayApproveSuppression(actor.roles);
  }
  return prisma.medicationSafetySuppressionRule.update({
    where: { id: existing.id },
    data: {
      status: input.toStatus,
      approvedByUserId: input.toStatus === "APPROVED" ? actor.userId : existing.approvedByUserId,
      approvedAt: input.toStatus === "APPROVED" ? new Date() : existing.approvedAt,
      shadowOnly: true,
      clinicalActivationAllowed: false,
    },
  });
}

export async function listSuppressionRules(prisma: PrismaClient) {
  return prisma.medicationSafetySuppressionRule.findMany({
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
}
