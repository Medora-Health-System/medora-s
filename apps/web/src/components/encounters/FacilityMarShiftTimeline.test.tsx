import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildMarShiftTimelineItemHoverTitle,
  isMarShiftTimelineMutationAction,
} from "@/features/mar/marShiftTimelineDisplay";
import type { MarShiftTimelineCellItem } from "@/lib/marShiftTimelineApi";
import { MAR_SHIFT_TIMELINE_SHIFT_LABELS } from "@medora/shared";

const webSrcRoot = join(import.meta.dirname, "..", "..");

function sampleItem(overrides?: Partial<MarShiftTimelineCellItem>): MarShiftTimelineCellItem {
  return {
    type: "MEDICATION",
    medicationDoseInstanceId: "dose-1",
    orderItemId: "oi-1",
    medicationLabel: "Potassium Chloride IVPB",
    primaryText: "KCl IVPB",
    secondaryText: "Witness",
    tertiaryText: "",
    doseStatus: "DUE",
    doseKind: "IVPB_SESSION",
    route: "IVPB",
    frequencyCode: "Q12H",
    scheduledAt: "2026-06-11T08:00:00.000Z",
    dueWindowStartAt: "2026-06-11T08:00:00.000Z",
    dueWindowEndAt: "2026-06-11T09:00:00.000Z",
    requiresWitness: true,
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
      title: "KCl IVPB",
      due: "08:00",
      dose: "20 mEq",
      route: "IVPB",
      witness: "Required",
      status: "Due",
    },
    actions: ["ADMINISTER", "START_INFUSION", "REFUSE", "HOLD", "VIEW_ORDER"],
    ...overrides,
  };
}

describe("FacilityMarShiftTimeline (M1.8B.7K.2)", () => {
  const timeline = readFileSync(
    join(webSrcRoot, "components/encounters/FacilityMarShiftTimeline.tsx"),
    "utf8"
  );
  const drawer = readFileSync(
    join(webSrcRoot, "components/encounters/FacilityMarShiftTimelineDrawer.tsx"),
    "utf8"
  );
  const marTab = readFileSync(
    join(webSrcRoot, "components/encounters/MedicationAdministrationTab.tsx"),
    "utf8"
  );

  it("component renders title from API response.title", () => {
    expect(timeline).toContain('data-testid="mar-shift-timeline-title"');
    expect(timeline).toContain("data?.title");
    expect(timeline).not.toContain("Medora MAR");
    expect(timeline).not.toContain("Medora Dashboard");
  });

  it("component renders assigned nurse (not viewer-as-assignment gate)", () => {
    expect(timeline).toContain('data-testid="mar-shift-timeline-assigned-nurse"');
    expect(timeline).toContain('data-testid="mar-shift-timeline-assigned-nurse-name"');
    expect(timeline).toContain('t("marShiftTimeline.assignedNurseLabel")');
    expect(timeline).toContain("marShiftTimeline.assignedNurseLine");
    expect(timeline).toContain("data-mar-nurse-assignment");
    expect(timeline).toContain('data-testid="mar-shift-timeline-viewer"');
    expect(timeline).toContain('fontWeight: 700');
    expect(timeline).toContain('assignedToUserId: encounterId?.trim() ? undefined : assignedToUserId');
  });

  it("shift selector includes all standard shift labels", () => {
    expect(timeline).toContain("MAR_SHIFT_TIMELINE_SHIFT_CODES");
    expect(timeline).toContain("MAR_SHIFT_TIMELINE_SHIFT_LABELS");
    expect(MAR_SHIFT_TIMELINE_SHIFT_LABELS["6A_6P"]).toBe("6A–6P");
    expect(MAR_SHIFT_TIMELINE_SHIFT_LABELS["7A_7P"]).toBe("7A–7P");
    expect(MAR_SHIFT_TIMELINE_SHIFT_LABELS["7P_7A"]).toBe("7P–7A");
    expect(MAR_SHIFT_TIMELINE_SHIFT_LABELS["12P_12A"]).toBe("12P–12A");
    expect(MAR_SHIFT_TIMELINE_SHIFT_LABELS["3P_3A"]).toBe("3P–3A");
    expect(MAR_SHIFT_TIMELINE_SHIFT_LABELS.CUSTOM).toBe("Custom");
  });

  it("renders hour columns from API shift.columns", () => {
    expect(timeline).toContain("data.shift.columns.map");
    expect(timeline).toContain('data-testid={`mar-shift-timeline-column-${column.label}`}');
  });

  it("renders patient name and room on each row", () => {
    expect(timeline).toContain('data-testid="mar-shift-timeline-patient"');
    expect(timeline).toContain('data-testid="mar-shift-timeline-room"');
    expect(timeline).toContain("row.patientDisplay");
    expect(timeline).toContain("row.roomLabel");
  });

  it("renders medication cell primaryText and secondaryText", () => {
    expect(timeline).toContain('data-testid="mar-shift-timeline-primary-text"');
    expect(timeline).toContain('data-testid="mar-shift-timeline-secondary-text"');
    expect(timeline).toContain("item.primaryText");
    expect(timeline).toContain("item.secondaryText");
  });

  it("supports multiple items in the same cell", () => {
    expect(timeline).toContain("cell?.items ?? []");
    expect(timeline).toContain(".map((item)");
  });

  it("hover title includes due, dose, route, witness, status", () => {
    const title = buildMarShiftTimelineItemHoverTitle(sampleItem());
    expect(title).toContain("KCl IVPB");
    expect(title).toContain("Due: 08:00");
    expect(title).toContain("Dose: 20 mEq");
    expect(title).toContain("Route: IVPB");
    expect(title).toContain("Witness: Required");
    expect(title).toContain("Status: Due");
    expect(timeline).toContain("buildMarShiftTimelineItemHoverTitle(item)");
    expect(timeline).toContain("title={buildMarShiftTimelineItemHoverTitle(item)}");
  });

  it("clicking item opens drawer", () => {
    expect(timeline).toContain("setDrawerSelection");
    expect(timeline).toContain("<FacilityMarShiftTimelineDrawer");
    expect(drawer).toContain('data-testid="mar-shift-timeline-drawer"');
  });

  it("drawer renders action buttons with handler-based enablement", () => {
    expect(drawer).toContain("isMarShiftTimelineActionEnabled");
    expect(drawer).toContain("actionHandlers");
    expect(drawer).toContain('data-testid={`mar-shift-timeline-action-${action}`}');
    expect(drawer).toContain('data-enabled={enabled ? "true" : "false"}');
    expect(isMarShiftTimelineMutationAction("ADMINISTER")).toBe(true);
    expect(isMarShiftTimelineMutationAction("VIEW_ORDER")).toBe(false);
  });

  it("disabled response shows disabled message", () => {
    expect(timeline).toContain('data-testid="mar-shift-timeline-disabled"');
    expect(timeline).toContain('t("marShiftTimeline.disabled")');
  });

  it("empty rows shows empty message", () => {
    expect(timeline).toContain('data-testid="mar-shift-timeline-empty"');
    expect(timeline).toContain('t("marShiftTimeline.empty")');
  });

  it("shift selector change refetches with new shiftCode", () => {
    expect(timeline).toContain("setShiftCode");
    expect(timeline).toContain("fetchMarShiftTimeline");
    expect(timeline).toContain("shiftCode,");
    expect(timeline).toContain("useEffect");
  });

  it("integrates into MedicationAdministrationTab as unified primary MAR UI", () => {
    expect(marTab).toContain("<FacilityMarShiftTimeline");
    expect(marTab).toContain("MAR_TAB_SHOW_LEGACY_SECTIONS");
    expect(marTab).toContain("encounterId={encounterId}");
  });

  it("supports horizontal scroll container", () => {
    expect(timeline).toContain('data-testid="mar-shift-timeline-grid-scroll"');
    expect(timeline).toContain("overflowX: \"auto\"");
  });
});
