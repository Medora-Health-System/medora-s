import { describe, expect, it } from "vitest";
import { findMedicationInfusionTimelineFromOrderEvents } from "./erOrderLifecycleUi";

describe("findMedicationInfusionTimelineFromOrderEvents — duration source", () => {
  it("uses OrderEvent metadata durationMinutes, not MAR effective times", () => {
    const orderId = "ord-1";
    const orderItemId = "item-1";
    const events = [
      {
        orderId,
        eventType: "STARTED",
        performedAt: "2026-05-16T10:00:00.000Z",
        metadata: {
          infusionScope: "MEDICATION_INFUSION",
          infusionAction: "START",
          orderItemId,
          infusionSessionKey: "sess-1",
          infusionStartedAt: "2026-05-16T10:00:00.000Z",
        },
      },
      {
        orderId,
        eventType: "COMPLETED",
        performedAt: "2026-05-16T11:30:00.000Z",
        metadata: {
          infusionScope: "MEDICATION_INFUSION",
          infusionAction: "STOP",
          orderItemId,
          infusionSessionKey: "sess-1",
          infusionStartedAt: "2026-05-16T10:00:00.000Z",
          infusionStoppedAt: "2026-05-16T11:30:00.000Z",
          durationMinutes: 90,
        },
      },
    ];
    const tl = findMedicationInfusionTimelineFromOrderEvents(events, orderId, orderItemId);
    expect(tl.lastCompleted?.durationMinutes).toBe(90);
    expect(tl.lastCompleted?.infusionStartedAtIso).toBe("2026-05-16T10:00:00.000Z");
    expect(tl.lastCompleted?.infusionStoppedAtIso).toBe("2026-05-16T11:30:00.000Z");
  });

  it("derives duration from OrderEvent start/stop ISO when durationMinutes omitted", () => {
    const orderId = "ord-1";
    const orderItemId = "item-1";
    const events = [
      {
        orderId,
        eventType: "STARTED",
        performedAt: "2026-05-16T10:00:00.000Z",
        metadata: {
          infusionScope: "MEDICATION_INFUSION",
          infusionAction: "START",
          orderItemId,
          infusionSessionKey: "sess-2",
          infusionStartedAt: "2026-05-16T10:00:00.000Z",
        },
      },
      {
        orderId,
        eventType: "COMPLETED",
        performedAt: "2026-05-16T10:45:00.000Z",
        metadata: {
          infusionScope: "MEDICATION_INFUSION",
          infusionAction: "STOP",
          orderItemId,
          infusionSessionKey: "sess-2",
          infusionStartedAt: "2026-05-16T10:00:00.000Z",
          infusionStoppedAt: "2026-05-16T10:45:00.000Z",
        },
      },
    ];
    const tl = findMedicationInfusionTimelineFromOrderEvents(events, orderId, orderItemId);
    expect(tl.lastCompleted?.durationMinutes).toBe(45);
  });
});
