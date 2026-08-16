/**
 * MEDUI.D5A.5 — Periodontal exam, treatment plan, procedures, clinical-record projection.
 */

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuditAction } from "@prisma/client";
import {
  D5A4A_DENTAL_CLINICAL_EVALUATION_KEY,
  D5A5_CERTIFICATION_ID,
  D5A5_DENTAL_HISTORY_REVIEW_KEY,
  D5A5_PERIODONTAL_STATUS,
  D5A5_TREATMENT_ACCEPTANCE,
  deriveClinicalAttachmentLevelMm,
  isCanonicalToothCode,
  isD5a5PeriodontalSite,
  isD5a5TreatmentPlanItemStatus,
  isD5a5TreatmentPlanPhase,
  isDentalClinicalBoardEditable,
  normalizeBulkToothCodes,
  projectCurrentToothFindings,
  summarizePeriodontalSites,
  validateProbingDepthMm,
  type DentalWorkspaceAccess,
  type D5a5PeriodontalSiteInput,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";

type Actor = {
  userId: string;
  facilityId: string;
  access: DentalWorkspaceAccess;
};

@Injectable()
export class DentalCareClinicalBoardService {
  constructor(private readonly prisma: PrismaService) {}

  private assertView(access: DentalWorkspaceAccess) {
    if (!access.canAccessDentalShell) {
      throw new ForbiddenException("Dental view capability required.");
    }
  }

  private async loadOpenEncounter(facilityId: string, encounterId: string) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: {
        id: true,
        patientId: true,
        facilityId: true,
        status: true,
        type: true,
        serviceLine: true,
        chiefComplaint: true,
        providerNote: true,
        treatmentPlan: true,
        followUpDate: true,
        providerDocumentationStatus: true,
        providerDocumentationSignedAt: true,
        physicianAssignedUserId: true,
        nurseAssignedUserId: true,
        createdAt: true,
        closedAt: true,
        nursingAssessment: true,
        patient: {
          select: {
            id: true,
            mrn: true,
            globalMrn: true,
            firstName: true,
            lastName: true,
            dob: true,
          },
        },
        physicianAssigned: { select: { firstName: true, lastName: true } },
      },
    });
    if (!encounter) throw new NotFoundException("Encounter not found");
    return encounter;
  }

  private canEditClinicalDomain(
    access: DentalWorkspaceAccess,
    encounterStatus: string,
    domain: "periodontal" | "treatmentPlan" | "procedures"
  ): boolean {
    if (!isDentalClinicalBoardEditable({ access, encounterStatus })) return false;
    if (domain === "periodontal") return access.canEditPeriodontal;
    if (domain === "treatmentPlan") return access.canEditTreatmentPlan;
    return access.canPerformProcedures;
  }

  private assertOpenForWrite(status: string) {
    if (status !== "OPEN") {
      throw new ForbiddenException("Closed encounters are read-only for dental clinical board.");
    }
  }

  async getPeriodontalExam(actor: Actor, encounterId: string) {
    this.assertView(actor.access);
    const encounter = await this.loadOpenEncounter(actor.facilityId, encounterId);
    const exam = await this.prisma.dentalPeriodontalExam.findUnique({
      where: { encounterId: encounter.id },
      include: { siteMeasurements: true },
    });
    const sites = (exam?.siteMeasurements ?? []).map((s) => ({
      toothCode: s.toothCode,
      site: s.site,
      probingDepthMm: s.probingDepthMm,
      gingivalMarginMm: s.gingivalMarginMm,
      clinicalAttachmentLevelMm: s.clinicalAttachmentLevelMm,
      bleedingOnProbing: s.bleedingOnProbing,
      plaque: s.plaque,
      suppuration: s.suppuration,
      mobilityGrade: s.mobilityGrade,
      furcationGrade: s.furcationGrade,
      missingTooth: s.missingTooth,
      implantSite: s.implantSite,
      notes: s.notes,
    }));
    return {
      certificationId: D5A5_CERTIFICATION_ID,
      encounterId: encounter.id,
      patientId: encounter.patientId,
      readOnly: !this.canEditClinicalDomain(actor.access, encounter.status, "periodontal"),
      canEdit: this.canEditClinicalDomain(actor.access, encounter.status, "periodontal"),
      exam: exam
        ? {
            id: exam.id,
            periodontalStatus: exam.periodontalStatus,
            periodontitisStage: exam.periodontitisStage,
            periodontitisGrade: exam.periodontitisGrade,
            extentDistribution: exam.extentDistribution,
            periImplantStatus: exam.periImplantStatus,
            narrativeAssessment: exam.narrativeAssessment,
            documentedAt: exam.documentedAt.toISOString(),
            version: exam.version,
            sites,
            summary: summarizePeriodontalSites(sites),
          }
        : null,
    };
  }

  async savePeriodontalExam(
    actor: Actor,
    encounterId: string,
    body: {
      periodontalStatus?: string;
      periodontitisStage?: string | null;
      periodontitisGrade?: string | null;
      extentDistribution?: string | null;
      periImplantStatus?: string | null;
      narrativeAssessment?: string | null;
      sites?: D5a5PeriodontalSiteInput[];
    }
  ) {
    this.assertView(actor.access);
    if (!actor.access.canEditPeriodontal) {
      throw new ForbiddenException("Periodontal chart edit capability required.");
    }
    const encounter = await this.loadOpenEncounter(actor.facilityId, encounterId);
    this.assertOpenForWrite(encounter.status);

    const status = String(body.periodontalStatus ?? "NOT_ASSESSED")
      .trim()
      .toUpperCase();
    if (!(D5A5_PERIODONTAL_STATUS as readonly string[]).includes(status)) {
      throw new BadRequestException("Invalid periodontalStatus");
    }

    const rawSites = Array.isArray(body.sites) ? body.sites : [];
    const normalizedSites: Array<{
      toothCode: string;
      site: string;
      probingDepthMm: number | null;
      gingivalMarginMm: number | null;
      clinicalAttachmentLevelMm: number | null;
      bleedingOnProbing: boolean;
      plaque: boolean;
      suppuration: boolean;
      mobilityGrade: number | null;
      furcationGrade: number | null;
      missingTooth: boolean;
      implantSite: boolean;
      notes: string | null;
    }> = [];

    for (const s of rawSites) {
      const toothCode = String(s.toothCode ?? "")
        .trim()
        .toUpperCase();
      if (!isCanonicalToothCode(toothCode)) {
        throw new BadRequestException(`Invalid toothCode: ${toothCode}`);
      }
      const site = String(s.site ?? "")
        .trim()
        .toUpperCase();
      if (!isD5a5PeriodontalSite(site)) {
        throw new BadRequestException(`Invalid site: ${site}`);
      }
      let probingDepthMm: number | null = null;
      let gingivalMarginMm: number | null = null;
      try {
        probingDepthMm = validateProbingDepthMm(s.probingDepthMm);
        gingivalMarginMm =
          s.gingivalMarginMm == null || s.gingivalMarginMm === ("" as never)
            ? null
            : validateProbingDepthMm(s.gingivalMarginMm);
      } catch {
        throw new BadRequestException("Invalid probingDepthMm or gingivalMarginMm");
      }
      const cal =
        s.clinicalAttachmentLevelMm != null && s.clinicalAttachmentLevelMm !== ("" as never)
          ? Number(s.clinicalAttachmentLevelMm)
          : deriveClinicalAttachmentLevelMm({ probingDepthMm, gingivalMarginMm });
      normalizedSites.push({
        toothCode,
        site,
        probingDepthMm,
        gingivalMarginMm,
        clinicalAttachmentLevelMm:
          cal != null && Number.isFinite(cal) ? Math.round(cal * 10) / 10 : null,
        bleedingOnProbing: Boolean(s.bleedingOnProbing),
        plaque: Boolean(s.plaque),
        suppuration: Boolean(s.suppuration),
        mobilityGrade:
          s.mobilityGrade == null ? null : Math.min(3, Math.max(0, Number(s.mobilityGrade) || 0)),
        furcationGrade:
          s.furcationGrade == null ? null : Math.min(3, Math.max(0, Number(s.furcationGrade) || 0)),
        missingTooth: Boolean(s.missingTooth),
        implantSite: Boolean(s.implantSite),
        notes: s.notes?.trim() ? String(s.notes).trim() : null,
      });
    }

    await this.prisma.$transaction(async (tx) => {
      const exam = await tx.dentalPeriodontalExam.upsert({
        where: { encounterId: encounter.id },
        create: {
          facilityId: actor.facilityId,
          patientId: encounter.patientId,
          encounterId: encounter.id,
          periodontalStatus: status,
          periodontitisStage: body.periodontitisStage?.trim() || null,
          periodontitisGrade: body.periodontitisGrade?.trim() || null,
          extentDistribution: body.extentDistribution?.trim() || null,
          periImplantStatus: String(body.periImplantStatus ?? "NOT_APPLICABLE")
            .trim()
            .toUpperCase(),
          narrativeAssessment: body.narrativeAssessment?.trim() || null,
          documentedByUserId: actor.userId,
        },
        update: {
          periodontalStatus: status,
          periodontitisStage: body.periodontitisStage?.trim() || null,
          periodontitisGrade: body.periodontitisGrade?.trim() || null,
          extentDistribution: body.extentDistribution?.trim() || null,
          periImplantStatus: String(body.periImplantStatus ?? "NOT_APPLICABLE")
            .trim()
            .toUpperCase(),
          narrativeAssessment: body.narrativeAssessment?.trim() || null,
          documentedByUserId: actor.userId,
          documentedAt: new Date(),
          version: { increment: 1 },
        },
      });

      await tx.dentalPeriodontalSiteMeasurement.deleteMany({ where: { examId: exam.id } });
      if (normalizedSites.length > 0) {
        await tx.dentalPeriodontalSiteMeasurement.createMany({
          data: normalizedSites.map((s) => ({
            examId: exam.id,
            facilityId: actor.facilityId,
            patientId: encounter.patientId,
            encounterId: encounter.id,
            ...s,
          })),
        });
      }

      await tx.auditLog.create({
        data: {
          userId: actor.userId,
          facilityId: actor.facilityId,
          patientId: encounter.patientId,
          encounterId: encounter.id,
          entityType: "DentalPeriodontalExam",
          entityId: exam.id,
          action: AuditAction.DENTAL_PERIODONTAL_EXAM_SAVE,
          metadata: {
            certificationId: D5A5_CERTIFICATION_ID,
            siteCount: normalizedSites.length,
            periodontalStatus: status,
          },
        },
      });
    });

    return this.getPeriodontalExam(actor, encounterId);
  }

  async getTreatmentPlan(actor: Actor, encounterId: string) {
    this.assertView(actor.access);
    const encounter = await this.loadOpenEncounter(actor.facilityId, encounterId);
    const plan = await this.prisma.dentalTreatmentPlan.findUnique({
      where: { encounterId: encounter.id },
      include: {
        items: { orderBy: [{ sequence: "asc" }, { createdAt: "asc" }] },
      },
    });
    return {
      certificationId: D5A5_CERTIFICATION_ID,
      encounterId: encounter.id,
      patientId: encounter.patientId,
      readOnly: !this.canEditClinicalDomain(actor.access, encounter.status, "treatmentPlan"),
      canEdit: this.canEditClinicalDomain(actor.access, encounter.status, "treatmentPlan"),
      plan: plan
        ? {
            id: plan.id,
            status: plan.status,
            proposedTreatmentSummary: plan.proposedTreatmentSummary,
            expectedBenefits: plan.expectedBenefits,
            materialRisks: plan.materialRisks,
            reasonableAlternatives: plan.reasonableAlternatives,
            noTreatmentDiscussed: plan.noTreatmentDiscussed,
            patientQuestions: plan.patientQuestions,
            acceptanceOutcome: plan.acceptanceOutcome,
            documentedAt: plan.documentedAt.toISOString(),
            proposedAt: plan.proposedAt.toISOString(),
            version: plan.version,
            items: plan.items.map((i) => ({
              id: i.id,
              problemText: i.problemText,
              diagnosisId: i.diagnosisId,
              toothCodes: i.toothCodes,
              surfaces: i.surfaces,
              proposedTreatment: i.proposedTreatment,
              priority: i.priority,
              phase: i.phase,
              status: i.status,
              sequence: i.sequence,
              notes: i.notes,
              plannedDate: i.plannedDate?.toISOString() ?? null,
              codingSystem: i.codingSystem,
              code: i.code,
              codeVersion: i.codeVersion,
            })),
          }
        : null,
    };
  }

  async saveTreatmentPlan(
    actor: Actor,
    encounterId: string,
    body: {
      status?: string;
      proposedTreatmentSummary?: string | null;
      expectedBenefits?: string | null;
      materialRisks?: string | null;
      reasonableAlternatives?: string | null;
      noTreatmentDiscussed?: boolean;
      patientQuestions?: string | null;
      acceptanceOutcome?: string;
      items?: Array<{
        id?: string;
        problemText?: string | null;
        diagnosisId?: string | null;
        toothCodes?: string[];
        surfaces?: string[];
        proposedTreatment?: string;
        priority?: number;
        phase?: string;
        status?: string;
        sequence?: number;
        notes?: string | null;
        plannedDate?: string | null;
        codingSystem?: string | null;
        code?: string | null;
        codeVersion?: string | null;
      }>;
    }
  ) {
    this.assertView(actor.access);
    if (!actor.access.canEditTreatmentPlan) {
      throw new ForbiddenException("Treatment plan capability required.");
    }
    const encounter = await this.loadOpenEncounter(actor.facilityId, encounterId);
    this.assertOpenForWrite(encounter.status);

    const acceptance = String(body.acceptanceOutcome ?? "NOT_DISCUSSED")
      .trim()
      .toUpperCase();
    if (!(D5A5_TREATMENT_ACCEPTANCE as readonly string[]).includes(acceptance)) {
      throw new BadRequestException("Invalid acceptanceOutcome");
    }

    const items = Array.isArray(body.items) ? body.items : [];
    for (const item of items) {
      const treatment = String(item.proposedTreatment ?? "").trim();
      if (!treatment) throw new BadRequestException("proposedTreatment required");
      const phase = String(item.phase ?? "DISEASE_CONTROL")
        .trim()
        .toUpperCase();
      if (!isD5a5TreatmentPlanPhase(phase)) throw new BadRequestException("Invalid phase");
      const st = String(item.status ?? "PROPOSED")
        .trim()
        .toUpperCase();
      if (!isD5a5TreatmentPlanItemStatus(st)) throw new BadRequestException("Invalid item status");
      for (const tc of item.toothCodes ?? []) {
        if (!isCanonicalToothCode(String(tc).toUpperCase())) {
          throw new BadRequestException(`Invalid toothCode: ${tc}`);
        }
      }
    }

    await this.prisma.$transaction(async (tx) => {
      const plan = await tx.dentalTreatmentPlan.upsert({
        where: { encounterId: encounter.id },
        create: {
          facilityId: actor.facilityId,
          patientId: encounter.patientId,
          encounterId: encounter.id,
          status: String(body.status ?? "ACTIVE")
            .trim()
            .toUpperCase(),
          proposedTreatmentSummary: body.proposedTreatmentSummary?.trim() || null,
          expectedBenefits: body.expectedBenefits?.trim() || null,
          materialRisks: body.materialRisks?.trim() || null,
          reasonableAlternatives: body.reasonableAlternatives?.trim() || null,
          noTreatmentDiscussed: Boolean(body.noTreatmentDiscussed),
          patientQuestions: body.patientQuestions?.trim() || null,
          acceptanceOutcome: acceptance,
          documentedByUserId: actor.userId,
        },
        update: {
          status: String(body.status ?? "ACTIVE")
            .trim()
            .toUpperCase(),
          proposedTreatmentSummary: body.proposedTreatmentSummary?.trim() || null,
          expectedBenefits: body.expectedBenefits?.trim() || null,
          materialRisks: body.materialRisks?.trim() || null,
          reasonableAlternatives: body.reasonableAlternatives?.trim() || null,
          noTreatmentDiscussed: Boolean(body.noTreatmentDiscussed),
          patientQuestions: body.patientQuestions?.trim() || null,
          acceptanceOutcome: acceptance,
          documentedByUserId: actor.userId,
          documentedAt: new Date(),
          version: { increment: 1 },
        },
      });

      const keepIds: string[] = [];
      let seq = 0;
      for (const item of items) {
        const phase = String(item.phase ?? "DISEASE_CONTROL")
          .trim()
          .toUpperCase();
        const st = String(item.status ?? "PROPOSED")
          .trim()
          .toUpperCase();
        const toothCodes = normalizeBulkToothCodes(item.toothCodes ?? []);
        const surfaces = (item.surfaces ?? []).map((s) => String(s).trim().toUpperCase()).filter(Boolean);
        const data = {
          planId: plan.id,
          facilityId: actor.facilityId,
          patientId: encounter.patientId,
          encounterId: encounter.id,
          problemText: item.problemText?.trim() || null,
          diagnosisId: item.diagnosisId?.trim() || null,
          toothCodes,
          surfaces,
          proposedTreatment: String(item.proposedTreatment).trim(),
          priority: Number.isFinite(Number(item.priority)) ? Number(item.priority) : 3,
          phase,
          status: st,
          sequence: Number.isFinite(Number(item.sequence)) ? Number(item.sequence) : seq,
          notes: item.notes?.trim() || null,
          plannedDate: item.plannedDate ? new Date(item.plannedDate) : null,
          codingSystem: item.codingSystem?.trim() || null,
          code: item.code?.trim() || null,
          codeVersion: item.codeVersion?.trim() || null,
        };
        seq += 1;
        if (item.id) {
          const existing = await tx.dentalTreatmentPlanItem.findFirst({
            where: { id: item.id, planId: plan.id, facilityId: actor.facilityId },
          });
          if (existing) {
            await tx.dentalTreatmentPlanItem.update({ where: { id: existing.id }, data });
            keepIds.push(existing.id);
            continue;
          }
        }
        const created = await tx.dentalTreatmentPlanItem.create({ data });
        keepIds.push(created.id);
      }

      await tx.dentalTreatmentPlanItem.deleteMany({
        where: {
          planId: plan.id,
          id: { notIn: keepIds },
          procedureRecords: { none: {} },
        },
      });

      await tx.auditLog.create({
        data: {
          userId: actor.userId,
          facilityId: actor.facilityId,
          patientId: encounter.patientId,
          encounterId: encounter.id,
          entityType: "DentalTreatmentPlan",
          entityId: plan.id,
          action: AuditAction.DENTAL_TREATMENT_PLAN_SAVE,
          metadata: {
            certificationId: D5A5_CERTIFICATION_ID,
            itemCount: keepIds.length,
            acceptanceOutcome: acceptance,
          },
        },
      });
    });

    return this.getTreatmentPlan(actor, encounterId);
  }

  async listProcedures(actor: Actor, encounterId: string) {
    this.assertView(actor.access);
    const encounter = await this.loadOpenEncounter(actor.facilityId, encounterId);
    const rows = await this.prisma.dentalProcedureRecord.findMany({
      where: { encounterId: encounter.id, facilityId: actor.facilityId },
      orderBy: { performedAt: "desc" },
      include: {
        provider: { select: { firstName: true, lastName: true } },
        assistant: { select: { firstName: true, lastName: true } },
      },
    });
    return {
      certificationId: D5A5_CERTIFICATION_ID,
      encounterId: encounter.id,
      patientId: encounter.patientId,
      readOnly: !this.canEditClinicalDomain(actor.access, encounter.status, "procedures"),
      canEdit: this.canEditClinicalDomain(actor.access, encounter.status, "procedures"),
      procedures: rows.map((r) => this.mapProcedure(r)),
    };
  }

  private mapProcedure(r: {
    id: string;
    clinicalName: string;
    toothCodes: string[];
    surfaces: string[];
    performedAt: Date;
    treatmentPlanItemId: string | null;
    indication: string | null;
    anesthesiaUsed: boolean;
    anesthesiaDetails: string | null;
    materials: string | null;
    techniqueDetails: string | null;
    findings: string | null;
    complications: string | null;
    postProcedureStatus: string | null;
    postOpInstructions: string | null;
    followUpNotes: string | null;
    notes: string | null;
    status: string;
    codingSystem: string | null;
    code: string | null;
    codeVersion: string | null;
    providerUserId: string;
    assistantUserId: string | null;
    provider?: { firstName: string; lastName: string } | null;
    assistant?: { firstName: string; lastName: string } | null;
  }) {
    return {
      id: r.id,
      clinicalName: r.clinicalName,
      toothCodes: r.toothCodes,
      surfaces: r.surfaces,
      performedAt: r.performedAt.toISOString(),
      treatmentPlanItemId: r.treatmentPlanItemId,
      indication: r.indication,
      anesthesiaUsed: r.anesthesiaUsed,
      anesthesiaDetails: r.anesthesiaDetails,
      materials: r.materials,
      techniqueDetails: r.techniqueDetails,
      findings: r.findings,
      complications: r.complications,
      postProcedureStatus: r.postProcedureStatus,
      postOpInstructions: r.postOpInstructions,
      followUpNotes: r.followUpNotes,
      notes: r.notes,
      status: r.status,
      codingSystem: r.codingSystem,
      code: r.code,
      codeVersion: r.codeVersion,
      providerUserId: r.providerUserId,
      assistantUserId: r.assistantUserId,
      providerDisplay: r.provider
        ? `${r.provider.firstName} ${r.provider.lastName}`.trim()
        : null,
      assistantDisplay: r.assistant
        ? `${r.assistant.firstName} ${r.assistant.lastName}`.trim()
        : null,
    };
  }

  async createProcedure(
    actor: Actor,
    encounterId: string,
    body: {
      clinicalName?: string;
      toothCodes?: string[];
      surfaces?: string[];
      treatmentPlanItemId?: string | null;
      performedAt?: string | null;
      indication?: string | null;
      anesthesiaUsed?: boolean;
      anesthesiaDetails?: string | null;
      materials?: string | null;
      techniqueDetails?: string | null;
      findings?: string | null;
      complications?: string | null;
      postProcedureStatus?: string | null;
      postOpInstructions?: string | null;
      followUpNotes?: string | null;
      notes?: string | null;
      codingSystem?: string | null;
      code?: string | null;
      codeVersion?: string | null;
      assistantUserId?: string | null;
      markPlanItemCompleted?: boolean;
    }
  ) {
    this.assertView(actor.access);
    if (!actor.access.canPerformProcedures) {
      throw new ForbiddenException("Procedure documentation capability required.");
    }
    const encounter = await this.loadOpenEncounter(actor.facilityId, encounterId);
    this.assertOpenForWrite(encounter.status);

    const clinicalName = String(body.clinicalName ?? "").trim();
    if (!clinicalName) throw new BadRequestException("clinicalName required");
    const toothCodes = normalizeBulkToothCodes(body.toothCodes ?? []);
    for (const tc of toothCodes) {
      if (!isCanonicalToothCode(tc)) throw new BadRequestException(`Invalid toothCode: ${tc}`);
    }

    const planItemId = body.treatmentPlanItemId?.trim() || null;
    if (planItemId) {
      const item = await this.prisma.dentalTreatmentPlanItem.findFirst({
        where: { id: planItemId, encounterId: encounter.id, facilityId: actor.facilityId },
      });
      if (!item) throw new BadRequestException("treatmentPlanItemId not found");
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const row = await tx.dentalProcedureRecord.create({
        data: {
          facilityId: actor.facilityId,
          patientId: encounter.patientId,
          encounterId: encounter.id,
          treatmentPlanItemId: planItemId,
          clinicalName,
          toothCodes,
          surfaces: (body.surfaces ?? []).map((s) => String(s).trim().toUpperCase()).filter(Boolean),
          performedAt: body.performedAt ? new Date(body.performedAt) : new Date(),
          providerUserId: actor.userId,
          assistantUserId: body.assistantUserId?.trim() || null,
          indication: body.indication?.trim() || null,
          anesthesiaUsed: Boolean(body.anesthesiaUsed),
          anesthesiaDetails: body.anesthesiaDetails?.trim() || null,
          materials: body.materials?.trim() || null,
          techniqueDetails: body.techniqueDetails?.trim() || null,
          findings: body.findings?.trim() || null,
          complications: body.complications?.trim() || null,
          postProcedureStatus: body.postProcedureStatus?.trim() || null,
          postOpInstructions: body.postOpInstructions?.trim() || null,
          followUpNotes: body.followUpNotes?.trim() || null,
          notes: body.notes?.trim() || null,
          codingSystem: body.codingSystem?.trim() || null,
          code: body.code?.trim() || null,
          codeVersion: body.codeVersion?.trim() || null,
        },
        include: {
          provider: { select: { firstName: true, lastName: true } },
          assistant: { select: { firstName: true, lastName: true } },
        },
      });

      if (planItemId && body.markPlanItemCompleted !== false) {
        await tx.dentalTreatmentPlanItem.update({
          where: { id: planItemId },
          data: { status: "COMPLETED" },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: actor.userId,
          facilityId: actor.facilityId,
          patientId: encounter.patientId,
          encounterId: encounter.id,
          entityType: "DentalProcedureRecord",
          entityId: row.id,
          action: AuditAction.DENTAL_PROCEDURE_RECORD_SAVE,
          metadata: {
            certificationId: D5A5_CERTIFICATION_ID,
            treatmentPlanItemId: planItemId,
            toothCount: toothCodes.length,
          },
        },
      });
      return row;
    });

    return this.mapProcedure(created);
  }

  /**
   * Batched Overview / print projection — not a second storage authority.
   */
  async getClinicalRecord(actor: Actor, encounterId: string) {
    this.assertView(actor.access);
    const encounter = await this.loadOpenEncounter(actor.facilityId, encounterId);

    const [
      findings,
      perio,
      plan,
      procedures,
      diagnoses,
      notes,
      orders,
      providerAddenda,
      documents,
    ] = await Promise.all([
      this.prisma.toothFinding.findMany({
        where: { facilityId: actor.facilityId, patientId: encounter.patientId },
        orderBy: { documentedAt: "desc" },
        take: 500,
      }),
      this.prisma.dentalPeriodontalExam.findUnique({
        where: { encounterId: encounter.id },
        include: { siteMeasurements: true },
      }),
      this.prisma.dentalTreatmentPlan.findUnique({
        where: { encounterId: encounter.id },
        include: { items: { orderBy: { sequence: "asc" } } },
      }),
      this.prisma.dentalProcedureRecord.findMany({
        where: { encounterId: encounter.id, facilityId: actor.facilityId, status: { not: "VOIDED" } },
        orderBy: { performedAt: "desc" },
        include: {
          provider: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.diagnosis.findMany({
        where: {
          encounterId: encounter.id,
          facilityId: actor.facilityId,
          status: { not: "REMOVED" },
        },
        orderBy: { sortOrder: "asc" },
      }),
      this.prisma.encounterNote.findMany({
        where: { encounterId: encounter.id, facilityId: actor.facilityId },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          noteType: true,
          body: true,
          createdAt: true,
          author: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.order.findMany({
        where: { encounterId: encounter.id, facilityId: actor.facilityId },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          type: true,
          status: true,
          notes: true,
          createdAt: true,
        },
      }),
      this.prisma.encounterProviderAddendum.findMany({
        where: { encounterId: encounter.id, facilityId: actor.facilityId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, text: true, createdAt: true },
      }),
      this.prisma.enterpriseDocument.findMany({
        where: {
          facilityId: actor.facilityId,
          OR: [
            { encounterId: encounter.id },
            { patientId: encounter.patientId, encounterId: null },
          ],
          status: { not: "VOIDED" },
        },
        orderBy: { uploadedAt: "desc" },
        take: 40,
        select: {
          id: true,
          title: true,
          category: true,
          type: true,
          status: true,
          signatureStatus: true,
          uploadedAt: true,
          encounterId: true,
          signatures: {
            take: 3,
            orderBy: { signedAt: "desc" },
            select: { signerName: true, signerType: true, signedAt: true },
          },
        },
      }),
    ]);

    const nursing = (encounter.nursingAssessment ?? null) as Record<string, unknown> | null;
    const dentalEval =
      nursing && typeof nursing === "object"
        ? (nursing[D5A4A_DENTAL_CLINICAL_EVALUATION_KEY] ?? null)
        : null;
    const historyReviewRaw =
      nursing && typeof nursing === "object"
        ? (nursing[D5A5_DENTAL_HISTORY_REVIEW_KEY] as Record<string, unknown> | null | undefined)
        : null;
    const historyReview =
      historyReviewRaw && typeof historyReviewRaw === "object"
        ? {
            reviewed: Boolean(historyReviewRaw.reviewed),
            reviewedAt:
              typeof historyReviewRaw.reviewedAt === "string" ? historyReviewRaw.reviewedAt : null,
            notes:
              typeof historyReviewRaw.notes === "string" ? historyReviewRaw.notes : null,
          }
        : { reviewed: false, reviewedAt: null, notes: null };

    const currentFindings = projectCurrentToothFindings(
      findings.map((f) => ({
        id: f.id,
        toothCode: f.toothCode,
        scope: f.scope,
        surfaces: f.surfaces,
        findingType: f.findingType,
        clinicalState: f.clinicalState,
        notes: f.notes,
        documentedAt: f.documentedAt.toISOString(),
        voidedAt: f.voidedAt?.toISOString() ?? null,
        supersedesFindingId: f.supersedesFindingId,
        encounterId: f.encounterId,
      }))
    );
    const encounterFindings = currentFindings.filter((f) => f.encounterId === encounter.id);

    const perioSites = (perio?.siteMeasurements ?? []).map((s) => ({
      toothCode: s.toothCode,
      site: s.site,
      probingDepthMm: s.probingDepthMm,
      gingivalMarginMm: s.gingivalMarginMm,
      clinicalAttachmentLevelMm: s.clinicalAttachmentLevelMm,
      bleedingOnProbing: s.bleedingOnProbing,
      plaque: s.plaque,
      suppuration: s.suppuration,
      mobilityGrade: s.mobilityGrade,
      furcationGrade: s.furcationGrade,
      missingTooth: s.missingTooth,
      implantSite: s.implantSite,
      notes: s.notes,
    }));

    return {
      certificationId: D5A5_CERTIFICATION_ID,
      encounterId: encounter.id,
      patientId: encounter.patientId,
      readOnly: encounter.status !== "OPEN",
      patient: {
        id: encounter.patient.id,
        mrn: encounter.patient.mrn ?? encounter.patient.globalMrn,
        firstName: encounter.patient.firstName,
        lastName: encounter.patient.lastName,
        dateOfBirth: encounter.patient.dob?.toISOString() ?? null,
      },
      encounter: {
        status: encounter.status,
        type: encounter.type,
        serviceLine: encounter.serviceLine,
        createdAt: encounter.createdAt.toISOString(),
        closedAt: encounter.closedAt?.toISOString() ?? null,
        chiefComplaint: encounter.chiefComplaint,
        followUpDate: encounter.followUpDate?.toISOString() ?? null,
        providerDocumentationStatus: encounter.providerDocumentationStatus,
        providerDocumentationSignedAt:
          encounter.providerDocumentationSignedAt?.toISOString() ?? null,
        dentistDisplay: encounter.physicianAssigned
          ? `${encounter.physicianAssigned.firstName} ${encounter.physicianAssigned.lastName}`.trim()
          : null,
      },
      dentalEvaluation: dentalEval,
      odontogramFindings: encounterFindings,
      periodontalExam: perio
        ? {
            periodontalStatus: perio.periodontalStatus,
            periodontitisStage: perio.periodontitisStage,
            periodontitisGrade: perio.periodontitisGrade,
            extentDistribution: perio.extentDistribution,
            periImplantStatus: perio.periImplantStatus,
            narrativeAssessment: perio.narrativeAssessment,
            siteCount: perioSites.length,
            summary: summarizePeriodontalSites(perioSites),
          }
        : null,
      diagnoses: diagnoses.map((d) => ({
        id: d.id,
        code: d.code,
        description: d.description,
        status: d.status,
      })),
      treatmentPlan: plan
        ? {
            acceptanceOutcome: plan.acceptanceOutcome,
            expectedBenefits: plan.expectedBenefits,
            materialRisks: plan.materialRisks,
            reasonableAlternatives: plan.reasonableAlternatives,
            noTreatmentDiscussed: plan.noTreatmentDiscussed,
            patientQuestions: plan.patientQuestions,
            proposedTreatmentSummary: plan.proposedTreatmentSummary,
            items: plan.items.map((i) => ({
              id: i.id,
              proposedTreatment: i.proposedTreatment,
              toothCodes: i.toothCodes,
              surfaces: i.surfaces,
              phase: i.phase,
              status: i.status,
              priority: i.priority,
              problemText: i.problemText,
            })),
          }
        : null,
      procedures: procedures.map((p) => this.mapProcedure(p)),
      orders: orders.map((o) => ({
        id: o.id,
        orderType: o.type,
        status: o.status,
        displayName: o.notes,
        createdAt: o.createdAt.toISOString(),
      })),
      notes: notes.map((n) => ({
        id: n.id,
        noteType: n.noteType,
        body: n.body,
        createdAt: n.createdAt.toISOString(),
        authorDisplay: n.author
          ? `${n.author.firstName} ${n.author.lastName}`.trim()
          : null,
      })),
      addenda: providerAddenda.map((a) => ({
        id: a.id,
        text: a.text,
        createdAt: a.createdAt.toISOString(),
      })),
      historyReview,
      documents: documents.map((d) => ({
        id: d.id,
        title: d.title,
        category: d.category,
        type: d.type,
        status: d.status,
        signatureStatus: d.signatureStatus,
        uploadedAt: d.uploadedAt.toISOString(),
        encounterScoped: d.encounterId === encounter.id,
        // Treatment-plan acceptance is NOT the same as signed procedural consent.
        signers: d.signatures.map((s) => ({
          signerName: s.signerName,
          signerType: s.signerType,
          signedAt: s.signedAt.toISOString(),
        })),
      })),
      providerNote: encounter.providerNote,
      freeTextTreatmentPlan: encounter.treatmentPlan,
    };
  }

  /**
   * MEDUI.D5A.5A — encounter acknowledgement that enterprise medical history was reviewed.
   * Does not mutate longitudinal Patient clinical history.
   */
  async saveHistoryReview(
    actor: Actor,
    encounterId: string,
    body: { reviewed?: boolean; notes?: string | null }
  ) {
    this.assertView(actor.access);
    const encounter = await this.loadOpenEncounter(actor.facilityId, encounterId);
    if (
      !isDentalClinicalBoardEditable({
        access: actor.access,
        encounterStatus: encounter.status,
      })
    ) {
      throw new ForbiddenException(
        encounter.status !== "OPEN"
          ? "Closed encounters are read-only for dental clinical board."
          : "Dental clinical authoring capability required."
      );
    }
    this.assertOpenForWrite(encounter.status);

    const nursing =
      encounter.nursingAssessment &&
      typeof encounter.nursingAssessment === "object" &&
      !Array.isArray(encounter.nursingAssessment)
        ? { ...(encounter.nursingAssessment as Record<string, unknown>) }
        : {};
    const reviewed = Boolean(body.reviewed);
    nursing[D5A5_DENTAL_HISTORY_REVIEW_KEY] = {
      reviewed,
      reviewedAt: reviewed ? new Date().toISOString() : null,
      reviewedByUserId: actor.userId,
      notes: body.notes?.trim() ? body.notes.trim() : null,
      certificationId: D5A5_CERTIFICATION_ID,
    };

    await this.prisma.encounter.update({
      where: { id: encounter.id },
      data: { nursingAssessment: nursing as never, version: { increment: 1 } },
    });

    return {
      certificationId: D5A5_CERTIFICATION_ID,
      historyReview: nursing[D5A5_DENTAL_HISTORY_REVIEW_KEY],
    };
  }
}
