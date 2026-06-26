import { describe, expect, it } from "vitest";
import {
  extractMedicationOrderLifecycleInputFromItem,
  findReplacementOrderItemIdForOrderItem,
  isMedicationOrderLifecycleGovernanceDeferred,
  resolveMedicationOrderLifecycleDisplay,
} from "./medicationOrderLifecycleDisplay.js";

describe("medicationOrderLifecycleDisplay", () => {
  it("legacy rows without lifecycle status resolve as ACTIVE with no badge", () => {
    const display = resolveMedicationOrderLifecycleDisplay({});
    expect(display.status).toBe("ACTIVE");
    expect(display.showLifecycleBadge).toBe(false);
  });

  it("discontinued order shows lifecycle badge with reason and effective time", () => {
    const display = resolveMedicationOrderLifecycleDisplay({
      medicationLifecycleStatus: "DISCONTINUED",
      medicationLifecycleAt: "2026-06-23T14:00:00.000Z",
      medicationLifecycleReason: "Changement clinique",
      medicationLifecycleByDisplay: "Dr Smith",
      strength: "500 mg",
      frequencyCode: "Q12H",
      route: "IV",
    });
    expect(display.showLifecycleBadge).toBe(true);
    expect(display.reason).toBe("Changement clinique");
    expect(display.providerDisplay).toBe("Dr Smith");
    expect(display.doseSummary).toContain("Q12H");
  });

  it("finds replacement order item id from order bundle", () => {
    const orders = [
      {
        items: [
          { id: "old-1", medicationLifecycleStatus: "SUPERSEDED" },
          { id: "new-1", replacesOrderItemId: "old-1", strength: "750 mg", frequencyCode: "Q12H" },
        ],
      },
    ];
    expect(findReplacementOrderItemIdForOrderItem(orders, "old-1")).toBe("new-1");
  });

  it("superseded display includes previous and new dose summaries", () => {
    const orders = [
      {
        items: [
          {
            id: "old-1",
            medicationLifecycleStatus: "SUPERSEDED",
            strength: "500 mg",
            frequencyCode: "Q12H",
            route: "IV",
          },
          {
            id: "new-1",
            replacesOrderItemId: "old-1",
            strength: "750 mg",
            frequencyCode: "Q12H",
            route: "IV",
          },
        ],
      },
    ];
    const input = extractMedicationOrderLifecycleInputFromItem(
      orders[0].items[1] as Record<string, unknown>,
      orders
    );
    const display = resolveMedicationOrderLifecycleDisplay(input);
    expect(display.status).toBe("ACTIVE");
    expect(display.previousDoseSummary).toContain("500 mg");
    expect(display.doseSummary).toContain("750 mg");
  });

  it("governance-deferred statuses display safely without actions", () => {
    expect(isMedicationOrderLifecycleGovernanceDeferred("EXPIRED")).toBe(true);
    expect(isMedicationOrderLifecycleGovernanceDeferred("CANCELED_ENTERED_IN_ERROR")).toBe(true);
    expect(isMedicationOrderLifecycleGovernanceDeferred("DISCONTINUED")).toBe(false);
    const display = resolveMedicationOrderLifecycleDisplay({
      medicationLifecycleStatus: "EXPIRED",
      medicationLifecycleReason: "Durée terminée",
    });
    expect(display.isGovernanceDeferred).toBe(true);
    expect(display.showLifecycleBadge).toBe(true);
  });
});
