import {
  buildMarPrnTimelineCellDisplay,
  formatGovernedRoomDisplay,
  formatMarPrnFrequencyLabel,
  isPrnMedicationOrderClassification,
  prnTimelineCellPriority,
  resolveMarPrnTimelineColumnKey,
  resolvePrnNextEligibleAt,
  shouldRetainPrnTimelineItem,
  type MarShiftTimelineColumn,
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

/** Replace lower-priority PRN cell for the same order item (K.10B.11 dedup). */
export function upsertMarShiftTimelinePrnCellItem(
  row: MarShiftTimelineRowWithKind,
  columnKey: string,
  item: MarShiftTimelineCellItem
): void {
  const incomingPriority = prnTimelineCellPriority({
    doseStatus: item.doseStatus,
    readOnly: item.readOnly,
    secondaryText: item.secondaryText,
    hasMedicationDoseInstanceId: Boolean(item.medicationDoseInstanceId?.trim()),
  });

  for (const cell of row.cells) {
    cell.items = cell.items.filter((existing) => {
      if (existing.orderItemId !== item.orderItemId || existing.isPrnBand !== true) {
        return true;
      }
      const existingPriority = prnTimelineCellPriority({
        doseStatus: existing.doseStatus,
        readOnly: existing.readOnly,
        secondaryText: existing.secondaryText,
        hasMedicationDoseInstanceId: Boolean(existing.medicationDoseInstanceId?.trim()),
      });
      return existingPriority > incomingPriority;
    });
  }

  row.cells = row.cells.filter((cell) => cell.items.length > 0);
  appendMarShiftTimelineCellItem(row, columnKey, item);
}

export { shouldRetainPrnTimelineItem };

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

export { isPrnMedicationOrderClassification };
