import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { z } from "zod";
import { PrismaService } from "../../prisma/prisma.service";
import {
  approveBatchManifest,
  attestPhase7BatchExecution,
  dedupeApproveBatch,
  extractBatch,
  generateBatchCandidates,
  getBatchDashboardMetrics,
  getBatchReport,
  previewBatch,
  registerOrLoadBatchManifest,
  rollbackBatch,
  stageBatch,
  validateBatchSource,
  type BatchActor,
} from "./medication-em-batch.service";

function assertNoSpoofedActor(body: unknown, authenticatedUserId: string): void {
  if (!body || typeof body !== "object") return;
  const reviewerUserId = (body as { reviewerUserId?: string }).reviewerUserId;
  if (reviewerUserId && reviewerUserId !== authenticatedUserId) {
    throw new BadRequestException(
      "Payload reviewerUserId must match the authenticated user."
    );
  }
}

const confirmSchema = z.object({
  confirmStage: z.boolean().optional(),
  confirmRollback: z.boolean().optional(),
  manifestHash: z.string().optional(),
  allowStructuralFixtureForCi: z.boolean().optional(),
  reviewerUserId: z.string().optional(),
});

const attestSchema = z.object({
  sourceChecksumVerified: z.boolean(),
  rollbackTested: z.boolean(),
  manifestHashVerified: z.boolean().optional(),
  reviewerUserId: z.string().optional(),
});

@Injectable()
export class MedicationBatchHttpService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.medicationBatchManifest.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        batchId: true,
        batchVersion: true,
        batchName: true,
        batchStatus: true,
        approvalStatus: true,
        expectedMedicationFamilyCount: true,
        clinicalActivationAllowed: true,
        batchManifestHash: true,
        createdAt: true,
        approvedAt: true,
      },
    });
  }

  metrics() {
    return getBatchDashboardMetrics(this.prisma);
  }

  async getOne(batchId: string) {
    const row = await this.prisma.medicationBatchManifest.findFirst({
      where: { batchId },
      orderBy: { createdAt: "desc" },
    });
    if (!row) throw new NotFoundException("Lot médicament introuvable.");
    return row;
  }

  async create(actor: BatchActor) {
    try {
      return await registerOrLoadBatchManifest(this.prisma, actor);
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : "Création impossible.");
    }
  }

  async approve(batchId: string, actor: BatchActor) {
    await this.ensureBatch(batchId);
    try {
      return await approveBatchManifest(this.prisma, actor);
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : "Approbation impossible.");
    }
  }

  async preview(batchId: string, actor: BatchActor) {
    await this.ensureBatch(batchId);
    return previewBatch(this.prisma, actor);
  }

  async report(batchId: string, actor: BatchActor) {
    await this.ensureBatch(batchId);
    return getBatchReport(this.prisma, actor);
  }

  async items(batchId: string, limit: number, offset: number) {
    const manifest = await this.ensureBatch(batchId);
    const take = Math.min(Math.max(limit || 50, 1), 200);
    const skip = Math.max(offset || 0, 0);
    const [total, rows] = await Promise.all([
      this.prisma.medicationBatchItem.count({ where: { manifestId: manifest.id } }),
      this.prisma.medicationBatchItem.findMany({
        where: { manifestId: manifest.id },
        take,
        skip,
        orderBy: { itemCode: "asc" },
      }),
    ]);
    return { total, limit: take, offset: skip, rows };
  }

  async conflicts(batchId: string) {
    const manifest = await this.ensureBatch(batchId);
    const rows = await this.prisma.medicationDuplicateAssessment.findMany({
      where: {
        batchManifestId: manifest.id,
        classification: {
          in: [
            "EXACT_DUPLICATE",
            "SOURCE_DUPLICATE",
            "MAPPING_DUPLICATE",
            "PROBABLE_DUPLICATE",
            "POSSIBLE_DUPLICATE",
          ],
        },
      },
      take: 200,
      orderBy: { confidenceScore: "desc" },
    });
    return { total: rows.length, rows };
  }

  async batchMetrics(batchId: string) {
    await this.ensureBatch(batchId);
    return getBatchDashboardMetrics(this.prisma);
  }

  async extract(batchId: string, body: unknown, actor: BatchActor) {
    await this.ensureBatch(batchId);
    assertNoSpoofedActor(body, actor.userId);
    const parsed = confirmSchema.safeParse(body ?? {});
    try {
      await validateBatchSource(this.prisma, actor, {
        allowStructuralFixtureForCi: parsed.success
          ? parsed.data.allowStructuralFixtureForCi
          : false,
      });
      return await extractBatch(this.prisma, actor, {
        allowStructuralFixtureForCi: parsed.success
          ? parsed.data.allowStructuralFixtureForCi
          : false,
      });
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : "Extraction impossible.");
    }
  }

  async normalize(batchId: string, actor: BatchActor) {
    await this.ensureBatch(batchId);
    // Normalization is embedded in extract/preview identity builders.
    return previewBatch(this.prisma, actor);
  }

  async dedupe(batchId: string, actor: BatchActor) {
    await this.ensureBatch(batchId);
    try {
      return await dedupeApproveBatch(this.prisma, actor);
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : "Déduplication impossible.");
    }
  }

  async stage(batchId: string, body: unknown, actor: BatchActor) {
    await this.ensureBatch(batchId);
    assertNoSpoofedActor(body, actor.userId);
    const parsed = confirmSchema.safeParse(body ?? {});
    if (!parsed.success || !parsed.data.confirmStage) {
      throw new BadRequestException("confirmStage=true est requis.");
    }
    try {
      return await stageBatch(this.prisma, actor, {
        confirmStage: true,
        batchId,
        manifestHash: parsed.data.manifestHash,
        allowStructuralFixtureForCi: parsed.data.allowStructuralFixtureForCi,
      });
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : "Staging impossible.");
    }
  }

  async candidates(batchId: string, actor: BatchActor) {
    await this.ensureBatch(batchId);
    try {
      return await generateBatchCandidates(this.prisma, actor);
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : "Candidats impossibles.");
    }
  }

  async rollback(batchId: string, body: unknown, actor: BatchActor) {
    await this.ensureBatch(batchId);
    assertNoSpoofedActor(body, actor.userId);
    const parsed = confirmSchema.safeParse(body ?? {});
    if (!parsed.success || !parsed.data.confirmRollback) {
      throw new BadRequestException("confirmRollback=true est requis.");
    }
    try {
      return await rollbackBatch(this.prisma, actor, { confirmRollback: true });
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : "Rollback impossible.");
    }
  }

  async attest(batchId: string, body: unknown, actor: BatchActor) {
    await this.ensureBatch(batchId);
    assertNoSpoofedActor(body, actor.userId);
    const parsed = attestSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Attestation invalide.");
    }
    try {
      return await attestPhase7BatchExecution(this.prisma, actor, {
        sourceChecksumVerified: parsed.data.sourceChecksumVerified,
        rollbackTested: parsed.data.rollbackTested,
        manifestHashVerified: parsed.data.manifestHashVerified,
      });
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : "Attestation impossible.");
    }
  }

  private async ensureBatch(batchId: string) {
    const row = await this.prisma.medicationBatchManifest.findFirst({
      where: { batchId },
      orderBy: { createdAt: "desc" },
    });
    if (!row) throw new NotFoundException("Lot médicament introuvable.");
    return row;
  }
}
