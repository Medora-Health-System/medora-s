import {
  buildMarShiftTimelineColumns,
  formatMarShiftTimelineHourLabel,
  resolveMarShiftTimelineColumnKey,
} from "../medication/marShiftTimeline.js";
import {
  buildPrnAdminProjectionKey,
  buildPrnNextProjectionKey,
  buildPrnTimelineAvailabilityProjections,
  dedupeMarPrnTimelineCells,
  dedupeMarPrnTimelineRowCells,
  resolveMarPrnNextEligibleAt,
  type MarPrnTimelineDedupeItem,
} from "./marPrnTimeline.js";

/** Audit-only — deterministic PRN fixtures matching production reproduction scenario (UTC 7A–7P). */
export const PRN_TRACE_FIXTURES = {
  shiftStart: "2026-06-12T07:00:00.000Z",
  shiftEnd: "2026-06-12T20:00:00.000Z",
  facilityTimeZone: "UTC",
  acetaminophen: {
    orderItemId: "oi-acetaminophen-prn",
    medicationName: "Acetaminophen PO 500 mg",
    frequencyCode: "Q6H",
    medicationAdministrationId: "mar-acet-1029",
    administeredAt: "2026-06-12T10:29:00.000Z",
    expectedNextEligibleAt: "2026-06-12T16:29:00.000Z",
    /** Q6H dose scheduler materializes hour-bucket instances inside shift (production DB). */
    doseInstanceScheduledAts: [
      "2026-06-12T16:00:00.000Z",
      "2026-06-12T17:00:00.000Z",
      "2026-06-12T19:00:00.000Z",
    ] as const,
  },
  ondansetron: {
    orderItemId: "oi-ondansetron-prn",
    medicationName: "Ondansetron IVP 4 mg/2 mL",
    frequencyCode: "Q6H",
    medicationAdministrationId: "mar-ond-1132",
    administeredAt: "2026-06-12T11:32:00.000Z",
    expectedNextEligibleAt: "2026-06-12T17:32:00.000Z",
    doseInstanceScheduledAts: [
      "2026-06-12T14:00:00.000Z",
      "2026-06-12T17:00:00.000Z",
    ] as const,
  },
} as const;

export type PrnTraceCell = MarPrnTimelineDedupeItem & {
  columnKey: string;
  columnLabel: string;
  source: string;
  clinicalAction?: string;
  medicationName?: string;
  medicationAdministrationId?: string | null;
  medicationDoseInstanceId?: string | null;
};

export type PrnDatabaseSourceRow = {
  orderItemId: string;
  medicationName: string;
  administrationCount: number;
  doseInstanceCount: number;
  orderEventCount: number;
  lastAdministeredAt: string;
  expectedNextEligibleAt: string;
};

export function buildPrnDatabaseSourceCountReport(): PrnDatabaseSourceRow[] {
  return [PRN_TRACE_FIXTURES.acetaminophen, PRN_TRACE_FIXTURES.ondansetron].map((fx) => ({
    orderItemId: fx.orderItemId,
    medicationName: fx.medicationName,
    administrationCount: 1,
    doseInstanceCount: fx.doseInstanceScheduledAts.length,
    orderEventCount: 0,
    lastAdministeredAt: fx.administeredAt,
    expectedNextEligibleAt: fx.expectedNextEligibleAt,
  }));
}

function columnLabelForInstant(
  instant: string,
  shiftStart: string,
  shiftEnd: string,
  facilityTimeZone: string
): { columnKey: string; columnLabel: string } {
  const columns = buildMarShiftTimelineColumns(
    new Date(shiftStart),
    new Date(shiftEnd),
    facilityTimeZone
  );
  const columnKey =
    resolveMarShiftTimelineColumnKey({
      scheduledAt: new Date(instant),
      columns,
      facilityTimeZone,
    }) ?? "unknown";
  const column = columns.find((c) => c.key === columnKey);
  const columnLabel =
    column?.label ??
    formatMarShiftTimelineHourLabel(new Date(instant), facilityTimeZone);
  return { columnKey, columnLabel };
}

/** Simulates fallback terminal cards from MedicationAdministration rows (one per admin in shift). */
export function tracePrnAdministrationLoading(input: {
  orderItemId: string;
  medicationName: string;
  medicationAdministrationId: string;
  administeredAt: string;
  shiftStart: string;
  shiftEnd: string;
  facilityTimeZone: string;
}): PrnTraceCell[] {
  const { columnKey, columnLabel } = columnLabelForInstant(
    input.administeredAt,
    input.shiftStart,
    input.shiftEnd,
    input.facilityTimeZone
  );
  return [
    {
      orderItemId: input.orderItemId,
      medicationName: input.medicationName,
      isPrnBand: true,
      prnProjectionKey: buildPrnAdminProjectionKey(
        input.orderItemId,
        input.medicationAdministrationId
      ),
      medicationAdministrationId: input.medicationAdministrationId,
      doseStatus: "COMPLETED",
      readOnly: true,
      clinicalAction: "VIEW_ADMINISTRATION",
      scheduledAt: input.administeredAt,
      columnKey,
      columnLabel,
      source: "mar-shift-timeline-order-item-fallback.util",
    },
  ];
}

/** Simulates legacy production dose loop when PRN instances are NOT skipped. */
export function tracePrnDoseInstanceContribution(input: {
  orderItemId: string;
  medicationName: string;
  doseInstanceScheduledAts: readonly string[];
  lastAdministeredAt: string;
  nextEligibleAt: string;
  shiftStart: string;
  shiftEnd: string;
  facilityTimeZone: string;
  skipPrnDoseInstances: boolean;
}): PrnTraceCell[] {
  if (input.skipPrnDoseInstances) return [];

  const adminMs = new Date(input.lastAdministeredAt).getTime();
  const cells: PrnTraceCell[] = [];

  for (const scheduledAt of input.doseInstanceScheduledAts) {
    const scheduledMs = new Date(scheduledAt).getTime();
    // Production dose loop renders PLANNED/DUE instances still on the schedule after admin.
    if (scheduledMs <= adminMs) continue;
    const { columnKey, columnLabel } = columnLabelForInstant(
      scheduledAt,
      input.shiftStart,
      input.shiftEnd,
      input.facilityTimeZone
    );
    cells.push({
      orderItemId: input.orderItemId,
      medicationName: input.medicationName,
      isPrnBand: true,
      medicationDoseInstanceId: `dose-${scheduledAt}`,
      doseStatus: "DUE",
      readOnly: false,
      clinicalAction: "ADMINISTER",
      prnProjectionKey: null,
      scheduledAt,
      secondaryText: `Last given ${input.lastAdministeredAt.slice(11, 16)} · Next eligible ${input.nextEligibleAt.slice(11, 16)}`,
      columnKey,
      columnLabel,
      source: "mar-shift-timeline.service dose loop (legacy PRN path)",
    });
  }
  return cells;
}

export function tracePrnAvailabilityProjections(input: {
  orderItemId: string;
  medicationName: string;
  frequencyCode: string;
  lastAdministeredAt: string;
  shiftStart: string;
  shiftEnd: string;
  facilityTimeZone: string;
}): PrnTraceCell[] {
  const projections = buildPrnTimelineAvailabilityProjections({
    orderItemId: input.orderItemId,
    frequencyCode: input.frequencyCode,
    lastAdministeredAt: input.lastAdministeredAt,
    shiftStartAt: input.shiftStart,
    shiftEndAt: input.shiftEnd,
    terminalAdministeredAt: input.lastAdministeredAt,
  });

  return projections.map((projection) => {
    const { columnKey, columnLabel } = columnLabelForInstant(
      projection.eligibleAt,
      input.shiftStart,
      input.shiftEnd,
      input.facilityTimeZone
    );
    return {
      orderItemId: input.orderItemId,
      medicationName: input.medicationName,
      isPrnBand: true,
      prnProjectionKey: projection.projectionKey,
      doseStatus: "DUE",
      readOnly: false,
      clinicalAction: "ADMINISTER",
      scheduledAt: projection.eligibleAt,
      secondaryText: `Last given ${input.lastAdministeredAt.slice(11, 16)} · Next eligible ${projection.prnNextEligibleAt?.slice(11, 16) ?? ""}`,
      columnKey,
      columnLabel,
      source: "appendMarShiftTimelinePrnAvailabilityProjections",
    };
  });
}

function classifyCells(cells: PrnTraceCell[]) {
  const historical = cells.filter((c) => c.prnProjectionKey?.startsWith("prn-admin:"));
  const futureAvailability = cells.filter((c) => c.prnProjectionKey?.startsWith("prn-next:"));
  const doseInstanceDue = cells.filter(
    (c) => c.doseStatus === "DUE" && !c.prnProjectionKey?.startsWith("prn-next:")
  );
  return {
    historical,
    futureAvailability,
    doseInstanceDue,
    total: cells.length,
    historicalCount: historical.length,
    futureAvailabilityCount: futureAvailability.length,
    doseInstanceDueCount: doseInstanceDue.length,
  };
}

export function tracePrnPipelineStage(input: {
  fixture: (typeof PRN_TRACE_FIXTURES)["acetaminophen"] | (typeof PRN_TRACE_FIXTURES)["ondansetron"];
  skipPrnDoseInstances: boolean;
}) {
  const { shiftStart, shiftEnd, facilityTimeZone } = PRN_TRACE_FIXTURES;
  const fx = input.fixture;

  const historical = tracePrnAdministrationLoading({
    orderItemId: fx.orderItemId,
    medicationName: fx.medicationName,
    medicationAdministrationId: fx.medicationAdministrationId,
    administeredAt: fx.administeredAt,
    shiftStart,
    shiftEnd,
    facilityTimeZone,
  });

  const doseInstances = tracePrnDoseInstanceContribution({
    orderItemId: fx.orderItemId,
    medicationName: fx.medicationName,
    doseInstanceScheduledAts: fx.doseInstanceScheduledAts,
    lastAdministeredAt: fx.administeredAt,
    nextEligibleAt: fx.expectedNextEligibleAt,
    shiftStart,
    shiftEnd,
    facilityTimeZone,
    skipPrnDoseInstances: input.skipPrnDoseInstances,
  });

  const availability = tracePrnAvailabilityProjections({
    orderItemId: fx.orderItemId,
    medicationName: fx.medicationName,
    frequencyCode: fx.frequencyCode,
    lastAdministeredAt: fx.administeredAt,
    shiftStart,
    shiftEnd,
    facilityTimeZone,
  });

  const beforeMerge = [...historical, ...doseInstances, ...availability];
  const afterMerge = beforeMerge;

  const cellsByColumn = new Map<string, PrnTraceCell[]>();
  for (const cell of afterMerge) {
    const list = cellsByColumn.get(cell.columnKey) ?? [];
    list.push(cell);
    cellsByColumn.set(cell.columnKey, list);
  }

  const rowCells = [...cellsByColumn.entries()].map(([columnKey, items]) => ({
    columnKey,
    items,
  }));

  const beforeDedupeFlat = afterMerge;
  const afterPerCellDedupe = rowCells.flatMap(({ columnKey, items }) =>
    dedupeMarPrnTimelineCells(items).map((item) => ({
      ...(item as PrnTraceCell),
      columnKey,
      columnLabel: items[0]?.columnLabel ?? "",
    }))
  );
  const afterRowDedupe = dedupeMarPrnTimelineRowCells(
    rowCells.map(({ columnKey, items }) => ({ columnKey, items }))
  ).flatMap(({ columnKey, items }) =>
    items.map((item) => {
      const match = beforeDedupeFlat.find(
        (c) => c.orderItemId === item.orderItemId && c.scheduledAt === item.scheduledAt
      );
      return {
        ...(item as PrnTraceCell),
        columnKey,
        columnLabel: match?.columnLabel ?? columnLabelForInstant(
          item.scheduledAt ?? shiftStart,
          shiftStart,
          shiftEnd,
          facilityTimeZone
        ).columnLabel,
      };
    })
  );

  return {
    historical,
    doseInstances,
    availability,
    beforeMerge,
    afterMerge,
    beforeDedupeFlat,
    afterPerCellDedupe,
    afterRowDedupe,
    counts: {
      beforeMerge: classifyCells(beforeMerge),
      afterMerge: classifyCells(afterMerge),
      beforeDedupe: classifyCells(beforeDedupeFlat),
      afterDedupe: classifyCells(afterRowDedupe),
    },
  };
}

export type FirstDuplicationPointReport = {
  firstDuplicationStage: string;
  duplicatedOrderItemId: string;
  duplicatedMedication: string;
  duplicateCount: number;
  evidence: string[];
  recommendedFixLocation: string;
  doNotTouch: string[];
};

export function detectFirstPrnFutureDuplicationPoint(input: {
  skipPrnDoseInstances: boolean;
}): FirstDuplicationPointReport {
  const doNotTouch = [
    "provider ordering",
    "medication activation",
    "medication seeding",
    "pain response logic",
    "respiratory response logic",
    "scheduled/stat medication dose loop",
  ];

  for (const fixture of [PRN_TRACE_FIXTURES.acetaminophen, PRN_TRACE_FIXTURES.ondansetron]) {
    const stage = tracePrnPipelineStage({ fixture, skipPrnDoseInstances: input.skipPrnDoseInstances });

    const futureBeforeMerge = stage.counts.beforeMerge.futureAvailabilityCount;
    const doseDueBeforeMerge = stage.counts.beforeMerge.doseInstanceDueCount;

    if (futureBeforeMerge > 1) {
      return {
        firstDuplicationStage: "availability projection",
        duplicatedOrderItemId: fixture.orderItemId,
        duplicatedMedication: fixture.medicationName,
        duplicateCount: futureBeforeMerge,
        evidence: stage.availability.map(
          (c) => `${c.prnProjectionKey} @ ${c.columnLabel} from ${c.source}`
        ),
        recommendedFixLocation: "appendMarShiftTimelinePrnAvailabilityProjections / buildPrnTimelineAvailabilityProjections",
        doNotTouch,
      };
    }

    if (futureBeforeMerge === 1 && doseDueBeforeMerge >= 1) {
      return {
        firstDuplicationStage: "dose loop",
        duplicatedOrderItemId: fixture.orderItemId,
        duplicatedMedication: fixture.medicationName,
        duplicateCount: 1 + doseDueBeforeMerge,
        evidence: [
          ...stage.availability.map((c) => `prn-next @ ${c.columnLabel}: ${c.prnProjectionKey}`),
          ...stage.doseInstances.map(
            (c) => `orphan DUE dose @ ${c.columnLabel}: scheduledAt=${c.scheduledAt}, doseInstanceId=${c.medicationDoseInstanceId}`
          ),
        ],
        recommendedFixLocation:
          "mar-shift-timeline.service.ts dose loop — skip PRN dose-instance rendering; rely on prn-admin + prn-next only",
        doNotTouch,
      };
    }

    if (doseDueBeforeMerge > 1 && futureBeforeMerge === 0) {
      return {
        firstDuplicationStage: "dose loop",
        duplicatedOrderItemId: fixture.orderItemId,
        duplicatedMedication: fixture.medicationName,
        duplicateCount: doseDueBeforeMerge,
        evidence: stage.doseInstances.map(
          (c) => `orphan DUE dose @ ${c.columnLabel}: scheduledAt=${c.scheduledAt}`
        ),
        recommendedFixLocation: "mar-shift-timeline.service.ts dose loop — skip PRN dose-instance rendering",
        doNotTouch,
      };
    }
  }

  return {
    firstDuplicationStage: "none",
    duplicatedOrderItemId: "",
    duplicatedMedication: "",
    duplicateCount: 0,
    evidence: ["No future PRN duplication detected with current pipeline flags"],
    recommendedFixLocation: "n/a — trace shows clean contract",
    doNotTouch,
  };
}

/** React render trace — maps API cells 1:1; no fan-out. */
export function tracePrnReactRenderKeys(cells: PrnTraceCell[]) {
  return cells.map((item) => ({
    reactKey: `${item.orderItemId}:${item.medicationDoseInstanceId || item.prnProjectionKey || item.scheduledAt || "fallback"}`,
    orderItemId: item.orderItemId,
    prnProjectionKey: item.prnProjectionKey ?? null,
    column: item.columnLabel,
    medicationName: item.medicationName ?? null,
    clinicalAction: item.clinicalAction ?? null,
    status: item.doseStatus,
  }));
}

export function verifyNextEligible(fixture: typeof PRN_TRACE_FIXTURES.acetaminophen): string {
  const next = resolveMarPrnNextEligibleAt({
    lastAdministeredAt: fixture.administeredAt,
    frequencyCode: fixture.frequencyCode,
  });
  return next?.toISOString() ?? "";
}
