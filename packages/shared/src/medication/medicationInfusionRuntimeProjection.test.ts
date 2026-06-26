/** MEDUI.MAR.CONTINUOUS_INFUSION_RUNTIME_COMPLETION.1 */

import { describe, expect, it } from "vitest";
import {
  buildMedicationInfusionRuntimeProjection,
  findActiveMedicationInfusionSessionFromEvents,
  resolveMedicationInfusionCellSecondaryText,
  validateMedicationInfusionRuntimeAction,
} from "./medicationInfusionRuntimeProjection.js";
import { ENTERPRISE_CONTINUOUS_INFUSION_MEDICATIONS } from "./continuousInfusionLifecycleGovernance.js";

const ORDER_ITEM = "order-item-heparin";

function infusionEvent(
  action: string,
  extras: Record<string, unknown> = {}
): { metadata: Record<string, unknown> } {
  return {
    metadata: {
      infusionScope: "MEDICATION_INFUSION",
      infusionAction: action,
      orderItemId: ORDER_ITEM,
      infusionSessionKey: "session-1",
      infusionStartedAt: "2026-06-23T18:00:00.000Z",
      eventAt: extras.eventAt ?? "2026-06-23T18:00:00.000Z",
      route: "IV",
      ...extras,
    },
  };
}

describe("medicationInfusionRuntimeProjection", () => {
  it("replays start → rate change → pause → restart → stop chronologically", () => {
    const events = [
      infusionEvent("START", { eventAt: "2026-06-23T18:00:00.000Z", currentRate: "18 units/kg/hr" }),
      infusionEvent("RATE_CHANGE", {
        eventAt: "2026-06-23T19:00:00.000Z",
        previousRate: "18 units/kg/hr",
        currentRate: "20 units/kg/hr",
        rateChangeReason: "Provider order",
      }),
      infusionEvent("PAUSE", { eventAt: "2026-06-23T20:00:00.000Z", pauseReason: "Procedure" }),
      infusionEvent("RESTART", { eventAt: "2026-06-23T20:30:00.000Z" }),
      infusionEvent("STOP", {
        eventAt: "2026-06-23T22:00:00.000Z",
        infusionStoppedAt: "2026-06-23T22:00:00.000Z",
      }),
    ];

    const activeMid = findActiveMedicationInfusionSessionFromEvents(ORDER_ITEM, events.slice(0, 3));
    expect(activeMid?.paused).toBe(true);
    expect(activeMid?.currentRate).toBe("20 units/kg/hr");

    const projection = buildMedicationInfusionRuntimeProjection({
      orderItemId: ORDER_ITEM,
      events,
      locale: "fr",
      startedByDisplay: "Inf. Dupont",
      stopReason: "COMPLETED",
    });
    expect(projection?.timelineRows.map((row) => row.eventType)).toEqual([
      "INFUSION_START",
      "INFUSION_RATE_CHANGE",
      "INFUSION_PAUSE",
      "INFUSION_RESTART",
      "INFUSION_STOP",
    ]);
    expect(projection?.highestRate).toBe("20 units/kg/hr");
    expect(projection?.finalRate).toBe("20 units/kg/hr");
    expect(projection?.status).toBe("COMPLETED");
  });

  it("uses nurse-friendly secondary text without internal enums", () => {
    const projection = buildMedicationInfusionRuntimeProjection({
      orderItemId: ORDER_ITEM,
      events: [
        infusionEvent("START"),
        infusionEvent("RATE_CHANGE", { currentRate: "5 mcg/kg/min", previousRate: "2 mcg/kg/min" }),
      ],
      locale: "fr",
    });
    const label = resolveMedicationInfusionCellSecondaryText({
      doseStatus: "IN_PROGRESS",
      infusionRuntime: projection,
      locale: "fr",
    });
    expect(label).not.toMatch(/INFUSING|IN_PROGRESS|RATE_CHANGE/);
    expect(label).toContain("5 mcg/kg/min");
  });

  it("blocks duplicate pause and rate change while paused", () => {
    const active = {
      sessionKey: "session-1",
      startedAt: new Date("2026-06-23T18:00:00.000Z"),
      route: "IV",
      paused: true,
      currentRate: "10 mL/hr",
    };
    expect(validateMedicationInfusionRuntimeAction({ action: "PAUSE", active }).ok).toBe(false);
    expect(validateMedicationInfusionRuntimeAction({ action: "RATE_CHANGE", active, newRate: "12 mL/hr" }).ok).toBe(
      false
    );
    expect(validateMedicationInfusionRuntimeAction({ action: "RESTART", active }).ok).toBe(true);
  });

  it("covers all enterprise ICU infusion catalog medications via registry", () => {
    expect(ENTERPRISE_CONTINUOUS_INFUSION_MEDICATIONS.length).toBeGreaterThanOrEqual(15);
    for (const entry of ENTERPRISE_CONTINUOUS_INFUSION_MEDICATIONS) {
      expect(entry.catalogCodes.length).toBeGreaterThan(0);
    }
  });

  it("projects encounter summary row with device change and pause counts", () => {
    const events = [
      infusionEvent("START", { currentRate: "10 mL/hr" }),
      infusionEvent("BAG_CHANGE", { eventAt: "2026-06-23T19:00:00.000Z" }),
      infusionEvent("PUMP_CHANGE", { eventAt: "2026-06-23T19:30:00.000Z" }),
      infusionEvent("LINE_CHANGE", { eventAt: "2026-06-23T20:00:00.000Z" }),
      infusionEvent("PAUSE", { eventAt: "2026-06-23T20:30:00.000Z" }),
      infusionEvent("RESTART", { eventAt: "2026-06-23T21:00:00.000Z" }),
    ];
    const projection = buildMedicationInfusionRuntimeProjection({
      orderItemId: ORDER_ITEM,
      events,
      locale: "en",
    });
    expect(projection?.bagChangeCount).toBe(1);
    expect(projection?.pumpChangeCount).toBe(1);
    expect(projection?.lineChangeCount).toBe(1);
    expect(projection?.pauseCount).toBe(1);
    expect(projection?.restartCount).toBe(1);
  });
});
