import { Injectable, NotFoundException } from "@nestjs/common";
import {
  formatMarShiftTimelineClinicianDisplay,
  normalizeMedicationAdministrationHistoryMarRow,
  normalizeMedicationAdministrationHistoryResponseRows,
  normalizeMedicationAdministrationHistoryRespiratoryResponseRows,
  normalizeMedicationAdministrationHistoryAllergyReviewRows,
  normalizeMedicationAdministrationHistoryCorrectionRow,
  normalizeMedicationAdministrationHistoryOrderCancelRow,
  normalizeMedicationAdministrationHistoryScheduleAdjustmentRow,
  resolveMedicationOrderCancelMetadata,
  readMarDoseScheduleAdjustmentHistory,
  sortMedicationAdministrationHistoryEntries,
  type MedicationAdministrationHistoryEntry,
  type MedicationAdministrationHistoryEventType,
} from "@medora/shared";
import { OrderItemLifecycleState, OrderStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  ENCOUNTER_MAR_LIST_DEFAULT_LIMIT,
  ENCOUNTER_MAR_LIST_MAX_LIMIT,
  ENCOUNTER_MAR_LOOKBACK_DAYS,
  encounterClinicalLookbackStart,
  resolveBoundedListLimit,
} from "../common/encounter-clinical-read-limits";
import { MEDICATION_ADMINISTRATION_ENCOUNTER_LIST_SELECT } from "./medication-administration-encounter-list.select";

export type MedicationAdministrationHistoryQuery = {
  limit?: number;
  lookbackDays?: number;
  eventType?: MedicationAdministrationHistoryEventType;
  orderItemId?: string;
};

const CANCELED_ORDER_ITEM_SELECT = {
  id: true,
  orderId: true,
  manualLabel: true,
  manualSecondaryText: true,
  strength: true,
  quantity: true,
  route: true,
  frequencyCode: true,
  notes: true,
  lifecycleState: true,
  status: true,
  order: {
    select: {
      id: true,
      encounterId: true,
      type: true,
      status: true,
      cancelledAt: true,
      cancellationReason: true,
      cancelledByUserId: true,
      cancelledBy: {
        select: { firstName: true, lastName: true },
      },
    },
  },
} as const;

function formatMedicationLabelFromOrderItem(row: {
  manualLabel: string | null;
  manualSecondaryText: string | null;
  strength: string | null;
}): string {
  const primary = row.manualLabel?.trim() || row.manualSecondaryText?.trim();
  const strength = row.strength?.trim();
  if (primary && strength) return `${primary} ${strength}`;
  return primary || strength || "Medication";
}

function formatDoseFromOrderItem(row: {
  strength: string | null;
  quantity: number | null;
}): string | null {
  const strength = row.strength?.trim();
  if (strength) return strength;
  if (row.quantity != null) return String(row.quantity);
  return null;
}

function isCanceledMedicationOrderItem(row: {
  lifecycleState: string;
  status: OrderStatus;
  order: { status: OrderStatus };
}): boolean {
  return (
    row.lifecycleState === OrderItemLifecycleState.CANCELLED ||
    row.status === OrderStatus.CANCELLED ||
    row.order.status === OrderStatus.CANCELLED
  );
}

@Injectable()
export class MedicationAdministrationHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEncounter(
    encounterId: string,
    facilityId: string,
    query: MedicationAdministrationHistoryQuery = {}
  ): Promise<MedicationAdministrationHistoryEntry[]> {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: { id: true },
    });
    if (!encounter) {
      throw new NotFoundException("Encounter not found");
    }

    const limit = resolveBoundedListLimit(
      query.limit,
      ENCOUNTER_MAR_LIST_DEFAULT_LIMIT,
      ENCOUNTER_MAR_LIST_MAX_LIMIT
    );
    const lookbackDays =
      query.lookbackDays != null && Number.isFinite(query.lookbackDays) && query.lookbackDays > 0
        ? Math.floor(query.lookbackDays)
        : ENCOUNTER_MAR_LOOKBACK_DAYS;
    const lookbackStart = encounterClinicalLookbackStart(new Date(), lookbackDays);
    const orderItemFilter = query.orderItemId?.trim() || null;
    const eventTypeFilter = query.eventType ?? null;

    const marRows = await this.prisma.medicationAdministration.findMany({
      where: {
        encounterId,
        facilityId,
        administeredAt: { gte: lookbackStart },
        ...(orderItemFilter ? { orderItemId: orderItemFilter } : {}),
      },
      orderBy: { administeredAt: "desc" },
      take: limit,
      select: {
        ...MEDICATION_ADMINISTRATION_ENCOUNTER_LIST_SELECT,
        orderItem: {
          select: {
            frequencyCode: true,
            notes: true,
          },
        },
      },
    });

    const performerIds = [
      ...new Set(marRows.map((row) => row.administeredByUserId).filter(Boolean)),
    ];
    const roleByUserId = await this.loadPrimaryRoleByUserId(facilityId, performerIds);

    const doseIds = [
      ...new Set(
        marRows.map((row) => row.medicationDoseInstanceId).filter((id): id is string => Boolean(id?.trim()))
      ),
    ];
    const doseById = await this.loadDoseVarianceContextById(facilityId, encounterId, doseIds);

    const marEntries = marRows.flatMap((row) => {
      const doseCtx = row.medicationDoseInstanceId
        ? doseById.get(row.medicationDoseInstanceId) ?? null
        : null;
      const marEntry = normalizeMedicationAdministrationHistoryMarRow({
        id: row.id,
        encounterId: row.encounterId,
        orderItemId: row.orderItemId,
        administeredAt: row.administeredAt,
        effectiveAdministeredAt: row.effectiveAdministeredAt,
        createdAt: row.createdAt,
        effectiveAdministeredAtReason: row.effectiveAdministeredAtReason,
        medicationLabelSnapshot: row.medicationLabelSnapshot,
        route: row.route,
        doseValue: row.doseValue?.toString() ?? null,
        doseUnit: row.doseUnit,
        marAction: row.marAction,
        notes: row.notes,
        infusionPhase: row.infusionPhase,
        medicationDoseInstanceId: row.medicationDoseInstanceId,
        performedByFirstName: row.administeredBy.firstName,
        performedByLastName: row.administeredBy.lastName,
        performedByRole: roleByUserId.get(row.administeredByUserId) ?? null,
        orderItemFrequencyCode: row.orderItem?.frequencyCode ?? null,
        orderItemDirectionsSig: row.orderItem?.notes ?? null,
        doseScheduledAt: doseCtx?.scheduledAt ?? null,
        doseOrderedDoseSnapshotJson: doseCtx?.orderedDoseSnapshotJson,
      });
      const responseEntries = normalizeMedicationAdministrationHistoryResponseRows({
        marEntry,
        administrationId: row.id,
        notes: row.notes,
      });
      const respiratoryResponseEntries = normalizeMedicationAdministrationHistoryRespiratoryResponseRows({
        marEntry,
        administrationId: row.id,
        notes: row.notes,
      });
      const allergyReviewEntries = normalizeMedicationAdministrationHistoryAllergyReviewRows({
        marEntry,
        administrationId: row.id,
        notes: row.notes,
      });
      return [marEntry, ...responseEntries, ...respiratoryResponseEntries, ...allergyReviewEntries];
    });

    const cancelEntries = await this.loadOrderCancelHistoryEntries({
      encounterId,
      facilityId,
      lookbackStart,
      orderItemFilter,
      roleByUserId,
    });

    const correctionEntries = await this.loadCorrectionHistoryEntries({
      encounterId,
      facilityId,
      lookbackStart,
      orderItemFilter,
      roleByUserId,
    });

    const scheduleAdjustmentEntries = await this.loadScheduleAdjustmentHistoryEntries({
      encounterId,
      facilityId,
      lookbackStart,
      orderItemFilter,
    });

    let merged = sortMedicationAdministrationHistoryEntries([
      ...marEntries,
      ...cancelEntries,
      ...correctionEntries,
      ...scheduleAdjustmentEntries,
    ]);

    if (eventTypeFilter) {
      merged = merged.filter((entry) => entry.eventType === eventTypeFilter);
    }

    return merged.slice(0, limit);
  }

  private async loadOrderCancelHistoryEntries(input: {
    encounterId: string;
    facilityId: string;
    lookbackStart: Date;
    orderItemFilter: string | null;
    roleByUserId: Map<string, string>;
  }): Promise<MedicationAdministrationHistoryEntry[]> {
    const orderItems = await this.prisma.orderItem.findMany({
      where: {
        catalogItemType: "MEDICATION",
        medicationFulfillmentIntent: "ADMINISTER_CHART",
        ...(input.orderItemFilter ? { id: input.orderItemFilter } : {}),
        order: {
          encounterId: input.encounterId,
          facilityId: input.facilityId,
          type: "MEDICATION",
        },
        OR: [
          { lifecycleState: OrderItemLifecycleState.CANCELLED },
          { status: OrderStatus.CANCELLED },
          { order: { status: OrderStatus.CANCELLED } },
        ],
      },
      select: CANCELED_ORDER_ITEM_SELECT,
    });

    const canceledItems = orderItems.filter(isCanceledMedicationOrderItem);
    if (canceledItems.length === 0) return [];

    const orderIds = [...new Set(canceledItems.map((row) => row.orderId))];
    const cancelEvents = await this.prisma.orderEvent.findMany({
      where: {
        orderId: { in: orderIds },
        eventType: "CANCELLED",
        performedAt: { gte: input.lookbackStart },
      },
      orderBy: { performedAt: "desc" },
      select: {
        id: true,
        orderId: true,
        performedAt: true,
        performedByUserId: true,
        note: true,
        metadata: true,
        performedBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    const eventsByOrderId = new Map<string, typeof cancelEvents>();
    for (const event of cancelEvents) {
      const list = eventsByOrderId.get(event.orderId) ?? [];
      list.push(event);
      eventsByOrderId.set(event.orderId, list);
    }

    const cancelPerformerIds = [
      ...new Set(
        cancelEvents
          .map((event) => event.performedByUserId)
          .filter((id): id is string => Boolean(id?.trim()))
      ),
    ];
    const cancelRoles = await this.loadPrimaryRoleByUserId(input.facilityId, cancelPerformerIds);
    for (const [userId, role] of cancelRoles) {
      if (!input.roleByUserId.has(userId)) {
        input.roleByUserId.set(userId, role);
      }
    }

    const entries: MedicationAdministrationHistoryEntry[] = [];

    for (const orderItem of canceledItems) {
      const orderEvents = (eventsByOrderId.get(orderItem.orderId) ?? []).map((event) => ({
        performedAt: event.performedAt,
        performedByUserId: event.performedByUserId,
        performedByFirstName: event.performedBy?.firstName ?? null,
        performedByLastName: event.performedBy?.lastName ?? null,
        note: event.note,
        metadata: event.metadata,
        id: event.id,
      }));

      const cancelMeta = resolveMedicationOrderCancelMetadata({
        orderItemId: orderItem.id,
        orderCancelledAt: orderItem.order.cancelledAt,
        orderCancellationReason: orderItem.order.cancellationReason,
        orderCancelledByUserId: orderItem.order.cancelledByUserId,
        orderCancelledByDisplay: formatMarShiftTimelineClinicianDisplay(
          orderItem.order.cancelledBy?.firstName,
          orderItem.order.cancelledBy?.lastName
        ),
        cancelEvents: orderEvents,
      });
      if (!cancelMeta) continue;
      if (cancelMeta.cancelledAt.getTime() < input.lookbackStart.getTime()) continue;

      const matchingEvent = orderEvents.find((event) => {
        const meta = event.metadata;
        if (!meta || typeof meta !== "object" || Array.isArray(meta)) return false;
        const scope = String((meta as { cancelScope?: unknown }).cancelScope ?? "").toUpperCase();
        const eventOrderItemId = String((meta as { orderItemId?: unknown }).orderItemId ?? "").trim();
        return scope === "ORDER_ITEM" && eventOrderItemId === orderItem.id;
      });
      const wholeOrderEvent = orderEvents.find((event) => {
        const meta = event.metadata;
        if (!meta || typeof meta !== "object" || Array.isArray(meta)) return false;
        const scope = String((meta as { cancelScope?: unknown }).cancelScope ?? "").toUpperCase();
        return scope === "ORDER" || scope === "";
      });

      const sourceEvent = matchingEvent ?? wholeOrderEvent ?? orderEvents[0];
      const performerUserId = sourceEvent?.performedByUserId?.trim() || cancelMeta.cancelledByUserId;

      entries.push(
        normalizeMedicationAdministrationHistoryOrderCancelRow({
          orderItemId: orderItem.id,
          encounterId: orderItem.order.encounterId,
          orderEventId: sourceEvent?.id ?? null,
          medicationLabel: formatMedicationLabelFromOrderItem(orderItem),
          doseDisplay: formatDoseFromOrderItem(orderItem),
          route: orderItem.route?.trim() || null,
          cancelledAt: cancelMeta.cancelledAt,
          performedByDisplay: cancelMeta.cancelledByDisplay,
          performedByRole: performerUserId
            ? input.roleByUserId.get(performerUserId) ?? null
            : null,
          cancellationReason: cancelMeta.cancellationReason,
          cancellationDetails: cancelMeta.cancellationDetails,
          frequencyCode: orderItem.frequencyCode,
          directionsSig: orderItem.notes,
        })
      );
    }

    return entries;
  }

  private async loadCorrectionHistoryEntries(input: {
    encounterId: string;
    facilityId: string;
    lookbackStart: Date;
    orderItemFilter: string | null;
    roleByUserId: Map<string, string>;
  }): Promise<MedicationAdministrationHistoryEntry[]> {
    const corrections = await this.prisma.medicationAdministrationCorrection.findMany({
      where: {
        facilityId: input.facilityId,
        createdAt: { gte: input.lookbackStart },
        medicationAdministration: {
          encounterId: input.encounterId,
          ...(input.orderItemFilter ? { orderItemId: input.orderItemFilter } : {}),
        },
      },
      orderBy: { createdAt: "desc" },
      take: ENCOUNTER_MAR_LIST_MAX_LIMIT,
      select: {
        id: true,
        medicationAdministrationId: true,
        correctedByUserId: true,
        correctionReason: true,
        previousValues: true,
        correctedValues: true,
        createdAt: true,
        correctedBy: {
          select: { firstName: true, lastName: true },
        },
        medicationAdministration: {
          select: {
            encounterId: true,
            orderItemId: true,
            medicationLabelSnapshot: true,
            route: true,
            doseValue: true,
            doseUnit: true,
          },
        },
      },
    });

    if (corrections.length === 0) return [];

    const correctorIds = [
      ...new Set(corrections.map((row) => row.correctedByUserId).filter(Boolean)),
    ];
    const correctorRoles = await this.loadPrimaryRoleByUserId(input.facilityId, correctorIds);
    for (const [userId, role] of correctorRoles) {
      if (!input.roleByUserId.has(userId)) {
        input.roleByUserId.set(userId, role);
      }
    }

    return corrections.map((row) => {
      const mar = row.medicationAdministration;
      const doseValue = mar.doseValue?.toString() ?? null;
      const doseUnit = mar.doseUnit?.trim() || null;
      const doseDisplay =
        doseValue && doseUnit ? `${doseValue} ${doseUnit}` : doseValue || doseUnit || null;

      return normalizeMedicationAdministrationHistoryCorrectionRow({
        id: row.id,
        facilityId: input.facilityId,
        medicationAdministrationId: row.medicationAdministrationId,
        correctedByUserId: row.correctedByUserId,
        correctionReason: row.correctionReason,
        previousValues: row.previousValues,
        correctedValues: row.correctedValues,
        createdAt: row.createdAt,
        correctedByFirstName: row.correctedBy.firstName,
        correctedByLastName: row.correctedBy.lastName,
        correctedByRole: input.roleByUserId.get(row.correctedByUserId) ?? null,
        medicationLabel: mar.medicationLabelSnapshot,
        doseDisplay,
        route: mar.route,
        encounterId: mar.encounterId,
        orderItemId: mar.orderItemId,
      });
    });
  }

  private async loadScheduleAdjustmentHistoryEntries(input: {
    encounterId: string;
    facilityId: string;
    lookbackStart: Date;
    orderItemFilter: string | null;
  }): Promise<MedicationAdministrationHistoryEntry[]> {
    const doses = await this.prisma.medicationDoseInstance.findMany({
      where: {
        encounterId: input.encounterId,
        facilityId: input.facilityId,
        ...(input.orderItemFilter ? { orderItemId: input.orderItemFilter } : {}),
      },
      select: {
        id: true,
        encounterId: true,
        orderItemId: true,
        orderedDoseSnapshotJson: true,
        orderItem: {
          select: {
            manualLabel: true,
            manualSecondaryText: true,
            strength: true,
            quantity: true,
            route: true,
          },
        },
      },
    });

    const entries: MedicationAdministrationHistoryEntry[] = [];
    for (const dose of doses) {
      const history = readMarDoseScheduleAdjustmentHistory(dose.orderedDoseSnapshotJson);
      for (const row of history) {
        const changedAt = new Date(row.changedAt);
        if (changedAt < input.lookbackStart) continue;
        entries.push(
          normalizeMedicationAdministrationHistoryScheduleAdjustmentRow({
            medicationDoseInstanceId: dose.id,
            encounterId: dose.encounterId,
            orderItemId: dose.orderItemId,
            medicationLabel: formatMedicationLabelFromOrderItem(dose.orderItem),
            doseDisplay: formatDoseFromOrderItem(dose.orderItem),
            route: dose.orderItem.route,
            originalScheduledAt: row.originalScheduledAt,
            previousScheduledAt: row.previousScheduledAt ?? row.originalScheduledAt,
            newScheduledAt: row.newScheduledAt,
            reasonCode: row.reasonCode,
            reasonDetail: row.reasonDetail,
            changedAt: row.changedAt,
            changedByUserId: row.changedByUserId,
            changedByDisplay: row.changedByDisplay,
            riskSeverity: row.riskSeverity,
            reviewRecommended: row.reviewRecommended,
          })
        );
      }
    }
    return entries;
  }

  private async loadDoseVarianceContextById(
    facilityId: string,
    encounterId: string,
    doseIds: string[]
  ): Promise<Map<string, { scheduledAt: Date; orderedDoseSnapshotJson: unknown }>> {
    if (doseIds.length === 0) return new Map();
    const rows = await this.prisma.medicationDoseInstance.findMany({
      where: {
        id: { in: doseIds },
        facilityId,
        encounterId,
      },
      select: {
        id: true,
        scheduledAt: true,
        orderedDoseSnapshotJson: true,
      },
    });
    return new Map(
      rows.map((row) => [
        row.id,
        { scheduledAt: row.scheduledAt, orderedDoseSnapshotJson: row.orderedDoseSnapshotJson },
      ])
    );
  }

  private async loadPrimaryRoleByUserId(
    facilityId: string,
    userIds: string[]
  ): Promise<Map<string, string>> {
    if (userIds.length === 0) return new Map();

    const rows = await this.prisma.userRole.findMany({
      where: {
        facilityId,
        userId: { in: userIds },
        isActive: true,
      },
      select: {
        userId: true,
        role: { select: { code: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const map = new Map<string, string>();
    for (const row of rows) {
      if (!map.has(row.userId)) {
        map.set(row.userId, row.role.code);
      }
    }
    return map;
  }
}
