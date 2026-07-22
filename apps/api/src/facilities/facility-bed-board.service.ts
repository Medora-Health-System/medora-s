import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  AuditAction,
  EncounterStatus,
} from "@prisma/client";
import {
  BED_STATUS_UPDATE_EVENT,
  FACILITY_BED_ENTITY_TYPE,
  type BedOperationalOverlayRecord,
  type BedStatusUpdateDto,
  type ComposedBedBoardRow,
  type EncounterBedUnitCode,
  type BedOperationalStatus,
  buildCanonicalBedKey,
  buildFacilityBedBoardView,
  composeFacilityBedBoard,
  enrichComposedBedBoardRow,
  findComposedBedBoardRow,
  formatCanonicalBedDisplay,
  isEdPhysicalDepartureCompleted,
  isManualBedOperationalStatusWritable,
  manualStatusBlockedByOccupancy,
  normalizeBedBoardUnitFilter,
  normalizeBedOperationalStatus,
  parseBedKeyParam,
  parseCanonicalBedKey,
  rejectDerivedBedOperationalStatusWrite,
  requiresBedAssignmentOverride,
  validateBedInPool,
  type BedBoardOccupancyRow,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import { throwBedStatusBlocksAssignmentConflict } from "./bed-status-blocks.util";
import { throwBedOccupiedBlocksStatusChange } from "./bed-occupied-blocks-status.util";

export type BedStatusHistoryEntry = {
  id: string;
  occurredAt: string;
  actorDisplay: string | null;
  oldStatus: BedOperationalStatus | null;
  newStatus: BedOperationalStatus;
  reasonText: string | null;
  reasonCode: string | null;
};

@Injectable()
export class FacilityBedBoardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async getBedBoard(facilityId: string, unitFilter?: string | null) {
    const unit = unitFilter ? normalizeBedBoardUnitFilter(unitFilter) : null;
    if (unitFilter && !unit) {
      throw new BadRequestException("Invalid unit filter");
    }
    const composed = await this.loadComposedBedBoard(facilityId, unit);
    return buildFacilityBedBoardView(composed);
  }

  async getEffectiveBedRow(facilityId: string, bedKey: string): Promise<ComposedBedBoardRow | null> {
    const parsed = parseCanonicalBedKey(bedKey);
    if (!parsed) return null;
    const board = await this.loadComposedBedBoard(facilityId, parsed.unit);
    return findComposedBedBoardRow(board, bedKey);
  }

  private async loadComposedBedBoard(
    facilityId: string,
    unitFilter?: EncounterBedUnitCode | null
  ) {
    const [encounters, overlays] = await Promise.all([
      this.loadBedBoardOccupancyRows(facilityId),
      this.loadOperationalOverlays(facilityId),
    ]);
    return composeFacilityBedBoard({
      facilityId,
      unitFilter: unitFilter ?? null,
      encounters,
      overlays,
    });
  }

  async updateBedStatus(
    facilityId: string,
    bedKeyRaw: string,
    data: BedStatusUpdateDto,
    userId?: string,
    ip?: string,
    userAgent?: string
  ): Promise<ComposedBedBoardRow> {
    const parsed = parseBedKeyParam(bedKeyRaw);
    if (!parsed) {
      throw new BadRequestException("Invalid bed key");
    }
    if (!validateBedInPool(parsed.unit, parsed.room)) {
      throw new BadRequestException("Bed is not in the unit pool");
    }

    const status = normalizeBedOperationalStatus(data.status);
    if (!status || !isManualBedOperationalStatusWritable(status)) {
      throw new BadRequestException("Invalid or non-writable bed status");
    }
    if (rejectDerivedBedOperationalStatusWrite(status)) {
      throw new BadRequestException("Derived bed statuses cannot be written manually");
    }

    const bedDisplay = formatCanonicalBedDisplay(parsed.bedKey);
    const currentRow = await this.getEffectiveBedRow(facilityId, parsed.bedKey);
    const oldStatus = currentRow?.status ?? "AVAILABLE";

    if (
      manualStatusBlockedByOccupancy({
        targetStatus: status,
        bedStatus: oldStatus,
        occupantEncounterId: currentRow?.occupantEncounterId,
      })
    ) {
      throwBedOccupiedBlocksStatusChange({
        bedKey: parsed.bedKey,
        bedDisplay,
        status: oldStatus,
        targetStatus: status,
        occupantEncounterId: currentRow?.occupantEncounterId,
      });
    }

    const cleared = status === "AVAILABLE";
    const metadata = {
      event: BED_STATUS_UPDATE_EVENT,
      bedKey: parsed.bedKey,
      bedDisplay,
      unitCode: parsed.unit,
      room: parsed.room,
      status,
      oldStatus,
      newStatus: status,
      reasonCode: data.reasonCode?.trim() || null,
      reasonText: data.reasonText?.trim() || null,
      cleared,
    };

    await this.audit.log(AuditAction.UPDATE, FACILITY_BED_ENTITY_TYPE, {
      userId,
      facilityId,
      entityId: parsed.bedKey,
      ip,
      userAgent,
      metadata,
    });

    const overlays = await this.loadOperationalOverlays(facilityId);
    overlays.set(parsed.bedKey, {
      bedKey: parsed.bedKey,
      bedDisplay,
      unitCode: parsed.unit,
      room: parsed.room,
      status,
      cleared,
      reasonCode: metadata.reasonCode,
      reasonText: metadata.reasonText,
      updatedAt: new Date().toISOString(),
    });

    const board = composeFacilityBedBoard({
      facilityId,
      unitFilter: parsed.unit,
      encounters: await this.loadBedBoardOccupancyRows(facilityId),
      overlays,
    });
    const row = findComposedBedBoardRow(board, parsed.bedKey);
    if (!row) {
      throw new NotFoundException("Bed not found");
    }
    if (process.env.BEDBOARD_MUTATION_DEBUG === "true") {
      console.debug("[Medora BedBoardMutation:updateBedStatus]", {
        facilityId,
        bedKey: parsed.bedKey,
        oldStatus,
        newStatus: status,
        responseStatus: row.status,
      });
    }
    return enrichComposedBedBoardRow(row);
  }

  assertBedAssignableOrThrow(input: {
    bedRow: ComposedBedBoardRow;
    confirmBedStatusOverride?: boolean;
  }): void {
    const occupancyHandled: BedOperationalStatus[] = [
      "OCCUPIED",
      "TRANSFER_PENDING",
      "DISCHARGE_PENDING",
    ];
    if (occupancyHandled.includes(input.bedRow.status)) {
      return;
    }
    if (!requiresBedAssignmentOverride(input.bedRow.status)) {
      return;
    }
    if (input.confirmBedStatusOverride === true) {
      return;
    }
    throwBedStatusBlocksAssignmentConflict({
      bedKey: input.bedRow.bedKey,
      bedDisplay: input.bedRow.display,
      status: input.bedRow.status,
      reasonCode: input.bedRow.reasonCode,
      reasonText: input.bedRow.reasonText,
    });
  }

  async loadOperationalOverlays(
    facilityId: string
  ): Promise<Map<string, BedOperationalOverlayRecord>> {
    const rows = await this.prisma.auditLog.findMany({
      where: {
        facilityId,
        entityType: FACILITY_BED_ENTITY_TYPE,
      },
      orderBy: { createdAt: "desc" },
      select: {
        entityId: true,
        metadata: true,
        createdAt: true,
      },
      take: 5000,
    });

    const map = new Map<string, BedOperationalOverlayRecord>();
    for (const row of rows) {
      const bedKey = row.entityId?.trim();
      if (!bedKey || map.has(bedKey)) continue;
      const overlay = this.parseOverlayFromAuditMetadata(bedKey, row.metadata, row.createdAt);
      if (overlay) {
        map.set(bedKey, overlay);
      }
    }
    return map;
  }

  private parseOverlayFromAuditMetadata(
    bedKey: string,
    metadata: unknown,
    createdAt: Date
  ): BedOperationalOverlayRecord | null {
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
    const meta = metadata as Record<string, unknown>;
    if (meta.event !== BED_STATUS_UPDATE_EVENT) return null;

    const status = normalizeBedOperationalStatus(meta.status);
    if (!status) return null;

    const parsed = parseCanonicalBedKey(bedKey);
    return {
      bedKey,
      bedDisplay: typeof meta.bedDisplay === "string" ? meta.bedDisplay : formatCanonicalBedDisplay(bedKey),
      unitCode: parsed?.unit ?? null,
      room: parsed?.room ?? null,
      status,
      cleared: meta.cleared === true || status === "AVAILABLE",
      reasonCode: typeof meta.reasonCode === "string" ? meta.reasonCode : null,
      reasonText: typeof meta.reasonText === "string" ? meta.reasonText : null,
      updatedAt: createdAt.toISOString(),
    };
  }

  private async loadBedBoardOccupancyRows(facilityId: string): Promise<BedBoardOccupancyRow[]> {
    const rows = await this.prisma.encounter.findMany({
      where: {
        facilityId,
        status: EncounterStatus.OPEN,
        roomLabel: { not: null },
      },
      select: {
        id: true,
        facilityId: true,
        roomLabel: true,
        status: true,
        type: true,
        workflowState: true,
        disposition: true,
        admissionSummaryJson: true,
        dischargeSummaryJson: true,
        nursingAssessment: true,
        patient: {
          select: {
            firstName: true,
            lastName: true,
            mrn: true,
            dob: true,
            sexAtBirth: true,
            sex: true,
          },
        },
      },
    });

    return rows
      .filter((row) => {
        if (row.type !== "EMERGENCY") return true;
        return !isEdPhysicalDepartureCompleted({
          dischargeSummaryJson: row.dischargeSummaryJson,
          admissionSummaryJson: row.admissionSummaryJson,
          nursingAssessment: row.nursingAssessment,
        });
      })
      .map((row) => ({
        id: row.id,
        facilityId: row.facilityId,
        roomLabel: row.roomLabel,
        status: row.status,
        type: row.type,
        workflowState: row.workflowState,
        disposition: row.disposition,
        admissionSummaryJson: row.admissionSummaryJson,
        patientFirstName: row.patient?.firstName ?? null,
        patientLastName: row.patient?.lastName ?? null,
        patientMrn: row.patient?.mrn ?? null,
        patientDob: row.patient?.dob ?? null,
        patientSexAtBirth: row.patient?.sexAtBirth ?? null,
        patientSex: row.patient?.sex ?? null,
      }));
  }

  buildBedKeyForAssignment(unit: EncounterBedUnitCode, room: string): string {
    return buildCanonicalBedKey(unit, room);
  }

  async getBedStatusHistory(
    facilityId: string,
    bedKeyRaw: string,
    limit = 10
  ): Promise<BedStatusHistoryEntry[]> {
    const parsed = parseBedKeyParam(bedKeyRaw);
    if (!parsed) {
      throw new BadRequestException("Invalid bed key");
    }

    const rows = await this.prisma.auditLog.findMany({
      where: {
        facilityId,
        entityType: FACILITY_BED_ENTITY_TYPE,
        entityId: parsed.bedKey,
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(limit, 1), 10),
      select: {
        id: true,
        createdAt: true,
        metadata: true,
        user: { select: { firstName: true, lastName: true } },
      },
    });

    return rows
      .map((row) => this.parseHistoryEntryFromAudit(row))
      .filter((entry): entry is BedStatusHistoryEntry => Boolean(entry));
  }

  private parseHistoryEntryFromAudit(row: {
    id: string;
    createdAt: Date;
    metadata: unknown;
    user: { firstName: string; lastName: string } | null;
  }): BedStatusHistoryEntry | null {
    if (!row.metadata || typeof row.metadata !== "object" || Array.isArray(row.metadata)) {
      return null;
    }
    const meta = row.metadata as Record<string, unknown>;
    if (meta.event !== BED_STATUS_UPDATE_EVENT) return null;

    const newStatus =
      normalizeBedOperationalStatus(meta.newStatus) ??
      normalizeBedOperationalStatus(meta.status);
    if (!newStatus) return null;

    const oldStatus =
      normalizeBedOperationalStatus(meta.oldStatus) ??
      null;

    const actorDisplay = row.user
      ? `${row.user.firstName} ${row.user.lastName}`.trim()
      : null;

    return {
      id: row.id,
      occurredAt: row.createdAt.toISOString(),
      actorDisplay,
      oldStatus,
      newStatus,
      reasonText: typeof meta.reasonText === "string" ? meta.reasonText : null,
      reasonCode: typeof meta.reasonCode === "string" ? meta.reasonCode : null,
    };
  }
}
