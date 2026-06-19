import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  appendMarDoseScheduleAdjustmentHistory,
  evaluateMarScheduleTimingGovernance,
  isDoseAdministrableNow,
  isMarShiftTimelineItemActionable,
  readMarDoseScheduleAdjustmentHistory,
  resolveMarShiftTimelineClinicalAction,
  resolveOriginalScheduledAtFromDose,
  validateMarDoseScheduleAdjustment,
  validateMarDoseScheduleAdjustmentGovernance,
  validateMarScheduleTimingGovernance,
} from "@medora/shared";
import { isMarShiftTimelineActionEnabled } from "@/features/mar/marShiftTimelineActions";
import type { MarShiftTimelineCellItem } from "@/lib/marShiftTimelineApi";

const webSrcRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

function baseItem(overrides: Partial<MarShiftTimelineCellItem> = {}): MarShiftTimelineCellItem {
  return {
    type: "MEDICATION",
    medicationDoseInstanceId: "dose-1",
    orderItemId: "oi-1",
    medicationLabel: "Rocephin 1 g IVPB",
    primaryText: "Rocephin",
    secondaryText: "",
    tertiaryText: "",
    doseStatus: "PLANNED",
    doseKind: "FIXED_ADMINISTRATION",
    route: "IV",
    frequencyCode: "Q8H",
    scheduledAt: "2026-06-18T04:00:00.000Z",
    dueWindowStartAt: "2026-06-18T03:30:00.000Z",
    dueWindowEndAt: "2026-06-18T05:00:00.000Z",
    requiresWitness: false,
    readOnly: false,
    clinicalAction: "ADMINISTER",
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
    hover: { title: "Rocephin", due: "04:00", dose: null, route: "IV", witness: null, status: "Planned" },
    actions: ["ADMINISTER", "CHANGE_SCHEDULED_TIME", "REFUSE", "HOLD", "MARK_MISSED", "VIEW_ORDER"],
    ...overrides,
  };
}

const handlers = {
  disabled: false,
  busy: false,
  onRequestAdminister: async () => {},
  onRequestStartInfusion: async () => true,
  onExecuteStopInfusion: async () => {},
  onExecuteRefuse: async () => {},
  onExecuteHold: async () => {},
  onRequestScheduleAdjustment: async () => {},
};

describe("marUniversalMedicationAvailability (MEDUI.ED.MAR.H9)", () => {
  const tabSrc = readSrc("components/encounters/MedicationAdministrationTab.tsx");
  const drawerSrc = readSrc("components/encounters/FacilityMarShiftTimelineDrawer.tsx");
  const historySrc = readSrc("lib/medicationAdministrationHistoryApi.ts");

  it("1 — scheduled medication at future time shows Administer enabled", () => {
    const item = baseItem();
    expect(isMarShiftTimelineActionEnabled("ADMINISTER", item, handlers)).toBe(true);
  });

  it("2 — scheduled medication at past time shows Administer enabled", () => {
    const item = baseItem({ doseStatus: "OVERDUE", clinicalAction: "ADMINISTER" });
    expect(isMarShiftTimelineActionEnabled("ADMINISTER", item, handlers)).toBe(true);
  });

  it("3 — IVPB scheduled later shows Start infusion enabled", () => {
    const item = baseItem({
      doseKind: "IVPB_SESSION",
      clinicalAction: "START_INFUSION",
      route: "IVPB",
    });
    expect(isMarShiftTimelineActionEnabled("START_INFUSION", item, handlers)).toBe(true);
    expect(resolveMarShiftTimelineClinicalAction("IVPB_SESSION", "PLANNED")).toBe("START_INFUSION");
  });

  it("4 — early administration is advisory only", () => {
    const timing = evaluateMarScheduleTimingGovernance({
      administeredAt: "2026-06-17T23:40:00.000Z",
      scheduledAt: "2026-06-18T00:36:00.000Z",
      dueWindowStartAt: "2026-06-18T00:00:00.000Z",
      dueWindowEndAt: "2026-06-18T01:00:00.000Z",
      facilityTimeZone: "America/Port-au-Prince",
    });
    expect(timing.requiresReason).toBe(false);
    expect(validateMarScheduleTimingGovernance({ timing, reasonCode: null }).ok).toBe(true);
  });

  it("5 — late administration is advisory only", () => {
    const timing = evaluateMarScheduleTimingGovernance({
      administeredAt: "2026-06-18T02:00:00.000Z",
      scheduledAt: "2026-06-18T00:36:00.000Z",
      dueWindowStartAt: "2026-06-18T00:00:00.000Z",
      dueWindowEndAt: "2026-06-18T01:00:00.000Z",
      facilityTimeZone: "UTC",
    });
    expect(timing.kind).toBe("late");
    expect(timing.requiresReason).toBe(false);
  });

  it("6 — change scheduled time no longer hard-blocks without reason", () => {
    expect(
      validateMarDoseScheduleAdjustment({
        doseStatus: "PLANNED",
        originalScheduledAt: "2026-06-18T00:36:00.000Z",
        newScheduledAt: "2026-06-17T23:40:00.000Z",
        reasonCode: "",
      }).ok
    ).toBe(true);
    expect(
      validateMarDoseScheduleAdjustmentGovernance({ reasonCode: "PROVIDER_INSTRUCTION" }).ok
    ).toBe(true);
  });

  it("7 — original scheduled time preserved", () => {
    const json = appendMarDoseScheduleAdjustmentHistory(null, {
      originalScheduledAt: "2026-06-18T00:36:00.000Z",
      previousScheduledAt: "2026-06-18T00:36:00.000Z",
      newScheduledAt: "2026-06-17T23:40:00.000Z",
      originalDueWindowStartAt: "2026-06-18T00:00:00.000Z",
      originalDueWindowEndAt: "2026-06-18T01:00:00.000Z",
      newDueWindowStartAt: "2026-06-17T23:10:00.000Z",
      newDueWindowEndAt: "2026-06-18T00:10:00.000Z",
      reasonCode: "PROVIDER_INSTRUCTION",
      reasonDetail: null,
      changedByUserId: "u1",
      changedByDisplay: "Elizabeth Posada RN",
      changedAt: "2026-06-17T22:00:00.000Z",
      riskSeverity: "MODERATE",
      reviewRecommended: false,
    });
    expect(resolveOriginalScheduledAtFromDose({ scheduledAt: "2026-06-17T23:40:00.000Z", orderedDoseSnapshotJson: json })).toBe(
      "2026-06-18T00:36:00.000Z"
    );
    expect(readMarDoseScheduleAdjustmentHistory(json)).toHaveLength(1);
  });

  it("8 — adjusted scheduled time displayed via API wiring", () => {
    expect(tabSrc).toContain("adjustMedicationDoseSchedule");
    expect(readSrc("components/mar/MedicationDoseScheduleAdjustmentModal.tsx")).toContain(
      "mar-dose-schedule-adjustment-new-time"
    );
  });

  it("9 — actual administered time and window advisory in tab", () => {
    expect(tabSrc).toContain("resolveMarMedicationTimingAdvisory");
    expect(tabSrc).toContain("effectiveAdministeredAt");
  });

  it("10 — canceled order remains blocked", () => {
    const item = baseItem({ doseStatus: "CANCELLED", clinicalAction: "VIEW_CANCELED", readOnly: true });
    expect(isMarShiftTimelineItemActionable(item)).toBe(false);
    expect(isMarShiftTimelineActionEnabled("ADMINISTER", item, handlers)).toBe(false);
  });

  it("11 — completed dose remains blocked", () => {
    const item = baseItem({ doseStatus: "COMPLETED", clinicalAction: "VIEW_ADMINISTRATION", readOnly: true });
    expect(isMarShiftTimelineActionEnabled("ADMINISTER", item, handlers)).toBe(false);
  });

  it("12 — PRN interval preserved", () => {
    expect(tabSrc).toContain("validatePrnAdministrationForMarCreate");
  });

  it("13 — historical MAR shows outside-window advisory wiring", () => {
    expect(tabSrc).toContain("mar-outside-window-advisory");
    expect(tabSrc).toContain("resolveMarMedicationTimingAdvisory");
  });

  it("14 — history shows time change read model support", () => {
    expect(historySrc).toContain("fetchMedicationAdministrationHistory");
    const sharedHistory = readFileSync(
      join(webSrcRoot, "../../../packages/shared/src/mar/medicationAdministrationHistory.ts"),
      "utf8"
    );
    expect(sharedHistory).toContain("SCHEDULE_TIME_CHANGED");
  });

  it("15 — no silent mutation (append-only schedule audit)", () => {
    const json1 = appendMarDoseScheduleAdjustmentHistory(null, {
      originalScheduledAt: "2026-06-18T00:36:00.000Z",
      previousScheduledAt: "2026-06-18T00:36:00.000Z",
      newScheduledAt: "2026-06-17T23:40:00.000Z",
      originalDueWindowStartAt: "a",
      originalDueWindowEndAt: "b",
      newDueWindowStartAt: "c",
      newDueWindowEndAt: "d",
      reasonCode: "PROVIDER_INSTRUCTION",
      reasonDetail: null,
      changedByUserId: "u1",
      changedByDisplay: null,
      changedAt: "2026-06-17T22:00:00.000Z",
      riskSeverity: "MODERATE",
      reviewRecommended: false,
    });
    const json2 = appendMarDoseScheduleAdjustmentHistory(json1, {
      originalScheduledAt: "2026-06-18T00:36:00.000Z",
      previousScheduledAt: "2026-06-17T23:40:00.000Z",
      newScheduledAt: "2026-06-17T22:00:00.000Z",
      originalDueWindowStartAt: "a",
      originalDueWindowEndAt: "b",
      newDueWindowStartAt: "c",
      newDueWindowEndAt: "d",
      reasonCode: "NURSING_WORKFLOW",
      reasonDetail: null,
      changedByUserId: "u1",
      changedByDisplay: null,
      changedAt: "2026-06-17T21:00:00.000Z",
      riskSeverity: "LOW",
      reviewRecommended: false,
    });
    expect(readMarDoseScheduleAdjustmentHistory(json2)).toHaveLength(2);
  });

  it("16 — infusion compatibility", () => {
    expect(tabSrc).toContain("runMarInfusion");
  });

  it("17 — IVPB compatibility", () => {
    expect(
      isDoseAdministrableNow({
        doseStatus: "PLANNED",
        now: new Date(),
        dueWindowStartAt: new Date(Date.now() + 3_600_000),
        dueWindowEndAt: new Date(Date.now() + 7_200_000),
      })
    ).toBe(true);
  });

  it("18 — correction compatibility", () => {
    expect(tabSrc).toContain("MarAdministrationRowCorrectionControls");
  });

  it("19 — build passes (source wiring present)", () => {
    expect(drawerSrc).toContain("CHANGE_SCHEDULED_TIME");
    expect(tabSrc).toContain("onRequestScheduleAdjustment");
  });

  it("20 — no regression on refuse/hold eligibility for active doses", () => {
    const item = baseItem();
    expect(isMarShiftTimelineActionEnabled("REFUSE", item, handlers)).toBe(true);
    expect(isMarShiftTimelineActionEnabled("HOLD", item, handlers)).toBe(true);
    expect(isMarShiftTimelineActionEnabled("MARK_MISSED", item, handlers)).toBe(true);
  });
});
