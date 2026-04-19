import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import { AuditAction, EncounterStatus } from "@prisma/client";
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

  async upsertPrimaryCoverage(
    facilityId: string,
    patientId: string,
    data: PatientInsuranceCoverageUpsertDto,
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
      context: "patient_insurance_primary_write",
    });

    if (data.payerId) {
      const payer = await this.prisma.insurancePayer.findFirst({
        where: { id: data.payerId, isActive: true },
      });
      if (!payer) {
        throw new BadRequestException("Payeur invalide ou inactif");
      }
    }

    const hasDetail =
      Boolean(data.payerId) ||
      Boolean(data.payerNameFreeText?.trim()) ||
      Boolean(data.planName?.trim()) ||
      Boolean(data.memberId?.trim()) ||
      Boolean(data.groupNumber?.trim()) ||
      Boolean(data.subscriberName?.trim()) ||
      Boolean(data.relationToSubscriber?.trim()) ||
      Boolean(data.phone?.trim()) ||
      Boolean(data.notes?.trim());

    if (data.clear === true || !hasDetail) {
      await this.prisma.patientInsuranceCoverage.deleteMany({
        where: { patientId, facilityId, rank: "PRIMARY" },
      });
      await this.audit.log(AuditAction.PATIENT_UPDATE, "PATIENT", {
        userId,
        facilityId,
        patientId,
        entityId: patientId,
        ip,
        userAgent,
        metadata: {
          insurancePrimaryCleared: true,
          ...(breakGlassSessionId ? { breakGlassSessionId } : {}),
        },
      });
      return { primary: null };
    }

    const row = await this.prisma.patientInsuranceCoverage.upsert({
      where: {
        patientId_facilityId_rank: {
          patientId,
          facilityId,
          rank: "PRIMARY",
        },
      },
      create: {
        patientId,
        facilityId,
        rank: "PRIMARY",
        payerId: data.payerId ?? null,
        payerNameFreeText: data.payerNameFreeText?.trim() || null,
        planName: data.planName?.trim() || null,
        memberId: data.memberId?.trim() || null,
        groupNumber: data.groupNumber?.trim() || null,
        subscriberName: data.subscriberName?.trim() || null,
        relationToSubscriber: data.relationToSubscriber?.trim() || null,
        phone: data.phone?.trim() || null,
        notes: data.notes?.trim() || null,
      },
      update: {
        payerId: data.payerId ?? null,
        payerNameFreeText: data.payerNameFreeText?.trim() || null,
        planName: data.planName?.trim() || null,
        memberId: data.memberId?.trim() || null,
        groupNumber: data.groupNumber?.trim() || null,
        subscriberName: data.subscriberName?.trim() || null,
        relationToSubscriber: data.relationToSubscriber?.trim() || null,
        phone: data.phone?.trim() || null,
        notes: data.notes?.trim() || null,
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
        insurancePrimaryUpsert: true,
        ...(breakGlassSessionId ? { breakGlassSessionId } : {}),
      },
    });

    return { primary: row };
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

    const primaryCoverage = await this.prisma.patientInsuranceCoverage.findFirst({
      where: { patientId, facilityId, rank: "PRIMARY" },
      include: {
        payer: { select: { id: true, name: true, code: true } },
      },
    });

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
      activeEncounter,
    };
  }
}
