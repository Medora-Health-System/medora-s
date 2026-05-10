import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  AuditAction,
  ChartRoiRequestStatus,
  Prisma,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import { EncounterChartExportService } from "../encounters/chart-export.service";
import type {
  CreateChartRoiRequestDto,
} from "./chart-roi.dto";
import { fulfillChartRoiRequestDtoSchema } from "./chart-roi.dto";

const ROI_ENTITY = "CHART_ROI_REQUEST" as const;

/** PHI-safe audit metadata for ROI lifecycle (ids + enums + status only). */
function roiAuditMetadata(
  row: Pick<
    Prisma.ChartRoiRequestGetPayload<object>,
    "id" | "facilityId" | "patientId" | "encounterId" | "status" | "requestType" | "deliveryMethod" | "encounterChartExportId"
  >,
  extra?: Record<string, unknown>
): Record<string, unknown> {
  return {
    roiRequestId: row.id,
    facilityId: row.facilityId,
    patientId: row.patientId,
    encounterId: row.encounterId,
    requestType: row.requestType,
    status: row.status,
    deliveryMethod: row.deliveryMethod ?? undefined,
    snapshotId: row.encounterChartExportId ?? undefined,
    ...extra,
  };
}

@Injectable()
export class ChartRoiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly chartExport: EncounterChartExportService
  ) {}

  async create(
    facilityId: string,
    dto: CreateChartRoiRequestDto,
    userId: string,
    ip?: string,
    userAgent?: string
  ) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, facilityId },
      select: { id: true },
    });
    if (!patient) {
      throw new NotFoundException("Patient not found");
    }
    if (dto.encounterId) {
      const enc = await this.prisma.encounter.findFirst({
        where: { id: dto.encounterId, facilityId, patientId: dto.patientId },
        select: { id: true },
      });
      if (!enc) {
        throw new NotFoundException("Encounter not found for this patient");
      }
    }

    const row = await this.prisma.chartRoiRequest.create({
      data: {
        facilityId,
        patientId: dto.patientId,
        encounterId: dto.encounterId ?? null,
        requestedByUserId: userId,
        requestType: dto.requestType,
        purpose: dto.purpose,
        recipientName: dto.recipientName ?? null,
        recipientOrganization: dto.recipientOrganization ?? null,
        deliveryMethod: dto.deliveryMethod ?? null,
        authorizationReference: dto.authorizationReference ?? null,
        status: ChartRoiRequestStatus.DRAFT,
      },
    });

    await this.audit.log(AuditAction.ROI_REQUEST_CREATE, ROI_ENTITY, {
      userId,
      facilityId,
      patientId: row.patientId,
      encounterId: row.encounterId ?? undefined,
      entityId: row.id,
      ip,
      userAgent,
      metadata: roiAuditMetadata(row),
    });

    return this.serialize(row);
  }

  async list(facilityId: string, status?: ChartRoiRequestStatus) {
    const rows = await this.prisma.chartRoiRequest.findMany({
      where: { facilityId, ...(status ? { status } : {}) },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return { items: rows.map((r) => this.serialize(r)) };
  }

  async getOne(facilityId: string, id: string) {
    const row = await this.prisma.chartRoiRequest.findFirst({
      where: { id, facilityId },
    });
    if (!row) throw new NotFoundException("ROI request not found");
    return this.serialize(row);
  }

  async approve(facilityId: string, id: string, userId: string, ip?: string, userAgent?: string) {
    const row = await this.requireRow(facilityId, id);
    if (row.status !== ChartRoiRequestStatus.DRAFT) {
      throw new ConflictException("Only DRAFT requests can be approved");
    }
    const updated = await this.prisma.chartRoiRequest.update({
      where: { id },
      data: {
        status: ChartRoiRequestStatus.APPROVED,
        approvedByUserId: userId,
        approvedAt: new Date(),
      },
    });
    await this.audit.log(AuditAction.ROI_REQUEST_APPROVE, ROI_ENTITY, {
      userId,
      facilityId,
      patientId: updated.patientId,
      encounterId: updated.encounterId ?? undefined,
      entityId: updated.id,
      ip,
      userAgent,
      metadata: roiAuditMetadata(updated),
    });
    return this.serialize(updated);
  }

  async deny(
    facilityId: string,
    id: string,
    userId: string,
    denialReason: string | null | undefined,
    ip?: string,
    userAgent?: string
  ) {
    const row = await this.requireRow(facilityId, id);
    if (row.status !== ChartRoiRequestStatus.DRAFT) {
      throw new ConflictException("Only DRAFT requests can be denied");
    }
    const updated = await this.prisma.chartRoiRequest.update({
      where: { id },
      data: {
        status: ChartRoiRequestStatus.DENIED,
        deniedAt: new Date(),
        denialReason: denialReason?.trim() || null,
      },
    });
    await this.audit.log(AuditAction.ROI_REQUEST_DENY, ROI_ENTITY, {
      userId,
      facilityId,
      patientId: updated.patientId,
      encounterId: updated.encounterId ?? undefined,
      entityId: updated.id,
      ip,
      userAgent,
      metadata: roiAuditMetadata(updated),
    });
    return this.serialize(updated);
  }

  async cancel(
    facilityId: string,
    id: string,
    userId: string,
    cancelledReason: string | null | undefined,
    ip?: string,
    userAgent?: string
  ) {
    const row = await this.requireRow(facilityId, id);
    if (
      row.status !== ChartRoiRequestStatus.DRAFT &&
      row.status !== ChartRoiRequestStatus.APPROVED
    ) {
      throw new ConflictException("Only DRAFT or APPROVED requests can be cancelled");
    }
    const updated = await this.prisma.chartRoiRequest.update({
      where: { id },
      data: {
        status: ChartRoiRequestStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledReason: cancelledReason?.trim() || null,
      },
    });
    await this.audit.log(AuditAction.ROI_REQUEST_CANCEL, ROI_ENTITY, {
      userId,
      facilityId,
      patientId: updated.patientId,
      encounterId: updated.encounterId ?? undefined,
      entityId: updated.id,
      ip,
      userAgent,
      metadata: roiAuditMetadata(updated),
    });
    return this.serialize(updated);
  }

  async fulfill(
    facilityId: string,
    id: string,
    userId: string,
    body: unknown,
    ip?: string,
    userAgent?: string
  ) {
    const parsed = fulfillChartRoiRequestDtoSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }
    const dto = parsed.data;
    const row = await this.requireRow(facilityId, id);
    if (row.status !== ChartRoiRequestStatus.APPROVED) {
      throw new ConflictException("Only APPROVED requests can be fulfilled");
    }

    let snapshotId: string;
    let encounterIdForSnapshot: string;

    if (dto.createSnapshotIfMissing) {
      if (!row.encounterId) {
        throw new BadRequestException(
          "createSnapshotIfMissing requires the ROI request to specify an encounterId"
        );
      }
      const snap = await this.chartExport.createSnapshot(
        facilityId,
        row.encounterId,
        userId,
        ip,
        userAgent
      );
      snapshotId = snap.id;
      encounterIdForSnapshot = row.encounterId;
    } else {
      if (!dto.snapshotId) {
        throw new BadRequestException("snapshotId is required");
      }
      const snap = await this.prisma.encounterChartExport.findFirst({
        where: {
          id: dto.snapshotId,
          facilityId,
          patientId: row.patientId,
        },
        select: { id: true, encounterId: true },
      });
      if (!snap) {
        throw new NotFoundException("Snapshot not found for this patient");
      }
      if (row.encounterId && snap.encounterId !== row.encounterId) {
        throw new BadRequestException("Snapshot encounter does not match ROI request encounter");
      }
      snapshotId = snap.id;
      encounterIdForSnapshot = snap.encounterId;
    }

    const updated = await this.prisma.chartRoiRequest.update({
      where: { id },
      data: {
        status: ChartRoiRequestStatus.FULFILLED,
        fulfilledAt: new Date(),
        fulfilledByUserId: userId,
        encounterChartExportId: snapshotId,
      },
    });

    await this.audit.log(AuditAction.ROI_REQUEST_FULFILL, ROI_ENTITY, {
      userId,
      facilityId,
      patientId: updated.patientId,
      encounterId: updated.encounterId ?? undefined,
      entityId: updated.id,
      ip,
      userAgent,
      critical: true,
      metadata: roiAuditMetadata(updated, {
        snapshotId,
        manifestLinked: true,
      }),
    });

    return {
      request: this.serialize(updated),
      snapshotId,
      encounterId: encounterIdForSnapshot,
    };
  }

  /**
   * Returns the immutable snapshot for a **FULFILLED** ROI request.
   * Emits `ROI_EXPORT_VIEW` (not `RECORD_EXPORT_VIEW`) so external disclosure
   * reads are distinguishable in the audit trail.
   */
  async getFulfilledSnapshotDocument(
    facilityId: string,
    roiRequestId: string,
    format: "json" | "html",
    userId: string,
    ip?: string,
    userAgent?: string
  ) {
    const row = await this.requireRow(facilityId, roiRequestId);
    if (row.status !== ChartRoiRequestStatus.FULFILLED || !row.encounterChartExportId) {
      throw new ConflictException("ROI request is not fulfilled or has no linked snapshot");
    }
    const snap = await this.prisma.encounterChartExport.findFirst({
      where: {
        id: row.encounterChartExportId,
        facilityId,
      },
      select: { encounterId: true },
    });
    if (!snap) {
      throw new NotFoundException("Linked snapshot not found");
    }

    const result = await this.chartExport.getSnapshot(
      facilityId,
      snap.encounterId,
      row.encounterChartExportId,
      format,
      userId,
      ip,
      userAgent,
      { skipRecordExportViewAudit: true }
    );

    await this.audit.log(AuditAction.ROI_EXPORT_VIEW, ROI_ENTITY, {
      userId,
      facilityId,
      patientId: row.patientId,
      encounterId: row.encounterId ?? snap.encounterId,
      entityId: row.id,
      ip,
      userAgent,
      metadata: {
        roiRequestId: row.id,
        snapshotId: row.encounterChartExportId,
        format,
        requestType: row.requestType,
        status: row.status,
      },
    });

    return result;
  }

  private async requireRow(facilityId: string, id: string) {
    const row = await this.prisma.chartRoiRequest.findFirst({ where: { id, facilityId } });
    if (!row) throw new NotFoundException("ROI request not found");
    return row;
  }

  private serialize(row: Prisma.ChartRoiRequestGetPayload<object>) {
    return {
      id: row.id,
      facilityId: row.facilityId,
      patientId: row.patientId,
      encounterId: row.encounterId,
      requestedByUserId: row.requestedByUserId,
      approvedByUserId: row.approvedByUserId,
      fulfilledByUserId: row.fulfilledByUserId,
      encounterChartExportId: row.encounterChartExportId,
      requestType: row.requestType,
      status: row.status,
      recipientName: row.recipientName,
      recipientOrganization: row.recipientOrganization,
      deliveryMethod: row.deliveryMethod,
      purpose: row.purpose,
      authorizationReference: row.authorizationReference,
      denialReason: row.denialReason,
      cancelledReason: row.cancelledReason,
      createdAt: row.createdAt.toISOString(),
      approvedAt: row.approvedAt?.toISOString() ?? null,
      fulfilledAt: row.fulfilledAt?.toISOString() ?? null,
      cancelledAt: row.cancelledAt?.toISOString() ?? null,
      deniedAt: row.deniedAt?.toISOString() ?? null,
    };
  }
}
