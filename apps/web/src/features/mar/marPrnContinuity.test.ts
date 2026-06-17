import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildMarPrnTimelineCellDisplay,
  shouldAllowOrderLineCompletionDespitePrnContinuity,
  shouldSkipOrderLineCompletionForMar,
  validatePrnAdministrationForMarCreate,
} from "@medora/shared";
import {
  findMarShiftTimelineCellItem,
  findMarShiftTimelinePrnCellItemFallback,
  marShiftTimelineItemStatusStyle,
} from "@/features/mar/marShiftTimelineDisplay";
import { isOrderItemPendingNurseMedication } from "@/lib/nurseMedicationWorkload";
import type { MarShiftTimelineCellItem, MarShiftTimelineResponse } from "@/lib/marShiftTimelineApi";

const webSrcRoot = join(import.meta.dirname, "../..");
const repoRoot = join(import.meta.dirname, "../../../../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

function samplePrnItem(overrides?: Partial<MarShiftTimelineCellItem>): MarShiftTimelineCellItem {
  return {
    type: "MEDICATION",
    medicationDoseInstanceId: "",
    orderItemId: "oi-prn-1",
    medicationLabel: "Acetaminophen 650 mg PO",
    primaryText: "Acetaminophen",
    secondaryText: "PO",
    tertiaryText: "PRN Q6H",
    doseStatus: "DUE",
    doseKind: "STANDING",
    route: "PO",
    frequencyCode: "Q6H",
    scheduledAt: "2026-06-16T18:00:00.000Z",
    dueWindowStartAt: "2026-06-16T17:00:00.000Z",
    dueWindowEndAt: "2026-06-16T19:00:00.000Z",
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
    isPrnBand: true,
    prnLastGivenAt: null,
    prnNextEligibleAt: null,
    hover: {
      title: "Acetaminophen",
      due: "18:00",
      dose: "650 mg",
      route: "PO",
      witness: null,
      status: "Available",
    },
    actions: ["ADMINISTER", "REFUSE", "HOLD", "VIEW_ORDER"],
    ...overrides,
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
        rowKind: "PRN",
        cells: [{ columnKey: "c1", items }],
      },
    ],
  };
}

describe("marPrnContinuity (MEDUI.ED.MAR.H2)", () => {
  it("1 — PRN order skips line completion after administration policy", () => {
    expect(
      shouldSkipOrderLineCompletionForMar({
        frequencyCode: "PRN",
        directionsSig: "650 mg PO PRN pain",
        doseGatedMarPathUsed: false,
      })
    ).toBe(true);
  });

  it("2 — PRN task row remains pending after erroneous COMPLETED status", () => {
    expect(
      isOrderItemPendingNurseMedication({
        catalogItemType: "MEDICATION",
        status: "COMPLETED",
        frequencyCode: "PRN",
        notes: "PRN pain",
      })
    ).toBe(true);
    expect(
      isOrderItemPendingNurseMedication({
        catalogItemType: "MEDICATION",
        status: "COMPLETED",
        frequencyCode: "NOW",
      })
    ).toBe(false);
  });

  it("3 — administered PRN maps to gray timeline state", () => {
    const style = marShiftTimelineItemStatusStyle("COMPLETED", true, true, "650 mg PO");
    expect(style.backgroundColor).toBe("#E5E7EB");
    expect(style.borderColor).toBe("#9CA3AF");
  });

  it("4 — interval PRN shows last given and next eligible", () => {
    const display = buildMarPrnTimelineCellDisplay({
      medicationLabel: "Acetaminophen 650 mg PO",
      doseAmount: "650 mg",
      route: "PO",
      frequencyCode: "Q6H",
      directionsSig: "q6h PRN pain",
      doseStatus: "DUE",
      prnLastGivenAt: "2026-06-16T20:43:00.000Z",
      prnNextEligibleAt: "2026-06-17T02:43:00.000Z",
      facilityTimeZone: "UTC",
    });
    expect(display.tertiaryText).toContain("Last given");
    expect(display.tertiaryText).toContain("Next eligible");
  });

  it("5 — repeat administration allowed after interval (validation passes without early override)", () => {
    expect(
      validatePrnAdministrationForMarCreate({
        frequencyCode: "Q6H",
        directionsSig: "4 mg IVP q6h PRN nausea",
        marAction: "administered",
        prnReasonCode: "nausea",
        proposedAdministeredAt: new Date("2026-06-17T03:00:00.000Z"),
        lastAdministeredAt: new Date("2026-06-16T20:43:00.000Z"),
      })
    ).toBeNull();
  });

  it("6 — repeat administration blocked before interval without override", () => {
    expect(
      validatePrnAdministrationForMarCreate({
        frequencyCode: "Q6H",
        directionsSig: "4 mg IVP q6h PRN nausea",
        marAction: "administered",
        prnReasonCode: "nausea",
        proposedAdministeredAt: new Date("2026-06-16T22:00:00.000Z"),
        lastAdministeredAt: new Date("2026-06-16T20:43:00.000Z"),
      })?.code
    ).toBe("prn_early_override_required");
  });

  it("7 — scheduled NOW medication still completes on terminal MAR", () => {
    expect(
      shouldSkipOrderLineCompletionForMar({
        frequencyCode: "NOW",
        doseGatedMarPathUsed: false,
      })
    ).toBe(false);
  });

  it("8 — drawer resync finds relocated PRN cell after administration", () => {
    const due = samplePrnItem();
    const administered = samplePrnItem({
      doseStatus: "COMPLETED",
      readOnly: true,
      clinicalAction: "VIEW_ADMINISTRATION",
      administeredAt: "2026-06-16T20:43:00.000Z",
      administeredByDisplay: "Marie Dupont",
      administeredByInitials: "MD",
      scheduledAt: "2026-06-16T20:43:00.000Z",
      tertiaryText: "GIVEN 20:43 MD",
      prnLastGivenAt: "2026-06-16T20:43:00.000Z",
      prnNextEligibleAt: "2026-06-17T02:43:00.000Z",
    });
    const timeline = timelineWithItems([administered]);

    const staleLookup = findMarShiftTimelineCellItem(timeline, {
      orderItemId: due.orderItemId,
      medicationDoseInstanceId: "",
      scheduledAt: due.scheduledAt,
    });
    expect(staleLookup?.item.doseStatus).toBe("COMPLETED");
    expect(staleLookup?.item.administeredAt).toBe(administered.administeredAt);

    const fallback = findMarShiftTimelinePrnCellItemFallback(timeline, due.orderItemId);
    expect(fallback?.item.administeredAt).toBe(administered.administeredAt);
  });

  it("service wires classification-based PRN skip into MAR create", () => {
    const service = readFileSync(
      join(repoRoot, "apps/api/src/medication-administration/medication-administration.service.ts"),
      "utf8"
    );
    expect(service).toContain("shouldSkipOrderLineCompletionForMar");
    expect(service).toContain("shouldAllowOrderLineCompletionDespitePrnContinuity");
  });

  it("quantity-exhausted PRN may still complete order line", () => {
    expect(
      shouldAllowOrderLineCompletionDespitePrnContinuity({
        skipForPrnContinuity: true,
        marAction: "administered",
        prescribedQuantity: 1,
        priorAdministeredSum: 0,
        administrationIncrement: 1,
      })
    ).toBe(true);
  });
});
