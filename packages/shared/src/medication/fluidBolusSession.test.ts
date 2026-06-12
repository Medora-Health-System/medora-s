import { describe, expect, it } from "vitest";
import {
  FLUID_BOLUS_INFUSION_SCOPE,
  resolveFluidBolusIntakeContribution,
  resolveFluidBolusSessionFromEvents,
  validateFluidBolusTransition,
} from "./fluidBolusSession.js";

describe("fluidBolusSession (K.10B.8A)", () => {
  const orderItemId = "oi-bolus";

  function bolusEvent(action: string, at: string, volume = 1000) {
    return {
      metadata: {
        infusionScope: FLUID_BOLUS_INFUSION_SCOPE,
        fluidAction: action,
        fluidSessionKey: "k1",
        fluidActionAt: at,
        orderItemId,
        bolusVolumeMl: volume,
      },
    };
  }

  it("resolves DUE → RUNNING → COMPLETED lifecycle", () => {
    let snap = resolveFluidBolusSessionFromEvents(orderItemId, [], "NS 1000 mL bolus");
    expect(snap.status).toBe("DUE");

    snap = resolveFluidBolusSessionFromEvents(
      orderItemId,
      [bolusEvent("START_BOLUS", "2026-06-12T08:14:00.000Z")],
      "NS 1000 mL bolus"
    );
    expect(snap.status).toBe("RUNNING");

    snap = resolveFluidBolusSessionFromEvents(
      orderItemId,
      [
        bolusEvent("START_BOLUS", "2026-06-12T08:14:00.000Z"),
        bolusEvent("COMPLETE_BOLUS", "2026-06-12T08:47:00.000Z"),
      ],
      "NS 1000 mL bolus"
    );
    expect(snap.status).toBe("COMPLETED");
    expect(snap.bolusVolumeMl).toBe(1000);
  });

  it("blocks duplicate start and complete-before-start", () => {
    expect(
      validateFluidBolusTransition({
        current: "RUNNING",
        action: "START_BOLUS",
        bolusVolumeMl: 1000,
      })?.code
    ).toBe("bolus_duplicate_active");
    expect(
      validateFluidBolusTransition({
        current: "DUE",
        action: "COMPLETE_BOLUS",
        startedAt: null,
      })?.code
    ).toBe("bolus_complete_before_start");
  });

  it("I&O contribution equals bolus volume", () => {
    expect(resolveFluidBolusIntakeContribution({ volumeMl: 1000, fluidTypeLabel: "NS 0.9%" })).toEqual({
      volumeMl: 1000,
      fluidTypeLabel: "NS 0.9%",
      source: "FLUID_BOLUS",
    });
  });
});
