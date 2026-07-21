import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuditAction } from "@prisma/client";
import {
  hospitalEpisodeFoundationEnabledFromProcessEnv,
  projectHospitalEpisodeState,
  validateHospitalEpisodeEncounterEligibility,
  type HospitalEpisodeEligibilityResult,
  type HospitalEpisodeStateProjection,
} from "@medora/shared";
import { AuditService } from "../common/services/audit.service";
import { PrismaService } from "../prisma/prisma.service";

export const HOSPITAL_EPISODE_ENTITY = "HospitalEpisode" as const;

export type CreateHospitalEpisodeResult = {
  episode: HospitalEpisodeStateProjection;
  created: boolean;
  eligibility: HospitalEpisodeEligibilityResult;
};

type EncounterEligibilityRow = {
  id: string;
  facilityId: string;
  patientId: string;
  type: string;
  status: string;
  version: number;
  hospitalEpisodeId: string | null;
  nursingAssessment: unknown;
  dischargeSummaryJson: unknown;
  admissionSummaryJson: unknown;
};

/**
 * D3B — narrowly scoped HospitalEpisode foundation.
 * Feature flag OFF by default: no automatic production creation.
 * Does not replace ED type-flip admission (temporary coexistence until D3C).
 */
@Injectable()
export class HospitalEpisodeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  isFoundationEnabled(processEnv: NodeJS.ProcessEnv = process.env): boolean {
    return hospitalEpisodeFoundationEnabledFromProcessEnv(processEnv);
  }

  async validateEncounterEligibility(
    facilityId: string,
    encounterId: string,
    options?: { featureFlagEnabled?: boolean }
  ): Promise<HospitalEpisodeEligibilityResult> {
    const encounter = await this.loadEncounterForFacility(facilityId, encounterId);
    return this.eligibilityForEncounter(encounter, {
      featureFlagEnabled: options?.featureFlagEnabled ?? this.isFoundationEnabled(),
    });
  }

  async getEpisodeById(
    facilityId: string,
    episodeId: string
  ): Promise<HospitalEpisodeStateProjection | null> {
    const row = await this.prisma.hospitalEpisode.findFirst({
      where: { id: episodeId, facilityId },
      include: { encounters: { select: { id: true } } },
    });
    return projectHospitalEpisodeState(row);
  }

  async getEpisodeForEncounter(
    facilityId: string,
    encounterId: string
  ): Promise<HospitalEpisodeStateProjection | null> {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: { hospitalEpisodeId: true },
    });
    if (!encounter) {
      throw new NotFoundException("Encounter not found");
    }
    if (!encounter.hospitalEpisodeId) return null;
    return this.getEpisodeById(facilityId, encounter.hospitalEpisodeId);
  }

  async listEpisodeEncounters(
    facilityId: string,
    episodeId: string
  ): Promise<Array<{ id: string; type: string; status: string; patientId: string; facilityId: string }>> {
    const episode = await this.prisma.hospitalEpisode.findFirst({
      where: { id: episodeId, facilityId },
      select: { id: true },
    });
    if (!episode) {
      throw new NotFoundException("Hospital episode not found");
    }
    return this.prisma.encounter.findMany({
      where: { hospitalEpisodeId: episodeId, facilityId },
      select: { id: true, type: true, status: true, patientId: true, facilityId: true },
      orderBy: { createdAt: "asc" },
    });
  }

  projectEpisodeState(row: Parameters<typeof projectHospitalEpisodeState>[0]): HospitalEpisodeStateProjection | null {
    return projectHospitalEpisodeState(row);
  }

  /**
   * Controlled create + link for an eligible ED encounter.
   * Idempotent on originatingEncounterId / already-linked encounter.
   * Does not mutate Encounter.type (type-flip remains until D3C).
   */
  async createEpisodeForEncounter(
    facilityId: string,
    encounterId: string,
    actorUserId: string | undefined,
    options?: {
      /** Test-only override; production must rely on env flag. */
      featureFlagEnabled?: boolean;
      /**
       * D3C — when creating from InternalPlacementRequest → REQUESTED,
       * disposition-sign eligibility may be deferred; still requires open ED + facility/patient match.
       */
      fromInternalPlacementRequest?: boolean;
      expectedPatientId?: string;
      ip?: string;
      userAgent?: string;
    }
  ): Promise<CreateHospitalEpisodeResult> {
    if (!facilityId?.trim()) {
      throw new ForbiddenException("Facility scope required");
    }
    if (options?.featureFlagEnabled !== true && !this.isFoundationEnabled()) {
      throw new ForbiddenException("Hospital episode foundation is disabled");
    }

    const encounter = await this.loadEncounterForFacility(facilityId, encounterId);
    if (options?.expectedPatientId && options.expectedPatientId !== encounter.patientId) {
      throw new ForbiddenException("Patient mismatch");
    }

    const eligibility = this.eligibilityForEncounter(encounter, {
      featureFlagEnabled: true,
      expectedFacilityId: facilityId,
      expectedPatientId: options?.expectedPatientId,
    });

    // Idempotent: already linked → return existing episode projection.
    if (encounter.hospitalEpisodeId) {
      const existing = await this.getEpisodeById(facilityId, encounter.hospitalEpisodeId);
      if (!existing) {
        throw new ConflictException("Encounter linked to missing hospital episode");
      }
      await this.audit.log(AuditAction.VIEW, HOSPITAL_EPISODE_ENTITY, {
        userId: actorUserId,
        facilityId,
        patientId: encounter.patientId,
        encounterId: encounter.id,
        entityId: existing.id,
        critical: false,
        ip: options?.ip,
        userAgent: options?.userAgent,
        metadata: {
          event: "HOSPITAL_EPISODE_CREATE_IDEMPOTENT_ALREADY_LINKED",
          version: existing.version,
          sourceEncounterId: encounter.id,
        },
      });
      return { episode: existing, created: false, eligibility };
    }

    if (!eligibility.eligible) {
      const placementBypassOk =
        options?.fromInternalPlacementRequest === true &&
        encounter.type === "EMERGENCY" &&
        encounter.status === "OPEN" &&
        eligibility.denialReason !== "PATIENT_FACILITY_MISMATCH" &&
        eligibility.denialReason !== "ENCOUNTER_MISSING";
      if (!placementBypassOk) {
        await this.audit.log(AuditAction.VIEW, HOSPITAL_EPISODE_ENTITY, {
          userId: actorUserId,
          facilityId,
          patientId: encounter.patientId,
          encounterId: encounter.id,
          critical: false,
          ip: options?.ip,
          userAgent: options?.userAgent,
          metadata: {
            event: "HOSPITAL_EPISODE_CREATE_REJECTED",
            denialReason: eligibility.denialReason,
            sourceEncounterId: encounter.id,
          },
        });
        throw new BadRequestException(
          `Encounter not eligible for hospital episode: ${eligibility.denialReason ?? "UNKNOWN"}`
        );
      }
    }

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const fresh = await tx.encounter.findFirst({
          where: { id: encounterId, facilityId },
          select: {
            id: true,
            facilityId: true,
            patientId: true,
            hospitalEpisodeId: true,
            version: true,
            type: true,
            status: true,
            nursingAssessment: true,
            dischargeSummaryJson: true,
            admissionSummaryJson: true,
          },
        });
        if (!fresh) {
          throw new NotFoundException("Encounter not found");
        }
        if (fresh.version !== encounter.version) {
          throw new ConflictException("Encounter version changed");
        }
        if (fresh.hospitalEpisodeId) {
          const linked = await tx.hospitalEpisode.findFirst({
            where: { id: fresh.hospitalEpisodeId, facilityId },
            include: { encounters: { select: { id: true } } },
          });
          if (!linked) {
            throw new ConflictException("Encounter linked to missing hospital episode");
          }
          return { row: linked, created: false as const };
        }

        const byOrigin = await tx.hospitalEpisode.findUnique({
          where: { originatingEncounterId: fresh.id },
          include: { encounters: { select: { id: true } } },
        });
        if (byOrigin) {
          if (byOrigin.facilityId !== facilityId) {
            throw new ForbiddenException("Facility scope violation");
          }
          if (!fresh.hospitalEpisodeId) {
            await tx.encounter.update({
              where: { id: fresh.id },
              data: { hospitalEpisodeId: byOrigin.id, version: { increment: 1 } },
            });
            await this.audit.log(AuditAction.UPDATE, HOSPITAL_EPISODE_ENTITY, {
              tx,
              userId: actorUserId,
              facilityId,
              patientId: fresh.patientId,
              encounterId: fresh.id,
              entityId: byOrigin.id,
              critical: true,
              ip: options?.ip,
              userAgent: options?.userAgent,
              metadata: {
                event: "HOSPITAL_EPISODE_LINK_IDEMPOTENT_ORIGIN",
                version: byOrigin.version,
                sourceEncounterId: fresh.id,
              },
            });
          }
          const refreshed = await tx.hospitalEpisode.findFirst({
            where: { id: byOrigin.id, facilityId },
            include: { encounters: { select: { id: true } } },
          });
          return { row: refreshed!, created: false as const };
        }

        const activeOther = await tx.hospitalEpisode.findFirst({
          where: {
            facilityId,
            patientId: fresh.patientId,
            status: "ACTIVE",
          },
          select: { id: true },
        });
        if (activeOther) {
          await this.audit.log(AuditAction.VIEW, HOSPITAL_EPISODE_ENTITY, {
            tx,
            userId: actorUserId,
            facilityId,
            patientId: fresh.patientId,
            encounterId: fresh.id,
            entityId: activeOther.id,
            critical: false,
            ip: options?.ip,
            userAgent: options?.userAgent,
            metadata: {
              event: "HOSPITAL_EPISODE_DUPLICATE_ACTIVE_REJECTED",
              existingEpisodeId: activeOther.id,
              sourceEncounterId: fresh.id,
            },
          });
          throw new ConflictException(
            "Active hospital episode already exists for this patient at this facility"
          );
        }

        const episode = await tx.hospitalEpisode.create({
          data: {
            facilityId: fresh.facilityId,
            patientId: fresh.patientId,
            status: "ACTIVE",
            originatingEncounterId: fresh.id,
            version: 1,
            createdByUserId: actorUserId ?? null,
            updatedByUserId: actorUserId ?? null,
          },
        });

        await tx.encounter.update({
          where: { id: fresh.id },
          data: {
            hospitalEpisodeId: episode.id,
            version: { increment: 1 },
          },
        });

        await this.audit.log(AuditAction.CREATE, HOSPITAL_EPISODE_ENTITY, {
          tx,
          userId: actorUserId,
          facilityId,
          patientId: fresh.patientId,
          encounterId: fresh.id,
          entityId: episode.id,
          critical: true,
          ip: options?.ip,
          userAgent: options?.userAgent,
          metadata: {
            event: "HOSPITAL_EPISODE_CREATED",
            version: episode.version,
            sourceEncounterId: fresh.id,
            internalPlacementKind: eligibility.internalPlacementKind,
          },
        });

        const withEncounters = await tx.hospitalEpisode.findFirst({
          where: { id: episode.id, facilityId },
          include: { encounters: { select: { id: true } } },
        });
        return { row: withEncounters!, created: true as const };
      });

      const projection = projectHospitalEpisodeState(created.row);
      if (!projection) {
        throw new ConflictException("Failed to project hospital episode");
      }
      return { episode: projection, created: created.created, eligibility };
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        const recovered = await this.prisma.hospitalEpisode.findUnique({
          where: { originatingEncounterId: encounterId },
          include: { encounters: { select: { id: true } } },
        });
        if (recovered && recovered.facilityId === facilityId) {
          const projection = projectHospitalEpisodeState(recovered);
          if (projection) {
            await this.audit.log(AuditAction.VIEW, HOSPITAL_EPISODE_ENTITY, {
              userId: actorUserId,
              facilityId,
              patientId: recovered.patientId,
              encounterId,
              entityId: recovered.id,
              critical: false,
              ip: options?.ip,
              userAgent: options?.userAgent,
              metadata: {
                event: "HOSPITAL_EPISODE_CREATE_RACE_IDEMPOTENT",
                version: recovered.version,
                sourceEncounterId: encounterId,
              },
            });
            return { episode: projection, created: false, eligibility };
          }
        }
      }
      throw error;
    }
  }

  /**
   * Link an additional encounter into an existing ACTIVE episode (future Obs/IP).
   * Same patient + facility required. Does not create episodes.
   */
  async safelyLinkEncounter(
    facilityId: string,
    episodeId: string,
    encounterId: string,
    actorUserId: string | undefined,
    options?: { expectedVersion?: number; ip?: string; userAgent?: string }
  ): Promise<HospitalEpisodeStateProjection> {
    if (!this.isFoundationEnabled()) {
      throw new ForbiddenException("Hospital episode foundation is disabled");
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const episode = await tx.hospitalEpisode.findFirst({
        where: { id: episodeId, facilityId },
      });
      if (!episode) {
        throw new NotFoundException("Hospital episode not found");
      }
      if (episode.status !== "ACTIVE") {
        throw new BadRequestException("Hospital episode is not ACTIVE");
      }
      if (
        options?.expectedVersion != null &&
        options.expectedVersion !== episode.version
      ) {
        throw new ConflictException("Hospital episode version changed");
      }

      const encounter = await tx.encounter.findFirst({
        where: { id: encounterId, facilityId },
        select: {
          id: true,
          facilityId: true,
          patientId: true,
          hospitalEpisodeId: true,
          version: true,
        },
      });
      if (!encounter) {
        throw new NotFoundException("Encounter not found");
      }
      if (encounter.patientId !== episode.patientId || encounter.facilityId !== episode.facilityId) {
        await this.audit.log(AuditAction.VIEW, HOSPITAL_EPISODE_ENTITY, {
          tx,
          userId: actorUserId,
          facilityId,
          patientId: episode.patientId,
          encounterId: encounter.id,
          entityId: episode.id,
          critical: false,
          ip: options?.ip,
          userAgent: options?.userAgent,
          metadata: {
            event: "HOSPITAL_EPISODE_LINK_REJECTED_MISMATCH",
            sourceEncounterId: encounter.id,
            version: episode.version,
          },
        });
        throw new ForbiddenException("Patient or facility mismatch");
      }
      if (encounter.hospitalEpisodeId && encounter.hospitalEpisodeId !== episode.id) {
        await this.audit.log(AuditAction.VIEW, HOSPITAL_EPISODE_ENTITY, {
          tx,
          userId: actorUserId,
          facilityId,
          patientId: episode.patientId,
          encounterId: encounter.id,
          entityId: episode.id,
          critical: false,
          ip: options?.ip,
          userAgent: options?.userAgent,
          metadata: {
            event: "HOSPITAL_EPISODE_LINK_REJECTED_DUPLICATE",
            existingEpisodeId: encounter.hospitalEpisodeId,
            sourceEncounterId: encounter.id,
            version: episode.version,
          },
        });
        throw new ConflictException("Encounter already linked to another hospital episode");
      }
      if (encounter.hospitalEpisodeId === episode.id) {
        const current = await tx.hospitalEpisode.findFirst({
          where: { id: episode.id, facilityId },
          include: { encounters: { select: { id: true } } },
        });
        return current!;
      }

      await tx.encounter.update({
        where: { id: encounter.id },
        data: {
          hospitalEpisodeId: episode.id,
          version: { increment: 1 },
        },
      });
      const updated = await tx.hospitalEpisode.update({
        where: { id: episode.id },
        data: {
          version: { increment: 1 },
          updatedByUserId: actorUserId ?? null,
        },
        include: { encounters: { select: { id: true } } },
      });

      await this.audit.log(AuditAction.UPDATE, HOSPITAL_EPISODE_ENTITY, {
        tx,
        userId: actorUserId,
        facilityId,
        patientId: episode.patientId,
        encounterId: encounter.id,
        entityId: episode.id,
        critical: true,
        ip: options?.ip,
        userAgent: options?.userAgent,
        metadata: {
          event: "HOSPITAL_EPISODE_ENCOUNTER_LINKED",
          version: updated.version,
          sourceEncounterId: encounter.id,
        },
      });

      return updated;
    });

    const projection = projectHospitalEpisodeState(result);
    if (!projection) {
      throw new ConflictException("Failed to project hospital episode");
    }
    return projection;
  }

  /**
   * Documented invariant for D3B/D3C tests: ED close must not close the episode.
   * No production close hook is wired in D3B.
   */
  assertEpisodeRemainsActiveIndependentOfEdClose(params: {
    episodeStatus: string;
    encounterStatus: string;
  }): boolean {
    return (
      String(params.episodeStatus).toUpperCase() === "ACTIVE" &&
      String(params.encounterStatus).toUpperCase() === "CLOSED"
    );
  }

  private eligibilityForEncounter(
    encounter: EncounterEligibilityRow,
    opts: {
      featureFlagEnabled: boolean;
      expectedFacilityId?: string;
      expectedPatientId?: string;
    }
  ): HospitalEpisodeEligibilityResult {
    return validateHospitalEpisodeEncounterEligibility({
      id: encounter.id,
      facilityId: encounter.facilityId,
      patientId: encounter.patientId,
      type: encounter.type,
      status: encounter.status,
      hospitalEpisodeId: encounter.hospitalEpisodeId,
      nursingAssessment: encounter.nursingAssessment,
      dischargeSummaryJson: encounter.dischargeSummaryJson,
      admissionSummaryJson: encounter.admissionSummaryJson,
      featureFlagEnabled: opts.featureFlagEnabled,
      expectedFacilityId: opts.expectedFacilityId,
      expectedPatientId: opts.expectedPatientId,
    });
  }

  private async loadEncounterForFacility(
    facilityId: string,
    encounterId: string
  ): Promise<EncounterEligibilityRow> {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: {
        id: true,
        facilityId: true,
        patientId: true,
        type: true,
        status: true,
        version: true,
        hospitalEpisodeId: true,
        nursingAssessment: true,
        dischargeSummaryJson: true,
        admissionSummaryJson: true,
      },
    });
    if (!encounter) {
      throw new NotFoundException("Encounter not found");
    }
    return encounter as EncounterEligibilityRow;
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    );
  }
}
