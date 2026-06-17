import { Injectable, NotFoundException } from "@nestjs/common";
import {
  formatMarShiftTimelineClinicianDisplay,
  normalizeMedicationAdministrationHistoryMarRow,
  normalizeMedicationAdministrationHistoryOrderCancelRow,
  resolveMedicationOrderCancelMetadata,
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

    const marEntries = marRows.map((row) =>
      normalizeMedicationAdministrationHistoryMarRow({
        id: row.id,
        encounterId: row.encounterId,
        orderItemId: row.orderItemId,
        administeredAt: row.administeredAt,
        effectiveAdministeredAt: row.effectiveAdministeredAt,
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
      })
    );

    const cancelEntries = await this.loadOrderCancelHistoryEntries({
      encounterId,
      facilityId,
      lookbackStart,
      orderItemFilter,
      roleByUserId,
    });

    let merged = sortMedicationAdministrationHistoryEntries([...marEntries, ...cancelEntries]);

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
