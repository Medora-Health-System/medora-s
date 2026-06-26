import {
  buildMarPrnTimelineCellDisplay,
  buildPrnTimelineAvailabilityProjections,
  dedupeMarPrnTimelineRowCells,
  formatGovernedRoomDisplay,
  formatMarPrnFrequencyLabel,
  isPrnMedicationOrderClassification,
  prnTimelineCellPriority,
  resolveMarPrnTimelineColumnKey,
  resolveMarShiftTimelineColumnKey,
  resolvePrnNextEligibleAt,
  resolvePrnTimelineTerminalDisplay,
  shouldRetainPrnTimelineItem,
  type MarShiftTimelineColumn,
  type PrnTimelineAvailabilityProjection,
} from "@medora/shared";
import type { PrismaService } from "../prisma/prisma.service";
import type {
  MarShiftTimelineCellItem,
  MarShiftTimelineRow,
  MarShiftTimelineRowCell,
} from "./mar-shift-timeline.service";

export type MarShiftTimelineRowKind = "SCHEDULED" | "PRN";

export type MarShiftTimelineRowWithKind = MarShiftTimelineRow & {
  rowKind: MarShiftTimelineRowKind;
  prnBandSubtitle?: string | null;
};

export function createEmptyMarShiftTimelineRow(input: {
  patientId: string;
  encounterId: string;
  patientDisplay: string;
  roomLabel: string | null;
  encounterType?: string | null;
  admissionSummaryJson?: unknown;
  assignedNurseUserId: string | null;
  rowKind: MarShiftTimelineRowKind;
}): MarShiftTimelineRowWithKind {
  const governed = formatGovernedRoomDisplay({
    roomLabel: input.roomLabel,
    encounterType: input.encounterType,
    admissionSummaryJson: input.admissionSummaryJson,
    emptyLabel: "No room assigned",
  });
  return {
    patientId: input.patientId,
    encounterId: input.encounterId,
    patientDisplay: input.patientDisplay,
    roomLabel: input.roomLabel,
    governedRoomDisplay: governed.display,
    assignedNurseUserId: input.assignedNurseUserId,
    cells: [],
    rowKind: input.rowKind,
    prnBandSubtitle: input.rowKind === "PRN" ? "Available PRN meds" : null,
  };
}

export function appendMarShiftTimelineCellItem(
  row: MarShiftTimelineRowWithKind,
  columnKey: string,
  item: MarShiftTimelineCellItem
): void {
  let cell = row.cells.find((c) => c.columnKey === columnKey);
  if (!cell) {
    cell = { columnKey, items: [] };
    row.cells.push(cell);
  }
  cell.items.push(item);
}

/** Stable dedupe key for PRN row cells (K.10B.11A). */
export function resolveMarShiftTimelinePrnCellDedupeKey(
  item: MarShiftTimelineCellItem
): string {
  if (item.prnProjectionKey?.trim()) return item.prnProjectionKey.trim();
  if (
    resolvePrnTimelineTerminalDisplay({
      doseStatus: item.doseStatus,
      readOnly: item.readOnly,
      secondaryText: item.secondaryText,
    })
  ) {
    return `terminal:${item.orderItemId}:${item.administeredAt ?? item.medicationDoseInstanceId ?? "unknown"}`;
  }
  if (item.medicationDoseInstanceId?.trim()) {
    return `dose:${item.orderItemId}:${item.medicationDoseInstanceId}`;
  }
  return `fallback:${item.orderItemId}:${item.scheduledAt}`;
}

/** Replace PRN cell with the same dedupe key; keep terminal and other projections (K.10B.11A). */
export function upsertMarShiftTimelinePrnCellItem(
  row: MarShiftTimelineRowWithKind,
  columnKey: string,
  item: MarShiftTimelineCellItem
): void {
  const incomingKey = resolveMarShiftTimelinePrnCellDedupeKey(item);
  const incomingPriority = prnTimelineCellPriority({
    doseStatus: item.doseStatus,
    readOnly: item.readOnly,
    secondaryText: item.secondaryText,
    hasMedicationDoseInstanceId: Boolean(item.medicationDoseInstanceId?.trim()),
    prnProjectionKey: item.prnProjectionKey,
  });

  for (const cell of row.cells) {
    cell.items = cell.items.filter((existing) => {
      if (existing.isPrnBand !== true) return true;
      const existingKey = resolveMarShiftTimelinePrnCellDedupeKey(existing);
      if (existingKey !== incomingKey) return true;
      const existingPriority = prnTimelineCellPriority({
        doseStatus: existing.doseStatus,
        readOnly: existing.readOnly,
        secondaryText: existing.secondaryText,
        hasMedicationDoseInstanceId: Boolean(existing.medicationDoseInstanceId?.trim()),
        prnProjectionKey: existing.prnProjectionKey,
      });
      return existingPriority > incomingPriority;
    });
  }

  row.cells = row.cells.filter((cell) => cell.items.length > 0);
  appendMarShiftTimelineCellItem(row, columnKey, item);
}

export { shouldRetainPrnTimelineItem };

export async function loadPrnAdministrationsInShiftByOrderItemId(
  prisma: PrismaService,
  orderItemIds: string[],
  shiftStart: Date,
  shiftEnd: Date
): Promise<
  Map<
    string,
    Array<{
      id: string;
      administeredAt: Date;
      marAction: string | null;
      notes: string | null;
      infusionPhase: string | null;
    }>
  >
> {
  if (orderItemIds.length === 0) return new Map();
  const rows = await prisma.medicationAdministration.findMany({
    where: {
      orderItemId: { in: orderItemIds },
      marAction: "administered",
      administeredAt: { gte: shiftStart, lt: shiftEnd },
    },
    select: {
      id: true,
      orderItemId: true,
      administeredAt: true,
      marAction: true,
      notes: true,
      infusionPhase: true,
    },
    orderBy: { administeredAt: "asc" },
  });
  const map = new Map<
    string,
    Array<{
      id: string;
      administeredAt: Date;
      marAction: string | null;
      notes: string | null;
      infusionPhase: string | null;
    }>
  >();
  for (const row of rows) {
    if (!row.orderItemId || !row.administeredAt) continue;
    const list = map.get(row.orderItemId) ?? [];
    list.push({
      id: row.id,
      administeredAt: row.administeredAt,
      marAction: row.marAction,
      notes: row.notes,
      infusionPhase: row.infusionPhase,
    });
    map.set(row.orderItemId, list);
  }
  return map;
}

export function marShiftTimelinePrnRowHasTerminalCell(
  row: MarShiftTimelineRowWithKind,
  orderItemId: string,
  administeredAtIso: string
): boolean {
  const terminalKey = `terminal:${orderItemId}:${administeredAtIso}`;
  return row.cells.some((cell) =>
    cell.items.some(
      (item) =>
        item.isPrnBand === true &&
        item.orderItemId === orderItemId &&
        (item.prnProjectionKey === terminalKey ||
          (item.doseStatus === "COMPLETED" &&
            item.administeredAt === administeredAtIso &&
            item.readOnly === true))
    )
  );
}

export async function loadLastPrnAdministrationByOrderItemId(
  prisma: PrismaService,
  orderItemIds: string[]
): Promise<Map<string, { administeredAt: Date; marAction: string | null }>> {
  if (orderItemIds.length === 0) return new Map();
  const rows = await prisma.medicationAdministration.findMany({
    where: {
      orderItemId: { in: orderItemIds },
      marAction: "administered",
    },
    select: {
      orderItemId: true,
      administeredAt: true,
      marAction: true,
    },
    orderBy: { administeredAt: "desc" },
  });
  const map = new Map<string, { administeredAt: Date; marAction: string | null }>();
  for (const row of rows) {
    if (!row.orderItemId || map.has(row.orderItemId)) continue;
    if (!row.administeredAt) continue;
    map.set(row.orderItemId, {
      administeredAt: row.administeredAt,
      marAction: row.marAction,
    });
  }
  return map;
}

export function resolveMarShiftTimelinePrnTiming(input: {
  orderItemId: string;
  frequencyCode: string | null;
  lastAdminByOrderItemId: Map<string, { administeredAt: Date }>;
  enrichmentAdministeredAt?: string | null;
}): { prnLastGivenAt: string | null; prnNextEligibleAt: string | null } {
  const fromHistory = input.lastAdminByOrderItemId.get(input.orderItemId)?.administeredAt ?? null;
  const lastInstant =
    fromHistory ??
    (input.enrichmentAdministeredAt ? new Date(input.enrichmentAdministeredAt) : null);
  const prnLastGivenAt =
    lastInstant && !Number.isNaN(lastInstant.getTime()) ? lastInstant.toISOString() : null;
  const nextEligible = resolvePrnNextEligibleAt({
    lastAdministeredAt: prnLastGivenAt,
    frequencyCode: input.frequencyCode,
  });
  return {
    prnLastGivenAt,
    prnNextEligibleAt: nextEligible?.toISOString() ?? null,
  };
}

export function buildMarShiftTimelinePrnCellTexts(input: {
  medicationLabel: string | null;
  doseAmount: string | null;
  route: string | null;
  frequencyCode: string | null;
  directionsSig: string | null;
  doseStatus: string;
  administeredAt?: string | null;
  administeredByInitials?: string | null;
  prnLastGivenAt?: string | null;
  prnNextEligibleAt?: string | null;
  facilityTimeZone: string;
  secondaryTextOverride?: string | null;
  projectedEligibleAt?: string | null;
}): Pick<MarShiftTimelineCellItem, "primaryText" | "secondaryText" | "tertiaryText"> & {
  isPrnBand: true;
  prnFrequencyLabel: string;
} {
  const display = buildMarPrnTimelineCellDisplay({
    medicationLabel: input.medicationLabel,
    doseAmount: input.doseAmount,
    route: input.route,
    frequencyCode: input.frequencyCode,
    directionsSig: input.directionsSig,
    doseStatus: input.doseStatus,
    administeredAt: input.administeredAt,
    administeredByInitials: input.administeredByInitials,
    prnLastGivenAt: input.prnLastGivenAt,
    prnNextEligibleAt: input.prnNextEligibleAt,
    facilityTimeZone: input.facilityTimeZone,
    secondaryTextOverride: input.secondaryTextOverride,
    projectedEligibleAt: input.projectedEligibleAt,
  });
  return {
    primaryText: display.primaryText,
    secondaryText: display.secondaryText,
    tertiaryText: display.tertiaryText,
    isPrnBand: true,
    prnFrequencyLabel: formatMarPrnFrequencyLabel({
      frequencyCode: input.frequencyCode,
      directionsSig: input.directionsSig,
      presentation: "drawer",
    }),
  };
}

export function resolveMarShiftTimelinePrnColumnKey(input: {
  doseStatus: string;
  administeredAt?: string | null;
  prnLastGivenAt?: string | null;
  prnNextEligibleAt?: string | null;
  referenceAt: Date;
  columns: readonly MarShiftTimelineColumn[];
  facilityTimeZone: string;
}): string | null {
  return resolveMarPrnTimelineColumnKey({
    doseStatus: input.doseStatus,
    administeredAt: input.administeredAt,
    prnLastGivenAt: input.prnLastGivenAt,
    prnNextEligibleAt: input.prnNextEligibleAt,
    referenceAt: input.referenceAt,
    columns: input.columns,
    facilityTimeZone: input.facilityTimeZone,
  });
}

/** PRN order items already rendered from visible MedicationDoseInstance cells (K.10B.8B). */
export function collectVisiblePrnOrderItemIds(
  prnRowMap: ReadonlyMap<string, MarShiftTimelineRowWithKind>
): Set<string> {
  const ids = new Set<string>();
  for (const row of prnRowMap.values()) {
    for (const cell of row.cells) {
      for (const item of cell.items) {
        if (item.isPrnBand === true && item.medicationDoseInstanceId?.trim()) {
          ids.add(item.orderItemId);
        }
      }
    }
  }
  return ids;
}

export function marShiftTimelinePrnRowHasOrderItem(
  row: MarShiftTimelineRowWithKind,
  orderItemId: string
): boolean {
  return row.cells.some((cell) =>
    cell.items.some((item) => item.isPrnBand === true && item.orderItemId === orderItemId)
  );
}

export function mergeScheduledAndPrnMarShiftTimelineRows(
  scheduledMap: Map<string, MarShiftTimelineRowWithKind>,
  prnMap: Map<string, MarShiftTimelineRowWithKind>
): MarShiftTimelineRowWithKind[] {
  const encounterIds = new Set([...scheduledMap.keys(), ...prnMap.keys()]);
  const sorted = [...encounterIds].sort((a, b) => {
    const rowA = scheduledMap.get(a) ?? prnMap.get(a)!;
    const rowB = scheduledMap.get(b) ?? prnMap.get(b)!;
    const roomA = rowA.roomLabel ?? "";
    const roomB = rowB.roomLabel ?? "";
    if (roomA !== roomB) return roomA.localeCompare(roomB, undefined, { numeric: true });
    return rowA.patientDisplay.localeCompare(rowB.patientDisplay);
  });

  const merged: MarShiftTimelineRowWithKind[] = [];
  for (const encounterId of sorted) {
    const scheduled = scheduledMap.get(encounterId);
    if (scheduled) {
      merged.push(scheduled);
    }
    const prn = prnMap.get(encounterId);
    if (prn && prn.cells.some((cell) => cell.items.length > 0)) {
      merged.push(prn);
    }
  }
  return merged;
}

export function prnTerminalMarOverlapsShift(input: {
  administeredAt: Date | null | undefined;
  shiftStart: Date;
  shiftEnd: Date;
}): boolean {
  if (!input.administeredAt) return false;
  const time = input.administeredAt.getTime();
  return time >= input.shiftStart.getTime() && time < input.shiftEnd.getTime();
}

export type MarShiftTimelinePrnProjectionContext = {
  orderItemId: string;
  medicationLabel: string | null;
  doseAmount: string | null;
  route: string | null;
  frequencyCode: string | null;
  directionsSig: string | null;
  createdAt: Date | string;
  intendedAdministrationAt?: Date | string | null;
  lastAdministeredAt?: Date | string | null;
  terminalAdministeredAt?: Date | string | null;
  shiftStart: Date;
  shiftEnd: Date;
  columns: readonly MarShiftTimelineColumn[];
  facilityTimeZone: string;
  referenceAt: Date;
};

export function buildMarShiftTimelinePrnProjectionCellItem(input: {
  projection: PrnTimelineAvailabilityProjection;
  context: MarShiftTimelinePrnProjectionContext;
  prnLastGivenAt?: string | null;
}): { columnKey: string; item: MarShiftTimelineCellItem } | null {
  const eligibleAt = new Date(input.projection.eligibleAt);
  if (Number.isNaN(eligibleAt.getTime())) return null;
  const columnKey = resolveMarShiftTimelineColumnKey({
    scheduledAt: eligibleAt,
    columns: input.context.columns,
    facilityTimeZone: input.context.facilityTimeZone,
  });
  if (!columnKey) return null;

  const prnCell = buildMarShiftTimelinePrnCellTexts({
    medicationLabel: input.context.medicationLabel,
    doseAmount: input.context.doseAmount,
    route: input.context.route,
    frequencyCode: input.context.frequencyCode,
    directionsSig: input.context.directionsSig,
    doseStatus: "DUE",
    prnLastGivenAt: input.prnLastGivenAt ?? null,
    prnNextEligibleAt: input.projection.prnNextEligibleAt,
    facilityTimeZone: input.context.facilityTimeZone,
    projectedEligibleAt: input.projection.eligibleAt,
  });

  const windowEnd = new Date(eligibleAt.getTime() + 60 * 60 * 1000);
  return {
    columnKey,
    item: {
      type: "MEDICATION",
      medicationDoseInstanceId: "",
      orderItemId: input.context.orderItemId,
      medicationLabel: input.context.medicationLabel,
      primaryText: prnCell.primaryText,
      secondaryText: prnCell.secondaryText,
      tertiaryText: prnCell.tertiaryText,
      doseStatus: "DUE",
      readOnly: false,
      startedAt: null,
      startedByDisplay: null,
      startedByInitials: null,
      stoppedAt: null,
      stoppedByDisplay: null,
      stoppedByInitials: null,
      administeredAt: null,
      administeredByDisplay: null,
      administeredByInitials: null,
      completionSummary: prnCell.tertiaryText || null,
      isPrnBand: true,
      prnFrequencyLabel: prnCell.prnFrequencyLabel,
      prnLastGivenAt: input.prnLastGivenAt ?? null,
      prnNextEligibleAt: input.projection.prnNextEligibleAt,
      prnProjectionKey: input.projection.projectionKey,
      doseKind: "FIXED_ADMINISTRATION",
      route: input.context.route,
      frequencyCode: input.context.frequencyCode,
      scheduledAt: eligibleAt.toISOString(),
      dueWindowStartAt: eligibleAt.toISOString(),
      dueWindowEndAt: windowEnd.toISOString(),
      requiresWitness: false,
      clinicalAction: "ADMINISTER",
      hover: {
        title: input.context.medicationLabel ?? "Medication",
        due: prnCell.tertiaryText,
        dose: input.context.doseAmount,
        route: input.context.route,
        witness: null,
        status: "Due",
      },
      actions: ["ADMINISTER", "REFUSE", "HOLD", "VIEW_ORDER"],
    },
  };
}

export function appendMarShiftTimelinePrnAvailabilityProjections(input: {
  row: MarShiftTimelineRowWithKind;
  context: MarShiftTimelinePrnProjectionContext;
  prnLastGivenAt?: string | null;
}): void {
  const projections = buildPrnTimelineAvailabilityProjections({
    orderItemId: input.context.orderItemId,
    frequencyCode: input.context.frequencyCode,
    firstEligibleAt: input.context.intendedAdministrationAt ?? input.context.createdAt,
    plannedAt: input.context.intendedAdministrationAt,
    createdAt: input.context.createdAt,
    lastAdministeredAt: input.context.lastAdministeredAt,
    shiftStartAt: input.context.shiftStart,
    shiftEndAt: input.context.shiftEnd,
    terminalAdministeredAt: input.context.terminalAdministeredAt,
  });

  for (const projection of projections) {
    const built = buildMarShiftTimelinePrnProjectionCellItem({
      projection,
      context: input.context,
      prnLastGivenAt: input.prnLastGivenAt,
    });
    if (!built) continue;

    const existingCell = input.row.cells.find((cell) => cell.columnKey === built.columnKey);
    const hasBlockingNonTerminalCell = existingCell?.items.some(
      (existing) =>
        existing.orderItemId === input.context.orderItemId &&
        existing.isPrnBand === true &&
        !existing.prnProjectionKey?.trim() &&
        existing.doseStatus === "DUE" &&
        existing.clinicalAction === "ADMINISTER"
    );
    if (hasBlockingNonTerminalCell) continue;

    upsertMarShiftTimelinePrnCellItem(input.row, built.columnKey, built.item);
  }

  input.row.cells = dedupeMarPrnTimelineRowCells(input.row.cells);
}

export { isPrnMedicationOrderClassification };
