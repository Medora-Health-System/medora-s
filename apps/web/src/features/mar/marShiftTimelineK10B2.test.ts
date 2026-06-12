import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  findMarShiftTimelineCellItem,
  isMarShiftTimelineDrawerReadOnly,
  reconcileMarShiftTimelineDrawerSelection,
} from "@/features/mar/marShiftTimelineDisplay";
import {
  isMarShiftTimelineActionEnabled,
  type MarShiftTimelineActionHandlers,
} from "@/features/mar/marShiftTimelineActions";
import type { MarShiftTimelineCellItem } from "@/lib/marShiftTimelineApi";

const webSrcRoot = join(import.meta.dirname, "..", "..");

const enabledHandlers: MarShiftTimelineActionHandlers = {
  disabled: false,
  busy: false,
  onRequestAdminister: async () => undefined,
  onRequestStartInfusion: async () => true,
  onExecuteStopInfusion: async () => undefined,
  onExecuteRefuse: async () => undefined,
  onExecuteHold: async () => undefined,
};

function sampleItem(overrides?: Partial<MarShiftTimelineCellItem>): MarShiftTimelineCellItem {
  return {
    type: "MEDICATION",
    medicationDoseInstanceId: "dose-ond",
    orderItemId: "oi-ond",
    medicationLabel: "Ondansetron",
    primaryText: "Ondansetron 4 mg",
    secondaryText: "",
    tertiaryText: "",
    doseStatus: "DUE",
    doseKind: "SCHEDULED",
    route: "PO",
    frequencyCode: "NOW",
    scheduledAt: "2026-06-12T03:00:00.000Z",
    dueWindowStartAt: "2026-06-12T03:00:00.000Z",
    dueWindowEndAt: "2026-06-12T04:00:00.000Z",
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
    hover: {
      title: "Ondansetron",
      due: "10:00 PM",
      dose: "4 mg",
      route: "PO",
      witness: null,
      status: "Due",
    },
    actions: ["ADMINISTER", "REFUSE", "HOLD", "VIEW_ORDER"],
    ...overrides,
  };
}

function timelineWith(...items: MarShiftTimelineCellItem[]) {
  return {
    rows: [
      {
        patientDisplay: "Patient A",
        roomLabel: "ER-1",
        cells: [{ items }],
      },
    ],
  };
}

function mutationEnabled(
  item: MarShiftTimelineCellItem,
  action: "ADMINISTER" | "REFUSE" | "HOLD" | "START_INFUSION" | "STOP_INFUSION"
): boolean {
  return isMarShiftTimelineActionEnabled(action, item, enabledHandlers);
}

describe("marShiftTimelineK10B2 — drawer state sync", () => {
  it("1. Administer Ondansetron: refetched COMPLETED item disables mutation buttons", () => {
    const due = sampleItem();
    const completed = sampleItem({
      doseStatus: "COMPLETED",
      readOnly: true,
      clinicalAction: null,
      administeredAt: "2026-06-12T03:05:00.000Z",
      administeredByDisplay: "RN Test",
      administeredByInitials: "RT",
      completionSummary: "RT · 10:05 PM",
      hover: { ...due.hover, status: "Completed" },
      actions: ["VIEW_ORDER"],
    });
    const timeline = timelineWith(completed);
    const found = findMarShiftTimelineCellItem(timeline, due);
    expect(found?.item.hover.status).toBe("Completed");
    expect(isMarShiftTimelineDrawerReadOnly(found!.item)).toBe(true);
    expect(mutationEnabled(found!.item, "ADMINISTER")).toBe(false);
    expect(mutationEnabled(found!.item, "REFUSE")).toBe(false);
    expect(mutationEnabled(found!.item, "HOLD")).toBe(false);
  });

  it("2. Refuse: refetched REFUSED item disables mutation buttons", () => {
    const due = sampleItem();
    const refused = sampleItem({
      doseStatus: "REFUSED",
      readOnly: true,
      clinicalAction: null,
      completionSummary: "Patient declined",
      hover: { ...due.hover, status: "Refused" },
      actions: ["VIEW_ORDER"],
    });
    const found = findMarShiftTimelineCellItem(timelineWith(refused), due);
    expect(found?.item.hover.status).toBe("Refused");
    expect(mutationEnabled(found!.item, "ADMINISTER")).toBe(false);
    expect(mutationEnabled(found!.item, "REFUSE")).toBe(false);
    expect(mutationEnabled(found!.item, "HOLD")).toBe(false);
  });

  it("3. Hold: refetched HELD item disables mutation buttons", () => {
    const due = sampleItem();
    const held = sampleItem({
      doseStatus: "HELD",
      readOnly: true,
      clinicalAction: null,
      completionSummary: "Awaiting labs",
      hover: { ...due.hover, status: "Held" },
      actions: ["VIEW_ORDER"],
    });
    const found = findMarShiftTimelineCellItem(timelineWith(held), due);
    expect(found?.item.hover.status).toBe("Held");
    expect(mutationEnabled(found!.item, "ADMINISTER")).toBe(false);
    expect(mutationEnabled(found!.item, "HOLD")).toBe(false);
  });

  it("4. Start infusion: refetch transitions START_INFUSION → STOP_INFUSION", () => {
    const before = sampleItem({
      medicationLabel: "NS IVPB",
      primaryText: "NS IVPB",
      doseKind: "IVPB_SESSION",
      route: "IVPB",
      clinicalAction: "START_INFUSION",
      doseStatus: "DUE",
      actions: ["START_INFUSION", "REFUSE", "HOLD", "VIEW_ORDER"],
    });
    const after = sampleItem({
      medicationLabel: "NS IVPB",
      primaryText: "NS IVPB",
      doseKind: "IVPB_SESSION",
      route: "IVPB",
      clinicalAction: "STOP_INFUSION",
      doseStatus: "IN_PROGRESS",
      startedAt: "2026-06-12T03:10:00.000Z",
      startedByDisplay: "RN Test",
      hover: { ...before.hover, title: "NS IVPB", status: "In progress" },
      actions: ["STOP_INFUSION", "VIEW_ORDER"],
    });
    const found = findMarShiftTimelineCellItem(timelineWith(after), before);
    expect(mutationEnabled(found!.item, "START_INFUSION")).toBe(false);
    expect(mutationEnabled(found!.item, "STOP_INFUSION")).toBe(true);
    expect(found?.item.doseStatus).toBe("IN_PROGRESS");
  });

  it("5. Stop infusion: refetched COMPLETED item disables Stop", () => {
    const infusing = sampleItem({
      medicationLabel: "NS IVPB",
      clinicalAction: "STOP_INFUSION",
      doseStatus: "IN_PROGRESS",
      startedAt: "2026-06-12T03:10:00.000Z",
      actions: ["STOP_INFUSION", "VIEW_ORDER"],
    });
    const done = sampleItem({
      medicationLabel: "NS IVPB",
      clinicalAction: null,
      doseStatus: "COMPLETED",
      readOnly: true,
      startedAt: "2026-06-12T03:10:00.000Z",
      stoppedAt: "2026-06-12T04:10:00.000Z",
      stoppedByDisplay: "RN Test",
      completionSummary: "60 min",
      hover: { ...infusing.hover, title: "NS IVPB", status: "Done" },
      actions: ["VIEW_ORDER"],
    });
    const found = findMarShiftTimelineCellItem(timelineWith(done), infusing);
    expect(found?.item.readOnly).toBe(true);
    expect(mutationEnabled(found!.item, "STOP_INFUSION")).toBe(false);
  });

  it("6. Double-click prevention: busy handlers disable all mutation actions", () => {
    const due = sampleItem();
    const busyHandlers: MarShiftTimelineActionHandlers = { ...enabledHandlers, busy: true };
    for (const action of ["ADMINISTER", "REFUSE", "HOLD", "START_INFUSION", "STOP_INFUSION"] as const) {
      expect(isMarShiftTimelineActionEnabled(action, due, busyHandlers)).toBe(false);
    }
    const drawer = readFileSync(
      join(webSrcRoot, "components/encounters/FacilityMarShiftTimelineDrawer.tsx"),
      "utf8"
    );
    expect(drawer).toContain("const disabled = !enabled || submitting || actionHandlers?.busy");
  });

  it("7. Missing item after refresh closes drawer via reconcile (null selection)", () => {
    const due = sampleItem();
    const open = {
      item: due,
      patientDisplay: "Patient A",
      roomLabel: "ER-1",
    };
    const emptyTimeline = timelineWith();
    expect(reconcileMarShiftTimelineDrawerSelection(open, emptyTimeline)).toBeNull();
  });

  it("reconcile updates drawer item in place when still present", () => {
    const due = sampleItem();
    const completed = sampleItem({
      readOnly: true,
      doseStatus: "COMPLETED",
      clinicalAction: null,
      hover: { ...due.hover, status: "Completed" },
      actions: ["VIEW_ORDER"],
    });
    const open = { item: due, patientDisplay: "Patient A", roomLabel: "ER-1" };
    const next = reconcileMarShiftTimelineDrawerSelection(open, timelineWith(completed));
    expect(next?.item.readOnly).toBe(true);
    expect(next?.item).not.toBe(due);
  });

  it("FacilityMarShiftTimeline uses reconcile and reopen drawer after administer", () => {
    const timeline = readFileSync(
      join(webSrcRoot, "components/encounters/FacilityMarShiftTimeline.tsx"),
      "utf8"
    );
    expect(timeline).toContain("reconcileMarShiftTimelineDrawerSelection");
    expect(timeline).toContain("onRegisterReopenDrawer");
    expect(timeline).not.toMatch(/onActionSuccess[\s\S]{0,120}setDrawerSelection\(null\)/);
  });

  it("MedicationAdministrationTab refreshes MAR + timeline after drawer actions", () => {
    const marTab = readFileSync(
      join(webSrcRoot, "components/encounters/MedicationAdministrationTab.tsx"),
      "utf8"
    );
    expect(marTab).toContain("timelineReopenDrawerRef");
    expect(marTab).toContain("timelineDrawerAdministerTargetRef");
    expect(marTab).toMatch(/await reloadMarData\(\)/);
    expect(marTab).toMatch(/timelineRefreshRef\.current/);
    expect(marTab).not.toMatch(
      /submitTimelineTerminalMar[\s\S]{0,280}timelineCloseDrawerRef\.current/
    );
  });
});
