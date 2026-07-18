import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { z } from "zod";
import { PrismaService } from "../../prisma/prisma.service";
import {
  createOrGetEmKnowledgeBatch,
  dryRunKnowledgePopulation,
  executeDraftKnowledgePopulation,
  getKnowledgePopulationDashboard,
  listConflicts,
  loadPhase12Manifest,
  lockBatch,
  previewKnowledgePopulation,
  recalculateShadowEligibility,
  resolveBatchIdentities,
  resolveConflict,
  rollbackUnapprovedPhase12Drafts,
  transitionBatch,
  validatePhase12Manifest,
  type KpActor,
} from "./medication-knowledge-population.service";
import { recalculateFamilyCoverage } from "../safety-validation/medication-family-coverage.service";

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
      "Phase 12 forbids alerts, order blocking, clinical activation, and auto-approve."
    );
  }
}

@Injectable()
export class MedicationKnowledgePopulationHttpService {
  constructor(private readonly prisma: PrismaService) {}

  dashboard() {
    return getKnowledgePopulationDashboard(this.prisma);
  }

  listBatches() {
    return this.prisma.medicationKnowledgePopulationBatch.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async getBatch(id: string) {
    const row = await this.prisma.medicationKnowledgePopulationBatch.findUnique({
      where: { id },
      include: { items: true, conflicts: true, importRuns: { take: 20, orderBy: { createdAt: "desc" } } },
    });
    if (!row) throw new NotFoundException("Lot introuvable.");
    return row;
  }

  createBatch(actor: KpActor) {
    return createOrGetEmKnowledgeBatch(this.prisma, actor);
  }

  transition(id: string, body: unknown, actor: KpActor) {
    assertNoSpoof(body, actor.userId);
    const status = z.object({ status: z.string() }).parse(body).status;
    return transitionBatch(this.prisma, id, status, actor);
  }

  lock(id: string, actor: KpActor) {
    return lockBatch(this.prisma, id, actor);
  }

  manifest(id: string) {
    return { batchId: id, ...loadPhase12Manifest(), validation: validatePhase12Manifest() };
  }

  validateManifest() {
    return validatePhase12Manifest();
  }

  resolve(id: string, actor: KpActor) {
    return resolveBatchIdentities(this.prisma, id, actor);
  }

  preview(id: string, actor: KpActor) {
    return previewKnowledgePopulation(this.prisma, id, actor);
  }

  dryRun(id: string, actor: KpActor) {
    return dryRunKnowledgePopulation(this.prisma, id, actor);
  }

  executeDrafts(id: string, body: unknown, actor: KpActor) {
    assertNoSpoof(body, actor.userId);
    return executeDraftKnowledgePopulation(this.prisma, id, actor);
  }

  rollback(id: string, actor: KpActor) {
    return rollbackUnapprovedPhase12Drafts(this.prisma, id, actor);
  }

  resume(id: string, actor: KpActor) {
    return this.executeDrafts(id, {}, actor);
  }

  conflicts(batchId?: string) {
    return listConflicts(this.prisma, batchId);
  }

  resolveConflict(id: string, body: unknown, actor: KpActor) {
    assertNoSpoof(body, actor.userId);
    const parsed = z
      .object({ status: z.string(), resolution: z.string() })
      .parse(body);
    return resolveConflict(this.prisma, id, parsed, actor);
  }

  duplicatesCheck() {
    return {
      note: "Duplicate classification runs during preview/execute; exact duplicates are skipped with reporting.",
      AutomaticMerge: false,
    };
  }

  async coverage() {
    return getKnowledgePopulationDashboard(this.prisma);
  }

  async coverageRecalculate(actor: KpActor) {
    return recalculateFamilyCoverage(this.prisma, actor.userId);
  }

  async shadowEligibility(batchId?: string) {
    return this.prisma.medicationKnowledgeShadowEligibilitySnapshot.findMany({
      where: batchId ? { batchId } : undefined,
      orderBy: { calculatedAt: "desc" },
      take: 200,
    });
  }

  shadowEligibilityRecalculate(id: string, actor: KpActor) {
    return recalculateShadowEligibility(this.prisma, id, actor);
  }

  sources() {
    return this.prisma.medicationClinicalKnowledgeSource.findMany({ take: 100 });
  }

  sourceVersions() {
    return this.prisma.medicationClinicalKnowledgeVersion.findMany({
      take: 100,
      orderBy: { createdAt: "desc" },
    });
  }
}
