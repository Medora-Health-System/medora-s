import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { CarePlanComponentStatus, CarePlanComponentType, CarePlanPriority, CarePlanStatus, EncounterClinicalEventType, EncounterType, Prisma, RoleCode } from "@prisma/client";
import {
  assertSameClinicalAuthor,
  buildClinicalAuthorSnapshotPersist,
  CARE_PLAN_COMPONENT_NOT_AUTHOR,
  CARE_PLAN_SUGGESTION_SIGNAL_CARD_IDS,
  getCarePlanTemplate,
  INPATIENT_NURSING_ASSESSMENT_V1_KEY,
  suggestEncounterCarePlans,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";

export type CarePlanActor = { userId: string; facilityId: string; role: RoleCode };

/**
 * MEDUI.CP.1E — identity FKs remain authoritative; display names are persisted snapshots.
 * Live User joins are not used for chart attribution after CP.1E.
 */
const includeAggregate = {
  components: { orderBy: { sequence: "asc" as const } },
  progress: { orderBy: { createdAt: "asc" as const } },
  reviews: { orderBy: { createdAt: "asc" as const } },
  transitions: { orderBy: { createdAt: "asc" as const } },
} as const;

const mutable = new Set<CarePlanStatus>([
  CarePlanStatus.DRAFT,
  CarePlanStatus.ACTIVE,
  CarePlanStatus.ON_HOLD,
  CarePlanStatus.UNDER_REVIEW,
]);

const transitions: Record<CarePlanStatus, CarePlanStatus[]> = {
  DRAFT: [CarePlanStatus.ACTIVE, CarePlanStatus.DISCONTINUED],
  ACTIVE: [
    CarePlanStatus.ON_HOLD,
    CarePlanStatus.UNDER_REVIEW,
    CarePlanStatus.COMPLETED,
    CarePlanStatus.DISCONTINUED,
  ],
  ON_HOLD: [CarePlanStatus.ACTIVE, CarePlanStatus.DISCONTINUED],
  UNDER_REVIEW: [CarePlanStatus.ACTIVE, CarePlanStatus.COMPLETED, CarePlanStatus.DISCONTINUED],
  COMPLETED: [],
  DISCONTINUED: [],
};

@Injectable()
export class EncounterCarePlanService {
  constructor(private readonly prisma: PrismaService) {}

  private async encounter(actor: CarePlanActor, encounterId: string) {
    const value = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId: actor.facilityId },
      select: { id: true, patientId: true, facilityId: true, type: true },
    });
    if (!value) throw new NotFoundException("Encounter not found in facility scope");
    return value;
  }

  private async scoped(
    actor: CarePlanActor,
    encounterId: string,
    carePlanId: string,
    tx: Prisma.TransactionClient = this.prisma
  ) {
    const plan = await tx.encounterCarePlan.findFirst({
      where: { id: carePlanId, encounterId, facilityId: actor.facilityId },
      include: includeAggregate,
    });
    if (!plan) throw new NotFoundException("Care plan not found in encounter scope");
    const encounter = await tx.encounter.findFirst({
      where: { id: encounterId, facilityId: actor.facilityId, patientId: plan.patientId },
      select: { id: true },
    });
    if (!encounter) throw new ForbiddenException("CARE_PLAN_SCOPE_DENIED");
    return plan;
  }

  private revision(plan: { revision: number }, expectedRevision: unknown) {
    if (!Number.isInteger(expectedRevision) || expectedRevision !== plan.revision) {
      throw new ConflictException("CARE_PLAN_REVISION_CONFLICT");
    }
  }

  private requireClinical(actor: CarePlanActor, allowed: RoleCode[]) {
    if (!allowed.includes(actor.role)) throw new ForbiddenException("CARE_PLAN_CAPABILITY_DENIED");
  }

  /** Server-side ClinicalAuthorSnapshot — never trust browser-submitted names/titles. */
  private async resolveAuthorSnapshot(
    actor: CarePlanActor,
    tx: Prisma.TransactionClient = this.prisma
  ) {
    const [user, roles] = await Promise.all([
      tx.user.findUnique({
        where: { id: actor.userId },
        select: { firstName: true, lastName: true },
      }),
      tx.userRole.findMany({
        where: { userId: actor.userId, facilityId: actor.facilityId, isActive: true },
        select: { professionCode: true },
      }),
    ]);
    return buildClinicalAuthorSnapshotPersist({
      userId: actor.userId,
      firstName: user?.firstName,
      lastName: user?.lastName,
      professionCodes: roles.map((r) => r.professionCode),
      roleCode: actor.role,
    });
  }

  async list(actor: CarePlanActor, encounterId: string) {
    const encounter = await this.encounter(actor, encounterId);
    const [plans, legacy, signalDocs, nursingEvents] = await Promise.all([
      this.prisma.encounterCarePlan.findMany({
        where: { encounterId, facilityId: actor.facilityId, patientId: encounter.patientId },
        include: includeAggregate,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.encounter.findUnique({
        where: { id: encounterId },
        select: { admissionSummaryJson: true, nursingAssessment: true },
      }),
      this.prisma.encounterClinicalDocumentationEntry.findMany({
        where: {
          encounterId,
          facilityId: actor.facilityId,
          patientId: encounter.patientId,
          voidedAt: null,
          cardId: { in: [...CARE_PLAN_SUGGESTION_SIGNAL_CARD_IDS] },
        },
        orderBy: { createdAt: "desc" },
        select: { cardId: true, payloadJson: true, createdAt: true, voidedAt: true },
      }),
      this.prisma.encounterClinicalEvent.findMany({
        where: {
          encounterId,
          facilityId: actor.facilityId,
          payloadJson: { path: ["namespace"], equals: INPATIENT_NURSING_ASSESSMENT_V1_KEY },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { payloadJson: true, createdAt: true },
      }),
    ]);
    const raw = legacy?.admissionSummaryJson as {
      carePlan?: unknown[];
      inpatientClinicalOpsV1?: { carePlan?: unknown[] };
      ops?: { carePlan?: unknown[] };
    } | null;
    const legacyItems =
      (Array.isArray(raw?.inpatientClinicalOpsV1?.carePlan) && raw!.inpatientClinicalOpsV1!.carePlan) ||
      (Array.isArray(raw?.ops?.carePlan) && raw!.ops!.carePlan) ||
      (Array.isArray(raw?.carePlan) && raw!.carePlan) ||
      [];

    const nursingRoot = (legacy?.nursingAssessment ?? null) as Record<string, unknown> | null;
    const nursingFromRoot = nursingRoot?.[INPATIENT_NURSING_ASSESSMENT_V1_KEY] as
      | { fallRisk?: { level?: string | null } | null }
      | undefined;
    const nursingFromEvent = (nursingEvents[0]?.payloadJson as {
      snapshot?: { fallRisk?: { level?: string | null } };
    } | null)?.snapshot;
    const nursingFallLevel =
      nursingFromRoot?.fallRisk?.level ?? nursingFromEvent?.fallRisk?.level ?? null;

    const suggestions = suggestEncounterCarePlans({
      activePlans: plans.map((p) => ({ templateId: p.templateId, status: p.status })),
      clinicalDocs: signalDocs.map((d) => ({
        cardId: d.cardId,
        payload:
          d.payloadJson && typeof d.payloadJson === "object" && !Array.isArray(d.payloadJson)
            ? (d.payloadJson as Record<string, unknown>)
            : null,
        documentedAt: d.createdAt,
        voidedAt: d.voidedAt,
      })),
      nursingAssessment: nursingFallLevel
        ? { fallRiskLevel: nursingFallLevel, documentedAt: nursingEvents[0]?.createdAt ?? null }
        : null,
    });

    return {
      plans,
      legacyReadOnly: legacyItems.map((item) => ({ historical: true, item })),
      suggestions,
    };
  }

  async get(actor: CarePlanActor, encounterId: string, carePlanId: string) {
    return this.scoped(actor, encounterId, carePlanId);
  }

  async activate(
    actor: CarePlanActor,
    encounterId: string,
    input: { templateId?: string; priority?: CarePlanPriority }
  ) {
    this.requireClinical(actor, [RoleCode.RN]);
    const encounter = await this.encounter(actor, encounterId);
    if (encounter.type !== EncounterType.INPATIENT) {
      throw new ForbiddenException("CARE_PLAN_INPATIENT_ONLY");
    }
    const template = getCarePlanTemplate(String(input.templateId ?? ""));
    if (!template) throw new BadRequestException("CARE_PLAN_TEMPLATE_NOT_FOUND");
    if (template.governanceStatus !== "ACTIVE" || !template.selectedInD4b6) {
      throw new BadRequestException("CARE_PLAN_TEMPLATE_INACTIVE");
    }
    const snapshot = JSON.parse(
      JSON.stringify({
        certification: "MEDUI.D4B.6",
        governanceStatus: template.governanceStatus,
        version: template.version,
        template,
      })
    );
    return this.prisma.$transaction(async (tx) => {
      const author = await this.resolveAuthorSnapshot(actor, tx);
      const plan = await tx.encounterCarePlan.create({
        data: {
          facilityId: actor.facilityId,
          patientId: encounter.patientId,
          encounterId,
          templateId: template.templateId,
          templateVersion: template.version,
          templateSnapshotJson: snapshot,
          title: template.titleKey,
          priority: input.priority ?? CarePlanPriority.ROUTINE,
          activatedByUserId: actor.userId,
          activatedByDisplayNameSnapshot: author.displayNameSnapshot,
          activatedByProfessionalTitleSnapshot: author.professionalTitleSnapshot,
          components: {
            create: template.components
              .filter(
                (c) =>
                  c.kind === "GOAL" ||
                  c.kind === "OUTCOME" ||
                  c.kind === "INTERVENTION" ||
                  c.kind === "MONITORING" ||
                  c.kind === "EDUCATION" ||
                  c.kind === "SAFETY"
              )
              .map((c, sequence) => ({
                componentType:
                  c.kind === "GOAL" || c.kind === "OUTCOME"
                    ? CarePlanComponentType.GOAL
                    : CarePlanComponentType.INTERVENTION,
                sourceTemplateComponentId: c.componentId,
                discipline: c.disciplineHint,
                title: c.titleKey,
                text: c.bodyKey,
                sequence,
                monitoringJson: c.kind === "MONITORING" ? { source: c.componentId } : undefined,
                educationJson: c.kind === "EDUCATION" ? { source: c.componentId } : undefined,
                createdByUserId: actor.userId,
                createdByDisplayNameSnapshot: author.displayNameSnapshot,
                createdByProfessionalTitleSnapshot: author.professionalTitleSnapshot,
              })),
          },
        },
      });
      await tx.encounterCarePlanTransition.create({
        data: {
          carePlanId: plan.id,
          fromStatus: CarePlanStatus.DRAFT,
          toStatus: CarePlanStatus.ACTIVE,
          actorUserId: actor.userId,
          actorRoleSnapshot: actor.role,
          actorDisplayNameSnapshot: author.displayNameSnapshot,
          actorProfessionalTitleSnapshot: author.professionalTitleSnapshot,
          aggregateRevision: 1,
        },
      });
      await tx.encounterClinicalEvent.create({
        data: {
          facilityId: actor.facilityId,
          patientId: encounter.patientId,
          encounterId,
          eventType: EncounterClinicalEventType.CARE_PLAN_ACTIVATED,
          payloadJson: {
            carePlanId: plan.id,
            templateId: template.templateId,
            templateVersion: template.version,
          },
          createdByUserId: actor.userId,
        },
      });
      return tx.encounterCarePlan.findUniqueOrThrow({
        where: { id: plan.id },
        include: includeAggregate,
      });
    });
  }

  async addComponent(actor: CarePlanActor, encounterId: string, carePlanId: string, input: any) {
    this.requireClinical(actor, [RoleCode.RN, RoleCode.PROVIDER]);
    return this.prisma.$transaction(async (tx) => {
      const plan = await this.scoped(actor, encounterId, carePlanId, tx);
      this.revision(plan, input.expectedRevision);
      if (!mutable.has(plan.status)) throw new ConflictException("CARE_PLAN_CLOSED");
      const discipline = String(input.discipline ?? "").toUpperCase();
      if (actor.role === RoleCode.RN && discipline !== "NURSING") {
        throw new ForbiddenException("CARE_PLAN_DISCIPLINE_DENIED");
      }
      const bumped = await tx.encounterCarePlan.updateMany({
        where: { id: plan.id, revision: plan.revision },
        data: { revision: { increment: 1 } },
      });
      if (!bumped.count) throw new ConflictException("CARE_PLAN_REVISION_CONFLICT");
      const author = await this.resolveAuthorSnapshot(actor, tx);
      await tx.encounterCarePlanComponent.create({
        data: {
          carePlanId,
          componentType: input.componentType,
          discipline,
          title: String(input.title),
          text: String(input.text),
          targetOutcome: input.targetOutcome,
          sequence: plan.components.length,
          createdByUserId: actor.userId,
          createdByDisplayNameSnapshot: author.displayNameSnapshot,
          createdByProfessionalTitleSnapshot: author.professionalTitleSnapshot,
        },
      });
      return tx.encounterCarePlan.findUniqueOrThrow({
        where: { id: carePlanId },
        include: includeAggregate,
      });
    });
  }

  async updateComponent(
    actor: CarePlanActor,
    encounterId: string,
    carePlanId: string,
    componentId: string,
    input: any
  ) {
    this.requireClinical(actor, [RoleCode.RN, RoleCode.PROVIDER]);
    return this.prisma.$transaction(async (tx) => {
      const plan = await this.scoped(actor, encounterId, carePlanId, tx);
      this.revision(plan, input.expectedRevision);
      const component = plan.components.find((c) => c.id === componentId);
      if (!component) throw new NotFoundException("Care plan component not found");
      const authorship = assertSameClinicalAuthor({
        authorUserId: component.createdByUserId,
        actorUserId: actor.userId,
        code: CARE_PLAN_COMPONENT_NOT_AUTHOR,
      });
      if (!authorship.ok) throw new ForbiddenException(authorship.code);
      const actorDiscipline =
        actor.role === RoleCode.RN ? "NURSING" : actor.role === RoleCode.PROVIDER ? "PROVIDER" : "";
      if (component.discipline !== actorDiscipline) {
        throw new ForbiddenException("CARE_PLAN_DISCIPLINE_DENIED");
      }
      const bumped = await tx.encounterCarePlan.updateMany({
        where: { id: carePlanId, revision: plan.revision },
        data: { revision: { increment: 1 } },
      });
      if (!bumped.count) throw new ConflictException("CARE_PLAN_REVISION_CONFLICT");
      const corrector = await this.resolveAuthorSnapshot(actor, tx);
      const now = new Date();
      await tx.encounterCarePlanComponent.update({
        where: { id: componentId },
        data: {
          title: input.title,
          text: input.text,
          targetOutcome: input.targetOutcome,
          status: input.status,
          revision: { increment: 1 },
          // Original createdBy* snapshots / createdByUserId stay unchanged.
          correctedByUserId: actor.userId,
          correctedByDisplayNameSnapshot: corrector.displayNameSnapshot,
          correctedByProfessionalTitleSnapshot: corrector.professionalTitleSnapshot,
          correctedAt: now,
          correctionReason:
            typeof input.correctionReason === "string" && input.correctionReason.trim()
              ? input.correctionReason.trim()
              : typeof input.reason === "string" && input.reason.trim()
                ? input.reason.trim()
                : null,
        },
      });
      return tx.encounterCarePlan.findUniqueOrThrow({
        where: { id: carePlanId },
        include: includeAggregate,
      });
    });
  }

  async progress(actor: CarePlanActor, encounterId: string, carePlanId: string, input: any) {
    this.requireClinical(actor, [RoleCode.RN, RoleCode.PROVIDER, RoleCode.PATIENT_CARE_TECH]);
    return this.prisma.$transaction(async (tx) => {
      const plan = await this.scoped(actor, encounterId, carePlanId, tx);
      this.revision(plan, input.expectedRevision);
      const component = input.componentId
        ? plan.components.find((c) => c.id === input.componentId)
        : undefined;
      const discipline = String(input.discipline ?? "").toUpperCase();
      if (actor.role === RoleCode.RN && discipline !== "NURSING") {
        throw new ForbiddenException("CARE_PLAN_DISCIPLINE_DENIED");
      }
      if (
        actor.role === RoleCode.PATIENT_CARE_TECH &&
        (!input.delegated || component?.discipline !== "TECHNICIAN")
      ) {
        throw new ForbiddenException("CARE_PLAN_DELEGATION_REQUIRED");
      }
      const bumped = await tx.encounterCarePlan.updateMany({
        where: { id: carePlanId, revision: plan.revision },
        data: { revision: { increment: 1 } },
      });
      if (!bumped.count) throw new ConflictException("CARE_PLAN_REVISION_CONFLICT");
      const author = await this.resolveAuthorSnapshot(actor, tx);
      await tx.encounterCarePlanProgress.create({
        data: {
          carePlanId,
          componentId: component?.id,
          facilityId: plan.facilityId,
          patientId: plan.patientId,
          encounterId,
          discipline,
          status: input.status as CarePlanComponentStatus,
          narrative: String(input.narrative),
          structuredOutcomeJson: input.structuredOutcomeJson,
          authorUserId: actor.userId,
          authorRoleSnapshot: actor.role,
          authorDisplayNameSnapshot: author.displayNameSnapshot,
          authorProfessionalTitleSnapshot: author.professionalTitleSnapshot,
        },
      });
      return tx.encounterCarePlan.findUniqueOrThrow({
        where: { id: carePlanId },
        include: includeAggregate,
      });
    });
  }

  async review(actor: CarePlanActor, encounterId: string, carePlanId: string, input: any) {
    this.requireClinical(actor, [RoleCode.RN, RoleCode.PROVIDER]);
    return this.prisma.$transaction(async (tx) => {
      const plan = await this.scoped(actor, encounterId, carePlanId, tx);
      this.revision(plan, input.expectedRevision);
      const bumped = await tx.encounterCarePlan.updateMany({
        where: { id: carePlanId, revision: plan.revision },
        data: {
          revision: { increment: 1 },
          currentReviewDueAt: input.nextReviewAt ? new Date(input.nextReviewAt) : null,
        },
      });
      if (!bumped.count) throw new ConflictException("CARE_PLAN_REVISION_CONFLICT");
      const author = await this.resolveAuthorSnapshot(actor, tx);
      await tx.encounterCarePlanReview.create({
        data: {
          carePlanId,
          facilityId: plan.facilityId,
          patientId: plan.patientId,
          encounterId,
          reviewStatus: String(input.reviewStatus),
          nextReviewAt: input.nextReviewAt ? new Date(input.nextReviewAt) : null,
          componentStateSnapshotJson: plan.components,
          narrative: input.narrative,
          reviewerUserId: actor.userId,
          reviewerRoleSnapshot: actor.role,
          reviewerDisplayNameSnapshot: author.displayNameSnapshot,
          reviewerProfessionalTitleSnapshot: author.professionalTitleSnapshot,
        },
      });
      await tx.encounterClinicalEvent.create({
        data: {
          facilityId: plan.facilityId,
          patientId: plan.patientId,
          encounterId,
          eventType: EncounterClinicalEventType.CARE_PLAN_REVIEWED,
          payloadJson: { carePlanId, reviewStatus: input.reviewStatus },
          createdByUserId: actor.userId,
        },
      });
      return tx.encounterCarePlan.findUniqueOrThrow({
        where: { id: carePlanId },
        include: includeAggregate,
      });
    });
  }

  async transition(actor: CarePlanActor, encounterId: string, carePlanId: string, input: any) {
    this.requireClinical(actor, [RoleCode.RN, RoleCode.PROVIDER]);
    return this.prisma.$transaction(async (tx) => {
      const plan = await this.scoped(actor, encounterId, carePlanId, tx);
      this.revision(plan, input.expectedRevision);
      const to = input.toStatus as CarePlanStatus;
      if (!transitions[plan.status].includes(to)) {
        throw new BadRequestException("CARE_PLAN_TRANSITION_INVALID");
      }
      if (
        (to === CarePlanStatus.ON_HOLD || to === CarePlanStatus.DISCONTINUED) &&
        !String(input.reason ?? "").trim()
      ) {
        throw new BadRequestException("CARE_PLAN_TRANSITION_REASON_REQUIRED");
      }
      const nextRevision = plan.revision + 1;
      const now = new Date();
      const bumped = await tx.encounterCarePlan.updateMany({
        where: { id: carePlanId, revision: plan.revision },
        data: {
          status: to,
          revision: nextRevision,
          completedAt: to === CarePlanStatus.COMPLETED ? now : undefined,
          discontinuedAt: to === CarePlanStatus.DISCONTINUED ? now : undefined,
        },
      });
      if (!bumped.count) throw new ConflictException("CARE_PLAN_REVISION_CONFLICT");
      const author = await this.resolveAuthorSnapshot(actor, tx);
      await tx.encounterCarePlanTransition.create({
        data: {
          carePlanId,
          fromStatus: plan.status,
          toStatus: to,
          reason: input.reason,
          actorUserId: actor.userId,
          actorRoleSnapshot: actor.role,
          actorDisplayNameSnapshot: author.displayNameSnapshot,
          actorProfessionalTitleSnapshot: author.professionalTitleSnapshot,
          aggregateRevision: nextRevision,
        },
      });
      if (to === CarePlanStatus.COMPLETED || to === CarePlanStatus.DISCONTINUED) {
        await tx.encounterClinicalEvent.create({
          data: {
            facilityId: plan.facilityId,
            patientId: plan.patientId,
            encounterId,
            eventType:
              to === CarePlanStatus.COMPLETED
                ? EncounterClinicalEventType.CARE_PLAN_COMPLETED
                : EncounterClinicalEventType.CARE_PLAN_DISCONTINUED,
            payloadJson: { carePlanId, reason: input.reason ?? null },
            createdByUserId: actor.userId,
          },
        });
      }
      return tx.encounterCarePlan.findUniqueOrThrow({
        where: { id: carePlanId },
        include: includeAggregate,
      });
    });
  }
}
