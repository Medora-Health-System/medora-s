import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  MAR_SHIFT_TIMELINE_STATUS_COLORS,
  evaluateMarScheduleTimingGovernance,
  resolveMarShiftTimelineStatusColorKey,
} from "@medora/shared";
import { marShiftTimelineItemStatusStyle } from "@/features/mar/marShiftTimelineDisplay";

const webSrcRoot = join(import.meta.dirname, "..", "..");

describe("marShiftTimelineK10B9 — administration safety governance", () => {
  const marTab = readFileSync(
    join(webSrcRoot, "components/encounters/MedicationAdministrationTab.tsx"),
    "utf8"
  );
  const drawer = readFileSync(
    join(webSrcRoot, "components/encounters/FacilityMarShiftTimelineDrawer.tsx"),
    "utf8"
  );
  const terminalMar = readFileSync(
    join(webSrcRoot, "features/mar/marShiftTimelineTerminalMar.ts"),
    "utf8"
  );

  it("MAR tab uses single schedule timing governance layer", () => {
    expect(marTab).toContain("evaluateMarScheduleAdministrationTiming");
    expect(marTab).toContain("validateMarScheduleTimingGovernance");
    expect(marTab).toContain("buildMarScheduleTimingDocumentation");
    expect(marTab).toContain("MAR_SCHEDULE_EARLY_REASON_CODES");
    expect(marTab).not.toContain("useFacilityAndRoles");
  });

  it("drawer supports MARK_MISSED with missed reason codes", () => {
    expect(drawer).toContain("MARK_MISSED");
    expect(drawer).toContain("MAR_SHIFT_TIMELINE_MISSED_REASON_CODES");
    expect(drawer).toContain("onExecuteMissed");
  });

  it("terminal MAR submit handles MARK_MISSED", () => {
    expect(terminalMar).toContain("buildMarShiftTimelineMissedNotes");
    expect(terminalMar).toContain('"MARK_MISSED"');
  });

  it("OVERDUE timeline cell is red; INFUSING/DUE remain green", () => {
    const overdue = marShiftTimelineItemStatusStyle("OVERDUE", false, false, "PO");
    const due = marShiftTimelineItemStatusStyle("DUE", false, false, "PO");
    const infusing = marShiftTimelineItemStatusStyle("IN_PROGRESS", false, false, "INFUSING");
    expect(overdue.backgroundColor).toBe(MAR_SHIFT_TIMELINE_STATUS_COLORS.overdue.backgroundColor);
    expect(due.backgroundColor).toBe(MAR_SHIFT_TIMELINE_STATUS_COLORS.active.backgroundColor);
    expect(infusing.backgroundColor).toBe(MAR_SHIFT_TIMELINE_STATUS_COLORS.active.backgroundColor);
  });

  it("MISSED cell and drawer badge share red palette", () => {
    const missed = marShiftTimelineItemStatusStyle("MISSED", true, false, "MISSED");
    expect(missed.backgroundColor).toBe(MAR_SHIFT_TIMELINE_STATUS_COLORS.missed.backgroundColor);
    expect(resolveMarShiftTimelineStatusColorKey({ doseStatus: "MISSED", secondaryText: "MISSED" })).toBe(
      "missed"
    );
  });

  it("PRN band color unchanged for due PRN (K.10B.8 non-regression)", () => {
    const prn = marShiftTimelineItemStatusStyle("DUE", false, true, "PRN Q6H");
    expect(prn.backgroundColor).toBe("#FFFBE6");
  });

  it("completed PRN cell grays out inside PRN band (K.10B.11)", () => {
    const completedPrn = marShiftTimelineItemStatusStyle("COMPLETED", true, true, "PO");
    expect(completedPrn.backgroundColor).toBe(MAR_SHIFT_TIMELINE_STATUS_COLORS.administered.backgroundColor);
  });

  it("early administration governance exposes minutes delta", () => {
    const result = evaluateMarScheduleTimingGovernance({
      administeredAt: new Date("2026-06-12T13:00:00.000Z"),
      scheduledAt: new Date("2026-06-12T17:00:00.000Z"),
      dueWindowStartAt: new Date("2026-06-12T17:00:00.000Z"),
      dueWindowEndAt: new Date("2026-06-12T18:00:00.000Z"),
      facilityTimeZone: "UTC",
    });
    expect(result.kind).toBe("early");
    expect(result.minutesDelta).toBeGreaterThan(0);
  });
});
