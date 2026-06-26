import { describe, expect, it } from "vitest";
import {
  filterMedicationOrderLifecycleEventsForItem,
  medicationOrderLifecycleEventLabelKey,
} from "@/lib/medicationOrderLifecycleHistory";

describe("medicationOrderLifecycleHistory", () => {
  it("filters lifecycle events for a medication order item", () => {
    const rows = filterMedicationOrderLifecycleEventsForItem(
      [
        {
          id: "ev-1",
          orderId: "ord-1",
          eventType: "DISCONTINUED",
          performedAt: "2026-06-23T10:00:00.000Z",
          performedByDisplayName: "Dr Test",
          metadata: { orderItemId: "item-1", reason: "Changement clinique" },
        },
        {
          id: "ev-2",
          orderId: "ord-1",
          eventType: "COMPLETED",
          performedAt: "2026-06-23T09:00:00.000Z",
          metadata: { orderItemId: "item-1", medicationAdministrationId: "mar-1" },
        },
      ],
      "item-1",
      "ord-1"
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.eventType).toBe("DISCONTINUED");
    expect(rows[0]?.reason).toBe("Changement clinique");
  });

  it("maps lifecycle event types to i18n keys", () => {
    expect(medicationOrderLifecycleEventLabelKey("DISCONTINUED")).toBe("orderEvent.discontinued");
    expect(medicationOrderLifecycleEventLabelKey("ON_HOLD")).toBe("orderEvent.onHold");
    expect(medicationOrderLifecycleEventLabelKey("SUPERSEDED")).toBe("orderEvent.superseded");
  });
});
