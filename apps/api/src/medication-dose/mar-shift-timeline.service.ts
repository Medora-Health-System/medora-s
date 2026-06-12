import {
  buildMarShiftTimelineCellDisplay,
  buildMarShiftTimelineColumns,
  buildMarShiftTimelineHover,
  buildMarShiftTimelineTitle,
  doseOverlapsMarShiftTimelineWindow,
  parseMarShiftTimelineShiftCode,
  resolveMarShiftTimelineClinicalAction,
  resolveMarShiftTimelineColumnKey,
  resolveMarShiftTimelineDrawerActions,
  resolveMarShiftTimelineWindow,
  shouldIncludeMarShiftTimelineDose,
  isMarShiftTimelineItemReadOnly,
  buildMarShiftTimelineTertiaryText,
  resolveMarShiftTimelineMedicationLabel,
  normalizeMarShiftTimelineLocale,
  medicationIvpbDoseSchedulingEnabled,
  medicationSchedulingFeatureFlagsEnabled,
  parseMedicationDoseKind,
  parseMedicationDoseStatus,
  type MarShiftTimelineClinicalAction,
  type MarShiftTimelineDrawerAction,
  type MarShiftTimelineHover,
  type MarShiftTimelineShiftCode,
  type MedicationCatalogSnapshotJson,
  type MedicationFrequencySnapshotJson,
  type MedicationOrderedDoseSnapshotJson,
  type MedicationSafetyGovernanceSnapshot,
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
  assignedNurseUserId: string | null;
  cells: MarShiftTimelineRowCell[];
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

    const facilityTimeZone = facility.timezone?.trim() || "UTC";
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

    const doseInstanceOrderItemRows = await this.prisma.medicationDoseInstance.findMany({
      where: {
        facilityId,
        doseStatus: { notIn: excludedStatuses },
        ...(query.encounterId ? { encounterId: query.encounterId } : {}),
      },
      select: { orderItemId: true },
      distinct: ["orderItemId"],
    });
    const orderItemIdsWithDoseInstances = new Set(
      doseInstanceOrderItemRows.map((row) => row.orderItemId)
    );

    const rowMap = new Map<string, MarShiftTimelineRow>();

    for (const dose of doses) {
      const parsedStatus = parseMedicationDoseStatus(dose.doseStatus);
      if (!parsedStatus) continue;

      if (
        !shouldIncludeMarShiftTimelineDose({
          doseKind: dose.doseKind,
          doseStatus: dose.doseStatus,
          ivpbSchedulingEnabled,
          includeCompleted,
          includeUpcoming,
        })
      ) {
        continue;
      }

      if (
        !doseOverlapsMarShiftTimelineWindow({
          shiftStart: shiftWindow.startAt,
          shiftEnd: shiftWindow.endAt,
          scheduledAt: dose.scheduledAt,
          dueWindowStartAt: dose.dueWindowStartAt,
          dueWindowEndAt: dose.dueWindowEndAt,
          doseStatus: dose.doseStatus,
          infusionSessionId: dose.infusionSessionId,
        })
      ) {
        continue;
      }

      const columnKey = resolveMarShiftTimelineColumnKey({
        scheduledAt: dose.scheduledAt,
        dueWindowStartAt: dose.dueWindowStartAt,
        columns,
        facilityTimeZone: shiftWindow.facilityTimeZone,
      });
      if (!columnKey) continue;

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
      const clinicalAction = resolveMarShiftTimelineClinicalAction(
        parsedDoseKind ?? dose.doseKind,
        parsedStatus
      );
      const enrichment = administrationEnrichmentByDoseId.get(dose.id) ?? null;
      const { primaryText, secondaryText, tertiaryText } = buildMarShiftTimelineCellDisplay({
        medicationLabel,
        doseKind: parsedDoseKind ?? dose.doseKind,
        doseStatus: parsedStatus,
        route,
        frequencyCode: frequencySnapshot?.frequencyCode ?? null,
        requiresWitness,
        responseDueAt: dose.responseDueAt,
        enrichment,
        facilityTimeZone: shiftWindow.facilityTimeZone,
      });
      const resolvedTertiaryText =
        tertiaryText.trim() ||
        buildMarShiftTimelineTertiaryText({
          doseKind: parsedDoseKind ?? dose.doseKind,
          doseStatus: parsedStatus,
          enrichment,
          facilityTimeZone: shiftWindow.facilityTimeZone,
        });

      const doseValue = orderedSnapshot?.doseValue?.trim();
      const doseUnit = orderedSnapshot?.doseUnit?.trim();
      const doseAmount =
        doseValue && doseUnit
          ? `${doseValue} ${doseUnit}`
          : doseValue || doseUnit || orderedSnapshot?.quantity?.trim() || null;

      const item: MarShiftTimelineCellItem = {
        type: "MEDICATION",
        medicationDoseInstanceId: dose.id,
        orderItemId: dose.orderItemId,
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
        doseKind: parsedDoseKind ?? dose.doseKind,
        route,
        frequencyCode: frequencySnapshot?.frequencyCode ?? null,
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
        }),
        actions: resolveMarShiftTimelineDrawerActions(clinicalAction),
      };

      const rowKey = dose.encounterId;
      let row = rowMap.get(rowKey);
      if (!row) {
        row = {
          patientId: dose.encounter.patient.id,
          encounterId: dose.encounterId,
          patientDisplay: formatPatientDisplay(
            dose.encounter.patient.firstName,
            dose.encounter.patient.lastName
          ),
          roomLabel: dose.encounter.roomLabel,
          assignedNurseUserId: dose.encounter.nurseAssignedUserId,
          cells: [],
        };
        rowMap.set(rowKey, row);
      }

      let cell = row.cells.find((c) => c.columnKey === columnKey);
      if (!cell) {
        cell = { columnKey, items: [] };
        row.cells.push(cell);
      }
      cell.items.push(item);
    }

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
      governanceByCatalogId,
    });

    for (const placement of fallbackPlacements) {
      const rowKey = placement.encounterId;
      let row = rowMap.get(rowKey);
      if (!row) {
        row = {
          patientId: placement.patientId,
          encounterId: placement.encounterId,
          patientDisplay: placement.patientDisplay,
          roomLabel: placement.roomLabel,
          assignedNurseUserId: placement.assignedNurseUserId,
          cells: [],
        };
        rowMap.set(rowKey, row);
      }

      let cell = row.cells.find((c) => c.columnKey === placement.columnKey);
      if (!cell) {
        cell = { columnKey: placement.columnKey, items: [] };
        row.cells.push(cell);
      }

      const duplicate = cell.items.some(
        (existing) =>
          existing.orderItemId === placement.item.orderItemId &&
          !existing.medicationDoseInstanceId?.trim()
      );
      if (!duplicate) {
        cell.items.push(placement.item);
      }
    }

    const rows = [...rowMap.values()].sort((a, b) => {
      const roomA = a.roomLabel ?? "";
      const roomB = b.roomLabel ?? "";
      if (roomA !== roomB) return roomA.localeCompare(roomB, undefined, { numeric: true });
      return a.patientDisplay.localeCompare(b.patientDisplay);
    });

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
