import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import { AuditAction, type Triage } from "@prisma/client";
import { hasNonEmptyVitalsJson } from "../utils/patient-sex-map";
import { assertEncounterNotSigned } from "../encounters/encounter-sign-lock.util";

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

    const row = await this.prisma.triage.findUnique({
      where: { encounterId },
    });
    return this.enrichTriageWithDisplay(row);
  }

  /** Ajoute `updatedByDisplayFr` pour l’UI (sans changement de schéma). */
  private async enrichTriageWithDisplay(triage: Triage | null) {
    if (!triage) {
      return null;
    }
    if (!triage.updatedByUserId) {
      return triage;
    }
    const u = await this.prisma.user.findUnique({
      where: { id: triage.updatedByUserId },
      select: { firstName: true, lastName: true },
    });
    if (!u) {
      return { ...triage, updatedByDisplayFr: null };
    }
    return { ...triage, updatedByDisplayFr: `${u.firstName} ${u.lastName}`.trim() };
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

    assertEncounterNotSigned(encounter);

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
      await this.prisma.triageVitalsReading.create({
        data: {
          facilityId,
          patientId: encounter.patientId,
          encounterId,
          triageId: triage.id,
          vitalsJson: data.vitalsJson as object,
          triageCompleteAt: data.triageCompleteAt ?? null,
        },
      });
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

    return this.enrichTriageWithDisplay(triage);
  }
}

