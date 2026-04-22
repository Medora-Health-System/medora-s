import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import { AuditAction, EncounterStatus, InsuranceCoverageRank } from "@prisma/client";
import type { PatientInsuranceCoverageUpsertDto } from "@medora/shared";
import { logBreakGlassAccessIfApplicable } from "../common/break-glass/break-glass-audit.helper";

@Injectable()
export class PatientInsuranceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  private async assertPatientInFacility(facilityId: string, patientId: string) {
    const p = await this.prisma.patient.findFirst({
      where: { id: patientId, facilityId },
    });
    if (!p) {
      throw new NotFoundException("Patient not found");
    }
    return p;
  }

  private async assertPayerNotDuplicatedAcrossRanks(
    facilityId: string,
    patientId: string,
    rank: InsuranceCoverageRank,
    payerId: string | null,
    payerNameFreeText: string | null
  ) {
    const otherRank = rank === "PRIMARY" ? "SECONDARY" : "PRIMARY";
    const other = await this.prisma.patientInsuranceCoverage.findFirst({
      where: { patientId, facilityId, rank: otherRank },
    });
    if (!other) return;

    if (payerId && other.payerId && payerId === other.payerId) {
      throw new BadRequestException("Ce payeur est déjà utilisé sur l’autre rang (primaire / secondaire).");
    }
    const a = payerNameFreeText?.trim().toLowerCase() ?? "";
    const b = other.payerNameFreeText?.trim().toLowerCase() ?? "";
    if (a.length > 0 && a === b) {
      throw new BadRequestException("Ce nom de payeur libre est déjà utilisé sur l’autre rang.");
    }
  }

  async listCoverage(
    facilityId: string,
    patientId: string,
    userId?: string,
    ip?: string,
    userAgent?: string,
    breakGlassSessionId?: string
  ) {
    await this.assertPatientInFacility(facilityId, patientId);

    await logBreakGlassAccessIfApplicable(this.audit, {
      breakGlassSessionId,
      userId,
      facilityId,
      patientId,
      ip,
      userAgent,
      context: "patient_insurance_list",
    });

    return this.prisma.patientInsuranceCoverage.findMany({
      where: { patientId, facilityId },
      include: {
        payer: { select: { id: true, name: true, code: true } },
      },
      orderBy: { rank: "asc" },
    });
  }

  private async upsertCoverageRank(
    facilityId: string,
    patientId: string,
    rank: InsuranceCoverageRank,
    data: PatientInsuranceCoverageUpsertDto,
    userId?: string,
    ip?: string,
    userAgent?: string,
    breakGlassSessionId?: string
  ) {
    await this.assertPatientInFacility(facilityId, patientId);

    const bgContext =
      rank === "PRIMARY" ? "patient_insurance_primary_write" : "patient_insurance_secondary_write";

    await logBreakGlassAccessIfApplicable(this.audit, {
      breakGlassSessionId,
      userId,
      facilityId,
      patientId,
      ip,
      userAgent,
      context: bgContext,
    });

    if (data.payerId) {
      const payer = await this.prisma.insurancePayer.findFirst({
        where: { id: data.payerId, isActive: true },
      });
      if (!payer) {
        throw new BadRequestException("Payeur invalide ou inactif");
      }
    }

    const payerFree = data.payerNameFreeText ?? null;
    const hasPayer = Boolean(data.payerId) || Boolean(payerFree);
    const hasAncillary = Boolean(
      data.planName ||
        data.memberId ||
        data.policyNumber ||
        data.groupNumber ||
        data.subscriberName ||
        data.relationToSubscriber ||
        data.phone ||
        data.notes
    );

    const hasDetail = hasPayer || hasAncillary;

    if (data.clear === true || !hasDetail) {
      if (rank === "PRIMARY") {
        const hadSecondary = await this.prisma.patientInsuranceCoverage.findFirst({
          where: { patientId, facilityId, rank: "SECONDARY" },
        });
        await this.prisma.patientInsuranceCoverage.deleteMany({
          where: { patientId, facilityId, rank: { in: ["PRIMARY", "SECONDARY"] } },
        });
        await this.audit.log(AuditAction.PATIENT_UPDATE, "PATIENT", {
          userId,
          facilityId,
          patientId,
          entityId: patientId,
          ip,
          userAgent,
          metadata: {
            insuranceRank: "PRIMARY",
            insurancePrimaryCleared: true,
            insuranceSecondaryCleared: Boolean(hadSecondary),
            payerPresent: false,
            freeTextPresent: false,
            ...(breakGlassSessionId ? { breakGlassSessionId } : {}),
          },
        });
        return null;
      }

      await this.prisma.patientInsuranceCoverage.deleteMany({
        where: { patientId, facilityId, rank: "SECONDARY" },
      });
      await this.audit.log(AuditAction.PATIENT_UPDATE, "PATIENT", {
        userId,
        facilityId,
        patientId,
        entityId: patientId,
        ip,
        userAgent,
        metadata: {
          insuranceRank: "SECONDARY",
          insuranceSecondaryCleared: true,
          payerPresent: false,
          freeTextPresent: false,
          ...(breakGlassSessionId ? { breakGlassSessionId } : {}),
        },
      });
      return null;
    }

    if (!hasPayer) {
      throw new BadRequestException("Payeur requis (catalogue ou nom libre).");
    }

    if (rank === "SECONDARY") {
      const primaryRow = await this.prisma.patientInsuranceCoverage.findFirst({
        where: { patientId, facilityId, rank: "PRIMARY" },
      });
      if (!primaryRow) {
        throw new BadRequestException("Ajoutez d’abord une assurance primaire.");
      }
    }

    await this.assertPayerNotDuplicatedAcrossRanks(
      facilityId,
      patientId,
      rank,
      data.payerId ?? null,
      payerFree
    );

    const row = await this.prisma.patientInsuranceCoverage.upsert({
      where: {
        patientId_facilityId_rank: {
          patientId,
          facilityId,
          rank,
        },
      },
      create: {
        patientId,
        facilityId,
        rank,
        payerId: data.payerId ?? null,
        payerNameFreeText: payerFree,
        planName: data.planName ?? null,
        memberId: data.memberId ?? null,
        policyNumber: data.policyNumber ?? null,
        groupNumber: data.groupNumber ?? null,
        subscriberName: data.subscriberName ?? null,
        relationToSubscriber: data.relationToSubscriber ?? null,
        phone: data.phone ?? null,
        notes: data.notes ?? null,
        effectiveFrom: data.effectiveFrom ?? null,
        effectiveTo: data.effectiveTo ?? null,
        isActive: data.isActive ?? true,
      },
      update: {
        payerId: data.payerId ?? null,
        payerNameFreeText: payerFree,
        planName: data.planName ?? null,
        memberId: data.memberId ?? null,
        policyNumber: data.policyNumber ?? null,
        groupNumber: data.groupNumber ?? null,
        subscriberName: data.subscriberName ?? null,
        relationToSubscriber: data.relationToSubscriber ?? null,
        phone: data.phone ?? null,
        notes: data.notes ?? null,
        effectiveFrom: data.effectiveFrom ?? null,
        effectiveTo: data.effectiveTo ?? null,
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
      include: {
        payer: { select: { id: true, name: true, code: true } },
      },
    });

    await this.audit.log(AuditAction.PATIENT_UPDATE, "PATIENT", {
      userId,
      facilityId,
      patientId,
      entityId: patientId,
      ip,
      userAgent,
      metadata: {
        insuranceRank: rank,
        insuranceUpsert: true,
        payerPresent: Boolean(data.payerId),
        freeTextPresent: Boolean(payerFree),
        ...(breakGlassSessionId ? { breakGlassSessionId } : {}),
      },
    });

    return row;
  }

  async upsertPrimaryCoverage(
    facilityId: string,
    patientId: string,
    data: PatientInsuranceCoverageUpsertDto,
    userId?: string,
    ip?: string,
    userAgent?: string,
    breakGlassSessionId?: string
  ) {
    const row = await this.upsertCoverageRank(
      facilityId,
      patientId,
      "PRIMARY",
      data,
      userId,
      ip,
      userAgent,
      breakGlassSessionId
    );
    return { primary: row };
  }

  async upsertSecondaryCoverage(
    facilityId: string,
    patientId: string,
    data: PatientInsuranceCoverageUpsertDto,
    userId?: string,
    ip?: string,
    userAgent?: string,
    breakGlassSessionId?: string
  ) {
    const row = await this.upsertCoverageRank(
      facilityId,
      patientId,
      "SECONDARY",
      data,
      userId,
      ip,
      userAgent,
      breakGlassSessionId
    );
    return { secondary: row };
  }

  async getFacesheet(
    facilityId: string,
    patientId: string,
    userId?: string,
    ip?: string,
    userAgent?: string,
    breakGlassSessionId?: string
  ) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, facilityId },
    });
    if (!patient) {
      throw new NotFoundException("Patient not found");
    }

    await logBreakGlassAccessIfApplicable(this.audit, {
      breakGlassSessionId,
      userId,
      facilityId,
      patientId,
      ip,
      userAgent,
      context: "patient_facesheet",
    });

    await this.audit.log(AuditAction.PATIENT_VIEW, "PATIENT", {
      userId,
      facilityId,
      patientId,
      entityId: patientId,
      ip,
      userAgent,
      metadata: { facesheet: true },
    });

    const [primaryCoverage, secondaryCoverage] = await Promise.all([
      this.prisma.patientInsuranceCoverage.findFirst({
        where: { patientId, facilityId, rank: "PRIMARY" },
        include: {
          payer: { select: { id: true, name: true, code: true } },
        },
      }),
      this.prisma.patientInsuranceCoverage.findFirst({
        where: { patientId, facilityId, rank: "SECONDARY" },
        include: {
          payer: { select: { id: true, name: true, code: true } },
        },
      }),
    ]);

    const activeEncounter = await this.prisma.encounter.findFirst({
      where: { patientId, facilityId, status: EncounterStatus.OPEN },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        status: true,
        workflowState: true,
        chiefComplaint: true,
        roomLabel: true,
        triageAcuity: true,
        createdAt: true,
      },
    });

    return {
      patient,
      primaryCoverage,
      secondaryCoverage,
      activeEncounter,
    };
  }
}
