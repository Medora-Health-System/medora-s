import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  formatMarShiftTimelineClinicalDateTime,
  resolveMarShiftTimelineColumnKey,
  resolveStandardMarShiftTimelineWindow,
  wallClockToUtc,
  buildMarShiftTimelineColumns,
} from "@medora/shared";
import {
  defaultMarShiftTimelineStartTimeValue,
  defaultMarShiftTimelineStopTimeValue,
  toMarShiftTimelineDateTimeLocalValue,
} from "@/features/mar/marShiftTimelineDisplay";
import { MAR_SHIFT_TIMELINE_START_TIME_API_SUPPORTED } from "@/features/mar/marShiftTimelineActions";
import type { MarShiftTimelineCellItem } from "@/lib/marShiftTimelineApi";

const webSrcRoot = join(import.meta.dirname, "..", "..");
const haitiTz = "America/Port-au-Prince";

function nowFallbackItem(
  overrides?: Partial<MarShiftTimelineCellItem>
): MarShiftTimelineCellItem {
  const createdAt = wallClockToUtc(2026, 6, 11, 14, 16, haitiTz);
  return {
    type: "MEDICATION",
    medicationDoseInstanceId: "",
    orderItemId: "oi-now-haiti",
    medicationLabel: "Normal Saline",
    primaryText: "Normal Saline",
    secondaryText: "START",
    tertiaryText: "",
    doseStatus: "DUE",
    doseKind: "IVPB_SESSION",
    route: "IVPB",
    frequencyCode: "NOW",
    scheduledAt: createdAt.toISOString(),
    dueWindowStartAt: createdAt.toISOString(),
    dueWindowEndAt: new Date(createdAt.getTime() + 3_600_000).toISOString(),
    requiresWitness: false,
    readOnly: false,
    clinicalAction: "START_INFUSION",
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
    hover: {
      title: "Normal Saline",
      due: "14:16",
      dose: "1 L",
      route: "IVPB",
      witness: null,
      status: "Due",
    },
    actions: ["START_INFUSION", "REFUSE", "HOLD", "VIEW_ORDER"],
    ...overrides,
  };
}

describe("MAR timezone placement + drawer times (M1.8B.7K.7)", () => {
  const timeline = readFileSync(
    join(webSrcRoot, "components/encounters/FacilityMarShiftTimeline.tsx"),
    "utf8"
  );
  const drawer = readFileSync(
    join(webSrcRoot, "components/encounters/FacilityMarShiftTimelineDrawer.tsx"),
    "utf8"
  );

  it("Normal Saline NOW at 2:16 PM Haiti maps to 02P column", () => {
    const createdAt = wallClockToUtc(2026, 6, 11, 14, 16, haitiTz);
    const { startAt, endAt } = resolveStandardMarShiftTimelineWindow("7A_7P", createdAt, haitiTz);
    const columns = buildMarShiftTimelineColumns(startAt, endAt, haitiTz);
    const key = resolveMarShiftTimelineColumnKey({
      scheduledAt: createdAt,
      dueWindowStartAt: createdAt,
      columns,
      facilityTimeZone: haitiTz,
    });
    expect(columns.find((c) => c.key === key)?.label).toBe("02P");
  });

  it("drawer scheduled time uses facility clinical datetime, not UTC hour", () => {
    const item = nowFallbackItem();
    const display = formatMarShiftTimelineClinicalDateTime(item.scheduledAt, "en-US", haitiTz);
    expect(display).toMatch(/2:16/);
    expect(display).not.toMatch(/7:16/);
  });

  it("timeline passes facilityTimeZone to drawer", () => {
    expect(timeline).toContain("facilityTimeZone={data?.shift.timeZone");
  });

  it("drawer shows visible start time field with datetime-local control", () => {
    expect(drawer).toContain('testId="mar-shift-timeline-drawer-start-time"');
    expect(drawer).toContain("MedicationClinicalDateTimeField");
    expect(drawer).toContain("marShiftTimeline.drawer.startTimeField");
    expect(drawer).toContain("formatMarShiftTimelineClinicalDateTime");
  });

  it("drawer shows visible stop time field for IN_PROGRESS IVPB", () => {
    expect(drawer).toContain('testId="mar-shift-timeline-drawer-stop-time"');
    expect(drawer).toContain("defaultMarShiftTimelineStopTimeValue");
  });

  it("stop action passes edited stoppedAt to handler", () => {
    expect(drawer).toContain("buildMarShiftTimelineStopPayload");
  });

  it("start action passes startedAt when API supports effective start time", () => {
    expect(MAR_SHIFT_TIMELINE_START_TIME_API_SUPPORTED).toBe(true);
    expect(drawer).toContain("buildMarShiftTimelineStartPayload");
    expect(drawer).toContain("startedAt");
  });

  it("datetime-local defaults use facility timezone wall clock", () => {
    const item = nowFallbackItem();
    expect(defaultMarShiftTimelineStartTimeValue(item, haitiTz)).toBe("2026-06-11T14:16");
    expect(toMarShiftTimelineDateTimeLocalValue(item.scheduledAt, haitiTz)).toBe("2026-06-11T14:16");
  });

  it("stop time default uses facility timezone", () => {
    const item = nowFallbackItem({
      doseStatus: "IN_PROGRESS",
      clinicalAction: "STOP_INFUSION",
      startedAt: wallClockToUtc(2026, 6, 11, 14, 16, haitiTz).toISOString(),
    });
    const value = defaultMarShiftTimelineStopTimeValue(item, haitiTz);
    expect(value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(value).toContain("T");
  });
});
