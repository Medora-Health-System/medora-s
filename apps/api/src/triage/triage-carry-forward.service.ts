import { Injectable, NotFoundException } from "@nestjs/common";
import { AuditAction, EncounterStatus, EncounterType } from "@prisma/client";
import {
  buildTriageCarryForwardAuditMetadata,
  emptyTriageCarryForwardDraft,
  extractCarryForwardTriageHistory,
  mergeCarryForwardIntoNewTriage,
  normalizeTriageCarryForwardMeta,
  TRIAGE_CARRY_FORWARD_VERSION,
  type TriageCarryForwardHistoryFields,
  type TriageCarryForwardMeta,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";

export type TriageCarryForwardResponse = {
  available: boolean;
  meta?: TriageCarryForwardMeta;
  allergyNote?: string;
  fields?: Partial<TriageCarryForwardHistoryFields>;
  mergedFieldKeys?: string[];
};

@Injectable()
export class TriageCarryForwardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  /**
   * Resolve carry-forward history for a new ED encounter from the patient's most recent prior ED visit.
   * Does not mutate the source encounter or create triage rows.
   */
  async resolveForEncounter(
    encounterId: string,
    facilityId: string,
    userId?: string,
    ip?: string,
    userAgent?: string
  ): Promise<TriageCarryForwardResponse> {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: {
        id: true,
        patientId: true,
        facilityId: true,
        type: true,
        status: true,
        triage: { select: { id: true } },
      },
    });

    if (!encounter) {
      throw new NotFoundException("Encounter not found");
    }

    if (encounter.type !== EncounterType.EMERGENCY) {
      return { available: false };
    }

    if (encounter.triage) {
      return { available: false };
    }

    const prior = await this.findPriorEdTriageSource(
      encounter.patientId,
      facilityId,
      encounter.id
    );

    if (!prior) {
      return { available: false };
    }

    const extraction = extractCarryForwardTriageHistory(prior);
    if (!extraction) {
      return { available: false };
    }

    const carriedForwardAt = new Date().toISOString();
    const { meta, draft, mergedFieldKeys } = mergeCarryForwardIntoNewTriage(
      emptyTriageCarryForwardDraft(),
      extraction,
      {
        version: TRIAGE_CARRY_FORWARD_VERSION,
        sourceEncounterId: prior.encounterId,
        sourceEncounterDate: prior.encounterDate,
        sourceFacilityId: prior.facilityId,
        carriedForwardAt,
        carriedForwardBy: userId,
      }
    );

    if (!mergedFieldKeys.length) {
      return { available: false };
    }

    const normalizedMeta = normalizeTriageCarryForwardMeta(meta, draft);

    await this.audit.log(AuditAction.ENCOUNTER_VIEW, "TriageCarryForward", {
      facilityId,
      userId,
      entityId: encounterId,
      ip,
      userAgent,
      metadata: buildTriageCarryForwardAuditMetadata({
        patientId: encounter.patientId,
        encounterId,
        meta: normalizedMeta,
        actorId: userId,
        timestamp: carriedForwardAt,
      }),
    });

    return {
      available: true,
      meta: normalizedMeta,
      allergyNote: draft.allergyNote || extraction.allergyNote,
      fields: draft.erV1,
      mergedFieldKeys,
    };
  }

  private async findPriorEdTriageSource(
    patientId: string,
    facilityId: string,
    excludeEncounterId: string
  ) {
    const candidates = await this.prisma.encounter.findMany({
      where: {
        patientId,
        facilityId,
        type: EncounterType.EMERGENCY,
        id: { not: excludeEncounterId },
        status: { not: EncounterStatus.CANCELLED },
        triage: { isNot: null },
      },
      orderBy: { createdAt: "desc" },
      include: {
        triage: {
          select: {
            vitalsJson: true,
            updatedAt: true,
            chiefComplaint: true,
            esi: true,
          },
        },
      },
      take: 10,
    });

    for (const row of candidates) {
      if (!row.triage?.vitalsJson) continue;
      const encounterDate = row.triage.updatedAt.toISOString();
      const source = {
        encounterId: row.id,
        patientId: row.patientId,
        facilityId: row.facilityId,
        encounterDate,
        vitalsJson: row.triage.vitalsJson,
        chiefComplaint: row.triage.chiefComplaint,
        esi: row.triage.esi,
      };
      const extraction = extractCarryForwardTriageHistory(source);
      if (!extraction) continue;
      return source;
    }

    return null;
  }
}
