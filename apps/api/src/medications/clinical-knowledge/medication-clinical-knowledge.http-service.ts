import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { z } from "zod";
import { PrismaService } from "../../prisma/prisma.service";
import {
  createDraftClinicalProfile,
  createKnowledgeVersion,
  createSupersedingDraft,
  getClinicalKnowledgeDashboard,
  getClinicalProfileDetail,
  listClinicalProfiles,
  transitionClinicalProfileLifecycle,
  updateDraftClinicalProfileNotes,
  upsertKnowledgeSource,
  type ClinicalKnowledgeActor,
} from "./medication-clinical-knowledge.service";

function assertNoSpoof(body: unknown, userId: string) {
  if (!body || typeof body !== "object") return;
  const reviewerUserId = (body as { reviewerUserId?: string }).reviewerUserId;
  if (reviewerUserId && reviewerUserId !== userId) {
    throw new BadRequestException(
      "Payload reviewerUserId must match the authenticated user."
    );
  }
}

@Injectable()
export class MedicationClinicalKnowledgeHttpService {
  constructor(private readonly prisma: PrismaService) {}

  dashboard() {
    return getClinicalKnowledgeDashboard(this.prisma);
  }

  list(filters: Parameters<typeof listClinicalProfiles>[1]) {
    return listClinicalProfiles(this.prisma, filters);
  }

  async getOne(id: string) {
    const row = await getClinicalProfileDetail(this.prisma, id);
    if (!row) throw new NotFoundException("Profil de connaissances introuvable.");
    return row;
  }

  async upsertSource(body: unknown, actor: ClinicalKnowledgeActor) {
    assertNoSpoof(body, actor.userId);
    const parsed = z
      .object({
        sourceCode: z.string().min(1),
        sourceName: z.string().min(1),
        organization: z.string().optional(),
        licenseNotes: z.string().optional(),
        sourceUrl: z.string().optional(),
        reviewerUserId: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.");
    }
    try {
      return await upsertKnowledgeSource(this.prisma, actor, parsed.data);
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : "Source impossible.");
    }
  }

  async createVersion(body: unknown, actor: ClinicalKnowledgeActor) {
    assertNoSpoof(body, actor.userId);
    const parsed = z
      .object({
        sourceId: z.string().min(1),
        versionLabel: z.string().min(1),
        knowledgeVersion: z.string().min(1),
        notes: z.string().optional(),
        reviewerUserId: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.");
    }
    try {
      return await createKnowledgeVersion(this.prisma, actor, parsed.data);
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : "Version impossible.");
    }
  }

  async createDraft(body: unknown, actor: ClinicalKnowledgeActor) {
    assertNoSpoof(body, actor.userId);
    const parsed = z
      .object({
        conceptId: z.string().optional(),
        productId: z.string().optional(),
        sourceId: z.string().min(1),
        knowledgeVersionId: z.string().min(1),
        evidenceLevel: z.string().optional(),
        notes: z.string().optional(),
        emergencyUseProfiles: z.array(z.string()).optional(),
        doseRecommendation: z
          .object({
            doseKind: z.string(),
            population: z.string().optional(),
            routeCode: z.string().optional(),
            doseAmount: z.number().optional(),
            doseUnit: z.string().optional(),
            doseMinAmount: z.number().optional(),
            doseMaxAmount: z.number().optional(),
            frequencyText: z.string().optional(),
          })
          .optional(),
        administration: z
          .object({
            routeCode: z.string(),
            administrationMethod: z.string().optional(),
            dilutionRequired: z.boolean().optional(),
            ivPushRateText: z.string().optional(),
            infusionRateText: z.string().optional(),
            centralLineRequired: z.boolean().optional(),
          })
          .optional(),
        reviewerUserId: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.");
    }
    try {
      return await createDraftClinicalProfile(this.prisma, actor, parsed.data);
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : "Brouillon impossible.");
    }
  }

  async updateDraft(id: string, body: unknown, actor: ClinicalKnowledgeActor) {
    assertNoSpoof(body, actor.userId);
    const parsed = z
      .object({ notes: z.string(), reviewerUserId: z.string().optional() })
      .safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.");
    }
    try {
      return await updateDraftClinicalProfileNotes(
        this.prisma,
        actor,
        id,
        parsed.data.notes
      );
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : "Mise à jour impossible.");
    }
  }

  async transition(
    id: string,
    body: { toStatus: "DRAFT" | "UNDER_REVIEW" | "APPROVED" | "SUPERSEDED" | "RETIRED"; rationale: string },
    actor: ClinicalKnowledgeActor
  ) {
    try {
      return await transitionClinicalProfileLifecycle(this.prisma, actor, {
        profileId: id,
        toStatus: body.toStatus,
        rationale: body.rationale,
      });
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : "Transition impossible.");
    }
  }

  async fork(id: string, body: unknown, actor: ClinicalKnowledgeActor) {
    assertNoSpoof(body, actor.userId);
    const parsed = z
      .object({
        knowledgeVersionId: z.string().min(1),
        reviewerUserId: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.");
    }
    try {
      return await createSupersedingDraft(
        this.prisma,
        actor,
        id,
        parsed.data.knowledgeVersionId
      );
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : "Version impossible.");
    }
  }
}
