import {
  collectVisiblePrnOrderItemIds,
  createEmptyMarShiftTimelineRow,
  marShiftTimelinePrnRowHasOrderItem,
  upsertMarShiftTimelinePrnCellItem,
} from "./mar-shift-timeline-prn.util";
import type { MarShiftTimelineCellItem } from "./mar-shift-timeline.service";

function prnItem(orderItemId: string, doseInstanceId: string): MarShiftTimelineCellItem {
  return {
    type: "MEDICATION",
    medicationDoseInstanceId: doseInstanceId,
    orderItemId,
    medicationLabel: "Acetaminophen",
    primaryText: "Acetaminophen PO",
    secondaryText: "PO",
    tertiaryText: "Next: 16:30",
    doseStatus: "DUE",
    readOnly: false,
    isPrnBand: true,
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
    doseKind: "SCHEDULED",
    route: "PO",
    frequencyCode: "Q6H",
    scheduledAt: "2026-06-12T16:00:00.000Z",
    dueWindowStartAt: "2026-06-12T15:30:00.000Z",
    dueWindowEndAt: "2026-06-12T16:30:00.000Z",
    requiresWitness: false,
    clinicalAction: "ADMINISTER",
    hover: {
      title: "Acetaminophen",
      due: "16:00",
      dose: "500 mg",
      route: "PO",
      witness: null,
      status: "Due",
    },
    actions: ["ADMINISTER", "REFUSE", "HOLD", "VIEW_ORDER"],
  };
}

describe("mar-shift-timeline-prn.util (K.10B.8B deduplication)", () => {
  it("collectVisiblePrnOrderItemIds tracks dose-instance PRN cells only", () => {
    const prnRow = createEmptyMarShiftTimelineRow({
      patientId: "p1",
      encounterId: "e1",
      patientDisplay: "PRN",
      roomLabel: "2",
      assignedNurseUserId: null,
      rowKind: "PRN",
    });
    prnRow.cells.push({
      columnKey: "04P",
      items: [prnItem("oi-tylenol", "dose-1")],
    });

    const map = new Map([["e1", prnRow]]);
    expect(collectVisiblePrnOrderItemIds(map)).toEqual(new Set(["oi-tylenol"]));
  });

  it("marShiftTimelinePrnRowHasOrderItem detects existing PRN order line", () => {
    const prnRow = createEmptyMarShiftTimelineRow({
      patientId: "p1",
      encounterId: "e1",
      patientDisplay: "PRN",
      roomLabel: "2",
      assignedNurseUserId: null,
      rowKind: "PRN",
    });
    prnRow.cells.push({ columnKey: "04P", items: [prnItem("oi-tylenol", "dose-1")] });

    expect(marShiftTimelinePrnRowHasOrderItem(prnRow, "oi-tylenol")).toBe(true);
    expect(marShiftTimelinePrnRowHasOrderItem(prnRow, "oi-other")).toBe(false);
  });

  it("visible PRN dose-instance ids suppress duplicate fallback for same order item", () => {
    const prnRow = createEmptyMarShiftTimelineRow({
      patientId: "p1",
      encounterId: "e1",
      patientDisplay: "PRN",
      roomLabel: "2",
      assignedNurseUserId: null,
      rowKind: "PRN",
    });
    prnRow.cells.push({ columnKey: "04P", items: [prnItem("oi-tylenol", "dose-1")] });
    const visible = collectVisiblePrnOrderItemIds(new Map([["e1", prnRow]]));

    expect(visible.has("oi-tylenol")).toBe(true);
    expect(marShiftTimelinePrnRowHasOrderItem(prnRow, "oi-tylenol")).toBe(true);
  });

  it("upsertMarShiftTimelinePrnCellItem prefers terminal cell over due dose instance", () => {
    const prnRow = createEmptyMarShiftTimelineRow({
      patientId: "p1",
      encounterId: "e1",
      patientDisplay: "PRN",
      roomLabel: "2",
      assignedNurseUserId: null,
      rowKind: "PRN",
    });
    upsertMarShiftTimelinePrnCellItem(prnRow, "09A", {
      ...prnItem("oi-tylenol", "dose-due"),
      doseStatus: "DUE",
    });
    upsertMarShiftTimelinePrnCellItem(prnRow, "09A", {
      ...prnItem("oi-tylenol", "dose-done"),
      doseStatus: "COMPLETED",
      readOnly: true,
      administeredAt: "2026-06-12T09:16:00.000Z",
      tertiaryText: "GIVEN 09:16 EP",
    });
    const items = prnRow.cells.flatMap((cell) => cell.items);
    expect(items).toHaveLength(1);
    expect(items[0]?.doseStatus).toBe("COMPLETED");
    expect(items[0]?.readOnly).toBe(true);
  });
});
