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
  resolveMarClinicalDoseTimelinePlacementInstant,
  resolveMarTimelinePrnDisplayFields,
  marShiftTimelineOrderItemFallbackHasCompletedAdministration,
  shouldCreateMarShiftTimelineOrderItemFallback,
  resolveMarShiftTimelineMedicationLabel,
  resolveMarShiftTimelineTerminalOutcome,
  resolvePrnTimelineTerminalDisplay,
  buildMarPainResponseTimelineProjection,
  buildMedicationFollowUpProjection,
  parseMarMedicationResponseNotes,
  filterActiveMarAllergyReviewCandidates,
  parseMarAllergyReviewCandidatesFromNotes,
  type MarShiftTimelineColumn,
  type MedicationSafetyGovernanceSnapshot,
} from "@medora/shared";
import { resolveMarTimelineFluidEnrichment } from "./mar-shift-timeline-fluid-enrichment.util";
import {
  buildMarShiftTimelinePrnCellTexts,
  isPrnMedicationOrderClassification,
  loadLastPrnAdministrationByOrderItemId,
  loadPrnAdministrationsInShiftByOrderItemId,
  prnTerminalMarOverlapsShift,
  resolveMarShiftTimelinePrnColumnKey,
  resolveMarShiftTimelinePrnTiming,
  shouldRetainPrnTimelineItem,
} from "./mar-shift-timeline-prn.util";
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
          type: true,
          roomLabel: true,
          admissionSummaryJson: true,
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
      type: string;
      roomLabel: string | null;
      admissionSummaryJson: unknown;
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
  code: string | null;
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
  encounterType: string | null;
  admissionSummaryJson: unknown;
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
  pseudoDoseId?: string;
}): MedicationPassQueueDoseRow {
  const windowEnd = new Date(input.placementInstant.getTime() + 60 * 60 * 1000);
  return {
    id: input.pseudoDoseId ?? `order-item-fallback:${input.orderItem.id}`,
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
      code: true,
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
        code: row.code,
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
  visiblePrnOrderItemIds?: ReadonlySet<string>;
  governanceByCatalogId: Map<string, MedicationSafetyGovernanceSnapshot>;
  lastPrnAdminByOrderItemId?: Map<string, { administeredAt: Date }>;
  referenceAt?: Date;
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

  const candidateItems = orderItems.filter((row) => {
    const isPrn = isPrnMedicationOrderClassification({
      frequencyCode: row.frequencyCode,
      directionsSig: row.notes,
    });
    if (isPrn) {
      return true;
    }

    if (input.orderItemIdsWithDoseInstances.has(row.id)) {
      return false;
    }

    return shouldCreateMarShiftTimelineOrderItemFallback({
      frequencyCode: row.frequencyCode,
      notes: row.notes,
      intendedAdministrationAt: row.intendedAdministrationAt,
      hasMedicationDoseInstances: false,
      featureFlags,
    });
  });

  if (candidateItems.length === 0) return [];

  const fallbackPrnOrderItemIds = candidateItems
    .filter((row) =>
      isPrnMedicationOrderClassification({
        frequencyCode: row.frequencyCode,
        directionsSig: row.notes,
      })
    )
    .map((row) => row.id);
  const fallbackLastPrnAdmin = await loadLastPrnAdministrationByOrderItemId(
    input.prisma,
    fallbackPrnOrderItemIds
  );
  const prnShiftAdminsByOrderItemId = await loadPrnAdministrationsInShiftByOrderItemId(
    input.prisma,
    fallbackPrnOrderItemIds,
    input.shiftStart,
    input.shiftEnd
  );
  const lastPrnAdminByOrderItemId = new Map(input.lastPrnAdminByOrderItemId ?? []);
  for (const [orderItemId, slice] of fallbackLastPrnAdmin) {
    if (!lastPrnAdminByOrderItemId.has(orderItemId)) {
      lastPrnAdminByOrderItemId.set(orderItemId, slice);
    }
  }

  const catalogIds = [
    ...new Set(
      candidateItems
        .map((row) => row.catalogItemId?.trim())
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const catalogById = await loadCatalogMap(input.prisma, catalogIds);

  const orderItemIds = candidateItems.map((row) => row.id);

  const orderIds = [...new Set(candidateItems.map((row) => row.orderId))];

  const [activeSessions, terminalMarRows, orderEvents] = await Promise.all([
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
    input.prisma.orderEvent.findMany({
      where: { orderId: { in: orderIds } },
      orderBy: { performedAt: "asc" },
      select: { orderId: true, metadata: true },
    }),
  ]);

  const orderEventsByOrderId = new Map<string, Array<{ metadata: unknown }>>();
  for (const ev of orderEvents) {
    const list = orderEventsByOrderId.get(ev.orderId) ?? [];
    list.push({ metadata: ev.metadata });
    orderEventsByOrderId.set(ev.orderId, list);
  }

  const activeSessionByOrderItemId = new Map<string, { id: string; startedAt: Date | null }>();
  for (const session of activeSessions) {
    if (!activeSessionByOrderItemId.has(session.orderItemId)) {
      activeSessionByOrderItemId.set(session.orderItemId, session);
    }
  }

  type TerminalMarSlice = {
    id: string;
    administeredAt: Date | null;
    marAction: string | null;
    notes: string | null;
    infusionPhase: string | null;
  };
  const terminalMarByOrderItemId = new Map<string, TerminalMarSlice>();
  const terminalMarById = new Map<string, TerminalMarSlice>();
  for (const mar of terminalMarRows) {
    terminalMarById.set(mar.id, mar);
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
    const isPrnCandidate = isPrnMedicationOrderClassification({
      frequencyCode: orderItem.frequencyCode,
      directionsSig: orderItem.notes,
    });
    const shiftAdmins = isPrnCandidate ? prnShiftAdminsByOrderItemId.get(orderItem.id) ?? [] : [];

    if (shiftAdmins.length > 0) {
      const doseKind = resolveMarShiftTimelineOrderItemFallbackDoseKind(route);
      for (const adminMar of shiftAdmins) {
        if (!adminMar.administeredAt) continue;
        const doseStatus = "COMPLETED";
        if (
          !input.includeCompleted &&
          !shouldRetainPrnTimelineItem({
            isPrnBand: true,
            doseStatus,
            includeCompleted: input.includeCompleted,
            secondaryText: null,
          })
        ) {
          continue;
        }
        const placementInstant = adminMar.administeredAt;
        if (
          !marShiftTimelineOrderItemFallbackOverlapsShift({
            placementInstant,
            shiftStart: input.shiftStart,
            shiftEnd: input.shiftEnd,
          })
        ) {
          continue;
        }
        const pseudo = buildPseudoDoseRow({
          orderItem,
          doseKind,
          doseStatus,
          placementInstant,
          infusionSessionId: activeSession?.id ?? null,
          terminalMedicationAdministrationId: adminMar.id,
          pseudoDoseId: `order-item-fallback:${orderItem.id}:${adminMar.id}`,
        });
        pseudoDoses.push(pseudo);
        pseudoMeta.set(pseudo.id, orderItem);
      }
      continue;
    }

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

    if (
      (doseStatus === "COMPLETED" || doseStatus === "HELD") &&
      !input.includeCompleted &&
      !shouldRetainPrnTimelineItem({
        isPrnBand: isPrnMedicationOrderClassification({
          frequencyCode: orderItem.frequencyCode,
          directionsSig: orderItem.notes,
        }),
        doseStatus,
        includeCompleted: input.includeCompleted,
        secondaryText:
          terminalMar?.marAction === "refused" || resolveMarShiftTimelineTerminalOutcome({
            marAction: terminalMar?.marAction,
            notes: terminalMar?.notes,
          }) === "REFUSED"
            ? "REFUSED"
            : doseStatus === "HELD"
              ? "HELD"
              : null,
      })
    ) {
      continue;
    }

    const terminalInShift = prnTerminalMarOverlapsShift({
      administeredAt: terminalMar?.administeredAt,
      shiftStart: input.shiftStart,
      shiftEnd: input.shiftEnd,
    });
    if (
      isPrnCandidate &&
      input.visiblePrnOrderItemIds?.has(orderItem.id) &&
      !terminalInShift &&
      doseStatus === "DUE"
    ) {
      continue;
    }

    const completedAdministration =
      doseStatus === "COMPLETED" &&
      marShiftTimelineOrderItemFallbackHasCompletedAdministration({
        terminalMarAction: terminalMar?.marAction,
        hasInfusionStopMar: terminalMar?.infusionPhase === "INFUSION_STOP",
      });
    const placementInstant = resolveMarShiftTimelineOrderItemPlacementInstant({
      createdAt: orderItem.createdAt,
      intendedAdministrationAt: orderItem.intendedAdministrationAt,
      frequencyCode: orderItem.frequencyCode,
      notes: orderItem.notes,
      administeredAt: terminalMar?.administeredAt,
      useAdministeredPlacement: completedAdministration,
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

    const directionsSig = orderItem.notes?.trim() || null;
    const isPrnBand = isPrnMedicationOrderClassification({
      frequencyCode: orderItem.frequencyCode,
      directionsSig,
    });

    const medicationLabel = resolveMedicationLabel(orderItem, catalog, input.displayLocale);
    const enrichment = enrichmentByPseudoId.get(pseudo.id) ?? null;
    const terminalMar =
      (pseudo.terminalMedicationAdministrationId
        ? terminalMarById.get(pseudo.terminalMedicationAdministrationId)
        : null) ??
      terminalMarByOrderItemId.get(orderItem.id) ??
      null;
    const terminalOutcome = resolveMarShiftTimelineTerminalOutcome({
      marAction: terminalMar?.marAction,
      notes: terminalMar?.notes,
    });
    const administrationNotes = terminalMar?.notes?.trim() || null;

    const prnTiming = isPrnBand
      ? resolveMarShiftTimelinePrnTiming({
          orderItemId: orderItem.id,
          frequencyCode: orderItem.frequencyCode,
          lastAdminByOrderItemId: lastPrnAdminByOrderItemId,
          enrichmentAdministeredAt: enrichment?.administeredAt ?? terminalMar?.administeredAt?.toISOString() ?? null,
        })
      : { prnLastGivenAt: null, prnNextEligibleAt: null };

    const fluidEnrichment = resolveMarTimelineFluidEnrichment({
      orderItemId: orderItem.id,
      medicationLabel,
      directionsSig,
      route,
      doseKind: pseudo.doseKind,
      doseStatus: parsedStatus,
      orderEvents: orderEventsByOrderId.get(orderItem.orderId) ?? [],
      requiresWitness,
      facilityTimeZone: input.facilityTimeZone,
      enrichment: {
        marAction: terminalMar?.marAction,
        marNotes: administrationNotes,
        marStartedAt: enrichment?.startedAt ?? null,
        marStoppedAt: enrichment?.stoppedAt ?? null,
        marAdministeredAt: enrichment?.administeredAt ?? null,
      },
    });

    const cellPlacementInstant = resolveMarClinicalDoseTimelinePlacementInstant({
      doseStatus: parsedStatus,
      doseKind: pseudo.doseKind,
      scheduledAt: pseudo.scheduledAt,
      enrichment: enrichment
        ? {
            startedAt: enrichment.startedAt,
            stoppedAt: enrichment.stoppedAt,
            administeredAt: enrichment.administeredAt,
            administrationNotes,
          }
        : null,
      fluid: fluidEnrichment
        ? {
            isFluidBolus: fluidEnrichment.isFluidBolus,
            isContinuousFluid: fluidEnrichment.isContinuousFluid,
            fluidBolusStatus: fluidEnrichment.fluidBolusStatus,
            continuousFluidStatus: fluidEnrichment.continuousFluidStatus,
            fluidStartedAt: fluidEnrichment.fluidStartedAt,
            fluidStoppedAt: fluidEnrichment.fluidStoppedAt,
            fluidCompletedAt: fluidEnrichment.fluidCompletedAt,
          }
        : null,
    });

    const columnKey = isPrnBand
      ? resolveMarShiftTimelinePrnColumnKey({
          doseStatus: parsedStatus,
          administeredAt: enrichment?.administeredAt ?? terminalMar?.administeredAt?.toISOString() ?? null,
          prnLastGivenAt: prnTiming.prnLastGivenAt,
          prnNextEligibleAt: prnTiming.prnNextEligibleAt,
          referenceAt: input.referenceAt ?? new Date(),
          columns: input.columns,
          facilityTimeZone: input.facilityTimeZone,
        })
      : resolveMarShiftTimelineColumnKey({
          scheduledAt: cellPlacementInstant,
          dueWindowStartAt: pseudo.dueWindowStartAt,
          columns: input.columns,
          facilityTimeZone: input.facilityTimeZone,
        });
    if (!columnKey) continue;

    const clinicalAction =
      fluidEnrichment?.clinicalAction ??
      resolveMarShiftTimelineClinicalAction(pseudo.doseKind, parsedStatus);

    const cellFromFluid = fluidEnrichment?.cellDisplay;
    let primaryText: string;
    let secondaryText: string;
    let tertiaryText: string;
    let prnFrequencyLabel: string | null = null;

    const doseValue = orderItem.strength?.trim() || null;
    const doseAmount =
      doseValue || (orderItem.quantity != null ? String(orderItem.quantity) : null);

    if (isPrnBand) {
      const prnSecondaryOverride =
        terminalOutcome === "REFUSED" ? "REFUSED" : parsedStatus === "HELD" ? "HELD" : null;
      const prnCell = buildMarShiftTimelinePrnCellTexts({
        medicationLabel,
        doseAmount,
        route,
        frequencyCode: orderItem.frequencyCode,
        directionsSig,
        doseStatus: parsedStatus,
        administeredAt: enrichment?.administeredAt ?? terminalMar?.administeredAt?.toISOString() ?? null,
        administeredByInitials: enrichment?.administeredByInitials ?? null,
        prnLastGivenAt: prnTiming.prnLastGivenAt,
        prnNextEligibleAt: prnTiming.prnNextEligibleAt,
        facilityTimeZone: input.facilityTimeZone,
        secondaryTextOverride: prnSecondaryOverride,
      });
      primaryText = prnCell.primaryText;
      secondaryText = prnCell.secondaryText;
      tertiaryText = prnCell.tertiaryText;
      prnFrequencyLabel = prnCell.prnFrequencyLabel;
    } else {
      const scheduledDisplay = cellFromFluid ??
        buildMarShiftTimelineCellDisplay({
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
          marNotes: administrationNotes,
          directionsSig,
        });
      primaryText = scheduledDisplay.primaryText;
      secondaryText = scheduledDisplay.secondaryText;
      tertiaryText = scheduledDisplay.tertiaryText;
    }
    const prnDisplay = resolveMarTimelinePrnDisplayFields({
      directionsSig,
      administrationNotes,
    });
    const resolvedTertiaryText =
      tertiaryText.trim() ||
      buildMarShiftTimelineTertiaryText({
        doseKind: pseudo.doseKind,
        doseStatus: parsedStatus,
        enrichment,
        facilityTimeZone: input.facilityTimeZone,
      });

    const encounter = orderItem.order.encounter;

    const prnSecondaryOverride =
      terminalOutcome === "REFUSED" ? "REFUSED" : parsedStatus === "HELD" ? "HELD" : null;
    const isPrnTerminal =
      isPrnBand &&
      resolvePrnTimelineTerminalDisplay({
        doseStatus: parsedStatus,
        secondaryText: prnSecondaryOverride,
      }) != null;

    if (isPrnBand && !isPrnTerminal) {
      continue;
    }

    const resolvedMarAction =
      enrichment?.marAction ??
      terminalMar?.marAction ??
      (enrichment?.administeredAt || terminalMar?.administeredAt ? "administered" : null);
    const followUpProjection = buildMedicationFollowUpProjection({
      catalogCode: catalog?.code ?? null,
      medicationLabel,
      genericName: catalog?.genericName ?? null,
      marAction: resolvedMarAction,
      administrationNotes,
      administeredAt:
        enrichment?.administeredAt ?? terminalMar?.administeredAt?.toISOString() ?? null,
      doseStatus: parsedStatus,
      frequencyCode: orderItem.frequencyCode,
      directionsSig,
      prnIndication: prnDisplay.orderPrnIndication,
      defaultSecondaryText: secondaryText,
      route,
      doseKind: pseudo.doseKind,
      clinicalAction,
    });
    secondaryText = followUpProjection.secondaryText;

    const medicationResponses = followUpProjection.medicationResponses ?? [];
    const respiratoryMedicationResponses =
      followUpProjection.respiratoryMedicationResponses ?? [];
    const medicationResponseBadge = followUpProjection.medicationResponseBadge;
    const medicationResponseFollowUp = followUpProjection.medicationResponseFollowUp;
    const medicationResponseAdverseEscalation = medicationResponses.some(
      (r) => r.responseCode === "ADVERSE_REACTION_REPORTED"
    );
    const allergyReviewCandidates = filterActiveMarAllergyReviewCandidates(
      parseMarAllergyReviewCandidatesFromNotes(administrationNotes)
    );
    const medicationAdministrationId =
      enrichment?.medicationAdministrationId ?? terminalMar?.id ?? null;

    placements.push({
      columnKey,
      patientId: encounter.patient.id,
      encounterId: encounter.id,
      patientDisplay: formatPatientDisplay(
        encounter.patient.firstName,
        encounter.patient.lastName
      ),
      roomLabel: encounter.roomLabel,
      encounterType: encounter.type,
      admissionSummaryJson: encounter.admissionSummaryJson,
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
        readOnly: isMarShiftTimelineItemReadOnly(clinicalAction, parsedStatus, secondaryText),
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
        orderPrnIndication: prnDisplay.orderPrnIndication,
        prnReasonCode: prnDisplay.prnReasonCode,
        prnReasonLabel: prnDisplay.prnReasonLabel,
        prnPainScore: prnDisplay.prnPainScore,
        prnPainLocation: prnDisplay.prnPainLocation,
        isPrnBand,
        prnFrequencyLabel,
        prnLastGivenAt: prnTiming.prnLastGivenAt,
        prnNextEligibleAt: prnTiming.prnNextEligibleAt,
        prnProjectionKey: isPrnTerminal
          ? `terminal:${orderItem.id}:${enrichment?.administeredAt ?? terminalMar?.administeredAt?.toISOString() ?? pseudo.scheduledAt.toISOString()}`
          : null,
        continuousFluidStatus: fluidEnrichment?.continuousFluidStatus ?? null,
        fluidRateLabel: fluidEnrichment?.fluidRateLabel ?? null,
        fluidVolumeInfusedMl: fluidEnrichment?.fluidVolumeInfusedMl ?? null,
        fluidStartedAt: fluidEnrichment?.fluidStartedAt ?? null,
        fluidStoppedAt: fluidEnrichment?.fluidStoppedAt ?? null,
        fluidCompletedAt: fluidEnrichment?.fluidCompletedAt ?? null,
        fluidBolusStatus: fluidEnrichment?.fluidBolusStatus ?? null,
        fluidBolusVolumeMl: fluidEnrichment?.fluidBolusVolumeMl ?? null,
        fluidRunningDurationLabel: fluidEnrichment?.fluidRunningDurationLabel ?? null,
        fluidActiveDurationLabel: fluidEnrichment?.fluidActiveDurationLabel ?? null,
        fluidTotalDurationLabel: fluidEnrichment?.fluidTotalDurationLabel ?? null,
        fluidPausedAt: fluidEnrichment?.fluidPausedAt ?? null,
        isFluidBolus: fluidEnrichment?.isFluidBolus ?? false,
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
          directionsSig,
        }),
        actions:
          fluidEnrichment?.drawerActions ??
          resolveMarShiftTimelineDrawerActions(clinicalAction, {
            continuousFluidStatus: fluidEnrichment?.continuousFluidStatus as never,
            fluidBolusStatus: fluidEnrichment?.fluidBolusStatus as never,
          }),
        medicationAdministrationId,
        medicationResponses: medicationResponses.length > 0 ? medicationResponses : undefined,
        respiratoryMedicationResponses:
          respiratoryMedicationResponses.length > 0
            ? respiratoryMedicationResponses.map((response) => ({
                responseCode: response.responseCode,
                responseDetail: response.responseDetail ?? null,
                responseTime: response.responseTime ?? null,
                documentedAt: response.documentedAt,
                respiratoryRateBefore: response.respiratoryRateBefore ?? null,
                respiratoryRateAfter: response.respiratoryRateAfter ?? null,
                oxygenSaturationBefore: response.oxygenSaturationBefore ?? null,
                oxygenSaturationAfter: response.oxygenSaturationAfter ?? null,
                wheezingBefore: response.wheezingBefore ?? null,
                wheezingAfter: response.wheezingAfter ?? null,
                workOfBreathing: response.workOfBreathing ?? null,
                nebulizerCompletion: response.nebulizerCompletion ?? null,
                mdiSpacerUsed: response.mdiSpacerUsed ?? null,
                treatmentRefused: response.treatmentRefused ?? null,
                treatmentInterrupted: response.treatmentInterrupted ?? null,
                noAdverseReaction: response.noAdverseReaction ?? null,
                patientTolerated: response.patientTolerated ?? null,
                documentedBy: response.documentedBy ?? null,
                documentedByInitials: response.documentedByInitials ?? null,
                documentedByDisplayName: response.documentedByDisplayName ?? null,
              }))
            : undefined,
        medicationResponseBadge,
        medicationResponseFollowUp,
        medicationResponseAdverseEscalation,
        medicationFollowUpType: followUpProjection.followUpType,
        medicationAdministrationLifecycleState: followUpProjection.lifecycleState,
        allergyReviewCandidates:
          allergyReviewCandidates.length > 0 ? allergyReviewCandidates : undefined,
      },
    });
  }

  return placements;
}
