/**
 * D3C — InternalPlacementRequest lifecycle foundation.
 * Feature flags OFF by default. Does not query from Trackboard when OFF.
 * Receiving encounter created only at ARRIVED_DESTINATION when receiving flag ON.
 */

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuditAction, EncounterStatus, EncounterType, Prisma } from "@prisma/client";
import {
  internalPlacementWorkflowEnabledFromProcessEnv,
  projectInternalPlacementState,
  receivingEncounterFoundationEnabledFromProcessEnv,
  validateInternalPlacementClinicalRequestForSign,
  validateInternalPlacementTransition,
  InternalPlacementActorRole,
  InternalPlacementStatus,
  ReceivingEncounterLifecycle,
  type InternalPlacementStateProjection,
} from "@medora/shared";
import { AuditService } from "../common/services/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { HospitalEpisodeService } from "./hospital-episode.service";

export const INTERNAL_PLACEMENT_ENTITY = "InternalPlacementRequest" as const;

const PLACEMENT_SELECT = {
  id: true,
  facilityId: true,
  patientId: true,
  hospitalEpisodeId: true,
  originatingEncounterId: true,
  receivingEncounterId: true,
  receivingEncounterLifecycle: true,
  requestedEncounterType: true,
  requestedLevelOfCare: true,
  requestedService: true,
  status: true,
  clinicalPriority: true,
  admissionDiagnosisSummary: true,
  reasonForPlacement: true,
  telemetryRequired: true,
  isolationRequired: true,
  isolationType: true,
  acceptingProviderNameSnapshot: true,
  assignedUnitCode: true,
  assignedRoomKey: true,
  assignedBedKey: true,
  readyForTransferAt: true,
  departedEdAt: true,
  arrivedDestinationAt: true,
  requestedAt: true,
  createdAt: true,
  version: true,
  revision: true,
} satisfies Prisma.InternalPlacementRequestSelect;

/** Facility placement queue / admissions board — still excludes terminal noise except recent arrivals. */
const QUEUE_ACTIVE_STATUSES = [
  InternalPlacementStatus.SIGNED,
  InternalPlacementStatus.REQUESTED,
  InternalPlacementStatus.UNDER_REVIEW,
  InternalPlacementStatus.ACCEPTED,
  InternalPlacementStatus.BED_ASSIGNED,
  InternalPlacementStatus.READY_FOR_TRANSFER,
  InternalPlacementStatus.DEPARTED_ED,
  InternalPlacementStatus.ARRIVED_DESTINATION,
] as const;

const QUEUE_LIST_SELECT = {
  ...PLACEMENT_SELECT,
  patient: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      mrn: true,
      dob: true,
      sexAtBirth: true,
    },
  },
} satisfies Prisma.InternalPlacementRequestSelect;

export type ClinicalPlacementDraftInput = {
  requestedEncounterType: "OBSERVATION" | "INPATIENT";
  requestedLevelOfCare?: string | null;
  requestedService?: string | null;
  requestedSpecialty?: string | null;
  requestedUnitCode?: string | null;
  clinicalPriority?: string | null;
  admissionDiagnosisSummary?: string | null;
  reasonForPlacement?: string | null;
  telemetryRequired?: boolean;
  isolationRequired?: boolean;
  isolationType?: string | null;
  specialPlacementNeedsJson?: Prisma.InputJsonValue | null;
  acceptingProviderNameSnapshot?: string | null;
  expectedVersion?: number;
};

@Injectable()
export class InternalPlacementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly hospitalEpisodes: HospitalEpisodeService
  ) {}

  isWorkflowEnabled(processEnv: NodeJS.ProcessEnv = process.env): boolean {
    return internalPlacementWorkflowEnabledFromProcessEnv(processEnv);
  }

  isReceivingFoundationEnabled(processEnv: NodeJS.ProcessEnv = process.env): boolean {
    return receivingEncounterFoundationEnabledFromProcessEnv(processEnv);
  }

  private assertWorkflowEnabled(options?: { featureFlagEnabled?: boolean }): void {
    if (options?.featureFlagEnabled !== true && !this.isWorkflowEnabled()) {
      throw new ForbiddenException("Internal placement workflow is disabled");
    }
  }

  /**
   * D3CA — read-only facility placement queue (no mutations).
   * Flag OFF → empty list (UI shows empty states; does not throw for home widgets).
   */
  async listFacilityQueue(
    facilityId: string,
    options?: {
      featureFlagEnabled?: boolean;
      /** When true, throw if flag OFF (strict API). Default: soft-empty. */
      strict?: boolean;
      take?: number;
    }
  ): Promise<
    Array<
      NonNullable<InternalPlacementStateProjection> & {
        patient: {
          id: string;
          firstName: string | null;
          lastName: string | null;
          mrn: string | null;
          dob: Date | null;
          sexAtBirth: string | null;
        };
        requestedAt: string | null;
        createdAt: string;
      }
    >
  > {
    const enabled =
      options?.featureFlagEnabled === true || this.isWorkflowEnabled();
    if (!enabled) {
      if (options?.strict) {
        this.assertWorkflowEnabled(options);
      }
      return [];
    }

    const take = Math.min(Math.max(options?.take ?? 100, 1), 200);
    const rows = await this.prisma.internalPlacementRequest.findMany({
      where: {
        facilityId,
        status: { in: [...QUEUE_ACTIVE_STATUSES] },
      },
      select: QUEUE_LIST_SELECT,
      orderBy: [{ requestedAt: "desc" }, { createdAt: "desc" }],
      take,
    });

    return rows.map((row) => {
      const projected = projectInternalPlacementState(row)!;
      return {
        ...projected,
        patient: row.patient,
        requestedAt: row.requestedAt ? row.requestedAt.toISOString() : null,
        createdAt: row.createdAt.toISOString(),
      };
    });
  }

  async getActiveForEncounter(
    facilityId: string,
    encounterId: string,
    options?: { featureFlagEnabled?: boolean }
  ): Promise<InternalPlacementStateProjection | null> {
    if (options?.featureFlagEnabled !== true && !this.isWorkflowEnabled()) {
      return null;
    }
    const row = await this.prisma.internalPlacementRequest.findFirst({
      where: {
        facilityId,
        originatingEncounterId: encounterId,
        status: {
          notIn: [
            InternalPlacementStatus.CANCELLED,
            InternalPlacementStatus.DECLINED,
            InternalPlacementStatus.EXPIRED,
            InternalPlacementStatus.ERROR_REVIEW,
            InternalPlacementStatus.COMPLETED,
          ],
        },
      },
      select: PLACEMENT_SELECT,
      orderBy: { createdAt: "desc" },
    });
    return projectInternalPlacementState(row);
  }

  /**
   * Batch load for Trackboard — facility-scoped, one query, no N+1.
   * Call only when workflow flag ON; never join into Encounter select.
   */
  async projectForEncounterIds(
    facilityId: string,
    encounterIds: string[]
  ): Promise<Map<string, InternalPlacementStateProjection>> {
    const map = new Map<string, InternalPlacementStateProjection>();
    if (!this.isWorkflowEnabled() || encounterIds.length === 0) return map;
    const rows = await this.prisma.internalPlacementRequest.findMany({
      where: {
        facilityId,
        originatingEncounterId: { in: encounterIds },
        status: {
          notIn: [
            InternalPlacementStatus.CANCELLED,
            InternalPlacementStatus.DECLINED,
            InternalPlacementStatus.EXPIRED,
            InternalPlacementStatus.ERROR_REVIEW,
            InternalPlacementStatus.COMPLETED,
          ],
        },
      },
      select: PLACEMENT_SELECT,
      orderBy: { createdAt: "desc" },
    });
    for (const row of rows) {
      if (map.has(row.originatingEncounterId)) continue;
      const projected = projectInternalPlacementState(row);
      if (projected) map.set(row.originatingEncounterId, projected);
    }
    return map;
  }

  async createDraft(
    facilityId: string,
    originatingEncounterId: string,
    actorUserId: string,
    input: ClinicalPlacementDraftInput,
    options?: { featureFlagEnabled?: boolean; ip?: string; userAgent?: string }
  ): Promise<InternalPlacementStateProjection> {
    this.assertWorkflowEnabled(options);
    const encounter = await this.loadEdEncounter(facilityId, originatingEncounterId);

    const existing = await this.prisma.internalPlacementRequest.findFirst({
      where: {
        originatingEncounterId,
        facilityId,
        status: {
          notIn: [
            InternalPlacementStatus.CANCELLED,
            InternalPlacementStatus.DECLINED,
            InternalPlacementStatus.EXPIRED,
            InternalPlacementStatus.ERROR_REVIEW,
            InternalPlacementStatus.COMPLETED,
          ],
        },
      },
      select: PLACEMENT_SELECT,
    });
    if (existing) {
      throw new ConflictException("An active internal placement request already exists");
    }

    const created = await this.prisma.internalPlacementRequest.create({
      data: {
        facilityId: encounter.facilityId,
        patientId: encounter.patientId,
        hospitalEpisodeId: encounter.hospitalEpisodeId,
        originatingEncounterId: encounter.id,
        requestedEncounterType: input.requestedEncounterType,
        requestedLevelOfCare: input.requestedLevelOfCare?.trim() || null,
        requestedService: input.requestedService?.trim() || null,
        requestedSpecialty: input.requestedSpecialty?.trim() || null,
        requestedUnitCode: input.requestedUnitCode?.trim() || null,
        clinicalPriority: input.clinicalPriority?.trim() || null,
        admissionDiagnosisSummary: input.admissionDiagnosisSummary?.trim() || null,
        reasonForPlacement: input.reasonForPlacement?.trim() || null,
        telemetryRequired: input.telemetryRequired === true,
        isolationRequired: input.isolationRequired === true,
        isolationType: input.isolationType?.trim() || null,
        specialPlacementNeedsJson: input.specialPlacementNeedsJson ?? undefined,
        acceptingProviderNameSnapshot: input.acceptingProviderNameSnapshot?.trim() || null,
        status: InternalPlacementStatus.DRAFT,
        createdByUserId: actorUserId,
        updatedByUserId: actorUserId,
      },
      select: PLACEMENT_SELECT,
    });

    await this.audit.log(AuditAction.CREATE, INTERNAL_PLACEMENT_ENTITY, {
      userId: actorUserId,
      facilityId,
      patientId: encounter.patientId,
      encounterId: encounter.id,
      entityId: created.id,
      critical: true,
      ip: options?.ip,
      userAgent: options?.userAgent,
      metadata: {
        event: "INTERNAL_PLACEMENT_DRAFT_CREATED",
        status: created.status,
        requestedEncounterType: created.requestedEncounterType,
      },
    });

    return projectInternalPlacementState(created)!;
  }

  /**
   * Update clinical fields on DRAFT or SIGNED only (provider revision before REQUESTED).
   */
  async updateDraft(
    facilityId: string,
    requestId: string,
    actorUserId: string,
    input: ClinicalPlacementDraftInput,
    options?: { featureFlagEnabled?: boolean; ip?: string; userAgent?: string }
  ): Promise<InternalPlacementStateProjection> {
    this.assertWorkflowEnabled(options);
    const row = await this.prisma.internalPlacementRequest.findFirst({
      where: { id: requestId, facilityId },
      select: PLACEMENT_SELECT,
    });
    if (!row) throw new NotFoundException("Placement request not found");
    if (
      row.status !== InternalPlacementStatus.DRAFT &&
      row.status !== InternalPlacementStatus.SIGNED
    ) {
      throw new BadRequestException("Only DRAFT or SIGNED placement requests can be edited");
    }
    if (input.expectedVersion != null && row.version !== input.expectedVersion) {
      throw new ConflictException("Placement request version conflict");
    }

    const updated = await this.prisma.internalPlacementRequest.updateMany({
      where: { id: row.id, facilityId, version: row.version },
      data: {
        requestedEncounterType: input.requestedEncounterType,
        requestedLevelOfCare: input.requestedLevelOfCare?.trim() || null,
        requestedService: input.requestedService?.trim() || null,
        requestedSpecialty: input.requestedSpecialty?.trim() || null,
        requestedUnitCode: input.requestedUnitCode?.trim() || null,
        clinicalPriority: input.clinicalPriority?.trim() || null,
        admissionDiagnosisSummary: input.admissionDiagnosisSummary?.trim() || null,
        reasonForPlacement: input.reasonForPlacement?.trim() || null,
        telemetryRequired: input.telemetryRequired === true,
        isolationRequired: input.isolationRequired === true,
        isolationType: input.isolationType?.trim() || null,
        specialPlacementNeedsJson: input.specialPlacementNeedsJson ?? undefined,
        acceptingProviderNameSnapshot: input.acceptingProviderNameSnapshot?.trim() || null,
        updatedByUserId: actorUserId,
        version: { increment: 1 },
      },
    });
    if (updated.count !== 1) {
      throw new ConflictException("Placement request version conflict");
    }

    const fresh = await this.prisma.internalPlacementRequest.findFirst({
      where: { id: row.id, facilityId },
      select: PLACEMENT_SELECT,
    });
    await this.audit.log(AuditAction.UPDATE, INTERNAL_PLACEMENT_ENTITY, {
      userId: actorUserId,
      facilityId,
      patientId: row.patientId,
      encounterId: row.originatingEncounterId,
      entityId: row.id,
      critical: true,
      ip: options?.ip,
      userAgent: options?.userAgent,
      metadata: {
        event: "INTERNAL_PLACEMENT_DRAFT_UPDATED",
        status: fresh?.status,
        version: fresh?.version,
      },
    });
    return projectInternalPlacementState(fresh)!;
  }

  async signDraft(
    facilityId: string,
    requestId: string,
    actorUserId: string,
    options?: {
      featureFlagEnabled?: boolean;
      expectedVersion?: number;
      ip?: string;
      userAgent?: string;
    }
  ): Promise<InternalPlacementStateProjection> {
    return this.transition(
      facilityId,
      requestId,
      actorUserId,
      InternalPlacementStatus.SIGNED,
      InternalPlacementActorRole.PROVIDER,
      { expectedVersion: options?.expectedVersion },
      options
    );
  }

  async submitRequested(
    facilityId: string,
    requestId: string,
    actorUserId: string,
    options?: {
      featureFlagEnabled?: boolean;
      role?: typeof InternalPlacementActorRole.PROVIDER;
      expectedVersion?: number;
      ip?: string;
      userAgent?: string;
    }
  ): Promise<InternalPlacementStateProjection> {
    this.assertWorkflowEnabled(options);
    const role = options?.role ?? InternalPlacementActorRole.PROVIDER;

    const row = await this.prisma.internalPlacementRequest.findFirst({
      where: { id: requestId, facilityId },
    });
    if (!row) throw new NotFoundException("Placement request not found");
    if (options?.expectedVersion != null && row.version !== options.expectedVersion) {
      throw new ConflictException("Placement request version conflict");
    }

    const clinical = validateInternalPlacementClinicalRequestForSign(row);
    if (!clinical.ok) {
      throw new BadRequestException(
        `Placement clinical request incomplete: ${clinical.missing.join(", ")}`
      );
    }

    const from = row.status;
    const to =
      from === InternalPlacementStatus.DRAFT || from === InternalPlacementStatus.SIGNED
        ? InternalPlacementStatus.REQUESTED
        : null;
    if (!to) {
      throw new BadRequestException("Request cannot be submitted from current status");
    }
    const transition = validateInternalPlacementTransition(from, to, role);
    if (!transition.ok) {
      throw new ForbiddenException(`Transition not allowed: ${transition.reason}`);
    }

    // Episode at REQUESTED — create/link before status update (idempotent).
    let hospitalEpisodeId = row.hospitalEpisodeId;
    if (!hospitalEpisodeId) {
      const episodeResult = await this.hospitalEpisodes.createEpisodeForEncounter(
        facilityId,
        row.originatingEncounterId,
        actorUserId,
        {
          featureFlagEnabled: true,
          fromInternalPlacementRequest: true,
          expectedPatientId: row.patientId,
          ip: options?.ip,
          userAgent: options?.userAgent,
        }
      );
      hospitalEpisodeId = episodeResult.episode.id;
    }

    const updated = await this.prisma.internalPlacementRequest.updateMany({
      where: { id: row.id, facilityId, version: row.version },
      data: {
        status: InternalPlacementStatus.REQUESTED,
        hospitalEpisodeId,
        requestedByUserId: actorUserId,
        requestedAt: new Date(),
        updatedByUserId: actorUserId,
        version: { increment: 1 },
      },
    });
    if (updated.count !== 1) {
      throw new ConflictException("Placement request version conflict");
    }

    const fresh = await this.prisma.internalPlacementRequest.findFirst({
      where: { id: row.id, facilityId },
      select: PLACEMENT_SELECT,
    });

    await this.audit.log(AuditAction.UPDATE, INTERNAL_PLACEMENT_ENTITY, {
      userId: actorUserId,
      facilityId,
      patientId: row.patientId,
      encounterId: row.originatingEncounterId,
      entityId: row.id,
      critical: true,
      ip: options?.ip,
      userAgent: options?.userAgent,
      metadata: {
        event: "INTERNAL_PLACEMENT_REQUESTED",
        fromStatus: from,
        toStatus: to,
        hospitalEpisodeId,
        version: fresh?.version,
      },
    });

    return projectInternalPlacementState(fresh)!;
  }

  async transition(
    facilityId: string,
    requestId: string,
    actorUserId: string,
    toStatus: string,
    role: (typeof InternalPlacementActorRole)[keyof typeof InternalPlacementActorRole],
    patch?: {
      acceptanceNotes?: string | null;
      assignedUnitCode?: string | null;
      assignedRoomKey?: string | null;
      assignedBedKey?: string | null;
      assignmentSourceSystem?: string | null;
      cancellationReason?: string | null;
      expectedVersion?: number;
    },
    options?: { featureFlagEnabled?: boolean; ip?: string; userAgent?: string }
  ): Promise<InternalPlacementStateProjection> {
    this.assertWorkflowEnabled(options);

    return this.prisma.$transaction(async (tx) => {
      const row = await this.lockRequest(tx, facilityId, requestId, patch?.expectedVersion);
      if (
        toStatus === InternalPlacementStatus.CANCELLED &&
        (row.status === InternalPlacementStatus.ARRIVED_DESTINATION ||
          row.status === InternalPlacementStatus.COMPLETED)
      ) {
        throw new BadRequestException(
          "Cannot cancel after destination arrival; use governed correction"
        );
      }
      const transition = validateInternalPlacementTransition(row.status, toStatus, role);
      if (!transition.ok) {
        throw new ForbiddenException(`Transition not allowed: ${transition.reason}`);
      }

      if (toStatus === InternalPlacementStatus.BED_ASSIGNED) {
        if (!patch?.assignedUnitCode?.trim() || !patch?.assignedRoomKey?.trim()) {
          throw new BadRequestException("Bed assignment requires unit and room keys");
        }
      }
      if (toStatus === InternalPlacementStatus.READY_FOR_TRANSFER) {
        if (!row.assignedUnitCode || !row.assignedRoomKey) {
          throw new BadRequestException("Ready for transfer requires an assigned destination");
        }
      }
      if (toStatus === InternalPlacementStatus.DEPARTED_ED) {
        if (row.status !== InternalPlacementStatus.READY_FOR_TRANSFER) {
          throw new BadRequestException("Departure requires READY_FOR_TRANSFER");
        }
      }
      if (toStatus === InternalPlacementStatus.ARRIVED_DESTINATION) {
        if (!row.departedEdAt && row.status !== InternalPlacementStatus.DEPARTED_ED) {
          throw new BadRequestException("Arrival requires prior ED departure");
        }
      }

      const data: Prisma.InternalPlacementRequestUncheckedUpdateInput = {
        status: toStatus as never,
        updatedByUserId: actorUserId,
        version: { increment: 1 },
      };

      if (toStatus === InternalPlacementStatus.ACCEPTED) {
        data.acceptedAt = new Date();
        data.acceptedByUserId = actorUserId;
        data.acceptanceNotes = patch?.acceptanceNotes?.trim() || null;
      }
      if (toStatus === InternalPlacementStatus.BED_ASSIGNED) {
        data.assignedUnitCode = patch!.assignedUnitCode!.trim();
        data.assignedRoomKey = patch!.assignedRoomKey!.trim();
        data.assignedBedKey = patch?.assignedBedKey?.trim() || null;
        data.assignmentSourceSystem =
          patch?.assignmentSourceSystem?.trim() || "FACILITY_ROOM_LABEL";
        data.assignedAt = new Date();
        data.assignedByUserId = actorUserId;
      }
      if (toStatus === InternalPlacementStatus.READY_FOR_TRANSFER) {
        data.readyForTransferAt = new Date();
      }
      if (toStatus === InternalPlacementStatus.DEPARTED_ED) {
        data.departedEdAt = new Date();
        data.departureDocumentedByUserId = actorUserId;
      }
      if (
        toStatus === InternalPlacementStatus.CANCELLED ||
        toStatus === InternalPlacementStatus.DECLINED ||
        toStatus === InternalPlacementStatus.EXPIRED
      ) {
        data.cancellationReason = patch?.cancellationReason?.trim() || toStatus;
        data.cancelledAt = new Date();
        data.cancelledByUserId = actorUserId;
        if (row.receivingEncounterLifecycle === ReceivingEncounterLifecycle.PLANNED) {
          data.receivingEncounterLifecycle = ReceivingEncounterLifecycle.CANCELLED;
        }
      }

      let receivingEncounterId = row.receivingEncounterId;
      let receivingEncounterLifecycle = row.receivingEncounterLifecycle;

      if (toStatus === InternalPlacementStatus.ARRIVED_DESTINATION) {
        data.arrivedDestinationAt = new Date();
        data.arrivalDocumentedByUserId = actorUserId;

        if (this.isReceivingFoundationEnabled() || options?.featureFlagEnabled === true) {
          if (!receivingEncounterId) {
            const created = await tx.encounter.create({
              data: {
                facilityId: row.facilityId,
                patientId: row.patientId,
                type: EncounterType.INPATIENT,
                status: EncounterStatus.OPEN,
                hospitalEpisodeId: row.hospitalEpisodeId,
                admissionSummaryJson: {
                  d3cReceiving: true,
                  requestedEncounterType: row.requestedEncounterType,
                  careLevel: row.requestedLevelOfCare,
                  fromInternalPlacementRequestId: row.id,
                },
                admittedAt: new Date(),
              },
              select: { id: true },
            });
            receivingEncounterId = created.id;
          }
          receivingEncounterLifecycle = ReceivingEncounterLifecycle.ACTIVE;
          data.receivingEncounterId = receivingEncounterId;
          data.receivingEncounterLifecycle = ReceivingEncounterLifecycle.ACTIVE;
        }
      }

      const updated = await tx.internalPlacementRequest.update({
        where: { id: row.id },
        data,
        select: PLACEMENT_SELECT,
      });

      if (
        toStatus === InternalPlacementStatus.ARRIVED_DESTINATION &&
        (this.isReceivingFoundationEnabled() || options?.featureFlagEnabled === true)
      ) {
        const completed = await tx.internalPlacementRequest.update({
          where: { id: row.id },
          data: {
            status: InternalPlacementStatus.COMPLETED,
            version: { increment: 1 },
            updatedByUserId: actorUserId,
          },
          select: PLACEMENT_SELECT,
        });
        await this.audit.log(AuditAction.UPDATE, INTERNAL_PLACEMENT_ENTITY, {
          tx,
          userId: actorUserId,
          facilityId,
          patientId: row.patientId,
          encounterId: row.originatingEncounterId,
          entityId: row.id,
          critical: true,
          ip: options?.ip,
          userAgent: options?.userAgent,
          metadata: {
            event: "INTERNAL_PLACEMENT_ARRIVED_AND_COMPLETED",
            receivingEncounterId,
            receivingEncounterLifecycle,
            version: completed.version,
          },
        });
        return projectInternalPlacementState(completed)!;
      }

      await this.audit.log(AuditAction.UPDATE, INTERNAL_PLACEMENT_ENTITY, {
        tx,
        userId: actorUserId,
        facilityId,
        patientId: row.patientId,
        encounterId: row.originatingEncounterId,
        entityId: row.id,
        critical: true,
        ip: options?.ip,
        userAgent: options?.userAgent,
        metadata: {
          event: "INTERNAL_PLACEMENT_TRANSITION",
          fromStatus: row.status,
          toStatus,
          version: updated.version,
        },
      });

      return projectInternalPlacementState(updated)!;
    });
  }

  async reviseRequestedType(
    facilityId: string,
    requestId: string,
    actorUserId: string,
    requestedEncounterType: "OBSERVATION" | "INPATIENT",
    options?: { featureFlagEnabled?: boolean; expectedVersion?: number }
  ): Promise<InternalPlacementStateProjection> {
    this.assertWorkflowEnabled(options);
    const row = await this.prisma.internalPlacementRequest.findFirst({
      where: { id: requestId, facilityId },
      select: { ...PLACEMENT_SELECT, status: true },
    });
    if (!row) throw new NotFoundException("Placement request not found");
    if (
      row.status === InternalPlacementStatus.DEPARTED_ED ||
      row.status === InternalPlacementStatus.ARRIVED_DESTINATION ||
      row.status === InternalPlacementStatus.COMPLETED
    ) {
      throw new BadRequestException("Cannot revise type after ED departure");
    }
    if (options?.expectedVersion != null && row.version !== options.expectedVersion) {
      throw new ConflictException("Placement request version conflict");
    }
    const updated = await this.prisma.internalPlacementRequest.update({
      where: { id: row.id },
      data: {
        requestedEncounterType,
        revision: { increment: 1 },
        version: { increment: 1 },
        updatedByUserId: actorUserId,
      },
      select: PLACEMENT_SELECT,
    });
    return projectInternalPlacementState(updated)!;
  }

  private async loadEdEncounter(facilityId: string, encounterId: string) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: {
        id: true,
        facilityId: true,
        patientId: true,
        type: true,
        status: true,
        hospitalEpisodeId: true,
      },
    });
    if (!encounter) throw new NotFoundException("Encounter not found");
    if (encounter.type !== EncounterType.EMERGENCY) {
      throw new BadRequestException("Internal placement requires an ED encounter");
    }
    if (encounter.status !== EncounterStatus.OPEN) {
      throw new BadRequestException("Internal placement requires an open ED encounter");
    }
    return encounter;
  }

  private async lockRequest(
    tx: Prisma.TransactionClient,
    facilityId: string,
    requestId: string,
    expectedVersion?: number
  ) {
    const row = await tx.internalPlacementRequest.findFirst({
      where: { id: requestId, facilityId },
    });
    if (!row) throw new NotFoundException("Placement request not found");
    if (expectedVersion != null && row.version !== expectedVersion) {
      throw new ConflictException("Placement request version conflict");
    }
    return row;
  }
}
