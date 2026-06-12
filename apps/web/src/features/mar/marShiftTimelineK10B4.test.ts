import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  buildMarShiftTimelineCellDisplay,
  formatIvInfusionRateDisplay,
  parseIvInfusionRateFromDirections,
} from "@medora/shared";
import { submitMarShiftTimelineTerminalMar } from "./marShiftTimelineTerminalMar";

vi.mock("@/lib/apiClient", () => ({
  apiFetch: vi.fn(async () => ({ id: "mar-1" })),
}));

describe("marShiftTimeline K10B4", () => {
  it("parseIvInfusionRateFromDirections handles 100 ml x hr", () => {
    const parsed = parseIvInfusionRateFromDirections("100 ml x hr");
    expect(parsed).toEqual({ kind: "rate", rateValue: 100, rateUnit: "mL/hr" });
    expect(formatIvInfusionRateDisplay(parsed!)).toBe("100 mL/hr");
  });

  it("MAR cell displays NS 0.9% with rate secondary", () => {
    const display = buildMarShiftTimelineCellDisplay({
      medicationLabel: "Normal Saline",
      doseKind: "IVPB_SESSION",
      doseStatus: "DUE",
      route: "IVPB",
      frequencyCode: "NOW",
      requiresWitness: false,
      directionsSig: "NS 0.9% at 100 mL/hr",
    });
    expect(display.primaryText).toBe("NS 0.9%");
    expect(display.secondaryText).toBe("100 mL/hr");
    expect(display.tertiaryText).toBe("START");
  });

  it("submitMarShiftTimelineTerminalMar uses apiFetch without Response.json (K10B4)", async () => {
    const source = readFileSync(join(import.meta.dirname, "marShiftTimelineTerminalMar.ts"), "utf8");
    expect(source).not.toContain("res.json");
    expect(source).not.toContain("res.ok");

    await submitMarShiftTimelineTerminalMar(
      "enc-1",
      "fac-1",
      {
        type: "MEDICATION",
        orderItemId: "oi-1",
        medicationDoseInstanceId: "",
        medicationLabel: "Morphine",
        primaryText: "Morphine",
        secondaryText: "START",
        tertiaryText: "ADMIN",
        doseStatus: "DUE",
        doseKind: "FIXED_ADMINISTRATION",
        route: "PO",
        frequencyCode: "NOW",
        scheduledAt: new Date().toISOString(),
        dueWindowStartAt: new Date().toISOString(),
        dueWindowEndAt: new Date().toISOString(),
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
          title: "Morphine",
          due: "12:00",
          dose: null,
          route: "PO",
          rate: null,
          witness: null,
          status: "Due",
        },
        actions: ["ADMINISTER", "REFUSE", "HOLD"],
      },
      "REFUSE",
      {
        reasonCode: "PATIENT_REFUSED",
        administeredAtIso: new Date().toISOString(),
      }
    );
  });

  it("FacilityMarShiftTimelineDrawer shows rate row (K10B4)", () => {
    const source = readFileSync(
      join(import.meta.dirname, "../../components/encounters/FacilityMarShiftTimelineDrawer.tsx"),
      "utf8"
    );
    expect(source).toContain('t("marShiftTimeline.drawer.rate")');
    expect(source).toContain("item.hover.rate");
  });

  it("CreateOrderModal defers planned admin until facilityClinicalTimeZoneReady", () => {
    const source = readFileSync(
      join(import.meta.dirname, "../../components/orders/CreateOrderModal.tsx"),
      "utf8"
    );
    expect(source).toContain("facilityClinicalTimeZoneReady");
    expect(source).toContain("refreshUntouchedPlannedAdministrationLocal");
    expect(source).toContain("plannedAdminFacilityTimeZone");
  });
});
