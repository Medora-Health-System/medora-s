import { describe, expect, it } from "vitest";
import {
  resolveContinuousFluidDrawerMetrics,
  resolveFluidBolusDrawerMetrics,
} from "./fluidDrawerDisplay.js";

describe("fluidDrawerDisplay (K.10B.8A)", () => {
  it("shows running duration and volume for active continuous fluid", () => {
    const metrics = resolveContinuousFluidDrawerMetrics({
      session: {
        sessionKey: "k1",
        status: "RUNNING",
        startedAt: "2026-06-12T06:09:00.000Z",
        pausedAt: null,
        resumedAt: null,
        stoppedAt: null,
        events: [{ action: "START", at: "2026-06-12T06:09:00.000Z", sessionKey: "k1" }],
      },
      directionsSig: "NS 100 mL/hr",
      asOf: "2026-06-12T08:12:00.000Z",
    });
    expect(metrics.runningDurationLabel).toBeTruthy();
    expect(metrics.volumeInfusedMl).toBe(205);
  });

  it("excludes paused interval from active duration", () => {
    const metrics = resolveContinuousFluidDrawerMetrics({
      session: {
        sessionKey: "k1",
        status: "PAUSED",
        startedAt: "2026-06-12T08:00:00.000Z",
        pausedAt: "2026-06-12T10:00:00.000Z",
        resumedAt: null,
        stoppedAt: null,
        events: [
          { action: "START", at: "2026-06-12T08:00:00.000Z", sessionKey: "k1" },
          { action: "PAUSE", at: "2026-06-12T10:00:00.000Z", sessionKey: "k1" },
        ],
      },
      directionsSig: "NS 100 mL/hr",
      asOf: "2026-06-12T12:00:00.000Z",
    });
    expect(metrics.activeDurationLabel).toBe("2h");
    expect(metrics.volumeInfusedMl).toBe(200);
  });

  it("KVO shows no numeric volume in drawer metrics", () => {
    const metrics = resolveContinuousFluidDrawerMetrics({
      session: {
        sessionKey: "k1",
        status: "RUNNING",
        startedAt: "2026-06-12T08:00:00.000Z",
        pausedAt: null,
        resumedAt: null,
        stoppedAt: null,
        events: [{ action: "START", at: "2026-06-12T08:00:00.000Z", sessionKey: "k1" }],
      },
      directionsSig: "D5W 1000 mL at KVO",
      asOf: "2026-06-12T12:00:00.000Z",
    });
    expect(metrics.showNumericVolume).toBe(false);
    expect(metrics.volumeInfusedMl).toBeNull();
  });

  it("completed bolus shows duration and full volume", () => {
    const metrics = resolveFluidBolusDrawerMetrics({
      session: {
        sessionKey: "k1",
        status: "COMPLETED",
        startedAt: "2026-06-12T08:14:00.000Z",
        completedAt: "2026-06-12T08:47:00.000Z",
        bolusVolumeMl: 1000,
        events: [],
      },
    });
    expect(metrics.totalDurationLabel).toBe("33m");
    expect(metrics.volumeInfusedMl).toBe(1000);
  });
});
