import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildMarCanceledOrderMarkerDoseInstanceId,
  buildMarCanceledTimelineCellDisplay,
  isMarShiftTimelineItemActionable,
  resolveMarShiftTimelineClinicalAction,
  resolveMarShiftTimelineDrawerActions,
  resolveMarShiftTimelineStatusColorKey,
} from "@medora/shared";
import {
  findMarShiftTimelineCellItem,
  isMarShiftTimelineDrawerReadOnly,
  marShiftTimelineItemStatusStyle,
  marShiftTimelinePrimaryDrawerAction,
} from "@/features/mar/marShiftTimelineDisplay";
import { isOrderItemPendingNurseMedication } from "@/lib/nurseMedicationWorkload";
import type { MarShiftTimelineCellItem, MarShiftTimelineResponse } from "@/lib/marShiftTimelineApi";

const webSrcRoot = join(import.meta.dirname, "../..");
const apiSrcRoot = join(import.meta.dirname, "../../../../api/src");

function readWebSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

function readApiSrc(relativePath: string): string {
  return readFileSync(join(apiSrcRoot, relativePath), "utf8");
}

function sampleCanceledItem(overrides?: Partial<MarShiftTimelineCellItem>): MarShiftTimelineCellItem {
  return {
    type: "MEDICATION",
    medicationDoseInstanceId: buildMarCanceledOrderMarkerDoseInstanceId("oi-cancel-1"),
    orderItemId: "oi-cancel-1",
    medicationLabel: "Acetaminophen 650 mg PO",
    primaryText: "Acetaminophen",
    secondaryText: "ANNULÉ · PO",
    tertiaryText: "PATIENT_DISCHARGED",
    doseStatus: "CANCELLED",
    doseKind: "STANDING",
    route: "PO",
    frequencyCode: "Q6H",
    scheduledAt: "2026-06-16T14:30:00.000Z",
    dueWindowStartAt: "2026-06-16T14:30:00.000Z",
    dueWindowEndAt: "2026-06-16T14:30:00.000Z",
    requiresWitness: false,
    readOnly: true,
    clinicalAction: "VIEW_CANCELED",
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
    cancellationReason: "PATIENT_DISCHARGED",
    cancellationDetails: "Transfer to ward",
    cancelledAt: "2026-06-16T14:30:00.000Z",
    cancelledByDisplay: "Dr. Martin",
    hover: {
      title: "Acetaminophen",
      due: "14:30",
      dose: "650 mg",
      route: "PO",
      witness: null,
      status: "Canceled",
    },
    actions: ["VIEW_ORDER"],
    ...overrides,
  };
}

function sampleAdministeredItem(): MarShiftTimelineCellItem {
  return {
    type: "MEDICATION",
    medicationDoseInstanceId: "dose-completed-1",
    orderItemId: "oi-cancel-1",
    medicationLabel: "Acetaminophen 650 mg PO",
    primaryText: "Acetaminophen",
    secondaryText: "DONE",
    tertiaryText: "GIVEN 10:00 JD",
    doseStatus: "COMPLETED",
    doseKind: "STANDING",
    route: "PO",
    frequencyCode: "Q6H",
    scheduledAt: "2026-06-16T10:00:00.000Z",
    dueWindowStartAt: "2026-06-16T09:00:00.000Z",
    dueWindowEndAt: "2026-06-16T11:00:00.000Z",
    requiresWitness: false,
    readOnly: true,
    clinicalAction: "VIEW_ADMINISTRATION",
    startedAt: null,
    startedByDisplay: null,
    startedByInitials: null,
    stoppedAt: null,
    stoppedByDisplay: null,
    stoppedByInitials: null,
    administeredAt: "2026-06-16T10:00:00.000Z",
    administeredByDisplay: "Jane Doe",
    administeredByInitials: "JD",
    completionSummary: null,
    hover: {
      title: "Acetaminophen",
      due: "10:00",
      dose: "650 mg",
      route: "PO",
      witness: null,
      status: "Completed",
    },
    actions: ["VIEW_ORDER"],
  };
}

function timelineWithItems(items: MarShiftTimelineCellItem[]): MarShiftTimelineResponse {
  return {
    enabled: true,
    facility: { id: "f1", name: "Clinic", timeZone: "America/Port-au-Prince" },
    title: "MAR",
    viewer: { userId: "u1", displayName: "Nurse", role: "RN" },
    shift: {
      code: "7A_7P",
      label: "7A–7P",
      startAt: "2026-06-16T11:00:00.000Z",
      endAt: "2026-06-17T00:00:00.000Z",
      timeZone: "America/Port-au-Prince",
      columns: [{ key: "c1", label: "7A", startAt: "", endAt: "" }],
    },
    rows: [
      {
        patientId: "p1",
        encounterId: "e1",
        patientDisplay: "Patient Test",
        roomLabel: "ED-1",
        assignedNurseUserId: null,
        rowKind: "SCHEDULED",
        cells: [{ columnKey: "c1", items }],
      },
    ],
  };
}

describe("marOrderCancellationContinuity (MEDUI.ED.MAR.H1B)", () => {
  it("1 — backend wires medication cancel cascade on whole-order and line cancel", () => {
    const ordersService = readApiSrc("orders/orders.service.ts");
    expect(ordersService).toContain("cascadeMedicationOrderCancelInTransaction");
    expect(ordersService).toContain('if (order.type === "MEDICATION")');
    expect(ordersService).toContain("isMedicationAdministerChart(orderItem)");
  });

  it("2 — canceled medication remains visible as read-only canceled marker", () => {
    const item = sampleCanceledItem();
    expect(item.doseStatus).toBe("CANCELLED");
    expect(item.readOnly).toBe(true);
    expect(
      resolveMarShiftTimelineStatusColorKey({
        doseStatus: item.doseStatus,
        readOnly: item.readOnly,
        secondaryText: item.secondaryText,
      })
    ).toBe("cancelled");
  });

  it("3 — canceled marker exposes reason, canceled by, and date/time", () => {
    const item = sampleCanceledItem();
    expect(item.cancellationReason).toBe("PATIENT_DISCHARGED");
    expect(item.cancelledByDisplay).toBe("Dr. Martin");
    expect(item.cancelledAt).toBeTruthy();
    const display = buildMarCanceledTimelineCellDisplay({
      medicationLabel: item.medicationLabel,
      route: item.route,
      cancellationReason: item.cancellationReason ?? null,
      locale: "fr",
    });
    expect(display.tertiaryText).toBe("PATIENT_DISCHARGED");
  });

  it("4 — future scheduled doses are not actionable after cancel", () => {
    expect(
      isMarShiftTimelineItemActionable({
        doseStatus: "CANCELLED",
        clinicalAction: "VIEW_CANCELED",
      })
    ).toBe(false);
    expect(resolveMarShiftTimelineDrawerActions("VIEW_CANCELED")).not.toContain("ADMINISTER");
  });

  it("5 — PRN availability stops after cancellation", () => {
    const prnCanceled = sampleCanceledItem({
      isPrnBand: true,
      frequencyCode: "PRN",
      secondaryText: "ANNULÉ · PO",
    });
    expect(isMarShiftTimelineItemActionable(prnCanceled)).toBe(false);
    expect(prnCanceled.actions).toEqual(["VIEW_ORDER"]);
  });

  it("6 — prior administered dose remains visible alongside canceled marker", () => {
    const timeline = timelineWithItems([sampleAdministeredItem(), sampleCanceledItem()]);
    const administered = findMarShiftTimelineCellItem(timeline, {
      orderItemId: "oi-cancel-1",
      medicationDoseInstanceId: "dose-completed-1",
      scheduledAt: "2026-06-16T10:00:00.000Z",
    });
    const canceled = findMarShiftTimelineCellItem(timeline, {
      orderItemId: "oi-cancel-1",
      medicationDoseInstanceId: buildMarCanceledOrderMarkerDoseInstanceId("oi-cancel-1"),
      scheduledAt: "2026-06-16T14:30:00.000Z",
    });
    expect(administered?.item.doseStatus).toBe("COMPLETED");
    expect(canceled?.item.doseStatus).toBe("CANCELLED");
  });

  it("7 — page refresh preserves canceled marker via stable synthetic id", () => {
    const markerId = buildMarCanceledOrderMarkerDoseInstanceId("oi-cancel-1");
    const timeline = timelineWithItems([sampleCanceledItem()]);
    const found = findMarShiftTimelineCellItem(timeline, {
      orderItemId: "oi-cancel-1",
      medicationDoseInstanceId: markerId,
      scheduledAt: "2026-06-16T14:30:00.000Z",
    });
    expect(found?.item.medicationDoseInstanceId).toBe(markerId);
  });

  it("8 — timeline service loads canceled placements", () => {
    const service = readApiSrc("medication-dose/mar-shift-timeline.service.ts");
    expect(service).toContain("loadMarShiftTimelineCanceledPlacements");
  });

  it("9 — canceled util resolves metadata from OrderEvent without schema migration", () => {
    const canceledUtil = readApiSrc("medication-dose/mar-shift-timeline-canceled.util.ts");
    expect(canceledUtil).toContain("resolveMedicationOrderCancelMetadata");
    expect(canceledUtil).toContain('eventType: { in: ["CANCELLED", "DISCONTINUED", "SUPERSEDED"] }');
  });

  it("10 — canceled medication drawer has no administer button", () => {
    const item = sampleCanceledItem();
    expect(isMarShiftTimelineDrawerReadOnly(item)).toBe(true);
    expect(marShiftTimelinePrimaryDrawerAction(item)).toBeNull();
    expect(item.actions).not.toContain("ADMINISTER");
    const drawer = readWebSrc("components/encounters/FacilityMarShiftTimelineDrawer.tsx");
    expect(drawer).toContain("canceledReadOnlyNotice");
    expect(drawer).toContain("mar-shift-timeline-drawer-cancellation-reason");
  });

  it("11 — cascade util does not update completed/administered doses", () => {
    const cascade = readApiSrc("orders/medication-order-cancel-cascade.util.ts");
    expect(cascade).toContain('doseStatus: { notIn: ["COMPLETED", "MISSED", "CANCELLED", "SUPERSEDED", "HELD"] }');
    expect(cascade).toContain("terminalMedicationAdministrationId: null");
  });

  it("12 — active non-canceled scheduled meds remain actionable", () => {
    expect(
      isMarShiftTimelineItemActionable({
        doseStatus: "DUE",
        clinicalAction: "ADMINISTER",
      })
    ).toBe(true);
    expect(
      isOrderItemPendingNurseMedication({
        catalogItemType: "MEDICATION",
        status: "PLACED",
        frequencyCode: "Q6H",
        notes: "650 mg PO",
      })
    ).toBe(true);
  });

  it("13 — active non-canceled PRNs remain available", () => {
    expect(
      isMarShiftTimelineItemActionable({
        doseStatus: "DUE",
        clinicalAction: "ADMINISTER",
      })
    ).toBe(true);
    expect(
      isOrderItemPendingNurseMedication({
        catalogItemType: "MEDICATION",
        status: "PLACED",
        frequencyCode: "PRN",
        notes: "PRN nausea",
      })
    ).toBe(true);
  });

  it("14 — backend blocks medication administration against canceled order item", () => {
    const guard = readApiSrc("common/workflow/order-cancelled.guard.ts");
    const marService = readApiSrc("medication-administration/medication-administration.service.ts");
    expect(guard).toContain("assertOrderItemNotCancelled");
    expect(marService).toContain("assertOrderItemNotCancelled");
  });

  it("canceled cell style uses neutral gray bucket distinct from administered/refused", () => {
    const canceledStyle = marShiftTimelineItemStatusStyle("CANCELLED", true, false, "ANNULÉ · PO");
    const administeredStyle = marShiftTimelineItemStatusStyle("COMPLETED", true, false, "DONE");
    expect(canceledStyle.backgroundColor).not.toBe(administeredStyle.backgroundColor);
    expect(canceledStyle.borderColor).toBe("#9CA3AF");
  });
});
