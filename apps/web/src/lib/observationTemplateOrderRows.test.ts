import { describe, expect, it } from "vitest";
import { flattenObservationTemplateOrders } from "./observationTemplateOrderRows";

describe("observationTemplateOrderRows", () => {
  it("flattens template CARE bundle into independent rows", () => {
    const orders = [
      {
        id: "ord-1",
        type: "CARE",
        authority: { protocolName: "medora_observation_order_set_v1" },
        items: [
          { id: "item-a", manualLabel: "Signes vitaux toutes les 2 heures (surveillance observation)", status: "PLACED" },
          { id: "item-b", manualLabel: "Réévaluation infirmière toutes les 2 heures (parcours observation)", status: "ACKNOWLEDGED" },
        ],
      },
    ];
    const events = [
      {
        eventType: "STARTED",
        performedAt: "2026-05-17T07:32:00.000Z",
        performedByDisplayName: "Elizabeth Posada",
        roleSnapshot: "RN",
        metadata: { orderItemId: "item-b", lifecycleOutcome: "ACKNOWLEDGED" },
      },
    ];
    const rows = flattenObservationTemplateOrders(orders, events, "fr");
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.itemId === "item-a")?.status).toBe("PLACED");
    expect(rows.find((r) => r.itemId === "item-b")?.acknowledgedBy).toContain("Elizabeth Posada");
  });

  it("treats separate template orders as independent rows", () => {
    const orders = [
      {
        id: "ord-a",
        type: "CARE",
        authority: { protocolName: "medora_observation_order_set_v1" },
        items: [
          { id: "item-a", manualLabel: "Signes vitaux toutes les 2 heures (surveillance observation)", status: "PLACED" },
        ],
      },
      {
        id: "ord-b",
        type: "CARE",
        authority: { protocolName: "medora_observation_order_set_v1" },
        items: [
          { id: "item-b", manualLabel: "Réévaluation infirmière toutes les 2 heures (parcours observation)", status: "CANCELLED", lifecycleState: "CANCELLED" },
        ],
      },
    ];
    const rows = flattenObservationTemplateOrders(orders, [], "fr");
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.itemId === "item-a")?.cancelled).toBe(false);
    expect(rows.find((r) => r.itemId === "item-b")?.cancelled).toBe(true);
  });
});
