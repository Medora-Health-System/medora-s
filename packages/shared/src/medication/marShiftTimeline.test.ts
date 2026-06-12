import { describe, expect, it } from "vitest";
import {
  buildMarShiftTimelineCellDisplay,
  buildMarShiftTimelineColumns,
  buildMarShiftTimelineCompletionSummary,
  buildMarShiftTimelineTitle,
  formatMarShiftTimelineClinicianInitials,
  formatMarShiftTimelineHourLabel,
  resolveMarShiftTimelineClinicalAction,
  resolveMarShiftTimelineColumnKey,
  resolveMarShiftTimelineMedicationLabel,
  resolveStandardMarShiftTimelineWindow,
} from "./marShiftTimeline.js";
import { wallClockToUtc } from "./medicationDoseExpansionPlanner.js";

describe("marShiftTimeline (M1.8B.7K.1)", () => {
  it("buildMarShiftTimelineTitle uses facility name, not Medora MAR", () => {
    expect(buildMarShiftTimelineTitle("St. Mary Hospital")).toBe(
      "St. Mary Hospital MAR SHIFT TIMELINE"
    );
    expect(buildMarShiftTimelineTitle("Medora Demo Facility")).toBe(
      "Medora Demo Facility MAR SHIFT TIMELINE"
    );
  });

  it("7A_7P creates hour columns 07A through 07P", () => {
    const ref = new Date("2026-06-11T10:00:00.000Z");
    const { startAt, endAt } = resolveStandardMarShiftTimelineWindow("7A_7P", ref);
    const columns = buildMarShiftTimelineColumns(startAt, endAt);
    expect(columns.map((c) => c.label)).toEqual([
      "07A",
      "08A",
      "09A",
      "10A",
      "11A",
      "12P",
      "01P",
      "02P",
      "03P",
      "04P",
      "05P",
      "06P",
      "07P",
    ]);
  });

  it("7P_7A creates overnight columns 07P through 07A", () => {
    const ref = new Date("2026-06-11T22:00:00.000Z");
    const { startAt, endAt } = resolveStandardMarShiftTimelineWindow("7P_7A", ref);
    const columns = buildMarShiftTimelineColumns(startAt, endAt);
    expect(columns.map((c) => c.label)).toEqual([
      "07P",
      "08P",
      "09P",
      "10P",
      "11P",
      "12A",
      "01A",
      "02A",
      "03A",
      "04A",
      "05A",
      "06A",
      "07A",
    ]);
  });

  it("formatMarShiftTimelineHourLabel handles noon and midnight", () => {
    expect(formatMarShiftTimelineHourLabel(new Date("2026-06-11T12:00:00.000Z"))).toBe("12P");
    expect(formatMarShiftTimelineHourLabel(new Date("2026-06-11T00:00:00.000Z"))).toBe("12A");
    expect(formatMarShiftTimelineHourLabel(new Date("2026-06-11T13:00:00.000Z"))).toBe("01P");
  });

  it("resolveMarShiftTimelineClinicalAction maps FIXED_ADMINISTRATION DUE to ADMINISTER", () => {
    expect(resolveMarShiftTimelineClinicalAction("FIXED_ADMINISTRATION", "DUE")).toBe("ADMINISTER");
  });

  it("resolveMarShiftTimelineClinicalAction maps IVPB_SESSION DUE to START_INFUSION", () => {
    expect(resolveMarShiftTimelineClinicalAction("IVPB_SESSION", "DUE")).toBe("START_INFUSION");
    expect(resolveMarShiftTimelineClinicalAction("IVPB_SESSION", "IN_PROGRESS")).toBe(
      "STOP_INFUSION"
    );
  });

  it("buildMarShiftTimelineCellDisplay uses Witness secondary for witness-required meds", () => {
    const display = buildMarShiftTimelineCellDisplay({
      medicationLabel: "Potassium Chloride",
      doseKind: "IVPB_SESSION",
      doseStatus: "DUE",
      route: "IVPB",
      frequencyCode: "Q12H",
      requiresWitness: true,
    });
    expect(display.primaryText).toContain("KCl");
    expect(display.secondaryText).toBe("Witness");
  });

  it("resolveMarShiftTimelineColumnKey prefers scheduledAt hour", () => {
    const ref = new Date("2026-06-11T10:00:00.000Z");
    const { startAt, endAt } = resolveStandardMarShiftTimelineWindow("7A_7P", ref);
    const columns = buildMarShiftTimelineColumns(startAt, endAt);
    const key = resolveMarShiftTimelineColumnKey({
      scheduledAt: new Date("2026-06-11T08:30:00.000Z"),
      dueWindowStartAt: new Date("2026-06-11T08:00:00.000Z"),
      columns,
    });
    expect(columns.find((c) => c.key === key)?.label).toBe("08A");
  });

  it("formatMarShiftTimelineClinicianInitials builds EP from Elizabeth Posada", () => {
    expect(formatMarShiftTimelineClinicianInitials("Elizabeth", "Posada")).toBe("EP");
  });

  it("buildMarShiftTimelineCompletionSummary formats in-progress IVPB tertiary", () => {
    expect(
      buildMarShiftTimelineCompletionSummary({
        doseKind: "IVPB_SESSION",
        doseStatus: "IN_PROGRESS",
        startedAt: "2026-06-11T17:14:00.000Z",
        startedByInitials: "EP",
        stoppedAt: null,
        stoppedByInitials: null,
        administeredAt: null,
        administeredByInitials: null,
      })
    ).toBe("EP 17:14 ▶");
  });

  it("buildMarShiftTimelineCellDisplay shows INFUSING for in-progress IVPB", () => {
    const display = buildMarShiftTimelineCellDisplay({
      medicationLabel: "Ceftriaxone",
      doseKind: "IVPB_SESSION",
      doseStatus: "IN_PROGRESS",
      route: "IVPB",
      frequencyCode: "Q12H",
      requiresWitness: false,
      enrichment: {
        startedAt: "2026-06-11T17:14:00.000Z",
        startedByDisplay: "Elizabeth Posada",
        startedByInitials: "EP",
        stoppedAt: null,
        stoppedByDisplay: null,
        stoppedByInitials: null,
        administeredAt: null,
        administeredByDisplay: null,
        administeredByInitials: null,
        completionSummary: "EP 17:14 ▶",
      },
    });
    expect(display.secondaryText).toBe("INFUSING");
    expect(display.tertiaryText).toContain("EP");
  });

  it("buildMarShiftTimelineCellDisplay shows ADMIN tertiary for due PO dose", () => {
    const display = buildMarShiftTimelineCellDisplay({
      medicationLabel: "Furosemide",
      doseKind: "FIXED_ADMINISTRATION",
      doseStatus: "DUE",
      route: "PO",
      frequencyCode: "BID",
      requiresWitness: false,
    });
    expect(display.secondaryText).toBe("PO");
    expect(display.tertiaryText).toBe("ADMIN");
  });

  it("buildMarShiftTimelineCellDisplay shows DONE and completion for completed IVPB", () => {
    const display = buildMarShiftTimelineCellDisplay({
      medicationLabel: "Ceftriaxone",
      doseKind: "IVPB_SESSION",
      doseStatus: "COMPLETED",
      route: "IVPB",
      frequencyCode: "Q12H",
      requiresWitness: false,
      enrichment: {
        startedAt: "2026-06-11T17:14:00.000Z",
        startedByDisplay: "Elizabeth Posada",
        startedByInitials: "EP",
        stoppedAt: "2026-06-11T17:42:00.000Z",
        stoppedByDisplay: "Elizabeth Posada",
        stoppedByInitials: "EP",
        administeredAt: null,
        administeredByDisplay: null,
        administeredByInitials: null,
        completionSummary: "EP 17:14–EP 17:42",
      },
    });
    expect(display.secondaryText).toBe("DONE");
    expect(display.tertiaryText).toBe("EP 17:14–EP 17:42");
  });

  it("buildMarShiftTimelineCompletionSummary uses both initials for completed IVPB", () => {
    expect(
      buildMarShiftTimelineCompletionSummary({
        doseKind: "IVPB_SESSION",
        doseStatus: "COMPLETED",
        startedAt: "2026-06-11T17:14:00.000Z",
        startedByInitials: "EP",
        stoppedAt: "2026-06-11T17:42:00.000Z",
        stoppedByInitials: "EP",
        administeredAt: null,
        administeredByInitials: null,
      })
    ).toBe("EP 17:14–EP 17:42");
  });

  it("buildMarShiftTimelineCellDisplay shows STAT secondary for STAT due dose", () => {
    const display = buildMarShiftTimelineCellDisplay({
      medicationLabel: "Normal Saline",
      doseKind: "FIXED_ADMINISTRATION",
      doseStatus: "DUE",
      route: "IV",
      frequencyCode: "STAT",
      requiresWitness: false,
    });
    expect(display.secondaryText).toBe("STAT");
    expect(display.tertiaryText).toBe("ADMIN");
  });
});

describe("marShiftTimeline timezone placement (M1.8B.7K.7 / K.9)", () => {
  const haitiTz = "America/Port-au-Prince";

  function columnLabelForInstant(
    instant: Date,
    shiftCode: "7A_7P" | "7P_7A",
    facilityTimeZone: string
  ): string | undefined {
    const { startAt, endAt } = resolveStandardMarShiftTimelineWindow(
      shiftCode,
      instant,
      facilityTimeZone
    );
    const columns = buildMarShiftTimelineColumns(startAt, endAt, facilityTimeZone);
    const key = resolveMarShiftTimelineColumnKey({
      scheduledAt: instant,
      dueWindowStartAt: instant,
      columns,
      facilityTimeZone,
    });
    return columns.find((c) => c.key === key)?.label;
  }

  it("9:07 PM NOW fallback maps to 09P on 7P_7A shift", () => {
    const createdAt = wallClockToUtc(2026, 6, 3, 21, 7, haitiTz);
    expect(columnLabelForInstant(createdAt, "7P_7A", haitiTz)).toBe("09P");
  });

  it("9:59 PM NOW fallback maps to 09P on 7P_7A shift", () => {
    const createdAt = wallClockToUtc(2026, 6, 3, 21, 59, haitiTz);
    expect(columnLabelForInstant(createdAt, "7P_7A", haitiTz)).toBe("09P");
  });

  it("10:00 PM NOW fallback maps to 10P on 7P_7A shift", () => {
    const createdAt = wallClockToUtc(2026, 6, 3, 22, 0, haitiTz);
    expect(columnLabelForInstant(createdAt, "7P_7A", haitiTz)).toBe("10P");
  });

  it("facility timezone conversion does not drift NOW PO to next hour", () => {
    const createdAt = wallClockToUtc(2026, 6, 3, 21, 7, haitiTz);
    expect(formatMarShiftTimelineHourLabel(createdAt, haitiTz)).toBe("09P");
    expect(columnLabelForInstant(createdAt, "7P_7A", haitiTz)).toBe("09P");
    expect(columnLabelForInstant(createdAt, "7P_7A", haitiTz)).not.toBe("10P");
  });

  it("NOW fallback instant at 2:16 PM Haiti maps to 02P column", () => {
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
    expect(formatMarShiftTimelineHourLabel(createdAt, haitiTz)).toBe("02P");
  });

  it("same instant buckets to UTC hour when columns use UTC labels (regression guard)", () => {
    const createdAt = wallClockToUtc(2026, 6, 11, 14, 16, haitiTz);
    const { startAt, endAt } = resolveStandardMarShiftTimelineWindow("7A_7P", createdAt, "UTC");
    const utcColumns = buildMarShiftTimelineColumns(startAt, endAt, "UTC");
    const utcKey = resolveMarShiftTimelineColumnKey({
      scheduledAt: createdAt,
      dueWindowStartAt: createdAt,
      columns: utcColumns,
    });
    const utcLabel = formatMarShiftTimelineHourLabel(createdAt, "UTC");
    expect(utcColumns.find((c) => c.key === utcKey)?.label).toBe(utcLabel);
    expect(utcLabel).not.toBe("02P");
  });
});

describe("resolveMarShiftTimelineMedicationLabel (M1.8B.7K.8)", () => {
  const catalog = {
    catalogItemId: "cat-ns",
    catalogItemCode: "NS",
    displayNameEn: "Normal Saline",
    displayNameFr: "Chlorure de sodium",
    genericName: "Sodium Chloride",
  };

  it("English locale shows Normal Saline, not Chlorure de sodium", () => {
    expect(
      resolveMarShiftTimelineMedicationLabel({ locale: "en", catalogSnapshot: catalog })
    ).toBe("Normal Saline");
  });

  it("French locale may show Chlorure de sodium", () => {
    expect(
      resolveMarShiftTimelineMedicationLabel({ locale: "fr", catalogSnapshot: catalog })
    ).toBe("Chlorure de sodium");
  });

  it("cell display abbreviates Normal Saline to NS 0.9%", () => {
    const label = resolveMarShiftTimelineMedicationLabel({ locale: "en", catalogSnapshot: catalog });
    const display = buildMarShiftTimelineCellDisplay({
      medicationLabel: label,
      doseKind: "IVPB_SESSION",
      doseStatus: "DUE",
      route: "IVPB",
      frequencyCode: "NOW",
      requiresWitness: false,
    });
    expect(display.primaryText).toBe("NS 0.9%");
    expect(label).toBe("Normal Saline");
  });

  it("cell display includes volume for Normal Saline 0.9% 1 L", () => {
    const display = buildMarShiftTimelineCellDisplay({
      medicationLabel: "Normal Saline 0.9% 1 L",
      doseKind: "IVPB_SESSION",
      doseStatus: "DUE",
      route: "IVPB",
      frequencyCode: "NOW",
      requiresWitness: false,
    });
    expect(display.primaryText).toBe("NS 0.9% 1 L");
  });

  it("cell display shows REFUSED secondary for refused terminal MAR", () => {
    const display = buildMarShiftTimelineCellDisplay({
      medicationLabel: "Metoprolol",
      doseKind: "FIXED_ADMINISTRATION",
      doseStatus: "COMPLETED",
      route: "PO",
      frequencyCode: "NOW",
      requiresWitness: false,
      marAction: "refused",
      marNotes: "Refused: PATIENT_REFUSED",
    });
    expect(display.secondaryText).toBe("REFUSED");
  });
});
