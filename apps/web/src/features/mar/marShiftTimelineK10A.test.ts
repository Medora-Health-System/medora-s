import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildMarShiftTimelineColumns,
  resolveMarShiftTimelineColumnKey,
  resolveMarShiftTimelineOrderItemPlacementInstant,
  resolveStandardMarShiftTimelineWindow,
  wallClockToUtc,
} from "@medora/shared";
import {
  isMarShiftTimelineActionEnabled,
  isMarShiftTimelineActionShowComingSoon,
} from "@/features/mar/marShiftTimelineActions";
import type { MarShiftTimelineCellItem, MarShiftTimelineResponse } from "@/lib/marShiftTimelineApi";

const webSrcRoot = join(import.meta.dirname, "..", "..");
const haitiTz = "America/Port-au-Prince";

function timelineItem(
  input: {
    orderItemId: string;
    primaryText: string;
    secondaryText: string;
    createdAt: Date;
    route?: string;
  },
  overrides?: Partial<MarShiftTimelineCellItem>
): MarShiftTimelineCellItem {
  return {
    type: "MEDICATION",
    medicationDoseInstanceId: "",
    orderItemId: input.orderItemId,
    medicationLabel: input.primaryText,
    primaryText: input.primaryText,
    secondaryText: input.secondaryText,
    tertiaryText: "ADMIN",
    doseStatus: "DUE",
    doseKind: "FIXED_ADMINISTRATION",
    route: input.route ?? "PO",
    frequencyCode: "NOW",
    scheduledAt: input.createdAt.toISOString(),
    dueWindowStartAt: input.createdAt.toISOString(),
    dueWindowEndAt: new Date(input.createdAt.getTime() + 3_600_000).toISOString(),
    requiresWitness: false,
    readOnly: false,
    clinicalAction: "ADMINISTER",
    startedAt: null,
    stoppedAt: null,
    startedByDisplay: null,
    startedByInitials: null,
    stoppedByDisplay: null,
    stoppedByInitials: null,
    administeredAt: null,
    administeredByDisplay: null,
    administeredByInitials: null,
    completionSummary: null,
    hover: {
      title: input.primaryText,
      due: "22:24",
      dose: null,
      route: input.route ?? "PO",
      witness: null,
      status: "Due",
    },
    actions: ["ADMINISTER", "REFUSE", "HOLD", "VIEW_ORDER"],
    ...overrides,
  };
}

function columnLabelForInstant(instant: Date, shiftCode: "7P_7A", facilityTimeZone: string): string {
  const { startAt, endAt } = resolveStandardMarShiftTimelineWindow(shiftCode, instant, facilityTimeZone);
  const columns = buildMarShiftTimelineColumns(startAt, endAt, facilityTimeZone);
  const key = resolveMarShiftTimelineColumnKey({
    scheduledAt: instant,
    columns,
    facilityTimeZone,
  });
  return columns.find((c) => c.key === key)?.label ?? "";
}

function buildTenPCellTimeline(): MarShiftTimelineResponse {
  const metoprololAt = wallClockToUtc(2026, 6, 3, 22, 7, haitiTz);
  const ondansetronAt = wallClockToUtc(2026, 6, 3, 22, 24, haitiTz);
  const { startAt, endAt } = resolveStandardMarShiftTimelineWindow("7P_7A", ondansetronAt, haitiTz);
  const columns = buildMarShiftTimelineColumns(startAt, endAt, haitiTz);
  const tenPKey = columns.find((c) => c.label === "10P")!.key;
  const elevenPKey = columns.find((c) => c.label === "11P")!.key;

  return {
    enabled: true,
    facility: { id: "fac-1", name: "Demo", timeZone: haitiTz },
    title: "Demo MAR SHIFT TIMELINE",
    viewer: { userId: "u1", displayName: "RN", role: "NURSE" },
    shift: {
      code: "7P_7A",
      label: "7P–7A",
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      timeZone: haitiTz,
      columns,
    },
    rows: [
      {
        patientId: "p1",
        encounterId: "enc-1",
        patientDisplay: "Test Patient",
        roomLabel: "12",
        assignedNurseUserId: "u1",
        cells: [
          {
            columnKey: tenPKey,
            items: [
              timelineItem({
                orderItemId: "oi-metoprolol",
                primaryText: "Metoprolol",
                secondaryText: "PO",
                createdAt: metoprololAt,
                route: "PO",
              }),
              timelineItem({
                orderItemId: "oi-ondansetron",
                primaryText: "Ondansetron",
                secondaryText: "IVP",
                createdAt: ondansetronAt,
                route: "IVP",
              }),
              timelineItem({
                orderItemId: "oi-third",
                primaryText: "Third Med",
                secondaryText: "PO",
                createdAt: wallClockToUtc(2026, 6, 3, 22, 30, haitiTz),
                route: "PO",
              }),
            ],
          },
          {
            columnKey: elevenPKey,
            items: [],
          },
        ],
      },
    ],
  };
}

const enabledHandlers = {
  disabled: false,
  busy: false,
  onRequestAdminister: async () => undefined,
  onRequestStartInfusion: async () => true,
  onExecuteStopInfusion: async () => undefined,
  onExecuteRefuse: async () => undefined,
  onExecuteHold: async () => undefined,
};

describe("MAR shift timeline K.10A same-hour placement", () => {
  const timeline = readFileSync(
    join(webSrcRoot, "components/encounters/FacilityMarShiftTimeline.tsx"),
    "utf8"
  );

  it("Metoprolol 10:07 and Ondansetron 10:24 map to the same 10P column", () => {
    const metoprololAt = wallClockToUtc(2026, 6, 3, 22, 7, haitiTz);
    const ondansetronAt = wallClockToUtc(2026, 6, 3, 22, 24, haitiTz);
    expect(columnLabelForInstant(metoprololAt, "7P_7A", haitiTz)).toBe("10P");
    expect(columnLabelForInstant(ondansetronAt, "7P_7A", haitiTz)).toBe("10P");
  });

  it("NOW placement uses createdAt when intendedAdministrationAt is one hour later", () => {
    const createdAt = wallClockToUtc(2026, 6, 3, 22, 24, haitiTz);
    const intended = wallClockToUtc(2026, 6, 3, 23, 24, haitiTz);
    const placement = resolveMarShiftTimelineOrderItemPlacementInstant({
      createdAt,
      intendedAdministrationAt: intended,
      frequencyCode: "NOW",
      notes: null,
    });
    expect(columnLabelForInstant(placement, "7P_7A", haitiTz)).toBe("10P");
  });

  it("timeline stacks multiple pills vertically in one cell", () => {
    expect(timeline).toContain('flexDirection: "column"');
    expect(timeline).toContain("alignItems: \"stretch\"");
    expect(timeline).toContain("overflow: \"hidden\"");
    expect(timeline).toContain("flexShrink: 0");
  });

  it("timeline uses stable per-order item keys for fallback rows", () => {
    expect(timeline).toContain("item.orderItemId");
    expect(timeline).toContain("item.medicationDoseInstanceId");
    expect(timeline).toContain("item.prnProjectionKey");
    expect(timeline).toContain("item.administeredAt");
  });

  it("mock 10P cell contains Metoprolol and Ondansetron with no Ondansetron in 11P", () => {
    const data = buildTenPCellTimeline();
    const tenP = data.shift.columns.find((c) => c.label === "10P")!;
    const elevenP = data.shift.columns.find((c) => c.label === "11P")!;
    const row = data.rows[0]!;
    const tenPCell = row.cells.find((c) => c.columnKey === tenP.key);
    const elevenPCell = row.cells.find((c) => c.columnKey === elevenP.key);
    expect(tenPCell?.items.map((i) => i.primaryText)).toEqual([
      "Metoprolol",
      "Ondansetron",
      "Third Med",
    ]);
    expect(elevenPCell?.items.some((i) => i.primaryText === "Ondansetron")).toBe(false);
  });

  it("each stacked pill remains clickable via setDrawerSelection", () => {
    expect(timeline).toContain("setDrawerSelection");
    expect(timeline).toContain("onClick={() =>");
    expect(timeline).toContain("data-testid=\"mar-shift-timeline-cell-item\"");
  });

  it("Ondansetron IVP NOW remains eligible for Administer", () => {
    const ondansetronAt = wallClockToUtc(2026, 6, 3, 22, 24, haitiTz);
    const item = timelineItem({
      orderItemId: "oi-ondansetron",
      primaryText: "Ondansetron",
      secondaryText: "IVP",
      createdAt: ondansetronAt,
      route: "IVP",
    });
    expect(isMarShiftTimelineActionEnabled("ADMINISTER", item, enabledHandlers)).toBe(true);
    expect(isMarShiftTimelineActionShowComingSoon("ADMINISTER", item)).toBe(false);
  });
});
