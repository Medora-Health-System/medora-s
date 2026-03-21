import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import { AuditAction } from "@prisma/client";
import { hasNonEmptyVitalsJson } from "../utils/patient-sex-map";

@Injectable()
export class TriageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async getTriage(encounterId: string, facilityId: string) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
    });

    if (!encounter) {
      throw new NotFoundException("Encounter not found");
    }

    return this.prisma.triage.findUnique({
      where: { encounterId },
    });
  }

  async upsertTriage(
    encounterId: string,
    facilityId: string,
    data: {
      chiefComplaint?: string;
      onsetAt?: Date | null;
      esi?: number | null;
      vitalsJson?: any;
      strokeScreen?: any;
      sepsisScreen?: any;
      triageCompleteAt?: Date | null;
    },
    userId?: string,
    ip?: string,
    userAgent?: string
  ) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      include: { patient: true },
    });

    if (!encounter) {
      throw new NotFoundException("Encounter not found");
    }

    const existing = await this.prisma.triage.findUnique({
      where: { encounterId },
    });

    const triageData: any = {
      encounterId,
      facilityId,
      chiefComplaint: data.chiefComplaint,
      onsetAt: data.onsetAt,
      esi: data.esi,
      vitalsJson: data.vitalsJson,
      strokeScreen: data.strokeScreen,
      sepsisScreen: data.sepsisScreen,
      triageCompleteAt: data.triageCompleteAt,
      updatedByUserId: userId,
    };

    if (!existing) {
      triageData.createdByUserId = userId;
    }

    const triage = await this.prisma.triage.upsert({
      where: { encounterId },
      update: triageData,
      create: triageData,
    });

    if (data.vitalsJson !== undefined && hasNonEmptyVitalsJson(data.vitalsJson)) {
      await this.prisma.patient.update({
        where: { id: encounter.patientId },
        data: {
          latestVitalsJson: data.vitalsJson as object,
          latestVitalsAt: new Date(),
        },
      });
    }

    await this.audit.log(AuditAction.TRIAGE_SAVE, "TRIAGE", {
      userId,
      facilityId,
      patientId: encounter.patientId,
      encounterId,
      entityId: triage.id,
      ip,
      userAgent,
      metadata: { esi: data.esi, complete: !!data.triageCompleteAt },
    });

    return triage;
  }
}

