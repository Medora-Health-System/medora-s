import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { z } from "zod";
import type { MedicationSafetyKnowledgeLifecycle } from "@medora/shared";
import { PrismaService } from "../../prisma/prisma.service";
import {
  createAllergenMapping,
  createCrossReactivityRule,
  listAllergenConcepts,
  listAllergenMappings,
  listCrossReactivityRules,
  upsertAllergenConcept,
} from "./medication-allergy-knowledge.service";
import {
  createDuplicateTherapyMembership,
  createDuplicateTherapyRule,
  listDuplicateTherapyGroups,
  listDuplicateTherapyMemberships,
  listDuplicateTherapyRules,
  upsertDuplicateTherapyGroup,
} from "./medication-duplicate-therapy.service";
import {
  createDraftDrugInteraction,
  forkApprovedDrugInteraction,
  getDrugInteraction,
  listDrugInteractions,
  transitionDrugInteraction,
  updateDraftDrugInteraction,
} from "./medication-interaction.service";
import {
  checkDrugInteractionDuplicate,
  summarizeSafetyDuplicateQueue,
} from "./medication-safety-duplicate-detection.service";
import {
  dryRunSafetyKnowledgeImport,
  previewSafetyKnowledgeImport,
  rollbackSafetyKnowledgeImportPreview,
} from "./medication-safety-knowledge-import.service";
import {
  createSafetyKnowledgeVersion,
  getSafetyKnowledgeDashboard,
  listSafetyKnowledgeSources,
  listSafetyKnowledgeVersions,
  upsertSafetyKnowledgeSource,
  type SafetyKnowledgeActor,
} from "./medication-safety-knowledge.service";
import {
  createClassMembership,
  listClassMemberships,
  listTherapeuticClasses,
  upsertTherapeuticClass,
} from "./medication-therapeutic-class.service";

function assertNoSpoof(body: unknown, userId: string) {
  if (!body || typeof body !== "object") return;
  const reviewerUserId = (body as { reviewerUserId?: string }).reviewerUserId;
  if (reviewerUserId && reviewerUserId !== userId) {
    throw new BadRequestException(
      "Payload reviewerUserId must match the authenticated user."
    );
  }
  if ("roles" in (body as object) || "role" in (body as object)) {
    throw new BadRequestException("Role spoofing via request body is forbidden.");
  }
}

@Injectable()
export class MedicationSafetyKnowledgeHttpService {
  constructor(private readonly prisma: PrismaService) {}

  dashboard() {
    return getSafetyKnowledgeDashboard(this.prisma);
  }

  listSources() {
    return listSafetyKnowledgeSources(this.prisma);
  }

  listVersions(sourceId?: string) {
    return listSafetyKnowledgeVersions(this.prisma, sourceId);
  }

  async upsertSource(body: unknown, actor: SafetyKnowledgeActor) {
    assertNoSpoof(body, actor.userId);
    const parsed = z
      .object({
        sourceCode: z.string().min(1),
        name: z.string().min(1),
        sourceType: z.string().optional(),
        publisher: z.string().optional(),
        sourceUrl: z.string().optional(),
        licenseReference: z.string().optional(),
        releaseVersion: z.string().optional(),
        reviewerUserId: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.");
    }
    try {
      return await upsertSafetyKnowledgeSource(this.prisma, actor, parsed.data);
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : "Source impossible.");
    }
  }

  async createVersion(body: unknown, actor: SafetyKnowledgeActor) {
    assertNoSpoof(body, actor.userId);
    const parsed = z
      .object({
        sourceId: z.string().min(1),
        version: z.string().min(1),
        releaseIdentifier: z.string().optional(),
        notes: z.string().optional(),
        checksum: z.string().optional(),
        reviewerUserId: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.");
    }
    try {
      return await createSafetyKnowledgeVersion(this.prisma, actor, parsed.data);
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : "Version impossible.");
    }
  }

  listInteractions(filters: { status?: string; limit?: number; offset?: number }) {
    return listDrugInteractions(this.prisma, filters);
  }

  async getInteraction(id: string) {
    const row = await getDrugInteraction(this.prisma, id);
    if (!row) throw new NotFoundException("Interaction introuvable.");
    return row;
  }

  async createInteraction(body: unknown, actor: SafetyKnowledgeActor) {
    assertNoSpoof(body, actor.userId);
    const parsed = z
      .object({
        subjectMedicationConceptId: z.string().optional(),
        objectMedicationConceptId: z.string().optional(),
        subjectMedicationProductId: z.string().optional(),
        objectMedicationProductId: z.string().optional(),
        directional: z.boolean().optional(),
        interactionScope: z.string().min(1),
        interactionType: z.string().min(1),
        severity: z.string().min(1),
        clinicalSignificance: z.string().optional(),
        evidenceLevel: z.string().min(1),
        onset: z.string().optional(),
        mechanism: z.string().optional(),
        clinicalEffect: z.string().optional(),
        managementRecommendation: z.string().optional(),
        monitoringRecommendation: z.string().optional(),
        administrationSeparationMinutes: z.number().int().optional(),
        contraindicatedCombination: z.boolean().optional(),
        sourceVersionId: z.string().min(1),
        notes: z.string().optional(),
        reviewerUserId: z.string().optional(),
        clinicalActivationAllowed: z.boolean().optional(),
      })
      .safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.");
    }
    if (parsed.data.clinicalActivationAllowed === true) {
      throw new BadRequestException(
        "Phase 9 forbids setting clinicalActivationAllowed=true."
      );
    }
    try {
      return await createDraftDrugInteraction(this.prisma, actor, parsed.data);
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : "Création impossible.");
    }
  }

  async patchInteraction(id: string, body: unknown, actor: SafetyKnowledgeActor) {
    assertNoSpoof(body, actor.userId);
    const parsed = z
      .object({
        notes: z.string().optional(),
        managementRecommendation: z.string().optional(),
        monitoringRecommendation: z.string().optional(),
        reviewerUserId: z.string().optional(),
        clinicalActivationAllowed: z.boolean().optional(),
      })
      .safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.");
    }
    if (parsed.data.clinicalActivationAllowed === true) {
      throw new BadRequestException(
        "Phase 9 forbids setting clinicalActivationAllowed=true."
      );
    }
    try {
      return await updateDraftDrugInteraction(this.prisma, actor, id, parsed.data);
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : "Mise à jour impossible.");
    }
  }

  async transitionInteraction(id: string, body: unknown, actor: SafetyKnowledgeActor) {
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
      return await transitionDrugInteraction(this.prisma, actor, {
        id,
        toStatus: parsed.data.toStatus as MedicationSafetyKnowledgeLifecycle,
        rationale: parsed.data.rationale,
      });
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : "Transition impossible.");
    }
  }

  async forkInteraction(id: string, body: unknown, actor: SafetyKnowledgeActor) {
    assertNoSpoof(body, actor.userId);
    const parsed = z
      .object({
        sourceVersionId: z.string().min(1),
        reviewerUserId: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.");
    }
    try {
      return await forkApprovedDrugInteraction(
        this.prisma,
        actor,
        id,
        parsed.data.sourceVersionId
      );
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : "Fork impossible.");
    }
  }

  listClasses() {
    return listTherapeuticClasses(this.prisma);
  }

  async upsertClass(body: unknown, actor: SafetyKnowledgeActor) {
    assertNoSpoof(body, actor.userId);
    const parsed = z
      .object({
        code: z.string().min(1),
        name: z.string().min(1),
        codeSystem: z.string().optional(),
        normalizedName: z.string().optional(),
        displayNameFr: z.string().optional(),
        description: z.string().optional(),
        parentId: z.string().optional(),
        reviewerUserId: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.");
    }
    try {
      return await upsertTherapeuticClass(this.prisma, actor, parsed.data);
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : "Classe impossible.");
    }
  }

  listClassMemberships(therapeuticClassId?: string, status?: string) {
    return listClassMemberships(this.prisma, { therapeuticClassId, status });
  }

  async createClassMembership(body: unknown, actor: SafetyKnowledgeActor) {
    assertNoSpoof(body, actor.userId);
    const parsed = z
      .object({
        medicationConceptId: z.string().optional(),
        medicationProductId: z.string().optional(),
        therapeuticClassId: z.string().min(1),
        membershipType: z.string().min(1),
        sourceVersionId: z.string().min(1),
        reviewerUserId: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.");
    }
    try {
      return await createClassMembership(this.prisma, actor, parsed.data);
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : "Adhésion impossible.");
    }
  }

  listAllergens() {
    return listAllergenConcepts(this.prisma);
  }

  async upsertAllergen(body: unknown, actor: SafetyKnowledgeActor) {
    assertNoSpoof(body, actor.userId);
    const parsed = z
      .object({
        allergenType: z.string().min(1),
        displayName: z.string().min(1),
        displayNameFr: z.string().optional(),
        codeSystem: z.string().optional(),
        code: z.string().optional(),
        parentAllergenId: z.string().optional(),
        description: z.string().optional(),
        reviewerUserId: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.");
    }
    try {
      return await upsertAllergenConcept(this.prisma, actor, parsed.data);
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : "Allergène impossible.");
    }
  }

  listAllergenMappings() {
    return listAllergenMappings(this.prisma);
  }

  async createAllergenMapping(body: unknown, actor: SafetyKnowledgeActor) {
    assertNoSpoof(body, actor.userId);
    const parsed = z
      .object({
        allergenConceptId: z.string().min(1),
        medicationConceptId: z.string().optional(),
        medicationProductId: z.string().optional(),
        therapeuticClassId: z.string().optional(),
        relationshipType: z.string().min(1),
        reactionKind: z.string().optional(),
        crossReactivityRisk: z.string().optional(),
        evidenceLevel: z.string().optional(),
        clinicalDescription: z.string().optional(),
        sourceVersionId: z.string().min(1),
        reviewerUserId: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.");
    }
    try {
      return await createAllergenMapping(this.prisma, actor, parsed.data);
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : "Mapping impossible.");
    }
  }

  listCrossReactivity() {
    return listCrossReactivityRules(this.prisma);
  }

  async createCrossReactivity(body: unknown, actor: SafetyKnowledgeActor) {
    assertNoSpoof(body, actor.userId);
    const parsed = z
      .object({
        sourceAllergenId: z.string().min(1),
        targetMedicationConceptId: z.string().optional(),
        targetMedicationProductId: z.string().optional(),
        targetTherapeuticClassId: z.string().optional(),
        riskLevel: z.string().min(1),
        crossReactivityType: z.string().optional(),
        evidenceLevel: z.string().optional(),
        estimatedFrequency: z.string().optional(),
        clinicalDescription: z.string().optional(),
        managementRecommendation: z.string().optional(),
        sourceVersionId: z.string().min(1),
        reviewerUserId: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.");
    }
    try {
      return await createCrossReactivityRule(this.prisma, actor, parsed.data);
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : "Règle impossible.");
    }
  }

  listDupGroups() {
    return listDuplicateTherapyGroups(this.prisma);
  }

  async upsertDupGroup(body: unknown, actor: SafetyKnowledgeActor) {
    assertNoSpoof(body, actor.userId);
    const parsed = z
      .object({
        code: z.string().min(1),
        displayName: z.string().min(1),
        displayNameFr: z.string().optional(),
        description: z.string().optional(),
        severity: z.string().optional(),
        defaultClinicalSignificance: z.string().optional(),
        reviewerUserId: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.");
    }
    try {
      return await upsertDuplicateTherapyGroup(this.prisma, actor, parsed.data);
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : "Groupe impossible.");
    }
  }

  listDupRules() {
    return listDuplicateTherapyRules(this.prisma);
  }

  async createDupRule(body: unknown, actor: SafetyKnowledgeActor) {
    assertNoSpoof(body, actor.userId);
    const parsed = z
      .object({
        duplicateTherapyGroupId: z.string().min(1),
        ruleType: z.string().min(1),
        severity: z.string().min(1),
        clinicalSignificance: z.string().optional(),
        minimumDistinctMedications: z.number().int().optional(),
        maximumRecommendedConcurrentAgents: z.number().int().optional(),
        sameIngredientOnly: z.boolean().optional(),
        sameRouteOnly: z.boolean().optional(),
        sameDosageFormOnly: z.boolean().optional(),
        includeCombinationProducts: z.boolean().optional(),
        excludeTopicalProducts: z.boolean().optional(),
        excludeSingleAdministrationEmergencyUse: z.boolean().optional(),
        sourceVersionId: z.string().min(1),
        reviewerUserId: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.");
    }
    try {
      return await createDuplicateTherapyRule(this.prisma, actor, parsed.data);
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : "Règle impossible.");
    }
  }

  listDupMemberships() {
    return listDuplicateTherapyMemberships(this.prisma);
  }

  async createDupMembership(body: unknown, actor: SafetyKnowledgeActor) {
    assertNoSpoof(body, actor.userId);
    const parsed = z
      .object({
        duplicateTherapyGroupId: z.string().min(1),
        medicationConceptId: z.string().optional(),
        medicationProductId: z.string().optional(),
        ingredientConceptId: z.string().optional(),
        membershipRole: z.string().min(1),
        sourceVersionId: z.string().min(1),
        reviewerUserId: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.");
    }
    try {
      return await createDuplicateTherapyMembership(this.prisma, actor, parsed.data);
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : "Adhésion impossible.");
    }
  }

  async duplicateCheck(body: unknown) {
    const parsed = z
      .object({
        leftMedicationId: z.string().min(1),
        rightMedicationId: z.string().min(1),
        interactionScope: z.string().min(1),
        sourceVersionId: z.string().min(1),
        directional: z.boolean().optional(),
      })
      .safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.");
    }
    return checkDrugInteractionDuplicate(this.prisma, parsed.data);
  }

  duplicateQueue() {
    return summarizeSafetyDuplicateQueue(this.prisma);
  }

  async importPreview(body: unknown, actor: SafetyKnowledgeActor) {
    assertNoSpoof(body, actor.userId);
    const parsed = z
      .object({
        sourceVersionId: z.string().min(1),
        candidates: z.array(
          z.object({
            subjectMedicationConceptId: z.string().optional(),
            objectMedicationConceptId: z.string().optional(),
            interactionScope: z.string().min(1),
            interactionType: z.string().min(1),
            severity: z.string().min(1),
            evidenceLevel: z.string().min(1),
            directional: z.boolean().optional(),
          })
        ),
        reviewerUserId: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.");
    }
    try {
      return await previewSafetyKnowledgeImport(this.prisma, actor, parsed.data);
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : "Prévisualisation impossible.");
    }
  }

  async importDryRun(body: unknown, actor: SafetyKnowledgeActor) {
    assertNoSpoof(body, actor.userId);
    const parsed = z
      .object({
        sourceVersionId: z.string().min(1),
        candidates: z.array(
          z.object({
            subjectMedicationConceptId: z.string().optional(),
            objectMedicationConceptId: z.string().optional(),
            interactionScope: z.string().min(1),
            interactionType: z.string().min(1),
            severity: z.string().min(1),
            evidenceLevel: z.string().min(1),
            directional: z.boolean().optional(),
          })
        ),
        reviewerUserId: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.");
    }
    try {
      return await dryRunSafetyKnowledgeImport(this.prisma, actor, parsed.data);
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : "Dry-run impossible.");
    }
  }

  async importRollback(body: unknown, actor: SafetyKnowledgeActor) {
    assertNoSpoof(body, actor.userId);
    const parsed = z
      .object({
        sourceVersionId: z.string().min(1),
        rationale: z.string().min(1),
        reviewerUserId: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.");
    }
    try {
      return await rollbackSafetyKnowledgeImportPreview(
        this.prisma,
        actor,
        parsed.data.sourceVersionId,
        parsed.data.rationale
      );
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : "Rollback impossible.");
    }
  }
}
