import { describe, expect, it } from "vitest";
import {
  buildMarCanceledOrderMarkerDoseInstanceId,
  buildMarCanceledTimelineCellDisplay,
  isMedicationDoseOpenForCancellation,
  isMarCanceledOrderMarkerDoseInstanceId,
  resolveMarCanceledTimelinePlacementInstant,
  resolveMedicationOrderCancelMetadata,
} from "./medicationOrderCancelMar.js";
import {
  resolveMarShiftTimelineClinicalAction,
  resolveMarShiftTimelineDrawerActions,
} from "./marShiftTimeline.js";
import { isMarShiftTimelineItemActionable } from "./marShiftTimelineActionability.js";
import { resolveMarShiftTimelineStatusColorKey } from "../mar/marPrnTimeline.js";

describe("medicationOrderCancelMar (MEDUI.ED.MAR.H1B)", () => {
  it("identifies open future doses for cancellation cascade", () => {
    const cancelledAt = new Date("2026-06-16T14:00:00.000Z");
    expect(
      isMedicationDoseOpenForCancellation({
        doseStatus: "DUE",
        scheduledAt: new Date("2026-06-16T15:00:00.000Z"),
        cancelledAt,
      })
    ).toBe(true);
    expect(
      isMedicationDoseOpenForCancellation({
        doseStatus: "COMPLETED",
        scheduledAt: new Date("2026-06-16T15:00:00.000Z"),
        cancelledAt,
      })
    ).toBe(false);
    expect(
      isMedicationDoseOpenForCancellation({
        doseStatus: "HELD",
        scheduledAt: new Date("2026-06-16T15:00:00.000Z"),
        cancelledAt,
      })
    ).toBe(false);
    expect(
      isMedicationDoseOpenForCancellation({
        doseStatus: "DUE",
        scheduledAt: new Date("2026-06-16T13:00:00.000Z"),
        cancelledAt,
      })
    ).toBe(false);
  });

  it("resolves line-level cancel metadata from OrderEvent", () => {
    const meta = resolveMedicationOrderCancelMetadata({
      orderItemId: "oi-1",
      orderCancelledAt: null,
      orderCancellationReason: null,
      orderCancelledByUserId: null,
      orderCancelledByDisplay: null,
      cancelEvents: [
        {
          performedAt: new Date("2026-06-16T14:30:00.000Z"),
          performedByUserId: "md-1",
          performedByFirstName: "Jean",
          performedByLastName: "Dupont",
          note: "PATIENT_DISCHARGED",
          metadata: {
            cancelScope: "ORDER_ITEM",
            orderItemId: "oi-1",
            cancellationReason: "PATIENT_DISCHARGED",
            cancellationDetails: "Patient transfer",
          },
        },
      ],
    });
    expect(meta).toMatchObject({
      cancellationReason: "PATIENT_DISCHARGED",
      cancellationDetails: "Patient transfer",
      cancelledByDisplay: "Jean Dupont",
      cancelScope: "ORDER_ITEM",
    });
  });

  it("builds canceled timeline marker display and placement", () => {
    const display = buildMarCanceledTimelineCellDisplay({
      medicationLabel: "Acetaminophen 650 mg PO",
      route: "PO",
      cancellationReason: "PATIENT_DISCHARGED",
      locale: "fr",
    });
    expect(display.secondaryText).toContain("ANNULÉ");
    expect(display.tertiaryText).toBe("PATIENT_DISCHARGED");

    const placement = resolveMarCanceledTimelinePlacementInstant({
      cancelledAt: new Date("2026-06-16T08:00:00.000Z"),
      shiftStart: new Date("2026-06-16T11:00:00.000Z"),
      shiftEnd: new Date("2026-06-17T00:00:00.000Z"),
    });
    expect(placement?.toISOString()).toBe("2026-06-16T11:00:00.000Z");
  });

  it("maps canceled MAR cells to read-only clinical action and gray color", () => {
    expect(resolveMarShiftTimelineClinicalAction("STANDING", "CANCELLED")).toBe("VIEW_CANCELED");
    expect(resolveMarShiftTimelineDrawerActions("VIEW_CANCELED")).toEqual(["VIEW_ORDER"]);
    expect(
      isMarShiftTimelineItemActionable({
        doseStatus: "CANCELLED",
        clinicalAction: "VIEW_CANCELED",
      })
    ).toBe(false);
    expect(
      resolveMarShiftTimelineStatusColorKey({
        doseStatus: "CANCELLED",
        readOnly: true,
      })
    ).toBe("cancelled");
  });

  it("uses synthetic canceled marker dose id prefix", () => {
    const id = buildMarCanceledOrderMarkerDoseInstanceId("oi-9");
    expect(isMarCanceledOrderMarkerDoseInstanceId(id)).toBe(true);
    expect(id).toBe("canceled-order:oi-9");
  });
});
