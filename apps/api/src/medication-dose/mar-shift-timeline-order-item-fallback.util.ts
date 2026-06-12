import {
  buildMarShiftTimelineCellDisplay,
  buildMarShiftTimelineHover,
  buildMarShiftTimelineTertiaryText,
  isMarShiftTimelineItemReadOnly,
  isStructuredMedicationOrderRouteIvpb,
  marShiftTimelineOrderItemFallbackOverlapsShift,
  parseMedicationDoseStatus,
  resolveMarShiftTimelineClinicalAction,
  resolveMarShiftTimelineColumnKey,
  resolveMarShiftTimelineDrawerActions,
  resolveMarShiftTimelineOrderItemFallbackDoseKind,
  resolveMarShiftTimelineOrderItemFallbackDoseStatus,
  resolveMarShiftTimelineOrderItemPlacementInstant,
  marShiftTimelineOrderItemFallbackHasCompletedAdministration,
  shouldCreateMarShiftTimelineOrderItemFallback,
  resolveMarShiftTimelineMedicationLabel,
  resolveMarShiftTimelineTerminalOutcome,
  type MarShiftTimelineColumn,
  type MedicationSafetyGovernanceSnapshot,
} from "@medora/shared";
import { OrderStatus } from "@prisma/client";
import type { PrismaService } from "../prisma/prisma.service";
import { getMedicationSchedulingFeatureFlagsFromEnv } from "../medication-scheduling/medication-scheduling-feature-flags.util";
import { loadMarShiftTimelineAdministrationEnrichment } from "./mar-shift-timeline-admin-enrichment.util";
import type { MarShiftTimelineCellItem } from "./mar-shift-timeline.service";
import type { MedicationPassQueueDoseRow } from "./medication-pass-queue-dose.select";

const ORDER_ITEM_FALLBACK_SELECT = {
  id: true,
  orderId: true,
  catalogItemId: true,
  catalogItemType: true,
  quantity: true,
  notes: true,
  createdAt: true,
  status: true,
  manualLabel: true,
  manualSecondaryText: true,
  strength: true,
  route: true,
  frequencyCode: true,
  intendedAdministrationAt: true,
  medicationFulfillmentIntent: true,
  order: {
    select: {
      id: true,
      encounterId: true,
      patientId: true,
      type: true,
      status: true,
      encounter: {
        select: {
          id: true,
          roomLabel: true,
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

type OrderItemFallbackRow = {
  id: string;
  orderId: string;
  catalogItemId: string | null;
  catalogItemType: string;
  quantity: number | null;
  notes: string | null;
  createdAt: Date;
  status: OrderStatus;
  manualLabel: string | null;
  manualSecondaryText: string | null;
  strength: string | null;
  route: string | null;
  frequencyCode: string | null;
  intendedAdministrationAt: Date | null;
  medicationFulfillmentIntent: string | null;
  order: {
    id: string;
    encounterId: string;
    patientId: string;
    type: string;
    status: OrderStatus;
    encounter: {
      id: string;
      roomLabel: string | null;
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

type CatalogSlice = {
  displayNameFr: string | null;
  displayNameEn: string | null;
  genericName: string | null;
  route: string | null;
  requiresWitness: boolean;
};

export type MarShiftTimelineOrderItemFallbackPlacement = {
  item: MarShiftTimelineCellItem;
  columnKey: string;
  patientId: string;
  encounterId: string;
  patientDisplay: string;
  roomLabel: string | null;
  assignedNurseUserId: string | null;
};

function formatPatientDisplay(firstName: string | null, lastName: string | null): string {
  const parts = [firstName?.trim(), lastName?.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "Patient";
}

function governanceRequiresWitness(
  governance: MedicationSafetyGovernanceSnapshot | null | undefined
): boolean {
  return governance?.requiresWitness === true || governance?.requiresDoubleSign === true;
}

function orderItemCompleted(status: OrderStatus): boolean {
  return status === OrderStatus.COMPLETED;
}

function buildPseudoDoseRow(input: {
  orderItem: OrderItemFallbackRow;
  doseKind: string;
  doseStatus: string;
  placementInstant: Date;
  infusionSessionId: string | null;
  terminalMedicationAdministrationId: string | null;
}): MedicationPassQueueDoseRow {
  const windowEnd = new Date(input.placementInstant.getTime() + 60 * 60 * 1000);
  return {
    id: `order-item-fallback:${input.orderItem.id}`,
    orderItemId: input.orderItem.id,
    orderId: input.orderItem.orderId,
    encounterId: input.orderItem.order.encounterId,
    medicationOrderScheduleId: null as string | null,
    doseKind: input.doseKind,
    scheduledAt: input.placementInstant,
    dueWindowStartAt: input.placementInstant,
    dueWindowEndAt: windowEnd,
    doseStatus: input.doseStatus,
    responseDueAt: null,
    infusionSessionId: input.infusionSessionId,
    terminalMedicationAdministrationId: input.terminalMedicationAdministrationId,
    medicationCatalogSnapshotJson: input.orderItem.catalogItemId
      ? { catalogItemId: input.orderItem.catalogItemId }
      : null,
    orderedDoseSnapshotJson: {
      medicationLabel:
        input.orderItem.manualLabel?.trim() ||
        input.orderItem.manualSecondaryText?.trim() ||
        null,
      route: input.orderItem.route,
      doseValue: null,
      doseUnit: null,
      quantity: input.orderItem.quantity != null ? String(input.orderItem.quantity) : null,
    },
    frequencySnapshotJson: input.orderItem.frequencyCode
      ? { frequencyCode: input.orderItem.frequencyCode }
      : null,
    encounter: input.orderItem.order.encounter,
  } as unknown as MedicationPassQueueDoseRow;
}

function resolveMedicationLabel(
  orderItem: OrderItemFallbackRow,
  catalog: CatalogSlice | null,
  displayLocale: "en" | "fr"
): string | null {
  return resolveMarShiftTimelineMedicationLabel({
    locale: displayLocale,
    manualLabel: orderItem.manualLabel,
    orderedMedicationLabel: orderItem.manualSecondaryText,
    catalogSnapshot: catalog
      ? {
          catalogItemId: orderItem.catalogItemId,
          catalogItemCode: null,
          displayNameEn: catalog.displayNameEn,
          displayNameFr: catalog.displayNameFr,
          genericName: catalog.genericName,
        }
      : orderItem.catalogItemId
        ? { catalogItemId: orderItem.catalogItemId, catalogItemCode: null, displayNameEn: null, displayNameFr: null, genericName: null }
        : null,
  });
}

function resolveRoute(orderItem: OrderItemFallbackRow, catalog: CatalogSlice | null): string | null {
  return orderItem.route?.trim() || catalog?.route?.trim() || null;
}

async function loadCatalogMap(
  prisma: PrismaService,
  catalogIds: string[]
): Promise<Map<string, CatalogSlice>> {
  if (catalogIds.length === 0) return new Map();
  const rows = await prisma.catalogMedication.findMany({
    where: { id: { in: catalogIds } },
    select: {
      id: true,
      displayNameFr: true,
      displayNameEn: true,
      genericName: true,
      route: true,
      requiresWitness: true,
    },
  });
  return new Map(
    rows.map((row) => [
      row.id,
      {
        displayNameFr: row.displayNameFr,
        displayNameEn: row.displayNameEn,
        genericName: row.genericName,
        route: row.route,
        requiresWitness: row.requiresWitness === true,
      },
    ])
  );
}

/** M1.8B.7K.6 — OrderItem fallback rows for direct-MAR meds without dose instances. */
export async function loadMarShiftTimelineOrderItemFallbackPlacements(input: {
  prisma: PrismaService;
  facilityId: string;
  shiftStart: Date;
  shiftEnd: Date;
  columns: readonly MarShiftTimelineColumn[];
  facilityTimeZone: string;
  displayLocale: "en" | "fr";
  encounterId?: string;
  assignedToUserId?: string;
  includeCompleted: boolean;
  orderItemIdsWithDoseInstances: ReadonlySet<string>;
  governanceByCatalogId: Map<string, MedicationSafetyGovernanceSnapshot>;
}): Promise<MarShiftTimelineOrderItemFallbackPlacement[]> {
  const featureFlags = getMedicationSchedulingFeatureFlagsFromEnv();
  const excludedOrderStatuses: OrderStatus[] = [OrderStatus.CANCELLED];

  const orderItems = await input.prisma.orderItem.findMany({
    where: {
      catalogItemType: "MEDICATION",
      medicationFulfillmentIntent: "ADMINISTER_CHART",
      status: { notIn: excludedOrderStatuses },
      order: {
        facilityId: input.facilityId,
        type: "MEDICATION",
        status: { notIn: excludedOrderStatuses },
        encounter: {
          ...(input.encounterId ? { id: input.encounterId } : { status: "OPEN" }),
          ...(input.assignedToUserId
            ? { nurseAssignedUserId: input.assignedToUserId }
            : {}),
        },
      },
    },
    select: ORDER_ITEM_FALLBACK_SELECT,
    orderBy: { createdAt: "asc" },
    take: 500,
  });

  const candidateItems = orderItems.filter(
    (row) =>
      !input.orderItemIdsWithDoseInstances.has(row.id) &&
      shouldCreateMarShiftTimelineOrderItemFallback({
        frequencyCode: row.frequencyCode,
        notes: row.notes,
        intendedAdministrationAt: row.intendedAdministrationAt,
        hasMedicationDoseInstances: false,
        featureFlags,
      })
  );

  if (candidateItems.length === 0) return [];

  const catalogIds = [
    ...new Set(
      candidateItems
        .map((row) => row.catalogItemId?.trim())
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const catalogById = await loadCatalogMap(input.prisma, catalogIds);

  const orderItemIds = candidateItems.map((row) => row.id);

  const [activeSessions, terminalMarRows] = await Promise.all([
    input.prisma.infusionSession.findMany({
      where: {
        orderItemId: { in: orderItemIds },
        status: "IN_PROGRESS",
      },
      select: { id: true, orderItemId: true, startedAt: true },
      orderBy: { startedAt: "desc" },
    }),
    input.prisma.medicationAdministration.findMany({
      where: {
        orderItemId: { in: orderItemIds },
        OR: [
          { infusionPhase: "INFUSION_STOP" },
          {
            marAction: { in: ["administered", "refused", "not_available", "md_changed"] },
            infusionPhase: null,
          },
        ],
      },
      select: {
        id: true,
        orderItemId: true,
        administeredAt: true,
        marAction: true,
        notes: true,
        infusionPhase: true,
      },
      orderBy: { administeredAt: "desc" },
    }),
  ]);

  const activeSessionByOrderItemId = new Map<string, { id: string; startedAt: Date | null }>();
  for (const session of activeSessions) {
    if (!activeSessionByOrderItemId.has(session.orderItemId)) {
      activeSessionByOrderItemId.set(session.orderItemId, session);
    }
  }

  type TerminalMarSlice = {
    id: string;
    marAction: string | null;
    notes: string | null;
    infusionPhase: string | null;
  };
  const terminalMarByOrderItemId = new Map<string, TerminalMarSlice>();
  for (const mar of terminalMarRows) {
    if (mar.orderItemId && !terminalMarByOrderItemId.has(mar.orderItemId)) {
      terminalMarByOrderItemId.set(mar.orderItemId, mar);
    }
  }

  const pseudoDoses: MedicationPassQueueDoseRow[] = [];
  const pseudoMeta = new Map<string, OrderItemFallbackRow>();

  for (const orderItem of candidateItems) {
    const catalog = orderItem.catalogItemId
      ? catalogById.get(orderItem.catalogItemId) ?? null
      : null;
    const route = resolveRoute(orderItem, catalog);
    const isIvpb = isStructuredMedicationOrderRouteIvpb(route);
    const activeSession = activeSessionByOrderItemId.get(orderItem.id);
    const terminalMar = terminalMarByOrderItemId.get(orderItem.id) ?? null;

    const doseStatus = resolveMarShiftTimelineOrderItemFallbackDoseStatus({
      orderItemCompleted: orderItemCompleted(orderItem.status),
      isIvpb,
      activeInfusionSession: activeSession != null,
      orderItemInProgress: orderItem.status === OrderStatus.IN_PROGRESS,
      hasCompletedAdministration: marShiftTimelineOrderItemFallbackHasCompletedAdministration({
        terminalMarAction: terminalMar?.marAction,
        hasInfusionStopMar: terminalMar?.infusionPhase === "INFUSION_STOP",
      }),
      terminalMarAction: terminalMar?.marAction,
      terminalMarNotes: terminalMar?.notes,
    });

    if (doseStatus === "COMPLETED" && !input.includeCompleted) continue;

    const placementInstant = resolveMarShiftTimelineOrderItemPlacementInstant({
      createdAt: orderItem.createdAt,
      intendedAdministrationAt: orderItem.intendedAdministrationAt,
      frequencyCode: orderItem.frequencyCode,
      notes: orderItem.notes,
    });

    if (
      !marShiftTimelineOrderItemFallbackOverlapsShift({
        placementInstant,
        shiftStart: input.shiftStart,
        shiftEnd: input.shiftEnd,
      })
    ) {
      continue;
    }

    const doseKind = resolveMarShiftTimelineOrderItemFallbackDoseKind(route);
    const pseudo = buildPseudoDoseRow({
      orderItem,
      doseKind,
      doseStatus,
      placementInstant,
      infusionSessionId: activeSession?.id ?? null,
      terminalMedicationAdministrationId: terminalMar?.id ?? null,
    });
    pseudoDoses.push(pseudo);
    pseudoMeta.set(pseudo.id, orderItem);
  }

  if (pseudoDoses.length === 0) return [];

  const enrichmentByPseudoId = await loadMarShiftTimelineAdministrationEnrichment(
    input.prisma,
    pseudoDoses,
    input.facilityId,
    input.facilityTimeZone
  );

  const placements: MarShiftTimelineOrderItemFallbackPlacement[] = [];

  for (const pseudo of pseudoDoses) {
    const orderItem = pseudoMeta.get(pseudo.id);
    if (!orderItem) continue;

    const catalog = orderItem.catalogItemId
      ? catalogById.get(orderItem.catalogItemId) ?? null
      : null;
    const route = resolveRoute(orderItem, catalog);
    const catalogId = orderItem.catalogItemId?.trim() || null;
    const governance = catalogId ? input.governanceByCatalogId.get(catalogId) : undefined;
    const requiresWitness =
      governanceRequiresWitness(governance) || catalog?.requiresWitness === true;

    const parsedStatus = parseMedicationDoseStatus(pseudo.doseStatus);
    if (!parsedStatus) continue;

    const columnKey = resolveMarShiftTimelineColumnKey({
      scheduledAt: pseudo.scheduledAt,
      dueWindowStartAt: pseudo.dueWindowStartAt,
      columns: input.columns,
      facilityTimeZone: input.facilityTimeZone,
    });
    if (!columnKey) continue;

    const medicationLabel = resolveMedicationLabel(orderItem, catalog, input.displayLocale);
    const enrichment = enrichmentByPseudoId.get(pseudo.id) ?? null;
    const clinicalAction = resolveMarShiftTimelineClinicalAction(pseudo.doseKind, parsedStatus);
    const terminalMar = terminalMarByOrderItemId.get(orderItem.id) ?? null;
    const terminalOutcome = resolveMarShiftTimelineTerminalOutcome({
      marAction: terminalMar?.marAction,
      notes: terminalMar?.notes,
    });
    const { primaryText, secondaryText, tertiaryText } = buildMarShiftTimelineCellDisplay({
      medicationLabel,
      doseKind: pseudo.doseKind,
      doseStatus: parsedStatus,
      route,
      frequencyCode: orderItem.frequencyCode,
      requiresWitness,
      enrichment,
      facilityTimeZone: input.facilityTimeZone,
      terminalOutcome,
      marAction: terminalMar?.marAction,
      marNotes: terminalMar?.notes,
    });
    const resolvedTertiaryText =
      tertiaryText.trim() ||
      buildMarShiftTimelineTertiaryText({
        doseKind: pseudo.doseKind,
        doseStatus: parsedStatus,
        enrichment,
        facilityTimeZone: input.facilityTimeZone,
      });

    const doseValue = orderItem.strength?.trim() || null;
    const doseAmount =
      doseValue || (orderItem.quantity != null ? String(orderItem.quantity) : null);

    const encounter = orderItem.order.encounter;

    placements.push({
      columnKey,
      patientId: encounter.patient.id,
      encounterId: encounter.id,
      patientDisplay: formatPatientDisplay(
        encounter.patient.firstName,
        encounter.patient.lastName
      ),
      roomLabel: encounter.roomLabel,
      assignedNurseUserId: encounter.nurseAssignedUserId,
      item: {
        type: "MEDICATION",
        medicationDoseInstanceId: "",
        orderItemId: orderItem.id,
        medicationLabel,
        primaryText,
        secondaryText,
        tertiaryText: resolvedTertiaryText,
        doseStatus: parsedStatus,
        readOnly: isMarShiftTimelineItemReadOnly(clinicalAction),
        startedAt: enrichment?.startedAt ?? null,
        startedByDisplay: enrichment?.startedByDisplay ?? null,
        startedByInitials: enrichment?.startedByInitials ?? null,
        stoppedAt: enrichment?.stoppedAt ?? null,
        stoppedByDisplay: enrichment?.stoppedByDisplay ?? null,
        stoppedByInitials: enrichment?.stoppedByInitials ?? null,
        administeredAt: enrichment?.administeredAt ?? null,
        administeredByDisplay: enrichment?.administeredByDisplay ?? null,
        administeredByInitials: enrichment?.administeredByInitials ?? null,
        completionSummary: enrichment?.completionSummary ?? (resolvedTertiaryText || null),
        doseKind: pseudo.doseKind,
        route,
        frequencyCode: orderItem.frequencyCode,
        scheduledAt: pseudo.scheduledAt.toISOString(),
        dueWindowStartAt: pseudo.dueWindowStartAt.toISOString(),
        dueWindowEndAt: pseudo.dueWindowEndAt.toISOString(),
        requiresWitness,
        clinicalAction,
        hover: buildMarShiftTimelineHover({
          medicationLabel,
          scheduledAt: pseudo.scheduledAt,
          doseAmount,
          route,
          requiresWitness,
          doseStatus: parsedStatus,
          facilityTimeZone: input.facilityTimeZone,
        }),
        actions: resolveMarShiftTimelineDrawerActions(clinicalAction),
      },
    });
  }

  return placements;
}
