import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveMarShiftTimelineMedicationLabel } from "@medora/shared";
import {
  MAR_SHIFT_TIMELINE_START_TIME_API_SUPPORTED,
  buildMarShiftTimelineStartPayload,
  buildMarShiftTimelineStopPayload,
  isMarShiftTimelineActionEnabled,
  isMarShiftTimelineActionShowComingSoon,
} from "@/features/mar/marShiftTimelineActions";
import { marShiftTimelineDateTimeLocalToUtcIso } from "@/features/mar/marShiftTimelineDisplay";
import type { MarShiftTimelineCellItem } from "@/lib/marShiftTimelineApi";

const webSrcRoot = join(import.meta.dirname, "..", "..");

function ivpbItem(
  overrides?: Partial<MarShiftTimelineCellItem>
): MarShiftTimelineCellItem {
  return {
    type: "MEDICATION",
    medicationDoseInstanceId: "dose-ivpb",
    orderItemId: "oi-ivpb",
    medicationLabel: "Normal Saline",
    primaryText: "Normal Saline",
    secondaryText: "START",
    tertiaryText: "",
    doseStatus: "DUE",
    doseKind: "IVPB_SESSION",
    route: "IVPB",
    frequencyCode: "Q12H",
    scheduledAt: "2026-06-11T14:00:00.000Z",
    dueWindowStartAt: "2026-06-11T14:00:00.000Z",
    dueWindowEndAt: "2026-06-11T15:00:00.000Z",
    requiresWitness: false,
    readOnly: false,
    clinicalAction: "START_INFUSION",
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
    hover: { title: "Normal Saline", due: "14:00", dose: null, route: "IVPB", witness: null, status: "Due" },
    actions: ["START_INFUSION", "REFUSE", "HOLD", "VIEW_ORDER"],
    ...overrides,
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

describe("MAR language, time picker, action enablement (M1.8B.7K.8)", () => {
  const timeline = readFileSync(
    join(webSrcRoot, "components/encounters/FacilityMarShiftTimeline.tsx"),
    "utf8"
  );
  const drawer = readFileSync(
    join(webSrcRoot, "components/encounters/FacilityMarShiftTimelineDrawer.tsx"),
    "utf8"
  );
  const infusionApi = readFileSync(join(webSrcRoot, "lib/medicationInfusionApi.ts"), "utf8");

  it("English locale resolves Normal Saline not Chlorure de sodium", () => {
    expect(
      resolveMarShiftTimelineMedicationLabel({
        locale: "en",
        catalogSnapshot: {
          catalogItemId: "1",
          catalogItemCode: "NS",
          displayNameEn: "Normal Saline",
          displayNameFr: "Chlorure de sodium",
          genericName: "Sodium Chloride",
        },
      })
    ).toBe("Normal Saline");
  });

  it("timeline fetch passes UI locale to API", () => {
    expect(timeline).toContain("locale: language");
  });

  it("start time input is enabled when START effective time API is supported", () => {
    expect(MAR_SHIFT_TIMELINE_START_TIME_API_SUPPORTED).toBe(true);
    expect(drawer).toContain('type="datetime-local"');
    expect(drawer).not.toContain("disabled={readOnly || !MAR_SHIFT_TIMELINE_START_TIME_API_SUPPORTED}");
    expect(drawer).toContain(
      "disabled={readOnly || submitting || !MAR_SHIFT_TIMELINE_START_TIME_API_SUPPORTED}"
    );
  });

  it("stop time input is enabled for editable drawer", () => {
    expect(drawer).toContain('data-testid="mar-shift-timeline-drawer-stop-time"');
    expect(drawer).toContain("disabled={readOnly || submitting}");
  });

  it("start payload sends startedAt through validated infusion start API", () => {
    const payload = buildMarShiftTimelineStartPayload(
      { startTimeLocal: "2026-06-11T14:16" },
      "America/Port-au-Prince"
    );
    expect(payload.startedAt).toBeTruthy();
    expect(infusionApi).toContain("startedAt");
  });

  it("stop payload sends stoppedAt", () => {
    const payload = buildMarShiftTimelineStopPayload(
      { stopTimeLocal: "2026-06-11T14:42" },
      "America/Port-au-Prince"
    );
    expect(payload.stoppedAt).toBeTruthy();
    expect(marShiftTimelineDateTimeLocalToUtcIso("2026-06-11T14:42", "UTC")).toBeTruthy();
  });

  it("DUE IVPB drawer enables Start infusion", () => {
    expect(isMarShiftTimelineActionEnabled("START_INFUSION", ivpbItem(), enabledHandlers)).toBe(true);
  });

  it("IN_PROGRESS IVPB drawer enables Stop infusion", () => {
    const inProgress = ivpbItem({
      doseStatus: "IN_PROGRESS",
      clinicalAction: "STOP_INFUSION",
      readOnly: false,
    });
    expect(isMarShiftTimelineActionEnabled("STOP_INFUSION", inProgress, enabledHandlers)).toBe(true);
  });

  it("COMPLETED item disables mutation actions", () => {
    const completed = ivpbItem({
      doseStatus: "COMPLETED",
      clinicalAction: "VIEW_ADMINISTRATION",
      readOnly: true,
    });
    expect(isMarShiftTimelineActionEnabled("START_INFUSION", completed, enabledHandlers)).toBe(false);
    expect(isMarShiftTimelineActionEnabled("STOP_INFUSION", completed, enabledHandlers)).toBe(false);
  });

  it("Administer is enabled for eligible non-IVPB NOW items", () => {
    const administer = ivpbItem({ clinicalAction: "ADMINISTER", doseKind: "FIXED_ADMINISTRATION" });
    expect(isMarShiftTimelineActionShowComingSoon("ADMINISTER", administer)).toBe(false);
    expect(isMarShiftTimelineActionEnabled("ADMINISTER", administer, enabledHandlers)).toBe(true);
  });

  it("Refuse and Hold are enabled for pending administer/start items", () => {
    const administer = ivpbItem({ clinicalAction: "ADMINISTER", doseKind: "FIXED_ADMINISTRATION" });
    expect(isMarShiftTimelineActionShowComingSoon("REFUSE", administer)).toBe(false);
    expect(isMarShiftTimelineActionEnabled("REFUSE", administer, enabledHandlers)).toBe(true);
    expect(isMarShiftTimelineActionEnabled("HOLD", administer, enabledHandlers)).toBe(true);
  });
});
