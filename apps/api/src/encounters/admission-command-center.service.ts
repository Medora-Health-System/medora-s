/**
 * D4A.2.3/D4A.2.4 — Hospital Admission Command Center.
 * Facility-scoped operational read model + multidisciplinary operational acceptance.
 * Dual-mode: placement OFF uses operationalAcceptanceV1; placement ON routes receiving
 * through InternalPlacementService. Does not enable production placement flags.
 */

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuditAction, EncounterStatus, EncounterType, RoleCode } from "@prisma/client";
import {
  ADMISSION_COMMAND_CENTER_D4A23_CERTIFICATION,
  ADMISSION_OPERATIONAL_ACCEPT_ROLE_CODES,
  ADMISSION_OPERATIONS_CONVERGENCE_D4A24_CERTIFICATION,
  actorHasAdmissionOperationalAcceptCapability,
  actorHasAdmissionOpsCapability,
  applyOperationalAdmissionAction,
  asAdmissionSummaryRecord,
  buildAdmissionCommandCenterRow,
  buildConvergedAdmissionEventProjection,
  computeAdmissionCommandCenterMetrics,
  detectAdmissionSourceKind,
  filterAdmissionCommandCenterRows,
  InternalPlacementActorRole,
  InternalPlacementStatus,
  internalPlacementWorkflowEnabledFromProcessEnv,
  mergeOperationalAcceptanceIntoSummary,
  readOperationalAcceptanceV1,
  resolveAdmissionOperationsMode,
  resolveConvergedDisplayState,
  resolveReceivingAcceptanceAuthority,
  routeOperationalAdmissionAction,
  sortAdmissionCommandCenterRows,
  type AdmissionCommandCenterFilter,
  type AdmissionCommandCenterRow,
  type AdmissionCommandCenterSort,
  type AdmissionOperationalActionDto,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import { InternalPlacementService } from "./internal-placement.service";

@Injectable()
export class AdmissionCommandCenterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly placement: InternalPlacementService
  ) {}

  async actorHasAnyActiveFacilityRole(
    facilityId: string,
    userId: string,
    allowed: readonly RoleCode[]
  ): Promise<{ ok: boolean; roleCodes: RoleCode[] }> {
    const rows = await this.prisma.userRole.findMany({
      where: {
        facilityId,
        userId,
        isActive: true,
        facility: { isActive: true },
      },
      select: { role: { select: { code: true } } },
    });
    const roleCodes = rows.map((r) => r.role.code);
    const set = new Set(roleCodes);
    const ok = allowed.some((a) => set.has(a));
    return { ok, roleCodes };
  }

  async assertOperationalAcceptCapability(
    facilityId: string,
    userId: string
  ): Promise<RoleCode[]> {
    const { ok, roleCodes } = await this.actorHasAnyActiveFacilityRole(
      facilityId,
      userId,
      [...ADMISSION_OPERATIONAL_ACCEPT_ROLE_CODES] as RoleCode[]
    );
    if (!ok || !actorHasAdmissionOperationalAcceptCapability(roleCodes)) {
      throw new ForbiddenException({
        statusCode: 403,
        code: "OPERATIONAL_ROLE_NOT_AUTHORIZED",
        message: "Operational admission acceptance is not authorized for this membership.",
      });
    }
    return roleCodes;
  }

  async listCommandCenter(
    facilityId: string,
    options?: {
      filter?: AdmissionCommandCenterFilter;
      sort?: AdmissionCommandCenterSort;
      service?: string | null;
      unit?: string | null;
      levelOfCare?: string | null;
      unassignedOnly?: boolean;
      take?: number;
    }
  ) {
    const take = Math.min(Math.max(options?.take ?? 100, 1), 200);
    const placementOn = internalPlacementWorkflowEnabledFromProcessEnv();

    // Federation: signed ED decisions + open direct/scheduled inpatient intake rows.
    const encounters = await this.prisma.encounter.findMany({
      where: {
        facilityId,
        status: EncounterStatus.OPEN,
        OR: [
          {
            admissionSummaryJson: {
              path: ["admissionDecisionMode"],
              equals: "SIGN",
            },
          },
          {
            type: EncounterType.INPATIENT,
            OR: [
              {
                admissionSummaryJson: {
                  path: ["d3e7DirectAdmission"],
                  equals: true,
                },
              },
              {
                admissionSummaryJson: {
                  path: ["d3e6dHospitalAdmissionIntake"],
                  equals: true,
                },
              },
            ],
          },
        ],
      },
      select: {
        id: true,
        facilityId: true,
        type: true,
        status: true,
        roomLabel: true,
        chiefComplaint: true,
        admissionSummaryJson: true,
        admittedAt: true,
        patientId: true,
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { admittedAt: "desc" },
      take,
    });

    const placementMap = await this.placement.projectForEncounterIds(
      facilityId,
      encounters.map((e) => e.id)
    );
    const placementTimes = placementOn
      ? await this.loadPlacementTimestamps(
          facilityId,
          encounters.map((e) => e.id)
        )
      : new Map<string, PlacementTimeRow>();

    const nowMs = Date.now();
    let rows = encounters.map((e) => {
      const pl = placementMap.get(e.id);
      const times = placementTimes.get(e.id);
      const name = [e.patient?.lastName, e.patient?.firstName]
        .filter(Boolean)
        .join(", ");
      const base = buildAdmissionCommandCenterRow({
        encounterId: e.id,
        facilityId: e.facilityId,
        encounterType: e.type,
        encounterStatus: e.status,
        patientDisplayName: name || null,
        patientId: e.patientId,
        roomLabel: e.roomLabel,
        chiefComplaint: e.chiefComplaint,
        admissionSummaryJson: e.admissionSummaryJson,
        placementWorkflowEnabled: placementOn,
        placementStatus: pl?.status ?? null,
        placementRequestedAt: times?.requestedAt ?? null,
        placementAssignedAt: times?.assignedAt ?? null,
        placementAcceptedAt: times?.acceptedAt ?? null,
        placementDepartedEdAt: pl?.departedEdAt ?? null,
        placementArrivedAt: pl?.arrivedDestinationAt ?? null,
        placementReadyForTransferAt: pl?.readyForTransferAt ?? null,
        assignedUnitCode: pl?.assignedUnitCode ?? null,
        assignedBedKey: pl?.assignedBedKey ?? null,
        receivingEncounterId: pl?.receivingEncounterId ?? null,
        clinicalPriority: pl?.clinicalPriority ?? null,
        nowMs,
      });
      return this.enrichRowWithConvergence(base, e.admissionSummaryJson, e.type, placementOn);
    });

    if (options?.service?.trim()) {
      const svc = options.service.trim().toLowerCase();
      rows = rows.filter((r) => (r.requestedService ?? "").toLowerCase().includes(svc));
    }
    if (options?.unit?.trim()) {
      const u = options.unit.trim().toLowerCase();
      rows = rows.filter((r) => (r.unit ?? "").toLowerCase().includes(u));
    }
    if (options?.levelOfCare?.trim()) {
      const loc = options.levelOfCare.trim().toLowerCase();
      rows = rows.filter((r) =>
        (r.requestedLevelOfCare ?? "").toLowerCase().includes(loc)
      );
    }
    if (options?.unassignedOnly) {
      rows = rows.filter((r) => !r.bed);
    }

    const filter = options?.filter ?? "ALL_PENDING";
    const filtered = filterAdmissionCommandCenterRows(rows, filter);
    const sorted = sortAdmissionCommandCenterRows(
      filtered,
      options?.sort ?? "LONGEST_WAITING"
    );
    const metrics = computeAdmissionCommandCenterMetrics(rows);

    return {
      certification: ADMISSION_COMMAND_CENTER_D4A23_CERTIFICATION,
      convergenceCertification: ADMISSION_OPERATIONS_CONVERGENCE_D4A24_CERTIFICATION,
      facilityId,
      placementWorkflowEnabled: placementOn,
      operationsMode: resolveAdmissionOperationsMode(placementOn),
      generatedAt: new Date(nowMs).toISOString(),
      filter,
      sort: options?.sort ?? "LONGEST_WAITING",
      metrics,
      items: sorted,
      total: sorted.length,
      productionSchemaVerification: "PRODUCTION SCHEMA NOT VERIFIED",
    };
  }

  async getCommandCenterDetail(facilityId: string, encounterId: string) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: {
        id: true,
        facilityId: true,
        type: true,
        status: true,
        roomLabel: true,
        chiefComplaint: true,
        admissionSummaryJson: true,
        patientId: true,
        patient: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!encounter) {
      throw new NotFoundException({
        statusCode: 404,
        code: "ENCOUNTER_NOT_FOUND",
        message: "Encounter not found in facility.",
      });
    }

    const placementOn = internalPlacementWorkflowEnabledFromProcessEnv();
    const pl = await this.placement.getActiveForEncounter(facilityId, encounterId);
    const times = placementOn
      ? (await this.loadPlacementTimestamps(facilityId, [encounterId])).get(encounterId)
      : undefined;
    const name = [encounter.patient?.lastName, encounter.patient?.firstName]
      .filter(Boolean)
      .join(", ");
    const row = buildAdmissionCommandCenterRow({
      encounterId: encounter.id,
      facilityId: encounter.facilityId,
      encounterType: encounter.type,
      encounterStatus: encounter.status,
      patientDisplayName: name || null,
      patientId: encounter.patientId,
      roomLabel: encounter.roomLabel,
      chiefComplaint: encounter.chiefComplaint,
      admissionSummaryJson: encounter.admissionSummaryJson,
      placementWorkflowEnabled: placementOn,
      placementStatus: pl?.status ?? null,
      placementRequestedAt: times?.requestedAt ?? null,
      placementAssignedAt: times?.assignedAt ?? null,
      placementAcceptedAt: times?.acceptedAt ?? null,
      placementDepartedEdAt: pl?.departedEdAt ?? null,
      placementArrivedAt: pl?.arrivedDestinationAt ?? null,
      placementReadyForTransferAt: pl?.readyForTransferAt ?? null,
      assignedUnitCode: pl?.assignedUnitCode ?? null,
      assignedBedKey: pl?.assignedBedKey ?? null,
      receivingEncounterId: pl?.receivingEncounterId ?? null,
      clinicalPriority: pl?.clinicalPriority ?? null,
    });

    const enriched = this.enrichRowWithConvergence(
      row,
      encounter.admissionSummaryJson,
      encounter.type,
      placementOn
    );
    const events = buildConvergedAdmissionEventProjection({
      admissionSummaryJson: encounter.admissionSummaryJson,
      placementWorkflowEnabled: placementOn,
      placementStatus: pl?.status ?? null,
      placementRequestedAt: times?.requestedAt ?? null,
      placementAssignedAt: times?.assignedAt ?? null,
      placementAcceptedAt: times?.acceptedAt ?? null,
      placementDepartedEdAt: pl?.departedEdAt ?? null,
      placementArrivedAt: pl?.arrivedDestinationAt ?? null,
      placementReadyForTransferAt: pl?.readyForTransferAt ?? null,
      receivingEncounterId: pl?.receivingEncounterId ?? null,
      assignedUnitCode: pl?.assignedUnitCode ?? null,
      assignedBedKey: pl?.assignedBedKey ?? null,
    });

    return {
      certification: ADMISSION_COMMAND_CENTER_D4A23_CERTIFICATION,
      convergenceCertification: ADMISSION_OPERATIONS_CONVERGENCE_D4A24_CERTIFICATION,
      row: enriched,
      events,
      operationalAcceptance: readOperationalAcceptanceV1(encounter.admissionSummaryJson),
      placementWorkflowEnabled: placementOn,
      operationsMode: resolveAdmissionOperationsMode(placementOn),
      productionSchemaVerification: "PRODUCTION SCHEMA NOT VERIFIED",
    };
  }

  async recordOperationalAction(
    facilityId: string,
    encounterId: string,
    dto: AdmissionOperationalActionDto,
    userId: string,
    ip?: string | null,
    userAgent?: string | null,
    requestId?: string | null
  ) {
    const roleCodes = await this.assertOperationalAcceptCapability(facilityId, userId);
    const placementOn = internalPlacementWorkflowEnabledFromProcessEnv();
    const opsMode = resolveAdmissionOperationsMode(placementOn);
    const routing = routeOperationalAdmissionAction(dto.action, opsMode);

    if (routing.route === "DENIED") {
      throw new ConflictException({
        statusCode: 409,
        code: routing.code,
        message: routing.message,
        requestId: requestId ?? null,
        operationsMode: opsMode,
      });
    }

    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: {
        id: true,
        facilityId: true,
        patientId: true,
        status: true,
        admissionSummaryJson: true,
        type: true,
      },
    });
    if (!encounter) {
      throw new NotFoundException({
        statusCode: 404,
        code: "FACILITY_SCOPE_MISMATCH",
        message: "Encounter not found in active facility.",
      });
    }

    const root = asAdmissionSummaryRecord(encounter.admissionSummaryJson);
    const decisionMode = String(root.admissionDecisionMode ?? "").toUpperCase();
    const isDirect =
      detectAdmissionSourceKind(encounter.admissionSummaryJson, encounter.type) ===
      "DIRECT_ADMISSION";
    if (decisionMode !== "SIGN" && !isDirect) {
      throw new ConflictException({
        statusCode: 409,
        code: "ADMISSION_CANCELLED",
        message: "No signed admission decision is available for operational acceptance.",
        requestId: requestId ?? null,
      });
    }

    if (routing.route === "PLACEMENT_SERVICE") {
      return this.recordReceivingViaPlacement(
        facilityId,
        encounterId,
        dto,
        userId,
        roleCodes,
        ip,
        userAgent,
        requestId
      );
    }

    const decisionAt =
      typeof root.admissionDecisionAt === "string" ? root.admissionDecisionAt : null;
    const prior = readOperationalAcceptanceV1(encounter.admissionSummaryJson);
    // Never persist receiving into ops JSON when placement ON (second SM forbidden).
    const priorForWrite =
      opsMode === "PLACEMENT_ON" && prior
        ? { ...prior, receiving: null }
        : prior;
    const displayRole = roleCodes.includes(RoleCode.ADMIN)
      ? "ADMIN"
      : roleCodes.includes(RoleCode.PROVIDER)
        ? "PROVIDER"
        : roleCodes.includes(RoleCode.RN)
          ? "RN"
          : roleCodes[0] ?? "UNKNOWN";

    const applied = applyOperationalAdmissionAction({
      prior: priorForWrite,
      action: dto.action,
      actorUserId: userId,
      actorRoleCodes: roleCodes,
      actorDisplayRole: displayRole,
      at: new Date().toISOString(),
      clientRequestId: dto.clientRequestId ?? requestId ?? null,
      note: dto.note,
      receivingService: dto.receivingService,
      receivingUnit: dto.receivingUnit,
      receivingTeam: dto.receivingTeam,
      holdReasonCode: dto.holdReasonCode,
      holdExplanation: dto.holdExplanation,
      responsibleTeam: dto.responsibleTeam,
      reassessmentTargetAt: dto.reassessmentTargetAt,
      redirectToService: dto.redirectToService,
      redirectToUnit: dto.redirectToUnit,
      declineReasonCode: dto.declineReasonCode,
      expectedAdmissionDecisionAt: dto.expectedAdmissionDecisionAt,
      currentAdmissionDecisionAt: decisionAt,
      precautionsAcknowledged: dto.precautionsAcknowledged,
      equipmentAcknowledged: dto.equipmentAcknowledged,
      isolationAcknowledged: dto.isolationAcknowledged,
      conditionsNote: dto.conditionsNote,
    });

    if (!applied.ok) {
      throw new ConflictException({
        statusCode: 409,
        code: applied.code,
        message: applied.code,
        requestId: requestId ?? null,
      });
    }

    if (applied.idempotentReplay) {
      return {
        ok: true as const,
        idempotentReplay: true,
        operationalAcceptance: applied.ops,
        clinicalPacketUnchanged: true as const,
        requestId: requestId ?? null,
      };
    }

    const opsToPersist =
      opsMode === "PLACEMENT_ON" ? { ...applied.ops, receiving: null } : applied.ops;
    const nextSummary = mergeOperationalAcceptanceIntoSummary(
      encounter.admissionSummaryJson,
      opsToPersist
    );

    // Guard: clinical protected keys must remain byte-identical for string fields.
    for (const key of [
      "admissionReason",
      "admissionDiagnosis",
      "initialPlan",
      "careLevel",
      "conditionAtAdmission",
      "serviceUnit",
      "responsiblePhysicianName",
      "admissionDecisionMode",
      "admissionDecisionAt",
      "admissionDecisionByUserId",
      "admissionDiagnosesV1",
      "admissionPacketV1",
    ] as const) {
      if (JSON.stringify(root[key]) !== JSON.stringify(nextSummary[key])) {
        throw new ConflictException({
          statusCode: 409,
          code: "ADMISSION_OPERATION_STALE",
          message: "Operational write would alter clinical admission packet.",
          requestId: requestId ?? null,
        });
      }
    }

    await this.prisma.encounter.update({
      where: { id: encounterId },
      data: {
        admissionSummaryJson: nextSummary as object,
      },
    });

    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, "ENCOUNTER", {
      userId,
      facilityId,
      patientId: encounter.patientId,
      encounterId,
      entityId: encounterId,
      critical: true,
      ip: ip ?? undefined,
      userAgent: userAgent ?? undefined,
      metadata: {
        event: "ADMISSION_OPERATIONAL_ACTION",
        action: dto.action,
        resultingState: opsToPersist.status,
        receivingStatus: null,
        actorDisplayRole: displayRole,
        holdReasonCode: opsToPersist.hold?.reasonCode ?? null,
        clientRequestId: dto.clientRequestId ?? null,
        requestId: requestId ?? null,
        edEncounterClosed: false,
        clinicalPacketUnchanged: true,
        operationsMode: opsMode,
        authority: "OPS_JSON",
      },
    });

    return {
      ok: true as const,
      idempotentReplay: false,
      operationalAcceptance: opsToPersist,
      clinicalPacketUnchanged: true as const,
      requestId: requestId ?? null,
      operationsMode: opsMode,
      authority: "OPS_JSON" as const,
    };
  }

  /**
   * Placement-ON receiving: call InternalPlacementService — never write ops.receiving.
   * After bed: READY_FOR_TRANSFER. Before bed: ACCEPTED (machine order).
   */
  private async recordReceivingViaPlacement(
    facilityId: string,
    encounterId: string,
    dto: AdmissionOperationalActionDto,
    userId: string,
    roleCodes: RoleCode[],
    ip?: string | null,
    userAgent?: string | null,
    requestId?: string | null
  ) {
    if (!actorHasAdmissionOpsCapability("ADMISSION_RECEIVING_ACCEPT", roleCodes)) {
      throw new ForbiddenException({
        statusCode: 403,
        code: "OPERATIONAL_ROLE_NOT_AUTHORIZED",
        message: "Receiving acceptance is not authorized for this membership.",
        requestId: requestId ?? null,
      });
    }

    const active = await this.placement.getActiveForEncounter(facilityId, encounterId);
    if (!active) {
      throw new ConflictException({
        statusCode: 409,
        code: "PLACEMENT_WORKFLOW_UNAVAILABLE",
        message: "No active placement request exists for receiving acceptance.",
        requestId: requestId ?? null,
      });
    }

    const status = String(active.status ?? "").toUpperCase();
    let toStatus: string = InternalPlacementStatus.READY_FOR_TRANSFER;
    if (
      status === InternalPlacementStatus.REQUESTED ||
      status === InternalPlacementStatus.UNDER_REVIEW
    ) {
      toStatus = InternalPlacementStatus.ACCEPTED;
    } else if (status === InternalPlacementStatus.BED_ASSIGNED) {
      toStatus = InternalPlacementStatus.READY_FOR_TRANSFER;
    } else if (
      status === InternalPlacementStatus.READY_FOR_TRANSFER ||
      status === InternalPlacementStatus.DEPARTED_ED ||
      status === InternalPlacementStatus.ARRIVED_DESTINATION ||
      status === InternalPlacementStatus.COMPLETED ||
      status === InternalPlacementStatus.ACCEPTED
    ) {
      // Idempotent: already at or past receiving/readiness.
      return {
        ok: true as const,
        idempotentReplay: true,
        placement: active,
        clinicalPacketUnchanged: true as const,
        requestId: requestId ?? null,
        operationsMode: "PLACEMENT_ON" as const,
        authority: "PLACEMENT" as const,
      };
    } else {
      throw new ConflictException({
        statusCode: 409,
        code: "RECEIVING_ACCEPTANCE_STALE",
        message: `Cannot accept receiving from placement status ${status}.`,
        requestId: requestId ?? null,
      });
    }

    // Machine: ACCEPTED/BED_ASSIGNED require ADMIN or BED_MANAGEMENT — clinic MVP ADMIN.
    // READY_FOR_TRANSFER allows RN/PROVIDER as ED_NURSE.
    let actorRole: (typeof InternalPlacementActorRole)[keyof typeof InternalPlacementActorRole] =
      InternalPlacementActorRole.ADMIN;
    if (toStatus === InternalPlacementStatus.READY_FOR_TRANSFER) {
      if (roleCodes.includes(RoleCode.ADMIN)) {
        actorRole = InternalPlacementActorRole.ADMIN;
      } else if (roleCodes.includes(RoleCode.RN) || roleCodes.includes(RoleCode.PROVIDER)) {
        actorRole = InternalPlacementActorRole.ED_NURSE;
      } else {
        throw new ForbiddenException({
          statusCode: 403,
          code: "OPERATIONAL_ROLE_NOT_AUTHORIZED",
          requestId: requestId ?? null,
        });
      }
    } else if (toStatus === InternalPlacementStatus.ACCEPTED) {
      if (!roleCodes.includes(RoleCode.ADMIN)) {
        throw new ForbiddenException({
          statusCode: 403,
          code: "OPERATIONAL_ROLE_NOT_AUTHORIZED",
          message:
            "Placement ACCEPTED (pre-bed) requires ADMIN until BED_MANAGEMENT RoleCode exists.",
          requestId: requestId ?? null,
        });
      }
      actorRole = InternalPlacementActorRole.ADMIN;
    }

    try {
      const projected = await this.placement.transition(
        facilityId,
        active.id,
        userId,
        toStatus,
        actorRole,
        {
          acceptanceNotes: dto.note ?? null,
          expectedVersion: active.version,
        },
        {
          featureFlagEnabled: true,
          ip: ip ?? undefined,
          userAgent: userAgent ?? undefined,
        }
      );

      await this.audit.log(AuditAction.ENCOUNTER_UPDATE, "ENCOUNTER", {
        userId,
        facilityId,
        encounterId,
        entityId: encounterId,
        critical: true,
        ip: ip ?? undefined,
        userAgent: userAgent ?? undefined,
        metadata: {
          event: "ADMISSION_RECEIVING_VIA_PLACEMENT",
          action: dto.action,
          toStatus,
          placementRequestId: active.id,
          requestId: requestId ?? null,
          authority: "PLACEMENT",
          clinicalPacketUnchanged: true,
        },
      });

      return {
        ok: true as const,
        idempotentReplay: false,
        placement: projected,
        clinicalPacketUnchanged: true as const,
        requestId: requestId ?? null,
        operationsMode: "PLACEMENT_ON" as const,
        authority: "PLACEMENT" as const,
      };
    } catch (err) {
      if (err instanceof BadRequestException || err instanceof ConflictException) {
        throw new ConflictException({
          statusCode: 409,
          code: "RECEIVING_ACCEPTANCE_STALE",
          message: err instanceof Error ? err.message : "Stale receiving acceptance",
          requestId: requestId ?? null,
        });
      }
      throw err;
    }
  }

  private enrichRowWithConvergence(
    row: AdmissionCommandCenterRow,
    admissionSummaryJson: unknown,
    encounterType: string | null | undefined,
    placementOn: boolean
  ): AdmissionCommandCenterRow & {
    admissionSourceKind: string;
    convergedDisplayState: string;
    receivingAuthority: string;
  } {
    const ops = readOperationalAcceptanceV1(admissionSummaryJson);
    const receiving = resolveReceivingAcceptanceAuthority({
      placementWorkflowEnabled: placementOn,
      placementStatus: row.placementStatus,
      placementAcceptedAt: null,
      assignedBedKey: row.bed,
      ops,
    });
    const sourceKind = detectAdmissionSourceKind(admissionSummaryJson, encounterType);
    const convergedDisplayState = resolveConvergedDisplayState({
      placementWorkflowEnabled: placementOn,
      decisionSigned:
        row.decisionStatus !== "NO_ADMISSION_DECISION" &&
        row.decisionStatus !== "DECISION_DRAFT",
      operationalStatus: row.operationalStatus,
      hasDurablePlacementRequest: row.hasDurablePlacementRequest,
      placementStatus: row.placementStatus,
      receivingDisplay: receiving.displayStatus,
      transportStatus: row.transportStatus,
      inpatientEncounterId: row.receivingEncounterId,
      onHold: row.operationalFilter === "ON_HOLD",
      cancelled: row.operationalFilter === "CANCELLED",
      failed: row.operationalFilter === "FAILED_NEEDS_ATTENTION",
    });
    return {
      ...row,
      receivingAcceptance: receiving.displayStatus,
      admissionSource: sourceKind,
      admissionSourceKind: sourceKind,
      convergedDisplayState,
      receivingAuthority: receiving.authority,
    };
  }

  private async loadPlacementTimestamps(
    facilityId: string,
    encounterIds: string[]
  ): Promise<Map<string, PlacementTimeRow>> {
    const map = new Map<string, PlacementTimeRow>();
    if (encounterIds.length === 0) return map;
    try {
      const rows = await this.prisma.internalPlacementRequest.findMany({
        where: {
          facilityId,
          originatingEncounterId: { in: encounterIds },
        },
        select: {
          originatingEncounterId: true,
          requestedAt: true,
          assignedAt: true,
          acceptedAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });
      for (const row of rows) {
        if (map.has(row.originatingEncounterId)) continue;
        map.set(row.originatingEncounterId, {
          requestedAt: row.requestedAt?.toISOString() ?? row.createdAt.toISOString(),
          assignedAt: row.assignedAt?.toISOString() ?? null,
          acceptedAt: row.acceptedAt?.toISOString() ?? null,
        });
      }
    } catch {
      // Placement table may be absent when D3C not applied — soft empty.
    }
    return map;
  }
}

type PlacementTimeRow = {
  requestedAt: string | null;
  assignedAt: string | null;
  acceptedAt: string | null;
};
