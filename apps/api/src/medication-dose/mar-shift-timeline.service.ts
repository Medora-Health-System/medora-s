import {
  buildMarShiftTimelineCellDisplay,
  buildMarShiftTimelineColumns,
  buildMarShiftTimelineHover,
  buildMarShiftTimelineTitle,
  doseOverlapsMarShiftTimelineWindow,
  formatGovernedRoomDisplay,
  parseMarShiftTimelineShiftCode,
  resolveMarShiftTimelineClinicalAction,
  resolveMarShiftTimelineColumnKey,
  resolveMarUniversalShiftTimelineDosePlacementInstant,
  resolveMarShiftTimelineDrawerActions,
  resolveMarShiftTimelineWindow,
  shouldIncludeMarShiftTimelineDose,
  isMarShiftTimelineItemReadOnly,
  isMarShiftTimelineTerminalClinicalAction,
  buildMarShiftTimelineTertiaryText,
  resolveMarShiftTimelineMedicationLabel,
  normalizeMarShiftTimelineLocale,
  resolveClinicalTimeZone,
  medicationIvpbDoseSchedulingEnabled,
  medicationSchedulingFeatureFlagsEnabled,
  parseMedicationDoseKind,
  resolveMarTimelinePrnDisplayFields,
  parseMedicationDoseStatus,
  buildMarScheduleAdjustmentTimelineProjection,
  buildMarScheduleAdjustmentChain,
  buildMarAdministrationVarianceTimelineProjection,
  resolveOriginalScheduledAtFromDose,
  type MarScheduleAdjustmentTimelineProjection,
  type MarScheduleAdjustmentChainStep,
  type MarAdministrationVarianceTimelineProjection,
  type MarShiftTimelineClinicalAction,
  type MarShiftTimelineDrawerAction,
  type MarShiftTimelineHover,
  type MarShiftTimelineShiftCode,
  type MedicationCatalogSnapshotJson,
  type MedicationFrequencySnapshotJson,
  type MedicationOrderedDoseSnapshotJson,
  type MedicationSafetyGovernanceSnapshot,
  parseMarMedicationResponseNotes,
  parseMarAllergyReviewCandidatesFromNotes,
  filterActiveMarAllergyReviewCandidates,
  buildMarMedicationResponseTimelineBadge,
  sortMarMedicationResponsesNewestFirst,
  type MarMedicationResponseSeverity,
  buildMarMedicationResponseFollowUpSummary,
  buildMarPainResponseTimelineProjection,
  type MarMedicationResponseFollowUpStatus,
} from "@medora/shared";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { getMedicationSchedulingFeatureFlagsFromEnv } from "../medication-scheduling/medication-scheduling-feature-flags.util";
import { loadMedicationSafetyGovernanceByCatalogIdSafe } from "../medication-safety/medication-governance-enrichment.util";
import { PrismaService } from "../prisma/prisma.service";
import {
  MEDICATION_PASS_QUEUE_DOSE_SELECT,
  type MedicationPassQueueDoseRow,
} from "./medication-pass-queue-dose.select";
import { MEDICATION_PASS_QUEUE_LIST_LIMIT } from "./medication-pass-queue.service";
import { loadMarShiftTimelineAdministrationEnrichment } from "./mar-shift-timeline-admin-enrichment.util";
import { loadMarShiftTimelineOrderItemFallbackPlacements } from "./mar-shift-timeline-order-item-fallback.util";
import { loadMarShiftTimelineCanceledPlacements } from "./mar-shift-timeline-canceled.util";
import { resolveMarTimelineFluidEnrichment } from "./mar-shift-timeline-fluid-enrichment.util";
import {
  appendMarShiftTimelineCellItem,
  collectVisiblePrnOrderItemIds,
  appendMarShiftTimelinePrnAvailabilityProjections,
  createEmptyMarShiftTimelineRow,
  isPrnMedicationOrderClassification,
  loadLastPrnAdministrationByOrderItemId,
  mergeScheduledAndPrnMarShiftTimelineRows,
  buildMarShiftTimelinePrnCellTexts,
  resolveMarShiftTimelinePrnColumnKey,
  resolveMarShiftTimelinePrnTiming,
  upsertMarShiftTimelinePrnCellItem,
  type MarShiftTimelineRowWithKind,
} from "./mar-shift-timeline-prn.util";

export type MarShiftTimelineQuery = {
  shiftCode?: MarShiftTimelineShiftCode | string;
  shiftStart?: Date;
  shiftEnd?: Date;
  encounterId?: string;
  assignedToUserId?: string;
  includeCompleted?: boolean;
  includeUpcoming?: boolean;
  locale?: string;
};

export type MarShiftTimelineViewer = {
  userId: string;
  displayName: string;
  role: string;
};

export type MarShiftTimelineCellItem = {
  type: "MEDICATION";
  medicationDoseInstanceId: string;
  orderItemId: string;
  medicationLabel: string | null;
  primaryText: string;
  secondaryText: string;
  tertiaryText: string;
  doseStatus: string;
  readOnly: boolean;
  startedAt: string | null;
  startedByDisplay: string | null;
  startedByInitials: string | null;
  stoppedAt: string | null;
  stoppedByDisplay: string | null;
  stoppedByInitials: string | null;
  administeredAt: string | null;
  administeredByDisplay: string | null;
  administeredByInitials: string | null;
  completionSummary: string | null;
  orderPrnIndication?: string | null;
  prnReasonCode?: string | null;
  prnReasonLabel?: string | null;
  prnPainScore?: number | null;
  prnPainLocation?: string | null;
  isPrnBand?: boolean;
  prnFrequencyLabel?: string | null;
  prnLastGivenAt?: string | null;
  prnNextEligibleAt?: string | null;
  prnProjectionKey?: string | null;
  cancellationReason?: string | null;
  cancellationDetails?: string | null;
  cancelledAt?: string | null;
  cancelledByDisplay?: string | null;
  continuousFluidStatus?: string | null;
  fluidRateLabel?: string | null;
  fluidVolumeInfusedMl?: number | null;
  fluidStartedAt?: string | null;
  fluidStoppedAt?: string | null;
  fluidCompletedAt?: string | null;
  fluidBolusStatus?: string | null;
  fluidBolusVolumeMl?: number | null;
  fluidRunningDurationLabel?: string | null;
  fluidActiveDurationLabel?: string | null;
  fluidTotalDurationLabel?: string | null;
  fluidPausedAt?: string | null;
  isFluidBolus?: boolean;
  doseKind: string;
  route: string | null;
  frequencyCode: string | null;
  scheduledAt: string;
  dueWindowStartAt: string;
  dueWindowEndAt: string;
  requiresWitness: boolean;
  clinicalAction: MarShiftTimelineClinicalAction | null;
  hover: MarShiftTimelineHover;
  actions: MarShiftTimelineDrawerAction[];
  scheduleAdjustment?: MarScheduleAdjustmentTimelineProjection | null;
  scheduleAdjustmentChain?: MarScheduleAdjustmentChainStep[];
  administrationVariance?: MarAdministrationVarianceTimelineProjection | null;
  medicationAdministrationId?: string | null;
  medicationResponses?: Array<{
    responseCode: string;
    responseDetail: string | null;
    responseTime: string | null;
    documentedAt: string;
    painBefore: number | null;
    painAfter: number | null;
  }>;
  medicationResponseBadge?: {
    label: "RESPONSE";
    displayLabel: string;
    count: number;
    severity: MarMedicationResponseSeverity;
  } | null;
  medicationResponseFollowUp?: {
    status: MarMedicationResponseFollowUpStatus;
    earliestAt: string | null;
    latestAt: string | null;
    responseCount: number;
    showAdverseEscalation: boolean;
  } | null;
  medicationResponseAdverseEscalation?: boolean;
  allergyReviewCandidates?: Array<{
    candidateId: string;
    medicationName: string;
    medicationClass: string | null;
    reactionText: string;
    reactionCategory: string;
    detectedAt: string;
    documentedBy: string | null;
    recommendationLevel: string;
    dismissedAt?: string | null;
  }>;
};

export type MarShiftTimelineRowCell = {
  columnKey: string;
  items: MarShiftTimelineCellItem[];
};

export type MarShiftTimelineRow = {
  patientId: string;
  encounterId: string;
  patientDisplay: string;
  roomLabel: string | null;
  /** K.10B.10 — governed display label (e.g. ED-4, MS-2). */
  governedRoomDisplay?: string | null;
  assignedNurseUserId: string | null;
  cells: MarShiftTimelineRowCell[];
  rowKind?: "SCHEDULED" | "PRN";
  prnBandSubtitle?: string | null;
};

export type MarShiftTimelineResponse = {
  enabled: boolean;
  facility: {
    id: string;
    name: string;
    timeZone: string;
  };
  title: string;
  viewer: MarShiftTimelineViewer;
  shift: {
    code: MarShiftTimelineShiftCode;
    label: string;
    startAt: string;
    endAt: string;
    timeZone: string;
    columns: ReturnType<typeof buildMarShiftTimelineColumns>;
  };
  rows: MarShiftTimelineRow[];
  locale: "en" | "fr";
};

function parseCatalogSnapshot(json: unknown): MedicationCatalogSnapshotJson | null {
  if (!json || typeof json !== "object") return null;
  return json as MedicationCatalogSnapshotJson;
}

function parseOrderedDoseSnapshot(json: unknown): MedicationOrderedDoseSnapshotJson | null {
  if (!json || typeof json !== "object") return null;
  return json as MedicationOrderedDoseSnapshotJson;
}

function parseFrequencySnapshot(json: unknown): MedicationFrequencySnapshotJson | null {
  if (!json || typeof json !== "object") return null;
  return json as MedicationFrequencySnapshotJson;
}

function formatPatientDisplay(firstName: string | null, lastName: string | null): string {
  const parts = [firstName?.trim(), lastName?.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "Patient";
}

function formatViewerDisplayName(input: {
  firstName: string | null;
  lastName: string | null;
  role: string;
}): string {
  const name = [input.firstName?.trim(), input.lastName?.trim()].filter(Boolean).join(" ");
  const roleLabel = input.role?.trim() || "RN";
  return name ? `${name} ${roleLabel}` : roleLabel;
}

function governanceRequiresWitness(
  governance: MedicationSafetyGovernanceSnapshot | null | undefined
): boolean {
  return governance?.requiresWitness === true || governance?.requiresDoubleSign === true;
}

@Injectable()
export class MarShiftTimelineService {
  constructor(private readonly prisma: PrismaService) {}

  async getMarShiftTimeline(
    facilityId: string,
    viewer: MarShiftTimelineViewer,
    query: MarShiftTimelineQuery
  ): Promise<MarShiftTimelineResponse> {
    const facility = await this.prisma.facility.findFirst({
      where: { id: facilityId, isActive: true },
      select: { id: true, name: true, timezone: true },
    });
    if (!facility) {
      throw new NotFoundException("Facility not found");
    }

    const featureFlags = getMedicationSchedulingFeatureFlagsFromEnv();
    const emptyShift = {
      code: "7A_7P" as const,
      label: "7A–7P",
      startAt: new Date().toISOString(),
      endAt: new Date().toISOString(),
      timeZone: "UTC",
      columns: [] as ReturnType<typeof buildMarShiftTimelineColumns>,
    };

    const facilityTimeZone = resolveClinicalTimeZone({ facilityTimeZone: facility.timezone });
    const displayLocale = normalizeMarShiftTimelineLocale(query.locale);

    if (!medicationSchedulingFeatureFlagsEnabled(featureFlags)) {
      return {
        enabled: false,
        facility: { id: facility.id, name: facility.name, timeZone: facilityTimeZone },
        title: buildMarShiftTimelineTitle(facility.name),
        viewer,
        shift: { ...emptyShift, timeZone: facilityTimeZone },
        rows: [],
        locale: displayLocale,
      };
    }

    const ivpbSchedulingEnabled = medicationIvpbDoseSchedulingEnabled(featureFlags);
    const includeCompleted = query.includeCompleted !== false;
    const includeUpcoming = query.includeUpcoming !== false;
    const referenceAt = new Date();

    let shiftWindow: ReturnType<typeof resolveMarShiftTimelineWindow>;
    try {
      shiftWindow = resolveMarShiftTimelineWindow({
        shiftCode: query.shiftCode,
        shiftStart: query.shiftStart,
        shiftEnd: query.shiftEnd,
        referenceAt,
        facilityTimeZone,
      });
    } catch {
      throw new BadRequestException("shiftStart et shiftEnd requis pour le quart personnalisé.");
    }

    const columns = buildMarShiftTimelineColumns(
      shiftWindow.startAt,
      shiftWindow.endAt,
      shiftWindow.facilityTimeZone
    );

    const excludedStatuses = ["CANCELLED", "SUPERSEDED"];
    const doses: MedicationPassQueueDoseRow[] = await this.prisma.medicationDoseInstance.findMany({
      where: {
        facilityId,
        doseStatus: { notIn: excludedStatuses },
        ...(query.encounterId ? { encounterId: query.encounterId } : {}),
        OR: [
          {
            dueWindowStartAt: { lt: shiftWindow.endAt },
            dueWindowEndAt: { gt: shiftWindow.startAt },
          },
          {
            scheduledAt: { gte: shiftWindow.startAt, lt: shiftWindow.endAt },
          },
          {
            doseStatus: "IN_PROGRESS",
            infusionSessionId: { not: null },
          },
        ],
        encounter: {
          ...(query.assignedToUserId
            ? { nurseAssignedUserId: query.assignedToUserId }
            : {}),
          ...(!query.encounterId ? { status: "OPEN" } : {}),
        },
      },
      select: MEDICATION_PASS_QUEUE_DOSE_SELECT,
      orderBy: [{ scheduledAt: "asc" }, { doseSequenceNumber: "asc" }],
      take: MEDICATION_PASS_QUEUE_LIST_LIMIT,
    });

    const catalogIds = [
      ...new Set(
        doses
          .map((d) => parseCatalogSnapshot(d.medicationCatalogSnapshotJson)?.catalogItemId)
          .filter((id): id is string => Boolean(id?.trim()))
      ),
    ];

    const governanceByCatalogId =
      catalogIds.length > 0
        ? await loadMedicationSafetyGovernanceByCatalogIdSafe(this.prisma, catalogIds)
        : new Map<string, MedicationSafetyGovernanceSnapshot>();

    const administrationEnrichmentByDoseId =
      await loadMarShiftTimelineAdministrationEnrichment(
        this.prisma,
        doses,
        facilityId,
        shiftWindow.facilityTimeZone
      );

    const orderItemIdsForDirections = [...new Set(doses.map((d) => d.orderItemId))];
    const encounterOrderItemNotesRows =
      query.encounterId != null
        ? await this.prisma.orderItem.findMany({
            where: {
              catalogItemType: "MEDICATION",
              order: {
                encounterId: query.encounterId,
                facilityId,
                type: "MEDICATION",
              },
            },
            select: {
              id: true,
              notes: true,
              frequencyCode: true,
              createdAt: true,
              intendedAdministrationAt: true,
              strength: true,
              quantity: true,
              route: true,
              catalogItemId: true,
              order: { select: { encounterId: true } },
            },
          })
        : [];
    const orderItemNotesRows =
      orderItemIdsForDirections.length > 0
        ? await this.prisma.orderItem.findMany({
            where: { id: { in: orderItemIdsForDirections } },
            select: { id: true, notes: true, frequencyCode: true },
          })
        : [];
    const directionsSigByOrderItemId = new Map<string, string | null>();
    for (const row of [...encounterOrderItemNotesRows, ...orderItemNotesRows]) {
      directionsSigByOrderItemId.set(row.id, row.notes?.trim() || null);
    }

    const prnOrderItemIdsFromEncounter = encounterOrderItemNotesRows
      .filter((row) =>
        isPrnMedicationOrderClassification({
          frequencyCode: row.frequencyCode,
          directionsSig: row.notes,
        })
      )
      .map((row) => row.id);

    const orderIds = [...new Set(doses.map((d) => d.orderId))];
    const orderEventRows =
      orderIds.length > 0
        ? await this.prisma.orderEvent.findMany({
            where: { orderId: { in: orderIds } },
            orderBy: { performedAt: "asc" },
            select: { orderId: true, metadata: true },
          })
        : [];
    const orderEventsByOrderId = new Map<string, Array<{ metadata: unknown }>>();
    for (const ev of orderEventRows) {
      const list = orderEventsByOrderId.get(ev.orderId) ?? [];
      list.push({ metadata: ev.metadata });
      orderEventsByOrderId.set(ev.orderId, list);
    }

    /** Only suppress fallback when a dose row is visible on this timeline (K.10B.5). */
    const orderItemIdsWithDoseInstances = new Set(doses.map((d) => d.orderItemId));

    const prnOrderItemIds = [
      ...new Set([
        ...prnOrderItemIdsFromEncounter,
        ...doses
          .filter((d) =>
            isPrnMedicationOrderClassification({
              frequencyCode: parseFrequencySnapshot(d.frequencySnapshotJson)?.frequencyCode ?? null,
              directionsSig: directionsSigByOrderItemId.get(d.orderItemId) ?? null,
            })
          )
          .map((d) => d.orderItemId),
      ]),
    ];
    const lastPrnAdminByOrderItemId = await loadLastPrnAdministrationByOrderItemId(
      this.prisma,
      prnOrderItemIds
    );

    const scheduledRowMap = new Map<string, MarShiftTimelineRowWithKind>();
    const prnRowMap = new Map<string, MarShiftTimelineRowWithKind>();

    function ensureRowMaps(input: {
      patientId: string;
      encounterId: string;
      patientDisplay: string;
      roomLabel: string | null;
      encounterType: string | null;
      admissionSummaryJson: unknown;
      assignedNurseUserId: string | null;
    }): { scheduled: MarShiftTimelineRowWithKind; prn: MarShiftTimelineRowWithKind } {
      let scheduled = scheduledRowMap.get(input.encounterId);
      if (!scheduled) {
        scheduled = createEmptyMarShiftTimelineRow({ ...input, rowKind: "SCHEDULED" });
        scheduledRowMap.set(input.encounterId, scheduled);
      }
      let prn = prnRowMap.get(input.encounterId);
      if (!prn) {
        prn = createEmptyMarShiftTimelineRow({
          ...input,
          rowKind: "PRN",
          patientDisplay: "PRN",
        });
        prnRowMap.set(input.encounterId, prn);
      }
      return { scheduled, prn };
    }

    for (const dose of doses) {
      const parsedStatus = parseMedicationDoseStatus(dose.doseStatus);
      if (!parsedStatus) continue;

      const directionsSigEarly = directionsSigByOrderItemId.get(dose.orderItemId) ?? null;
      const frequencySnapshotEarly = parseFrequencySnapshot(dose.frequencySnapshotJson);
      const isPrnBandEarly = isPrnMedicationOrderClassification({
        frequencyCode: frequencySnapshotEarly?.frequencyCode ?? null,
        directionsSig: directionsSigEarly,
      });

      if (
        !shouldIncludeMarShiftTimelineDose({
          doseKind: dose.doseKind,
          doseStatus: dose.doseStatus,
          ivpbSchedulingEnabled,
          includeCompleted,
          includeUpcoming,
          isPrnBand: isPrnBandEarly,
        })
      ) {
        continue;
      }

      const enrichment = administrationEnrichmentByDoseId.get(dose.id) ?? null;

      const catalogSnapshotEarly = parseCatalogSnapshot(dose.medicationCatalogSnapshotJson);
      const orderedSnapshotEarly = parseOrderedDoseSnapshot(dose.orderedDoseSnapshotJson);
      const medicationLabelEarly = resolveMarShiftTimelineMedicationLabel({
        locale: displayLocale,
        orderedMedicationLabel: orderedSnapshotEarly?.medicationLabel,
        catalogSnapshot: catalogSnapshotEarly,
      });
      const routeEarly =
        orderedSnapshotEarly?.route?.trim() ||
        catalogSnapshotEarly?.route?.trim() ||
        null;

      const fluidEnrichmentForPlacement = resolveMarTimelineFluidEnrichment({
        orderItemId: dose.orderItemId,
        medicationLabel: medicationLabelEarly,
        directionsSig: directionsSigEarly,
        route: routeEarly,
        doseKind: parseMedicationDoseKind(dose.doseKind) ?? dose.doseKind,
        doseStatus: parsedStatus,
        orderEvents: orderEventsByOrderId.get(dose.orderId) ?? [],
        requiresWitness: false,
        facilityTimeZone: shiftWindow.facilityTimeZone,
        enrichment: enrichment
          ? {
              marStartedAt: enrichment.startedAt,
              marStoppedAt: enrichment.stoppedAt,
              marAdministeredAt: enrichment.administeredAt,
              marNotes: enrichment.administrationNotes,
            }
          : null,
      });

      // MEDUI.ED.MAR.H9F.1 — universal placement certification (single resolver).
      const placementInstant = resolveMarUniversalShiftTimelineDosePlacementInstant({
        doseStatus: parsedStatus,
        doseKind: dose.doseKind,
        scheduledAt: dose.scheduledAt,
        adjustedScheduledAt: dose.scheduledAt,
        originalScheduledAt: resolveOriginalScheduledAtFromDose({
          scheduledAt: dose.scheduledAt,
          orderedDoseSnapshotJson: dose.orderedDoseSnapshotJson,
        }),
        enrichment,
        fluid: fluidEnrichmentForPlacement
          ? {
              isFluidBolus: fluidEnrichmentForPlacement.isFluidBolus,
              isContinuousFluid: fluidEnrichmentForPlacement.isContinuousFluid,
              fluidBolusStatus: fluidEnrichmentForPlacement.fluidBolusStatus,
              continuousFluidStatus: fluidEnrichmentForPlacement.continuousFluidStatus,
              fluidStartedAt: fluidEnrichmentForPlacement.fluidStartedAt,
              fluidStoppedAt: fluidEnrichmentForPlacement.fluidStoppedAt,
              fluidCompletedAt: fluidEnrichmentForPlacement.fluidCompletedAt,
            }
          : null,
      });

      if (
        !doseOverlapsMarShiftTimelineWindow({
          shiftStart: shiftWindow.startAt,
          shiftEnd: shiftWindow.endAt,
          scheduledAt: placementInstant,
          dueWindowStartAt: dose.dueWindowStartAt,
          dueWindowEndAt: dose.dueWindowEndAt,
          doseStatus: dose.doseStatus,
          infusionSessionId: dose.infusionSessionId,
        })
      ) {
        continue;
      }

      const catalogSnapshot = parseCatalogSnapshot(dose.medicationCatalogSnapshotJson);
      const orderedSnapshot = parseOrderedDoseSnapshot(dose.orderedDoseSnapshotJson);
      const frequencySnapshot = parseFrequencySnapshot(dose.frequencySnapshotJson);
      const catalogId = catalogSnapshot?.catalogItemId?.trim() || null;
      const governance = catalogId ? governanceByCatalogId.get(catalogId) : undefined;

      const medicationLabel = resolveMarShiftTimelineMedicationLabel({
        locale: displayLocale,
        orderedMedicationLabel: orderedSnapshot?.medicationLabel,
        catalogSnapshot: catalogSnapshot,
      });

      const route =
        orderedSnapshot?.route?.trim() ||
        catalogSnapshot?.route?.trim() ||
        null;

      const parsedDoseKind = parseMedicationDoseKind(dose.doseKind);
      const requiresWitness = governanceRequiresWitness(governance);
      const directionsSig = directionsSigByOrderItemId.get(dose.orderItemId) ?? null;
      const administrationNotes = enrichment?.administrationNotes ?? null;

      const fluidEnrichment = resolveMarTimelineFluidEnrichment({
        orderItemId: dose.orderItemId,
        medicationLabel,
        directionsSig,
        route,
        doseKind: parsedDoseKind ?? dose.doseKind,
        doseStatus: parsedStatus,
        orderEvents: orderEventsByOrderId.get(dose.orderId) ?? [],
        requiresWitness,
        facilityTimeZone: shiftWindow.facilityTimeZone,
        enrichment: {
          marAction: enrichment?.marAction ?? (enrichment?.administeredAt ? "administered" : null),
          marNotes: administrationNotes,
          marStartedAt: enrichment?.startedAt ?? null,
          marStoppedAt: enrichment?.stoppedAt ?? null,
          marAdministeredAt: enrichment?.administeredAt ?? null,
        },
      });

      const clinicalAction =
        fluidEnrichment?.clinicalAction ??
        resolveMarShiftTimelineClinicalAction(parsedDoseKind ?? dose.doseKind, parsedStatus);

      const frequencyCode = frequencySnapshot?.frequencyCode ?? null;
      const isPrnBand = isPrnMedicationOrderClassification({
        frequencyCode,
        directionsSig,
      });

      const doseValue = orderedSnapshot?.doseValue?.trim();
      const doseUnit = orderedSnapshot?.doseUnit?.trim();
      const doseAmount =
        doseValue && doseUnit
          ? `${doseValue} ${doseUnit}`
          : doseValue || doseUnit || orderedSnapshot?.quantity?.trim() || null;

      const prnTiming = isPrnBand
        ? resolveMarShiftTimelinePrnTiming({
            orderItemId: dose.orderItemId,
            frequencyCode,
            lastAdminByOrderItemId: lastPrnAdminByOrderItemId,
            enrichmentAdministeredAt: enrichment?.administeredAt ?? null,
          })
        : { prnLastGivenAt: null, prnNextEligibleAt: null };

      const columnKey = isPrnBand
        ? resolveMarShiftTimelinePrnColumnKey({
            doseStatus: parsedStatus,
            administeredAt: enrichment?.administeredAt ?? null,
            prnLastGivenAt: prnTiming.prnLastGivenAt,
            prnNextEligibleAt: prnTiming.prnNextEligibleAt,
            referenceAt,
            columns,
            facilityTimeZone: shiftWindow.facilityTimeZone,
          })
        : resolveMarShiftTimelineColumnKey({
            scheduledAt: placementInstant,
            dueWindowStartAt: dose.dueWindowStartAt,
            columns,
            facilityTimeZone: shiftWindow.facilityTimeZone,
          });
      if (!columnKey) continue;

      const cellFromFluid = fluidEnrichment?.cellDisplay;
      let primaryText: string;
      let secondaryText: string;
      let tertiaryText: string;
      let prnFrequencyLabel: string | null = null;

      if (isPrnBand) {
        const prnCell = buildMarShiftTimelinePrnCellTexts({
          medicationLabel,
          doseAmount,
          route,
          frequencyCode,
          directionsSig,
          doseStatus: parsedStatus,
          administeredAt: enrichment?.administeredAt ?? null,
          administeredByInitials: enrichment?.administeredByInitials ?? null,
          prnLastGivenAt: prnTiming.prnLastGivenAt,
          prnNextEligibleAt: prnTiming.prnNextEligibleAt,
          facilityTimeZone: shiftWindow.facilityTimeZone,
        });
        primaryText = prnCell.primaryText;
        secondaryText = prnCell.secondaryText;
        tertiaryText = prnCell.tertiaryText;
        prnFrequencyLabel = prnCell.prnFrequencyLabel;
      } else {
        const scheduledDisplay = cellFromFluid ??
          buildMarShiftTimelineCellDisplay({
            medicationLabel,
            doseKind: parsedDoseKind ?? dose.doseKind,
            doseStatus: parsedStatus,
            route,
            frequencyCode,
            requiresWitness,
            responseDueAt: dose.responseDueAt,
            enrichment,
            facilityTimeZone: shiftWindow.facilityTimeZone,
            directionsSig,
            marNotes: administrationNotes,
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
          doseKind: parsedDoseKind ?? dose.doseKind,
          doseStatus: parsedStatus,
          enrichment,
          facilityTimeZone: shiftWindow.facilityTimeZone,
        });

      const scheduleAdjustment = !isPrnBand
        ? buildMarScheduleAdjustmentTimelineProjection({
            scheduledAt: dose.scheduledAt.toISOString(),
            orderedDoseSnapshotJson: dose.orderedDoseSnapshotJson,
          })
        : null;
      if (scheduleAdjustment?.isRescheduled) {
        secondaryText = scheduleAdjustment.badgeLabel ?? "RESCHEDULED";
      }

      const painResponseProjection = buildMarPainResponseTimelineProjection({
        catalogCode: catalogSnapshot?.catalogItemCode ?? null,
        medicationLabel,
        genericName: catalogSnapshot?.genericName ?? orderedSnapshot?.medicationLabel ?? null,
        marAction: enrichment?.marAction ?? (enrichment?.administeredAt ? "administered" : null),
        administrationNotes,
        administeredAt: enrichment?.administeredAt ?? null,
        doseStatus: parsedStatus,
        frequencyCode,
        directionsSig,
        prnIndication: prnDisplay.orderPrnIndication,
        defaultSecondaryText: secondaryText,
      });
      secondaryText = painResponseProjection.secondaryText;

      const medicationResponses = painResponseProjection.medicationResponses ?? [];
      const medicationResponseBadge = painResponseProjection.medicationResponseBadge;
      const medicationResponseFollowUp = painResponseProjection.medicationResponseFollowUp;
      const medicationResponseAdverseEscalation = medicationResponses.some(
        (r) => r.responseCode === "ADVERSE_REACTION_REPORTED"
      );
      const allergyReviewCandidates = filterActiveMarAllergyReviewCandidates(
        parseMarAllergyReviewCandidatesFromNotes(administrationNotes)
      );

      const item: MarShiftTimelineCellItem = {
        type: "MEDICATION",
        medicationDoseInstanceId: dose.id,
        orderItemId: dose.orderItemId,
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
        prnProjectionKey:
          isPrnBand &&
          enrichment?.administeredAt &&
          (parsedStatus === "COMPLETED" ||
            isMarShiftTimelineTerminalClinicalAction(clinicalAction))
            ? `terminal:${dose.orderItemId}:${enrichment.administeredAt}`
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
        doseKind: parsedDoseKind ?? dose.doseKind,
        route,
        frequencyCode,
        scheduledAt: dose.scheduledAt.toISOString(),
        dueWindowStartAt: dose.dueWindowStartAt.toISOString(),
        dueWindowEndAt: dose.dueWindowEndAt.toISOString(),
        requiresWitness,
        clinicalAction,
        hover: buildMarShiftTimelineHover({
          medicationLabel,
          scheduledAt: dose.scheduledAt,
          doseAmount,
          route,
          requiresWitness,
          doseStatus: parsedStatus,
          facilityTimeZone: shiftWindow.facilityTimeZone,
          directionsSig,
        }),
        actions:
          fluidEnrichment?.drawerActions ??
          resolveMarShiftTimelineDrawerActions(clinicalAction, {
            continuousFluidStatus: fluidEnrichment?.continuousFluidStatus as never,
            fluidBolusStatus: fluidEnrichment?.fluidBolusStatus as never,
          }),
        scheduleAdjustment,
        scheduleAdjustmentChain: scheduleAdjustment?.isRescheduled
          ? buildMarScheduleAdjustmentChain({
              scheduledAt: dose.scheduledAt.toISOString(),
              orderedDoseSnapshotJson: dose.orderedDoseSnapshotJson,
              administeredAt: enrichment?.administeredAt ?? null,
            })
          : undefined,
        administrationVariance:
          !isPrnBand && enrichment?.administeredAt
            ? buildMarAdministrationVarianceTimelineProjection({
                scheduledAt: dose.scheduledAt.toISOString(),
                administeredAt: enrichment.administeredAt,
                orderedDoseSnapshotJson: dose.orderedDoseSnapshotJson,
                administrationNotes: enrichment.administrationNotes ?? null,
                performedByDisplay: enrichment.administeredByDisplay ?? null,
                performedAt: enrichment.administeredAt,
              })
            : null,
        medicationAdministrationId: enrichment?.medicationAdministrationId ?? null,
        medicationResponses: medicationResponses.length > 0 ? medicationResponses : undefined,
        medicationResponseBadge,
        medicationResponseFollowUp,
        medicationResponseAdverseEscalation,
        allergyReviewCandidates:
          allergyReviewCandidates.length > 0 ? allergyReviewCandidates : undefined,
      };

      const rowMeta = {
        patientId: dose.encounter.patient.id,
        encounterId: dose.encounterId,
        patientDisplay: formatPatientDisplay(
          dose.encounter.patient.firstName,
          dose.encounter.patient.lastName
        ),
        roomLabel: dose.encounter.roomLabel,
        encounterType: dose.encounter.type,
        admissionSummaryJson: dose.encounter.admissionSummaryJson,
        assignedNurseUserId: dose.encounter.nurseAssignedUserId,
      };
      const { scheduled, prn } = ensureRowMaps(rowMeta);
      const targetRow = isPrnBand ? prn : scheduled;
      if (isPrnBand) {
        upsertMarShiftTimelinePrnCellItem(targetRow, columnKey, item);
      } else {
        appendMarShiftTimelineCellItem(targetRow, columnKey, item);
      }
    }

    const visiblePrnOrderItemIds = collectVisiblePrnOrderItemIds(prnRowMap);

    const fallbackPlacements = await loadMarShiftTimelineOrderItemFallbackPlacements({
      prisma: this.prisma,
      facilityId,
      shiftStart: shiftWindow.startAt,
      shiftEnd: shiftWindow.endAt,
      columns,
      facilityTimeZone: shiftWindow.facilityTimeZone,
      displayLocale,
      encounterId: query.encounterId,
      assignedToUserId: query.assignedToUserId,
      includeCompleted,
      orderItemIdsWithDoseInstances,
      visiblePrnOrderItemIds,
      governanceByCatalogId,
      lastPrnAdminByOrderItemId,
      referenceAt,
    });

    for (const placement of fallbackPlacements) {
      const isPrnBand = placement.item.isPrnBand === true;
      const { scheduled, prn } = ensureRowMaps({
        patientId: placement.patientId,
        encounterId: placement.encounterId,
        patientDisplay: placement.patientDisplay,
        roomLabel: placement.roomLabel,
        encounterType: placement.encounterType,
        admissionSummaryJson: placement.admissionSummaryJson,
        assignedNurseUserId: placement.assignedNurseUserId,
      });
      const targetRow = isPrnBand ? prn : scheduled;
      if (isPrnBand) {
        upsertMarShiftTimelinePrnCellItem(targetRow, placement.columnKey, placement.item);
        continue;
      }
      const existingCell = targetRow.cells.find((c) => c.columnKey === placement.columnKey);
      const duplicate = existingCell?.items.some(
        (existing) =>
          existing.orderItemId === placement.item.orderItemId &&
          !existing.medicationDoseInstanceId?.trim()
      );
      if (!duplicate) {
        appendMarShiftTimelineCellItem(targetRow, placement.columnKey, placement.item);
      }
    }

    const canceledPlacements = await loadMarShiftTimelineCanceledPlacements({
      prisma: this.prisma,
      facilityId,
      shiftStart: shiftWindow.startAt,
      shiftEnd: shiftWindow.endAt,
      columns,
      facilityTimeZone: shiftWindow.facilityTimeZone,
      displayLocale,
      encounterId: query.encounterId,
      assignedToUserId: query.assignedToUserId,
      governanceByCatalogId,
    });

    for (const placement of canceledPlacements) {
      const isPrnBand = placement.item.isPrnBand === true;
      const { scheduled, prn } = ensureRowMaps({
        patientId: placement.patientId,
        encounterId: placement.encounterId,
        patientDisplay: placement.patientDisplay,
        roomLabel: placement.roomLabel,
        encounterType: placement.encounterType,
        admissionSummaryJson: placement.admissionSummaryJson,
        assignedNurseUserId: placement.assignedNurseUserId,
      });
      const targetRow = isPrnBand ? prn : scheduled;
      const markerId = placement.item.medicationDoseInstanceId?.trim() ?? "";
      const existingCell = targetRow.cells.find((c) => c.columnKey === placement.columnKey);
      const duplicateCanceled = existingCell?.items.some(
        (existing) => existing.medicationDoseInstanceId?.trim() === markerId
      );
      if (duplicateCanceled) continue;
      if (isPrnBand) {
        upsertMarShiftTimelinePrnCellItem(targetRow, placement.columnKey, placement.item);
      } else {
        appendMarShiftTimelineCellItem(targetRow, placement.columnKey, placement.item);
      }
    }

    if (prnOrderItemIds.length > 0) {
      const prnProjectionOrderItems = await this.prisma.orderItem.findMany({
        where: { id: { in: prnOrderItemIds } },
        select: {
          id: true,
          notes: true,
          frequencyCode: true,
          createdAt: true,
          intendedAdministrationAt: true,
          strength: true,
          quantity: true,
          route: true,
          catalogItemId: true,
          manualLabel: true,
          order: {
            select: {
              encounterId: true,
              encounter: {
                select: {
                  id: true,
                  type: true,
                  roomLabel: true,
                  admissionSummaryJson: true,
                  nurseAssignedUserId: true,
                  patient: { select: { id: true, firstName: true, lastName: true } },
                },
              },
            },
          },
        },
      });

      const prnProjectionCatalogIds = [
        ...new Set(
          prnProjectionOrderItems
            .map((row) => row.catalogItemId?.trim())
            .filter((id): id is string => Boolean(id))
        ),
      ];
      const prnProjectionCatalogRows =
        prnProjectionCatalogIds.length > 0
          ? await this.prisma.catalogMedication.findMany({
              where: { id: { in: prnProjectionCatalogIds } },
              select: {
                id: true,
                code: true,
                displayNameEn: true,
                displayNameFr: true,
                genericName: true,
              },
            })
          : [];
      const prnProjectionCatalogById = new Map(
        prnProjectionCatalogRows.map((row) => [row.id, row])
      );

      for (const orderItem of prnProjectionOrderItems) {
        if (
          !isPrnMedicationOrderClassification({
            frequencyCode: orderItem.frequencyCode,
            directionsSig: orderItem.notes,
          })
        ) {
          continue;
        }

        const encounter = orderItem.order.encounter;
        const { prn } = ensureRowMaps({
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
        });

        const catalogRow = orderItem.catalogItemId
          ? prnProjectionCatalogById.get(orderItem.catalogItemId) ?? null
          : null;
        const medicationLabel = resolveMarShiftTimelineMedicationLabel({
          locale: displayLocale,
          manualLabel: orderItem.manualLabel,
          catalogSnapshot: catalogRow
            ? {
                catalogItemId: catalogRow.id,
                catalogItemCode: catalogRow.code,
                displayNameEn: catalogRow.displayNameEn,
                displayNameFr: catalogRow.displayNameFr,
                genericName: catalogRow.genericName,
              }
            : null,
        });
        const doseAmount =
          orderItem.strength?.trim() ||
          (orderItem.quantity != null ? String(orderItem.quantity) : null);
        const lastAdmin = lastPrnAdminByOrderItemId.get(orderItem.id);
        const prnTiming = resolveMarShiftTimelinePrnTiming({
          orderItemId: orderItem.id,
          frequencyCode: orderItem.frequencyCode,
          lastAdminByOrderItemId: lastPrnAdminByOrderItemId,
        });

        appendMarShiftTimelinePrnAvailabilityProjections({
          row: prn,
          prnLastGivenAt: prnTiming.prnLastGivenAt,
          context: {
            orderItemId: orderItem.id,
            medicationLabel,
            doseAmount,
            route: orderItem.route,
            frequencyCode: orderItem.frequencyCode,
            directionsSig: orderItem.notes,
            createdAt: orderItem.createdAt,
            intendedAdministrationAt: orderItem.intendedAdministrationAt,
            lastAdministeredAt: lastAdmin?.administeredAt ?? null,
            terminalAdministeredAt: lastAdmin?.administeredAt ?? null,
            shiftStart: shiftWindow.startAt,
            shiftEnd: shiftWindow.endAt,
            columns,
            facilityTimeZone: shiftWindow.facilityTimeZone,
            referenceAt,
          },
        });
      }
    }

    const rows = mergeScheduledAndPrnMarShiftTimelineRows(scheduledRowMap, prnRowMap);

    return {
      enabled: true,
      facility: { id: facility.id, name: facility.name, timeZone: shiftWindow.facilityTimeZone },
      title: buildMarShiftTimelineTitle(facility.name),
      viewer,
      shift: {
        code: shiftWindow.code,
        label: shiftWindow.label,
        startAt: shiftWindow.startAt.toISOString(),
        endAt: shiftWindow.endAt.toISOString(),
        timeZone: shiftWindow.facilityTimeZone,
        columns,
      },
      rows,
      locale: displayLocale,
    };
  }

  async resolveViewer(
    facilityId: string,
    userId: string
  ): Promise<MarShiftTimelineViewer> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const roleRow = await this.prisma.userRole.findFirst({
      where: { userId, facilityId, isActive: true },
      include: { role: true },
    });

    return {
      userId: user.id,
      displayName: formatViewerDisplayName({
        firstName: user.firstName,
        lastName: user.lastName,
        role: roleRow?.role.code ?? "RN",
      }),
      role: roleRow?.role.code ?? "RN",
    };
  }
}

export { parseMarShiftTimelineShiftCode };
