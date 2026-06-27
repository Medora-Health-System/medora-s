import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { OrderStatus, RoleCode, Prisma } from "@prisma/client";
import {
  appendMarDoseScheduleAdjustmentHistory,
  buildMarDoseScheduleAdjustmentAuditEntry,
  computeMedicationDoseDueWindowsForScheduledAt,
  findMedicationDoseInstanceIdForScheduleAdjustment,
  resolveOriginalScheduledAtFromDose,
  validateMarDoseScheduleAdjustment,
  validateMarOrderItemScheduleAdjustment,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";

export type AdjustMedicationDoseScheduleInput = {
  facilityId: string;
  encounterId: string;
  doseInstanceId: string;
  userId: string;
  userDisplay: string | null;
  facilityTimeZone?: string | null;
  newScheduledAtIso: string;
  reasonCode: string;
  reasonDetail?: string | null;
};

@Injectable()
export class MedicationDoseScheduleAdjustmentService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveFacilityTimeZone(facilityId: string): Promise<string | null> {
    const facility = await this.prisma.facility.findUnique({
      where: { id: facilityId },
      select: { timezone: true },
    });
    return facility?.timezone?.trim() || null;
  }

  async adjustScheduledAt(input: AdjustMedicationDoseScheduleInput) {
    const dose = await this.prisma.medicationDoseInstance.findFirst({
      where: {
        id: input.doseInstanceId,
        facilityId: input.facilityId,
        encounterId: input.encounterId,
      },
      include: {
        orderItem: {
          select: {
            id: true,
            manualLabel: true,
            manualSecondaryText: true,
            strength: true,
            route: true,
          },
        },
      },
    });
    if (!dose) {
      throw new NotFoundException("Medication dose not found");
    }

    const validation = validateMarDoseScheduleAdjustment({
      doseStatus: dose.doseStatus,
      terminalMedicationAdministrationId: dose.terminalMedicationAdministrationId,
      originalScheduledAt: dose.scheduledAt,
      newScheduledAt: input.newScheduledAtIso,
      reasonCode: input.reasonCode,
      reasonDetail: input.reasonDetail,
    });
    if (!validation.ok) {
      throw new BadRequestException(validation.code);
    }

    const originalScheduledAt = resolveOriginalScheduledAtFromDose({
      scheduledAt: dose.scheduledAt,
      orderedDoseSnapshotJson: dose.orderedDoseSnapshotJson,
    });
    const facilityTimeZone =
      input.facilityTimeZone?.trim() ||
      (await this.resolveFacilityTimeZone(input.facilityId));
    const auditEntry = buildMarDoseScheduleAdjustmentAuditEntry({
      doseStatus: dose.doseStatus,
      terminalMedicationAdministrationId: dose.terminalMedicationAdministrationId,
      originalScheduledAt,
      previousScheduledAt: dose.scheduledAt,
      newScheduledAt: validation.newScheduledAt,
      reasonCode: input.reasonCode,
      reasonDetail: input.reasonDetail,
      changedByUserId: input.userId,
      changedByDisplay: input.userDisplay,
      facilityTimeZone,
    });
    const windows = computeMedicationDoseDueWindowsForScheduledAt(validation.newScheduledAt);
    const orderedDoseSnapshotJson = appendMarDoseScheduleAdjustmentHistory(
      dose.orderedDoseSnapshotJson,
      auditEntry
    ) as Prisma.InputJsonValue;

    const updated = await this.prisma.medicationDoseInstance.update({
      where: { id: dose.id },
      data: {
        scheduledAt: validation.newScheduledAt,
        dueWindowStartAt: windows.dueWindowStartAt,
        dueWindowEndAt: windows.dueWindowEndAt,
        overdueAt: windows.overdueAt,
        orderedDoseSnapshotJson,
      },
      select: {
        id: true,
        scheduledAt: true,
        dueWindowStartAt: true,
        dueWindowEndAt: true,
        doseStatus: true,
      },
    });

    return {
      doseInstanceId: updated.id,
      scheduledAt: updated.scheduledAt.toISOString(),
      dueWindowStartAt: updated.dueWindowStartAt.toISOString(),
      dueWindowEndAt: updated.dueWindowEndAt.toISOString(),
      doseStatus: updated.doseStatus,
      auditEntry,
    };
  }

  async resolveDoseInstanceForScheduleAdjustment(input: {
    facilityId: string;
    encounterId: string;
    orderItemId: string;
    scheduledAt?: string | null;
    medicationDoseInstanceId?: string | null;
  }): Promise<{ doseInstanceId: string | null; adjustTarget: "dose" | "order_item" }> {
    const explicitId = input.medicationDoseInstanceId?.trim();
    if (explicitId) {
      const dose = await this.prisma.medicationDoseInstance.findFirst({
        where: {
          id: explicitId,
          facilityId: input.facilityId,
          encounterId: input.encounterId,
          orderItemId: input.orderItemId,
        },
        select: { id: true },
      });
      if (dose) return { doseInstanceId: dose.id, adjustTarget: "dose" };
    }

    const doses = await this.prisma.medicationDoseInstance.findMany({
      where: {
        facilityId: input.facilityId,
        encounterId: input.encounterId,
        orderItemId: input.orderItemId,
      },
      select: { id: true, scheduledAt: true, doseStatus: true },
      orderBy: { scheduledAt: "asc" },
    });

    if (doses.length > 0) {
      const resolved = findMedicationDoseInstanceIdForScheduleAdjustment({
        doses,
        scheduledAt: input.scheduledAt ?? doses[0]!.scheduledAt.toISOString(),
      });
      if (resolved) return { doseInstanceId: resolved, adjustTarget: "dose" };
    }

    return { doseInstanceId: null, adjustTarget: "order_item" };
  }

  async adjustOrderItemScheduledAt(input: {
    facilityId: string;
    encounterId: string;
    orderItemId: string;
    userId: string;
    currentScheduledAtIso: string;
    newScheduledAtIso: string;
    reasonCode: string;
    reasonDetail?: string | null;
  }) {
    const orderItem = await this.prisma.orderItem.findFirst({
      where: {
        id: input.orderItemId,
        order: { encounterId: input.encounterId, encounter: { facilityId: input.facilityId } },
      },
      select: {
        id: true,
        status: true,
        frequencyCode: true,
        intendedAdministrationAt: true,
        createdAt: true,
      },
    });
    if (!orderItem) {
      throw new NotFoundException("Order item not found");
    }

    const doseCount = await this.prisma.medicationDoseInstance.count({
      where: {
        orderItemId: input.orderItemId,
        encounterId: input.encounterId,
        facilityId: input.facilityId,
      },
    });

    const originalScheduledAt =
      orderItem.intendedAdministrationAt ?? orderItem.createdAt ?? new Date(input.currentScheduledAtIso);

    const validation = validateMarOrderItemScheduleAdjustment({
      orderItemStatus: orderItem.status,
      frequencyCode: orderItem.frequencyCode,
      hasMedicationDoseInstances: doseCount > 0,
      originalScheduledAt,
      newScheduledAt: input.newScheduledAtIso,
      reasonCode: input.reasonCode,
    });
    if (!validation.ok) {
      throw new BadRequestException(validation.code);
    }

    if (
      orderItem.status === OrderStatus.COMPLETED ||
      orderItem.status === OrderStatus.CANCELLED
    ) {
      throw new BadRequestException("ORDER_ITEM_NOT_ADJUSTABLE");
    }

    const updated = await this.prisma.orderItem.update({
      where: { id: orderItem.id },
      data: { intendedAdministrationAt: validation.newScheduledAt },
      select: {
        id: true,
        intendedAdministrationAt: true,
        frequencyCode: true,
        status: true,
      },
    });

    return {
      orderItemId: updated.id,
      scheduledAt: updated.intendedAdministrationAt?.toISOString() ?? validation.newScheduledAt.toISOString(),
      adjustTarget: "order_item" as const,
      reasonCode: input.reasonCode.trim().toUpperCase(),
    };
  }
}

export function assertMarDoseScheduleAdjustmentRoles(roleCodes: RoleCode[]): void {
  const allowed = new Set<RoleCode>([RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN]);
  if (!roleCodes.some((role) => allowed.has(role))) {
    throw new ForbiddenException("Insufficient role for medication dose schedule adjustment");
  }
}
