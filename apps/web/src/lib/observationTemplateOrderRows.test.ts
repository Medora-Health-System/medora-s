import { describe, expect, it } from "vitest";
import { flattenObservationTemplateOrders } from "./observationTemplateOrderRows";

describe("observationTemplateOrderRows", () => {
  it("flattens template CARE bundle into independent rows with lifecycle phases", () => {
    const orders = [
      {
        id: "ord-1",
        type: "CARE",
        createdAt: "2026-05-16T08:00:00.000Z",
        createdByDisplay: { name: "Dr. Martin" },
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
    expect(rows.find((r) => r.itemId === "item-a")?.lifecyclePhase).toBe("ORDERED");
    expect(rows.find((r) => r.itemId === "item-a")?.orderedBy).toBe("Dr. Martin");
    expect(rows.find((r) => r.itemId === "item-b")?.lifecyclePhase).toBe("ACKNOWLEDGED");
    expect(rows.find((r) => r.itemId === "item-b")?.acknowledgedBy).toContain("Elizabeth Posada");
    expect(rows.find((r) => r.itemId === "item-b")?.performedBy).toBeNull();
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
    expect(rows.find((r) => r.itemId === "item-b")?.lifecyclePhase).toBe("CANCELLED");
  });

  it("maps completed lines with performedBy from COMPLETED event", () => {
    const orders = [
      {
        id: "ord-1",
        type: "CARE",
        authority: { protocolName: "medora_observation_order_set_v1" },
        items: [
          { id: "item-c", manualLabel: "Régime alimentaire selon tolérance", status: "COMPLETED", completedAt: "2026-05-17T09:00:00.000Z" },
        ],
      },
    ];
    const events = [
      {
        eventType: "COMPLETED",
        performedAt: "2026-05-17T09:00:00.000Z",
        performedByDisplayName: "Marie Infirmière",
        roleSnapshot: "RN",
        metadata: { orderItemId: "item-c", source: "OBSERVATION_TEMPLATE_ORDER" },
      },
    ];
    const rows = flattenObservationTemplateOrders(orders, events, "fr");
    expect(rows[0]?.lifecyclePhase).toBe("COMPLETED");
    expect(rows[0]?.performedBy).toContain("Marie Infirmière");
    expect(rows[0]?.acknowledgedBy).toBeNull();
  });

  it("renders English template labels when manualLabel is stored in French", () => {
    const orders = [
      {
        id: "ord-1",
        type: "CARE",
        authority: { protocolName: "medora_observation_order_set_v1" },
        items: [
          {
            id: "item-pox",
            manualLabel: "Surveillance continue par oxymétrie de pouls",
            status: "PLACED",
          },
        ],
      },
    ];
    const rows = flattenObservationTemplateOrders(orders, [], "en");
    expect(rows[0]?.label).toBe("Continuous pulse oximetry monitoring");
    expect(rows[0]?.label).not.toMatch(/oxymétrie/i);
  });
});
