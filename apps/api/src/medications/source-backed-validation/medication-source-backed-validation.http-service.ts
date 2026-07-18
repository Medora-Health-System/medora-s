import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { z } from "zod";
import { PrismaService } from "../../prisma/prisma.service";
import {
  attemptApproveForShadow,
  createOrGetWave1,
  createWave1ReferenceSet,
  deferIdentityCase,
  executeControlledShadowRun,
  getPhase12Baseline,
  getSourceBackedDashboard,
  investigateIdentityBlockers,
  listIdentityCases,
  listWaves,
  lockWave,
  recalculateSourceReadiness,
  resolveIdentityCase,
  runPhase13Pipeline,
  type SbvActor,
} from "./medication-source-backed-validation.service";

function assertNoSpoof(body: unknown, userId: string) {
  if (!body || typeof body !== "object") return;
  const o = body as Record<string, unknown>;
  if ("roles" in o || "role" in o) {
    throw new BadRequestException("Role spoofing via request body is forbidden.");
  }
  if (o.reviewerUserId && o.reviewerUserId !== userId) {
    throw new BadRequestException("reviewerUserId must match authenticated user.");
  }
  if (
    o.providerFacingAlertsEnabled === true ||
    o.orderBlockingEnabled === true ||
    o.clinicalActivationEnabled === true ||
    o.autoApprove === true
  ) {
    throw new BadRequestException(
      "Phase 13 forbids alerts, order blocking, clinical activation, and auto-approve."
    );
  }
}

@Injectable()
export class MedicationSourceBackedValidationHttpService {
  constructor(private readonly prisma: PrismaService) {}

  dashboard() {
    return getSourceBackedDashboard(this.prisma);
  }

  baseline() {
    return getPhase12Baseline(this.prisma);
  }

  identityCases() {
    return listIdentityCases(this.prisma);
  }

  async identityCase(id: string) {
    const rows = await listIdentityCases(this.prisma);
    const row = rows.find((r) => r.id === id);
    if (!row) throw new NotFoundException("Dossier identité introuvable.");
    return row;
  }

  investigate(actor: SbvActor) {
    return investigateIdentityBlockers(this.prisma, actor);
  }

  resolve(id: string, body: unknown, actor: SbvActor) {
    assertNoSpoof(body, actor.userId);
    const parsed = z
      .object({
        selectedConceptId: z.string().min(1),
        resolutionMethod: z.string().min(1),
        notes: z.string().optional(),
      })
      .parse(body);
    return resolveIdentityCase(this.prisma, id, actor, parsed);
  }

  defer(id: string, body: unknown, actor: SbvActor) {
    assertNoSpoof(body, actor.userId);
    const notes =
      body && typeof body === "object"
        ? String((body as any).notes ?? "")
        : undefined;
    return deferIdentityCase(this.prisma, id, actor, notes || undefined);
  }

  waves() {
    return listWaves(this.prisma);
  }

  async wave(id: string) {
    const row = await this.prisma.medicationKnowledgeApprovalWave.findUnique({
      where: { id },
      include: { items: true, sourceReadinessSnapshots: { take: 50 } },
    });
    if (!row) throw new NotFoundException("Vague introuvable.");
    return row;
  }

  createWave(actor: SbvActor) {
    return createOrGetWave1(this.prisma, actor);
  }

  selectFamilies(actor: SbvActor) {
    return createOrGetWave1(this.prisma, actor);
  }

  lock(id: string, actor: SbvActor) {
    return lockWave(this.prisma, id, actor);
  }

  sourceReadiness(id: string, actor: SbvActor) {
    return recalculateSourceReadiness(this.prisma, id, actor);
  }

  approveShadow(id: string, body: unknown, actor: SbvActor) {
    assertNoSpoof(body, actor.userId);
    return attemptApproveForShadow(this.prisma, id, actor);
  }

  listReferenceSets() {
    return this.prisma.medicationSafetyReferenceSet.findMany({
      where: { code: { startsWith: "PHASE13_" } },
      include: { cases: { include: { expectedFindings: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  createReferenceSet(actor: SbvActor) {
    return createWave1ReferenceSet(this.prisma, actor);
  }

  runShadow(actor: SbvActor) {
    return executeControlledShadowRun(this.prisma, actor);
  }

  async results() {
    const dash = await getSourceBackedDashboard(this.prisma);
    return {
      accuracy: {
        MatchedFindings: dash.MatchedFindings,
        MissedFindings: dash.MissedFindings,
        UnexpectedFindings: dash.UnexpectedFindings,
        ConfirmedFalsePositives: dash.ConfirmedFalsePositives,
        metricsLabel: "synthetic-reference-derived",
      },
      missedFindings: dash.MissedFindings,
      unexpectedFindings: dash.UnexpectedFindings,
      severity: { ExactSeverityAgreement: null, note: "No severity pairs until approved knowledge findings exist." },
      performance: { P95Latency: dash.P95Latency },
      gaps: {
        knowledge: dash.OpenKnowledgeGaps,
        identity: dash.OpenIdentityGaps,
        context: dash.OpenContextGaps,
        engine: dash.OpenEngineGaps,
      },
    };
  }

  pipeline(actor: SbvActor) {
    return runPhase13Pipeline(this.prisma, actor);
  }

  certification() {
    return {
      certificationId:
        "MEDUI.MEDICATION_INTELLIGENCE_PHASE_13_SOURCE_BACKED_REVIEW_APPROVAL_CONTROLLED_SHADOW_VALIDATION",
      ClinicalActivationEnabled: false,
      ProviderFacingAlertsEnabled: false,
      OrderBlockingEnabled: false,
      AutomaticKnowledgeApprovalEnabled: false,
      AcetaminophenAutoResolved: false,
    };
  }
}
