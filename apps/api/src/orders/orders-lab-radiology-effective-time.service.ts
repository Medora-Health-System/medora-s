import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import {
  AuditAction,
  OrderStatus,
  RoleCode,
  type OrderItem,
  type Prisma,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import type { LabRadiologyEffectiveClinicalTimeDto } from "@medora/shared";
import { deltaMinutesBetween } from "@medora/shared";
import {
  assertEncounterNotSigned,
  assertEncounterOpenForClinicalMutation,
} from "../encounters/encounter-sign-lock.util";
import { ENCOUNTER_CORE_SELECT, ENCOUNTER_NESTED_CORE_SELECT } from "../encounters/encounter-query-contracts";
import { assertParentOrderNotCancelled } from "../common/workflow/order-cancelled.guard";
import {
  encounterAnchorAt,
  labRadEffectiveTimeValidationMessage,
  parseLabRadEffectiveTimeIso,
  validateLabRadAdjust,
} from "./lab-radiology-effective-time.util";

type OrderItemWithOrder = OrderItem & {
  order: {
    id: string;
    facilityId: string;
    encounterId: string;
    type: string;
    status: OrderStatus;
    createdAt: Date;
    encounter: {
      id: string;
      patientId: string;
      status: string;
      createdAt: Date;
      admittedAt: Date | null;
      providerDocumentationStatus: string | null;
    };
  };
  result?: {
    id: string;
    verifiedAt: Date | null;
    effectiveResultedAt: Date | null;
    effectiveResultedAtVersion: number;
    effectiveFinalizedAt: Date | null;
    effectiveFinalizedAtVersion: number;
  } | null;
};

/**
 * Department worklist clinical-time adjustments only.
 * All effective* fields are stored as UTC Date; billing/claims must use documented anchors
 * (documentedCollectedAt, documentedPerformedAt, Result.verifiedAt) — never effective* fields.
 */
@Injectable()
export class OrdersLabRadiologyEffectiveTimeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  private assertLabActor(roleCodes: RoleCode[]) {
    if (roleCodes.includes(RoleCode.ADMIN) || roleCodes.includes(RoleCode.LAB)) return;
    throw new ForbiddenException("Rôle laboratoire requis pour ajuster l'heure clinique.");
  }

  private assertRadiologyActor(roleCodes: RoleCode[]) {
    if (roleCodes.includes(RoleCode.ADMIN) || roleCodes.includes(RoleCode.RADIOLOGY)) return;
    throw new ForbiddenException("Rôle imagerie requis pour ajuster l'heure clinique.");
  }

  private async loadOrderItem(facilityId: string, orderItemId: string): Promise<OrderItemWithOrder> {
    const row = await this.prisma.orderItem.findFirst({
      where: { id: orderItemId, order: { facilityId } },
      include: {
        order: { include: { encounter: { select: ENCOUNTER_NESTED_CORE_SELECT } } },
        result: true,
      },
    });
    if (!row) throw new NotFoundException("Ligne de commande introuvable.");
    return row as OrderItemWithOrder;
  }

  private guardClinicalMutation(row: OrderItemWithOrder) {
    assertEncounterOpenForClinicalMutation(row.order.encounter);
    assertEncounterNotSigned(row.order.encounter);
    assertParentOrderNotCancelled(row.order.status);
  }

  async setLabCollectedEffectiveTime(
    facilityId: string,
    orderItemId: string,
    dto: LabRadiologyEffectiveClinicalTimeDto,
    userId: string,
    roleCodes: RoleCode[],
    ip?: string,
    userAgent?: string
  ) {
    this.assertLabActor(roleCodes);
    const row = await this.loadOrderItem(facilityId, orderItemId);
    this.guardClinicalMutation(row);
    if (row.catalogItemType !== "LAB_TEST" || row.order.type !== "LAB") {
      throw new BadRequestException(labRadEffectiveTimeValidationMessage("WRONG_WORKFLOW"));
    }
    const documentedAt = row.documentedCollectedAt;
    if (!documentedAt) {
      throw new BadRequestException(labRadEffectiveTimeValidationMessage("NOT_READY"));
    }
    return this.applyOrderItemMilestone({
      row,
      facilityId,
      userId,
      ip,
      userAgent,
      dto,
      auditAction: AuditAction.LAB_TIME_ADJUSTED,
      milestone: "collected",
      prismaUpdate: (effectiveAtUtc, systemNow, reasonTrim) => ({
        effectiveCollectedAt: effectiveAtUtc,
        effectiveCollectedAtSetAt: systemNow,
        effectiveCollectedAtSetByUserId: userId,
        effectiveCollectedAtReason: reasonTrim,
        effectiveCollectedAtVersion: { increment: 1 },
      }),
      previousEffective: row.effectiveCollectedAt,
      documentedAt,
      adjustmentVersion: row.effectiveCollectedAtVersion,
    });
  }

  async setLabReceivedEffectiveTime(
    facilityId: string,
    orderItemId: string,
    dto: LabRadiologyEffectiveClinicalTimeDto,
    userId: string,
    roleCodes: RoleCode[],
    ip?: string,
    userAgent?: string
  ) {
    this.assertLabActor(roleCodes);
    const row = await this.loadOrderItem(facilityId, orderItemId);
    this.guardClinicalMutation(row);
    if (row.catalogItemType !== "LAB_TEST" || row.order.type !== "LAB") {
      throw new BadRequestException(labRadEffectiveTimeValidationMessage("WRONG_WORKFLOW"));
    }
    const documentedAt = row.documentedReceivedAt;
    if (!documentedAt) {
      throw new BadRequestException(labRadEffectiveTimeValidationMessage("NOT_READY"));
    }
    return this.applyOrderItemMilestone({
      row,
      facilityId,
      userId,
      ip,
      userAgent,
      dto,
      auditAction: AuditAction.LAB_TIME_ADJUSTED,
      milestone: "received",
      prismaUpdate: (effectiveAtUtc, systemNow, reasonTrim) => ({
        effectiveReceivedAt: effectiveAtUtc,
        effectiveReceivedAtSetAt: systemNow,
        effectiveReceivedAtSetByUserId: userId,
        effectiveReceivedAtReason: reasonTrim,
        effectiveReceivedAtVersion: { increment: 1 },
      }),
      previousEffective: row.effectiveReceivedAt,
      documentedAt,
      adjustmentVersion: row.effectiveReceivedAtVersion,
    });
  }

  async setImagingPerformedEffectiveTime(
    facilityId: string,
    orderItemId: string,
    dto: LabRadiologyEffectiveClinicalTimeDto,
    userId: string,
    roleCodes: RoleCode[],
    ip?: string,
    userAgent?: string
  ) {
    this.assertRadiologyActor(roleCodes);
    const row = await this.loadOrderItem(facilityId, orderItemId);
    this.guardClinicalMutation(row);
    if (row.catalogItemType !== "IMAGING_STUDY" || row.order.type !== "IMAGING") {
      throw new BadRequestException(labRadEffectiveTimeValidationMessage("WRONG_WORKFLOW"));
    }
    const documentedAt = row.documentedPerformedAt;
    if (!documentedAt) {
      throw new BadRequestException(labRadEffectiveTimeValidationMessage("NOT_READY"));
    }
    return this.applyOrderItemMilestone({
      row,
      facilityId,
      userId,
      ip,
      userAgent,
      dto,
      auditAction: AuditAction.RADIOLOGY_TIME_ADJUSTED,
      milestone: "performed",
      prismaUpdate: (effectiveAtUtc, systemNow, reasonTrim) => ({
        effectivePerformedAt: effectiveAtUtc,
        effectivePerformedAtSetAt: systemNow,
        effectivePerformedAtSetByUserId: userId,
        effectivePerformedAtReason: reasonTrim,
        effectivePerformedAtVersion: { increment: 1 },
      }),
      previousEffective: row.effectivePerformedAt,
      documentedAt,
      adjustmentVersion: row.effectivePerformedAtVersion,
    });
  }

  async setLabResultedEffectiveTime(
    facilityId: string,
    orderItemId: string,
    dto: LabRadiologyEffectiveClinicalTimeDto,
    userId: string,
    roleCodes: RoleCode[],
    ip?: string,
    userAgent?: string
  ) {
    this.assertLabActor(roleCodes);
    const row = await this.loadOrderItem(facilityId, orderItemId);
    this.guardClinicalMutation(row);
    if (row.catalogItemType !== "LAB_TEST" || row.order.type !== "LAB") {
      throw new BadRequestException(labRadEffectiveTimeValidationMessage("WRONG_WORKFLOW"));
    }
    const result = row.result;
    if (!result?.verifiedAt) {
      throw new BadRequestException(labRadEffectiveTimeValidationMessage("NOT_READY"));
    }
    return this.applyResultMilestone({
      row,
      facilityId,
      userId,
      ip,
      userAgent,
      dto,
      auditAction: AuditAction.LAB_TIME_ADJUSTED,
      milestone: "resulted",
      documentedAt: result.verifiedAt,
      previousEffective: result.effectiveResultedAt,
      adjustmentVersion: result.effectiveResultedAtVersion,
      prismaUpdate: (effectiveAtUtc, systemNow, reasonTrim) => ({
        effectiveResultedAt: effectiveAtUtc,
        effectiveResultedAtSetAt: systemNow,
        effectiveResultedAtSetByUserId: userId,
        effectiveResultedAtReason: reasonTrim,
        effectiveResultedAtVersion: { increment: 1 },
      }),
    });
  }

  async setImagingFinalizedEffectiveTime(
    facilityId: string,
    orderItemId: string,
    dto: LabRadiologyEffectiveClinicalTimeDto,
    userId: string,
    roleCodes: RoleCode[],
    ip?: string,
    userAgent?: string
  ) {
    this.assertRadiologyActor(roleCodes);
    const row = await this.loadOrderItem(facilityId, orderItemId);
    this.guardClinicalMutation(row);
    if (row.catalogItemType !== "IMAGING_STUDY" || row.order.type !== "IMAGING") {
      throw new BadRequestException(labRadEffectiveTimeValidationMessage("WRONG_WORKFLOW"));
    }
    const result = row.result;
    if (!result?.verifiedAt) {
      throw new BadRequestException(labRadEffectiveTimeValidationMessage("NOT_READY"));
    }
    return this.applyResultMilestone({
      row,
      facilityId,
      userId,
      ip,
      userAgent,
      dto,
      auditAction: AuditAction.RADIOLOGY_TIME_ADJUSTED,
      milestone: "finalized",
      documentedAt: result.verifiedAt,
      previousEffective: result.effectiveFinalizedAt,
      adjustmentVersion: result.effectiveFinalizedAtVersion,
      prismaUpdate: (effectiveAtUtc, systemNow, reasonTrim) => ({
        effectiveFinalizedAt: effectiveAtUtc,
        effectiveFinalizedAtSetAt: systemNow,
        effectiveFinalizedAtSetByUserId: userId,
        effectiveFinalizedAtReason: reasonTrim,
        effectiveFinalizedAtVersion: { increment: 1 },
      }),
    });
  }

  private async applyOrderItemMilestone(input: {
    row: OrderItemWithOrder;
    facilityId: string;
    userId: string;
    ip?: string;
    userAgent?: string;
    dto: LabRadiologyEffectiveClinicalTimeDto;
    auditAction: AuditAction;
    milestone: string;
    documentedAt: Date;
    previousEffective: Date | null;
    adjustmentVersion: number;
    prismaUpdate: (
      effectiveAtUtc: Date,
      systemNow: Date,
      reasonTrim: string | null
    ) => Prisma.OrderItemUpdateInput;
  }) {
    const systemNow = new Date();
    const effectiveAt = parseLabRadEffectiveTimeIso(input.dto.effectiveClinicalTime);
    const reasonTrim = input.dto.reason?.trim() || null;
    const effectiveAtUtc = validateLabRadAdjust({
      effectiveTime: effectiveAt,
      now: systemNow,
      encounter: input.row.order.encounter,
      documentedAt: input.documentedAt,
      orderCreatedAt: input.row.order.createdAt,
      orderItemCreatedAt: input.row.createdAt,
      adjustmentVersion: input.adjustmentVersion,
      reason: reasonTrim,
    });

    const updated = await this.prisma.orderItem.update({
      where: { id: input.row.id },
      data: input.prismaUpdate(effectiveAtUtc, systemNow, reasonTrim),
    });

    await this.audit.log(input.auditAction, "ORDER_ITEM", {
      userId: input.userId,
      facilityId: input.facilityId,
      patientId: input.row.order.encounter.patientId,
      encounterId: input.row.order.encounterId,
      orderId: input.row.order.id,
      entityId: input.row.id,
      ip: input.ip,
      userAgent: input.userAgent,
      critical: true,
      metadata: {
        orderItemId: input.row.id,
        encounterId: input.row.order.encounterId,
        milestone: input.milestone,
        domain: input.auditAction === AuditAction.LAB_TIME_ADJUSTED ? "LAB" : "RADIOLOGY",
        previousEffectiveAt: input.previousEffective?.toISOString() ?? null,
        newEffectiveAt: effectiveAtUtc.toISOString(),
        documentedAt: input.documentedAt.toISOString(),
        deltaMinutes: deltaMinutesBetween(effectiveAtUtc, input.documentedAt),
        reasonProvided: Boolean(reasonTrim),
        source: "DEPT_WORKLIST",
      },
    });

    return updated;
  }

  private async applyResultMilestone(input: {
    row: OrderItemWithOrder;
    facilityId: string;
    userId: string;
    ip?: string;
    userAgent?: string;
    dto: LabRadiologyEffectiveClinicalTimeDto;
    auditAction: AuditAction;
    milestone: string;
    documentedAt: Date;
    previousEffective: Date | null;
    adjustmentVersion: number;
    prismaUpdate: (
      effectiveAtUtc: Date,
      systemNow: Date,
      reasonTrim: string | null
    ) => Prisma.ResultUpdateInput;
  }) {
    const systemNow = new Date();
    const effectiveAt = parseLabRadEffectiveTimeIso(input.dto.effectiveClinicalTime);
    const reasonTrim = input.dto.reason?.trim() || null;
    const effectiveAtUtc = validateLabRadAdjust({
      effectiveTime: effectiveAt,
      now: systemNow,
      encounter: input.row.order.encounter,
      documentedAt: input.documentedAt,
      orderCreatedAt: input.row.order.createdAt,
      orderItemCreatedAt: input.row.createdAt,
      adjustmentVersion: input.adjustmentVersion,
      reason: reasonTrim,
    });

    const updated = await this.prisma.result.update({
      where: { orderItemId: input.row.id },
      data: input.prismaUpdate(effectiveAtUtc, systemNow, reasonTrim),
    });

    await this.audit.log(input.auditAction, "RESULT", {
      userId: input.userId,
      facilityId: input.facilityId,
      patientId: input.row.order.encounter.patientId,
      encounterId: input.row.order.encounterId,
      orderId: input.row.order.id,
      entityId: updated.id,
      ip: input.ip,
      userAgent: input.userAgent,
      critical: true,
      metadata: {
        orderItemId: input.row.id,
        encounterId: input.row.order.encounterId,
        milestone: input.milestone,
        domain: input.auditAction === AuditAction.LAB_TIME_ADJUSTED ? "LAB" : "RADIOLOGY",
        previousEffectiveAt: input.previousEffective?.toISOString() ?? null,
        newEffectiveAt: effectiveAtUtc.toISOString(),
        documentedAt: input.documentedAt.toISOString(),
        deltaMinutes: deltaMinutesBetween(effectiveAtUtc, input.documentedAt),
        reasonProvided: Boolean(reasonTrim),
        source: "DEPT_WORKLIST",
      },
    });

    return updated;
  }
}
