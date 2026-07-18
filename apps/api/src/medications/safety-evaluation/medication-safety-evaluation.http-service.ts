import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { z } from "zod";
import type { MedicationSafetyKnowledgeLifecycle } from "@medora/shared";
import { PrismaService } from "../../prisma/prisma.service";
import {
  getEvaluationRun,
  getFinding,
  getSafetyEvaluationDashboard,
  getSafetyEvaluationMetrics,
  listEvaluationRuns,
  listFindings,
} from "./medication-safety-evaluation-dashboard.service";
import {
  runShadowSafetyEvaluation,
  type SafetyEvaluationActor,
} from "./medication-safety-evaluation-orchestrator.service";
import {
  createSuppressionRule,
  listSuppressionRules,
  transitionSuppressionRule,
} from "./medication-safety-suppression.service";
import { randomUUID } from "node:crypto";

function assertNoSpoof(body: unknown, userId: string) {
  if (!body || typeof body !== "object") return;
  const o = body as Record<string, unknown>;
  if (o.reviewerUserId && o.reviewerUserId !== userId) {
    throw new BadRequestException(
      "Payload reviewerUserId must match the authenticated user."
    );
  }
  if ("roles" in o || "role" in o) {
    throw new BadRequestException("Role spoofing via request body is forbidden.");
  }
  if (o.shadowOnly === false) {
    throw new BadRequestException("Phase 10 forbids shadowOnly=false.");
  }
  if (o.providerFacingAlertsEnabled === true || o.orderBlockingEnabled === true) {
    throw new BadRequestException("Phase 10 forbids enabling alerts or order blocking.");
  }
}

@Injectable()
export class MedicationSafetyEvaluationHttpService {
  constructor(private readonly prisma: PrismaService) {}

  dashboard() {
    return getSafetyEvaluationDashboard(this.prisma);
  }

  metrics() {
    return getSafetyEvaluationMetrics(this.prisma);
  }

  listRuns(filters: { status?: string; limit?: number; offset?: number }) {
    return listEvaluationRuns(this.prisma, filters);
  }

  async getRun(id: string) {
    const row = await getEvaluationRun(this.prisma, id);
    if (!row) throw new NotFoundException("Évaluation introuvable.");
    return row;
  }

  listFindings(findingType?: string) {
    return listFindings(this.prisma, { findingType });
  }

  async getFinding(id: string) {
    const row = await getFinding(this.prisma, id);
    if (!row) throw new NotFoundException("Constat introuvable.");
    return row;
  }

  listUnresolvedIdentities() {
    return listFindings(this.prisma, {
      findingType: "UNRESOLVED_MEDICATION_IDENTITY",
    });
  }

  listKnowledgeConflicts() {
    return listFindings(this.prisma, {
      findingType: "UNRESOLVED_KNOWLEDGE_CONFLICT",
    });
  }

  listSuppressions() {
    return listSuppressionRules(this.prisma);
  }

  async runShadow(body: unknown, actor: SafetyEvaluationActor) {
    assertNoSpoof(body, actor.userId);
    const parsed = z
      .object({
        patientId: z.string().min(1),
        encounterId: z.string().optional(),
        triggerType: z
          .enum([
            "MANUAL_ADMIN_TEST",
            "ORDER_DRAFT_SHADOW",
            "ORDER_SIGN_SHADOW",
            "MEDICATION_RECONCILIATION_SHADOW",
            "ALLERGY_UPDATE_SHADOW",
            "LAB_RESULT_SHADOW",
            "PATIENT_CONTEXT_REFRESH",
            "BATCH_VALIDATION",
          ])
          .optional(),
        candidateMedicationConceptId: z.string().optional(),
        candidateMedicationProductId: z.string().optional(),
        candidateMedicationOrderId: z.string().optional(),
        relatedMedicationConceptIds: z.array(z.string()).optional(),
        emergencyContextTags: z.array(z.string()).optional(),
        pregnancyStatus: z.string().optional(),
        lactationStatus: z.string().optional(),
        estimatedGfr: z.number().optional(),
        creatinineClearance: z.number().optional(),
        hepaticFunctionClassification: z.string().optional(),
        weightKg: z.number().optional(),
        fixtureMarker: z.string().optional(),
        reviewerUserId: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.");
    }
    try {
      return await runShadowSafetyEvaluation(this.prisma, actor, parsed.data);
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : "Évaluation impossible.");
    }
  }

  async replay(body: unknown, actor: SafetyEvaluationActor) {
    assertNoSpoof(body, actor.userId);
    const parsed = z
      .object({
        runId: z.string().min(1),
        rationale: z.string().min(1),
        reviewerUserId: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.");
    }
    if (
      !actor.roles.includes("MEDICATION_ADMIN") &&
      !actor.roles.includes("MEDORA_SUPER_ADMIN")
    ) {
      throw new BadRequestException("Only MEDICATION_ADMIN may authorize replay.");
    }
    const prior = await getEvaluationRun(this.prisma, parsed.data.runId);
    if (!prior) throw new NotFoundException("Évaluation introuvable.");
    try {
      return await runShadowSafetyEvaluation(this.prisma, actor, {
        patientId: prior.patientId,
        encounterId: prior.encounterId ?? undefined,
        triggerType: "MANUAL_ADMIN_TEST",
        candidateMedicationConceptId: prior.candidateMedicationConceptId ?? undefined,
        candidateMedicationProductId: prior.candidateMedicationProductId ?? undefined,
        candidateMedicationOrderId: prior.candidateMedicationOrderId ?? undefined,
        fixtureMarker: prior.fixtureMarker ?? undefined,
        correlationId: `replay:${prior.id}:${randomUUID()}`,
      });
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : "Replay impossible.");
    }
  }

  async validateFixture(body: unknown, actor: SafetyEvaluationActor) {
    assertNoSpoof(body, actor.userId);
    const parsed = z
      .object({
        patientId: z.string().min(1),
        candidateMedicationConceptId: z.string().optional(),
        candidateMedicationProductId: z.string().optional(),
        relatedMedicationConceptIds: z.array(z.string()).optional(),
        reviewerUserId: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.");
    }
    try {
      return await runShadowSafetyEvaluation(this.prisma, actor, {
        ...parsed.data,
        triggerType: "BATCH_VALIDATION",
        fixtureMarker: "PHASE10_SHADOW_FIXTURE",
      });
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : "Fixture impossible.");
    }
  }

  async createSuppression(body: unknown, actor: SafetyEvaluationActor) {
    assertNoSpoof(body, actor.userId);
    const parsed = z
      .object({
        code: z.string().min(1),
        suppressionReason: z.string().min(1),
        summary: z.string().min(1),
        findingType: z.string().optional(),
        emergencyContext: z.string().optional(),
        normalizedRuleIdentity: z.string().optional(),
        reviewerUserId: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.");
    }
    try {
      return await createSuppressionRule(this.prisma, actor, parsed.data);
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : "Règle impossible.");
    }
  }

  async transitionSuppression(id: string, body: unknown, actor: SafetyEvaluationActor) {
    assertNoSpoof(body, actor.userId);
    const parsed = z
      .object({
        toStatus: z.enum([
          "DRAFT",
          "UNDER_REVIEW",
          "APPROVED",
          "SUPERSEDED",
          "RETIRED",
          "REJECTED",
        ]),
        rationale: z.string().min(1),
        reviewerUserId: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.");
    }
    try {
      return await transitionSuppressionRule(this.prisma, actor, {
        id,
        toStatus: parsed.data.toStatus as MedicationSafetyKnowledgeLifecycle,
        rationale: parsed.data.rationale,
      });
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : "Transition impossible.");
    }
  }

  async approveSuppression(id: string, body: unknown, actor: SafetyEvaluationActor) {
    const rationale =
      body && typeof body === "object" && "rationale" in body
        ? String((body as { rationale?: string }).rationale ?? "")
        : "";
    return this.transitionSuppression(
      id,
      { toStatus: "APPROVED", rationale },
      actor
    );
  }

  async classifyFinding(id: string, body: unknown, actor: SafetyEvaluationActor) {
    assertNoSpoof(body, actor.userId);
    const parsed = z
      .object({
        classification: z.string().min(1),
        reason: z.string().optional(),
        notes: z.string().optional(),
        recommendedKnowledgeChange: z.string().optional(),
        recommendedEngineChange: z.string().optional(),
        reviewerUserId: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.");
    }
    const finding = await getFinding(this.prisma, id);
    if (!finding) throw new NotFoundException("Constat introuvable.");
    return this.prisma.medicationSafetyFindingValidation.create({
      data: {
        id: randomUUID(),
        findingId: id,
        classification: parsed.data.classification,
        reason: parsed.data.reason,
        notes: parsed.data.notes,
        recommendedKnowledgeChange: parsed.data.recommendedKnowledgeChange,
        recommendedEngineChange: parsed.data.recommendedEngineChange,
        reviewedByUserId: actor.userId,
        reviewedAt: new Date(),
      },
    });
  }
}
