import {
  buildMarMedicationDoseDisplayFields,
  buildMarCanceledOrderMarkerDoseInstanceId,
  buildMarCanceledTimelineCellDisplay,
  buildMarShiftTimelineHover,
  formatMarShiftTimelineClinicianDisplay,
  resolveMarCanceledTimelinePlacementInstant,
  resolveMarShiftTimelineClinicalAction,
  resolveMarShiftTimelineColumnKey,
  resolveMarShiftTimelineDrawerActions,
  resolveMarShiftTimelineMedicationLabel,
  resolveMedicationOrderCancelMetadata,
  type MarShiftTimelineColumn,
  type MedicationSafetyGovernanceSnapshot,
} from "@medora/shared";
import { OrderItemLifecycleState, OrderStatus } from "@prisma/client";
import type { PrismaService } from "../prisma/prisma.service";
import {
  isPrnMedicationOrderClassification,
  resolveMarShiftTimelinePrnColumnKey,
} from "./mar-shift-timeline-prn.util";
import type { MarShiftTimelineCellItem } from "./mar-shift-timeline.service";
import { resolveMarAssignedNurseUserIdFromEncounter } from "./mar-enterprise-ownership.util";

const CANCELED_ORDER_ITEM_SELECT = {
  id: true,
  orderId: true,
  catalogItemId: true,
  quantity: true,
  notes: true,
  createdAt: true,
  status: true,
  lifecycleState: true,
  manualLabel: true,
  manualSecondaryText: true,
  strength: true,
  route: true,
  frequencyCode: true,
  intendedAdministrationAt: true,
  medicationLifecycleStatus: true,
  medicationLifecycleAt: true,
  medicationLifecycleReason: true,
  order: {
    select: {
      id: true,
      encounterId: true,
      patientId: true,
      type: true,
      status: true,
      cancelledAt: true,
      cancellationReason: true,
      cancelledByUserId: true,
      cancelledBy: {
        select: { firstName: true, lastName: true },
      },
      encounter: {
        select: {
          id: true,
          type: true,
          billingClassification: true,
          roomLabel: true,
          admissionSummaryJson: true,
          physicianAssignedUserId: true,
          nurseAssignedUserId: true,
          status: true,
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              mrn: true,
            },
          },
        },
      },
    },
  },
} as const;

type CanceledOrderItemRow = {
  id: string;
  orderId: string;
  catalogItemId: string | null;
  quantity: number | null;
  notes: string | null;
  createdAt: Date;
  status: OrderStatus;
  lifecycleState: string;
  manualLabel: string | null;
  manualSecondaryText: string | null;
  strength: string | null;
  route: string | null;
  frequencyCode: string | null;
  intendedAdministrationAt: Date | null;
  medicationLifecycleStatus: string | null;
  medicationLifecycleAt: Date | null;
  medicationLifecycleReason: string | null;
  order: {
    id: string;
    encounterId: string;
    patientId: string;
    type: string;
    status: OrderStatus;
    cancelledAt: Date | null;
    cancellationReason: string | null;
    cancelledByUserId: string | null;
    cancelledBy: { firstName: string | null; lastName: string | null } | null;
    encounter: {
      id: string;
      type: string;
      billingClassification?: string | null;
      roomLabel: string | null;
      admissionSummaryJson: unknown;
      physicianAssignedUserId: string | null;
      nurseAssignedUserId: string | null;
      status: string;
      patient: {
        id: string;
        firstName: string | null;
        lastName: string | null;
        mrn: string | null;
      };
    };
  };
};

export type MarShiftTimelineCanceledPlacement = {
  encounterId: string;
  patientId: string;
  patientDisplay: string;
  roomLabel: string | null;
  encounterType: string | null;
  admissionSummaryJson: unknown;
  assignedNurseUserId: string | null;
  columnKey: string;
  item: MarShiftTimelineCellItem;
};

function formatPatientDisplay(firstName: string | null, lastName: string | null): string {
  const parts = [firstName?.trim(), lastName?.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "Patient";
}

function isCanceledMedicationOrderItem(row: CanceledOrderItemRow): boolean {
  return (
    row.lifecycleState === OrderItemLifecycleState.CANCELLED ||
    row.status === OrderStatus.CANCELLED ||
    row.order.status === OrderStatus.CANCELLED ||
    row.medicationLifecycleStatus === "DISCONTINUED" ||
    row.medicationLifecycleStatus === "SUPERSEDED" ||
    row.medicationLifecycleStatus === "CANCELED_ENTERED_IN_ERROR"
  );
}

/** Synthetic canceled-order markers for MAR shift timeline (MEDUI.ED.MAR.H1B). */
export async function loadMarShiftTimelineCanceledPlacements(input: {
  prisma: PrismaService;
  facilityId: string;
  shiftStart: Date;
  shiftEnd: Date;
  columns: readonly MarShiftTimelineColumn[];
  facilityTimeZone: string;
  displayLocale: "en" | "fr";
  encounterId?: string;
  /** D4A.4.2: pre-resolved encounter ids for facility assignee filter (null = no filter). */
  assigneeEncounterIds?: string[] | null;
  /** @deprecated Prefer assigneeEncounterIds. */
  assignedToUserId?: string;
  governanceByCatalogId: Map<string, MedicationSafetyGovernanceSnapshot>;
}): Promise<MarShiftTimelineCanceledPlacement[]> {
  if (
    !input.encounterId?.trim() &&
    input.assigneeEncounterIds &&
    input.assigneeEncounterIds.length === 0
  ) {
    return [];
  }

  const orderItems = await input.prisma.orderItem.findMany({
    where: {
      catalogItemType: "MEDICATION",
      medicationFulfillmentIntent: "ADMINISTER_CHART",
      order: {
        facilityId: input.facilityId,
        type: "MEDICATION",
        encounter: {
          ...(input.encounterId
            ? { id: input.encounterId }
            : input.assigneeEncounterIds
              ? { id: { in: input.assigneeEncounterIds }, status: "OPEN" }
              : { status: "OPEN" }),
        },
      },
      OR: [
        { lifecycleState: OrderItemLifecycleState.CANCELLED },
        { status: OrderStatus.CANCELLED },
        { order: { status: OrderStatus.CANCELLED } },
        { medicationLifecycleStatus: "DISCONTINUED" },
        { medicationLifecycleStatus: "SUPERSEDED" },
        { medicationLifecycleStatus: "CANCELED_ENTERED_IN_ERROR" },
      ],
    },
    select: CANCELED_ORDER_ITEM_SELECT,
    orderBy: { createdAt: "asc" },
    take: 500,
  });

  const canceledItems = orderItems.filter(isCanceledMedicationOrderItem);
  if (canceledItems.length === 0) return [];

  const orderIds = [...new Set(canceledItems.map((row) => row.orderId))];
  const cancelEvents = await input.prisma.orderEvent.findMany({
    where: {
      orderId: { in: orderIds },
      eventType: { in: ["CANCELLED", "DISCONTINUED", "SUPERSEDED"] },
    },
    orderBy: { performedAt: "desc" },
    select: {
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

  const catalogIds = [
    ...new Set(
      canceledItems
        .map((row) => row.catalogItemId?.trim())
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const catalogRows =
    catalogIds.length > 0
      ? await input.prisma.catalogMedication.findMany({
          where: { id: { in: catalogIds } },
          select: {
            id: true,
            code: true,
            displayNameEn: true,
            displayNameFr: true,
            genericName: true,
            route: true,
            requiresWitness: true,
          },
        })
      : [];
  const catalogById = new Map(catalogRows.map((row) => [row.id, row]));

  const placements: MarShiftTimelineCanceledPlacement[] = [];

  for (const orderItem of canceledItems) {
    const orderEvents = (eventsByOrderId.get(orderItem.orderId) ?? []).map((event) => ({
      performedAt: event.performedAt,
      performedByUserId: event.performedByUserId,
      performedByFirstName: event.performedBy?.firstName ?? null,
      performedByLastName: event.performedBy?.lastName ?? null,
      note: event.note,
      metadata: event.metadata,
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

    const placementInstant = resolveMarCanceledTimelinePlacementInstant({
      cancelledAt: cancelMeta.cancelledAt,
      shiftStart: input.shiftStart,
      shiftEnd: input.shiftEnd,
    });
    if (!placementInstant) continue;

    const catalog = orderItem.catalogItemId
      ? catalogById.get(orderItem.catalogItemId) ?? null
      : null;
    const medicationLabel = resolveMarShiftTimelineMedicationLabel({
      locale: input.displayLocale,
      manualLabel: orderItem.manualLabel,
      orderedMedicationLabel: orderItem.manualSecondaryText,
      catalogSnapshot: catalog
        ? {
            catalogItemId: orderItem.catalogItemId,
            catalogItemCode: catalog.code ?? null,
            displayNameEn: catalog.displayNameEn,
            displayNameFr: catalog.displayNameFr,
            genericName: catalog.genericName,
          }
        : orderItem.catalogItemId
          ? {
              catalogItemId: orderItem.catalogItemId,
              catalogItemCode: null,
              displayNameEn: null,
              displayNameFr: null,
              genericName: null,
            }
          : null,
    });
    const route = orderItem.route?.trim() || catalog?.route?.trim() || null;
    const directionsSig = orderItem.notes?.trim() || null;
    const isPrnBand = isPrnMedicationOrderClassification({
      frequencyCode: orderItem.frequencyCode,
      directionsSig,
    });

    const columnKey = isPrnBand
      ? resolveMarShiftTimelinePrnColumnKey({
          doseStatus: "CANCELLED",
          administeredAt: null,
          prnLastGivenAt: null,
          prnNextEligibleAt: null,
          referenceAt: placementInstant,
          columns: input.columns,
          facilityTimeZone: input.facilityTimeZone,
        })
      : resolveMarShiftTimelineColumnKey({
          scheduledAt: placementInstant,
          dueWindowStartAt: placementInstant,
          columns: input.columns,
          facilityTimeZone: input.facilityTimeZone,
        });
    if (!columnKey) continue;

    const display = buildMarCanceledTimelineCellDisplay({
      medicationLabel,
      route,
      cancellationReason: cancelMeta.cancellationReason,
      locale: input.displayLocale,
    });

    const catalogId = orderItem.catalogItemId?.trim() || null;
    const governance = catalogId ? input.governanceByCatalogId.get(catalogId) : undefined;
    const requiresWitness =
      governance?.requiresWitness === true || catalog?.requiresWitness === true;

    const doseStatus = "CANCELLED" as const;
    const clinicalAction = resolveMarShiftTimelineClinicalAction("STANDING", doseStatus);
    const cancelledAtIso = cancelMeta.cancelledAt.toISOString();
    const placementIso = placementInstant.toISOString();
    const doseDisplay = buildMarMedicationDoseDisplayFields({
      quantity: orderItem.quantity != null ? String(orderItem.quantity) : null,
      route,
      frequencyCode: orderItem.frequencyCode,
      directionsSig,
      fallbackDoseLabel: orderItem.strength?.trim() || null,
    });

    const item: MarShiftTimelineCellItem = {
      type: "MEDICATION",
      medicationDoseInstanceId: buildMarCanceledOrderMarkerDoseInstanceId(orderItem.id),
      orderItemId: orderItem.id,
      medicationLabel,
      primaryText: display.primaryText,
      secondaryText: display.secondaryText,
      tertiaryText: display.tertiaryText,
      doseStatus,
      readOnly: true,
      startedAt: null,
      startedByDisplay: null,
      startedByInitials: null,
      stoppedAt: null,
      stoppedByDisplay: null,
      stoppedByInitials: null,
      administeredAt: null,
      administeredByDisplay: null,
      administeredByInitials: null,
      completionSummary: null,
      isPrnBand,
      prnLastGivenAt: null,
      prnNextEligibleAt: null,
      doseKind: "STANDING",
      route,
      frequencyCode: orderItem.frequencyCode,
      scheduledAt: placementIso,
      dueWindowStartAt: placementIso,
      dueWindowEndAt: placementIso,
      requiresWitness,
      clinicalAction,
      cancellationReason: cancelMeta.cancellationReason,
      cancellationDetails: cancelMeta.cancellationDetails,
      cancelledAt: cancelledAtIso,
      cancelledByDisplay: cancelMeta.cancelledByDisplay,
      doseDisplay,
      hover: buildMarShiftTimelineHover({
        medicationLabel,
        scheduledAt: placementInstant,
        doseAmount: doseDisplay.doseLabel ?? (orderItem.strength?.trim() || null),
        route,
        requiresWitness,
        doseStatus,
        facilityTimeZone: input.facilityTimeZone,
      }),
      actions: resolveMarShiftTimelineDrawerActions(clinicalAction),
    };

    placements.push({
      encounterId: orderItem.order.encounterId,
      patientId: orderItem.order.patientId,
      patientDisplay: formatPatientDisplay(
        orderItem.order.encounter.patient.firstName,
        orderItem.order.encounter.patient.lastName
      ),
      roomLabel: orderItem.order.encounter.roomLabel,
      encounterType: orderItem.order.encounter.type,
      admissionSummaryJson: orderItem.order.encounter.admissionSummaryJson,
      assignedNurseUserId: resolveMarAssignedNurseUserIdFromEncounter(
        orderItem.order.encounter
      ),
      columnKey,
      item,
    });
  }

  return placements;
}
