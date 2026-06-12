import { describe, expect, it } from "vitest";
import {
  buildPausedIntervalsFromEvents,
  calculateFluidVolumeInfused,
  CONTINUOUS_FLUID_INFUSION_SCOPE,
  resolveContinuousFluidSessionFromEvents,
  resolveFluidIntakeContribution,
  validateContinuousFluidTransition,
} from "./continuousFluidSession.js";

describe("continuousFluidSession (K.10B.8)", () => {
  const orderItemId = "oi-ns-1";
  const sessionKey = "fluid-session-1";

  function fluidEvent(action: string, at: string) {
    return {
      metadata: {
        infusionScope: CONTINUOUS_FLUID_INFUSION_SCOPE,
        fluidAction: action,
        fluidSessionKey: sessionKey,
        fluidActionAt: at,
        orderItemId,
      },
    };
  }

  it("resolves RUNNING → PAUSED → RUNNING → COMPLETED lifecycle", () => {
    let snap = resolveContinuousFluidSessionFromEvents(orderItemId, []);
    expect(snap.status).toBe("DUE");

    snap = resolveContinuousFluidSessionFromEvents(orderItemId, [
      fluidEvent("START", "2026-06-12T08:14:00.000Z"),
    ]);
    expect(snap.status).toBe("RUNNING");

    snap = resolveContinuousFluidSessionFromEvents(orderItemId, [
      fluidEvent("START", "2026-06-12T08:14:00.000Z"),
      fluidEvent("PAUSE", "2026-06-12T10:00:00.000Z"),
    ]);
    expect(snap.status).toBe("PAUSED");

    snap = resolveContinuousFluidSessionFromEvents(orderItemId, [
      fluidEvent("START", "2026-06-12T08:14:00.000Z"),
      fluidEvent("PAUSE", "2026-06-12T10:00:00.000Z"),
      fluidEvent("RESUME", "2026-06-12T10:30:00.000Z"),
    ]);
    expect(snap.status).toBe("RUNNING");

    snap = resolveContinuousFluidSessionFromEvents(orderItemId, [
      fluidEvent("START", "2026-06-12T08:14:00.000Z"),
      fluidEvent("STOP", "2026-06-12T16:27:00.000Z"),
    ]);
    expect(snap.status).toBe("COMPLETED");
  });

  it("blocks forbidden transitions", () => {
    expect(
      validateContinuousFluidTransition({ current: "COMPLETED", action: "RESUME" })?.code
    ).toBe("fluid_resume_when_completed");
    expect(
      validateContinuousFluidTransition({ current: "RUNNING", action: "START" })?.code
    ).toBe("fluid_start_when_running");
    expect(
      validateContinuousFluidTransition({
        current: "DUE",
        action: "STOP",
        startedAt: null,
      })?.code
    ).toBe("fluid_stop_before_start");
  });

  it("calculates volume infused with pause exclusion", () => {
    const events = [
      { action: "START" as const, at: "2026-06-12T08:00:00.000Z", sessionKey },
      { action: "PAUSE" as const, at: "2026-06-12T10:00:00.000Z", sessionKey },
      { action: "RESUME" as const, at: "2026-06-12T11:00:00.000Z", sessionKey },
      { action: "STOP" as const, at: "2026-06-12T12:00:00.000Z", sessionKey },
    ];
    const paused = buildPausedIntervalsFromEvents(events);
    const volume = calculateFluidVolumeInfused({
      rateMlPerHr: 100,
      startedAt: "2026-06-12T08:00:00.000Z",
      stoppedAt: "2026-06-12T12:00:00.000Z",
      pausedIntervals: paused,
    });
    expect(volume).toBe(300);
  });

  it("prepares I&O intake contribution", () => {
    expect(resolveFluidIntakeContribution({ volumeMl: 400, fluidTypeLabel: "NS 0.9%" })).toEqual({
      volumeMl: 400,
      fluidTypeLabel: "NS 0.9%",
      source: "CONTINUOUS_FLUID",
    });
  });
});
