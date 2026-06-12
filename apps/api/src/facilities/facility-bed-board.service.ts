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
  composeFacilityBedBoard,
  findComposedBedBoardRow,
  formatCanonicalBedDisplay,
  isManualBedOperationalStatusWritable,
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

    const [encounters, overlays] = await Promise.all([
      this.loadBedBoardOccupancyRows(facilityId),
      this.loadOperationalOverlays(facilityId),
    ]);

    return composeFacilityBedBoard({
      facilityId,
      unitFilter: unit,
      encounters,
      overlays,
    });
  }

  async getEffectiveBedRow(facilityId: string, bedKey: string): Promise<ComposedBedBoardRow | null> {
    const parsed = parseCanonicalBedKey(bedKey);
    if (!parsed) return null;
    const board = await this.getBedBoard(facilityId, parsed.unit);
    return findComposedBedBoardRow(board, bedKey);
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
    const cleared = status === "AVAILABLE";
    const metadata = {
      event: BED_STATUS_UPDATE_EVENT,
      bedKey: parsed.bedKey,
      bedDisplay,
      unitCode: parsed.unit,
      room: parsed.room,
      status,
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
    return row;
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
        patient: { select: { firstName: true, lastName: true, mrn: true } },
      },
    });

    return rows.map((row) => ({
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
    }));
  }

  buildBedKeyForAssignment(unit: EncounterBedUnitCode, room: string): string {
    return buildCanonicalBedKey(unit, room);
  }
}
