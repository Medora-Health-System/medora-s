import { describe, expect, it } from "vitest";
import {
  buildErEdSummaryContinuousInfusionRows,
  renderErEdSummaryContinuousInfusionHtml,
} from "@/features/emergency/erEdSummaryMedicationMar";
import {
  buildMedicationInfusionEncounterSummaryRows,
  resolveMedicationInfusionEncounterSummaryStatusLabel,
} from "@medora/shared";
import enMessages from "@/i18n/messages/en";

const ORDER_ID = "order-heparin-1";
const ORDER_ITEM_ID = "order-item-heparin";
const MEDICATION_LABEL = "Heparin IV infusion";

function tEn(key: string): string {
  const parts = key.split(".");
  let cur: unknown = enMessages;
  for (const part of parts) {
    if (!cur || typeof cur !== "object") return key;
    cur = (cur as Record<string, unknown>)[part];
  }
  return typeof cur === "string" ? cur : key;
}

function medicationOrder() {
  return {
    id: ORDER_ID,
    items: [
      {
        id: ORDER_ITEM_ID,
        catalogItemType: "MEDICATION",
        displayLabelEn: MEDICATION_LABEL,
        medicationName: MEDICATION_LABEL,
        doseValue: "25",
        doseUnit: "units/kg/hr",
        route: "IV",
      },
    ],
  };
}

function infusionOrderEvent(
  action: string,
  extras: Record<string, unknown> = {}
): { orderId: string; metadata: Record<string, unknown> } {
  return {
    orderId: ORDER_ID,
    metadata: {
      infusionScope: "MEDICATION_INFUSION",
      infusionAction: action,
      orderItemId: ORDER_ITEM_ID,
      infusionSessionKey: "session-1",
      infusionStartedAt: "2026-06-23T18:00:00.000Z",
      eventAt: extras.eventAt ?? "2026-06-23T18:00:00.000Z",
      route: "IV",
      performedByDisplayName: extras.performedByDisplayName ?? "Nurse Dupont",
      ...extras,
    },
  };
}

const INTERNAL_ENUMS = [
  "RATE_CHANGE",
  "PAUSE",
  "RESTART",
  "BAG_CHANGE",
  "PUMP_CHANGE",
  "LINE_CHANGE",
  "INFUSING",
  "STOPPED",
  "COMPLETED",
];

describe("erEdSummaryContinuousInfusion", () => {
  it("shows infusion start in encounter summary rows", () => {
    const rows = buildErEdSummaryContinuousInfusionRows({
      orders: [medicationOrder()],
      orderEvents: [
        infusionOrderEvent("START", {
          eventAt: "2026-06-23T18:00:00.000Z",
          currentRate: "18 units/kg/hr",
        }),
      ],
      language: "en",
      t: tEn,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.medicationName).toBe(MEDICATION_LABEL);
    expect(rows[0]?.startedAt).not.toBe("—");
    expect(rows[0]?.timeline.some((ev) => ev.label === "Infusion started")).toBe(true);
  });

  it("shows rate change in timeline", () => {
    const rows = buildErEdSummaryContinuousInfusionRows({
      orders: [medicationOrder()],
      orderEvents: [
        infusionOrderEvent("START", { currentRate: "18 units/kg/hr" }),
        infusionOrderEvent("RATE_CHANGE", {
          eventAt: "2026-06-23T19:00:00.000Z",
          previousRate: "18 units/kg/hr",
          currentRate: "20 units/kg/hr",
        }),
      ],
      language: "en",
      t: tEn,
    });
    expect(rows[0]?.timeline.some((ev) => ev.label === "Rate changed")).toBe(true);
    expect(rows[0]?.timeline.some((ev) => ev.detail.includes("20 units/kg/hr"))).toBe(true);
  });

  it("shows pause and restart counts and timeline labels", () => {
    const rows = buildErEdSummaryContinuousInfusionRows({
      orders: [medicationOrder()],
      orderEvents: [
        infusionOrderEvent("START"),
        infusionOrderEvent("PAUSE", { eventAt: "2026-06-23T20:00:00.000Z" }),
        infusionOrderEvent("RESTART", { eventAt: "2026-06-23T20:30:00.000Z" }),
      ],
      language: "en",
      t: tEn,
    });
    expect(rows[0]?.pauseRestart).toBe("2");
    expect(rows[0]?.timeline.some((ev) => ev.label === "Infusion paused")).toBe(true);
    expect(rows[0]?.timeline.some((ev) => ev.label === "Infusion restarted")).toBe(true);
  });

  it("shows stop/completion with nurse-friendly status", () => {
    const rows = buildErEdSummaryContinuousInfusionRows({
      orders: [medicationOrder()],
      orderEvents: [
        infusionOrderEvent("START"),
        infusionOrderEvent("STOP", {
          eventAt: "2026-06-23T22:00:00.000Z",
          infusionStoppedAt: "2026-06-23T22:00:00.000Z",
          stopReasonCode: "COMPLETED",
        }),
      ],
      language: "en",
      t: tEn,
    });
    expect(rows[0]?.statusLabel).toBe("Infusion completed");
    expect(rows[0]?.stoppedAt).not.toBe("—");
    expect(rows[0]?.stopReason).toBe("Infusion completed");
    expect(rows[0]?.timeline.some((ev) => ev.label === "Infusion stopped")).toBe(true);
  });

  it("shows highest and final rate", () => {
    const rows = buildErEdSummaryContinuousInfusionRows({
      orders: [medicationOrder()],
      orderEvents: [
        infusionOrderEvent("START", { currentRate: "10 mL/hr" }),
        infusionOrderEvent("RATE_CHANGE", {
          eventAt: "2026-06-23T19:00:00.000Z",
          previousRate: "10 mL/hr",
          currentRate: "15 mL/hr",
        }),
        infusionOrderEvent("RATE_CHANGE", {
          eventAt: "2026-06-23T20:00:00.000Z",
          previousRate: "15 mL/hr",
          currentRate: "12 mL/hr",
        }),
        infusionOrderEvent("STOP", {
          eventAt: "2026-06-23T21:00:00.000Z",
          infusionStoppedAt: "2026-06-23T21:00:00.000Z",
        }),
      ],
      language: "en",
      t: tEn,
    });
    expect(rows[0]?.highestRate).toBe("15 mL/hr");
    expect(rows[0]?.finalRate).toBe("12 mL/hr");
  });

  it("shows bag, pump, and line change counts", () => {
    const rows = buildErEdSummaryContinuousInfusionRows({
      orders: [medicationOrder()],
      orderEvents: [
        infusionOrderEvent("START"),
        infusionOrderEvent("BAG_CHANGE", { eventAt: "2026-06-23T19:00:00.000Z", newBag: "Bag B" }),
        infusionOrderEvent("PUMP_CHANGE", {
          eventAt: "2026-06-23T19:30:00.000Z",
          newPump: "Pump 2",
        }),
        infusionOrderEvent("LINE_CHANGE", {
          eventAt: "2026-06-23T20:00:00.000Z",
          newLine: "Right forearm",
        }),
      ],
      language: "en",
      t: tEn,
    });
    expect(rows[0]?.bagChanges).toBe("1");
    expect(rows[0]?.pumpChanges).toBe("1");
    expect(rows[0]?.lineChanges).toBe("1");
    expect(rows[0]?.timeline.some((ev) => ev.label === "Bag changed")).toBe(true);
    expect(rows[0]?.timeline.some((ev) => ev.label === "Pump changed")).toBe(true);
    expect(rows[0]?.timeline.some((ev) => ev.label === "Line changed")).toBe(true);
  });

  it("does not expose internal enum labels in summary output", () => {
    const rows = buildErEdSummaryContinuousInfusionRows({
      orders: [medicationOrder()],
      orderEvents: [
        infusionOrderEvent("START", { currentRate: "5 mL/hr" }),
        infusionOrderEvent("RATE_CHANGE", {
          eventAt: "2026-06-23T19:00:00.000Z",
          previousRate: "5 mL/hr",
          currentRate: "8 mL/hr",
        }),
        infusionOrderEvent("PAUSE", { eventAt: "2026-06-23T20:00:00.000Z" }),
        infusionOrderEvent("RESTART", { eventAt: "2026-06-23T20:15:00.000Z" }),
        infusionOrderEvent("BAG_CHANGE", { eventAt: "2026-06-23T20:30:00.000Z" }),
        infusionOrderEvent("PUMP_CHANGE", { eventAt: "2026-06-23T20:45:00.000Z" }),
        infusionOrderEvent("LINE_CHANGE", { eventAt: "2026-06-23T21:00:00.000Z" }),
        infusionOrderEvent("STOP", {
          eventAt: "2026-06-23T22:00:00.000Z",
          infusionStoppedAt: "2026-06-23T22:00:00.000Z",
          stopReasonCode: "COMPLETED",
        }),
      ],
      language: "en",
      t: tEn,
    });
    const serialized = JSON.stringify(rows);
    for (const token of INTERNAL_ENUMS) {
      expect(serialized).not.toContain(token);
    }
    expect(resolveMedicationInfusionEncounterSummaryStatusLabel("RUNNING", "en")).toBe(
      "Infusion running"
    );
  });

  it("chart live preview path includes continuous infusion summary html", () => {
    const rows = buildErEdSummaryContinuousInfusionRows({
      orders: [medicationOrder()],
      orderEvents: [infusionOrderEvent("START", { currentRate: "18 units/kg/hr" })],
      language: "en",
      t: tEn,
    });
    const html = renderErEdSummaryContinuousInfusionHtml({
      rows,
      language: "en",
      t: tEn,
    });
    expect(html).toContain("Continuous infusions");
    expect(html).toContain(MEDICATION_LABEL);
    expect(html).toContain("Infusion started");
    expect(html).not.toMatch(/RATE_CHANGE|INFUSING|BAG_CHANGE/);
  });
});

describe("buildMedicationInfusionEncounterSummaryRows", () => {
  it("builds rows only for order items with infusion start events", () => {
    const eventsByOrderId = new Map<string, Array<{ metadata: unknown }>>([
      [
        ORDER_ID,
        [
          infusionOrderEvent("START").metadata,
        ].map((metadata) => ({ metadata })),
      ],
    ]);
    const rows = buildMedicationInfusionEncounterSummaryRows({
      orderItems: [{ orderItemId: ORDER_ITEM_ID, orderId: ORDER_ID, medicationLabel: MEDICATION_LABEL }],
      eventsByOrderId,
      locale: "en",
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.bagChangeCount).toBe(0);
  });
});
