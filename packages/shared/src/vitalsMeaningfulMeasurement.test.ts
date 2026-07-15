import { describe, expect, it } from "vitest";
import {
  hasMeaningfulVitalMeasurement,
  resolveLatestMeaningfulVitalsReading,
} from "./vitalsMeaningfulMeasurement.js";

describe("hasMeaningfulVitalMeasurement", () => {
  it("rejects empty, room air alone, site alone, and recordingContext alone", () => {
    expect(hasMeaningfulVitalMeasurement(null)).toBe(false);
    expect(hasMeaningfulVitalMeasurement({})).toBe(false);
    expect(hasMeaningfulVitalMeasurement({ oxygenDevice: "ROOM_AIR" })).toBe(false);
    expect(hasMeaningfulVitalMeasurement({ temperatureSite: "ORAL" })).toBe(false);
    expect(
      hasMeaningfulVitalMeasurement({
        oxygenDevice: "ROOM_AIR",
        recordingContext: "NURSING_DISCHARGE",
      })
    ).toBe(false);
  });

  it("accepts each clinical measurement including pain 0", () => {
    expect(hasMeaningfulVitalMeasurement({ hr: 72 })).toBe(true);
    expect(hasMeaningfulVitalMeasurement({ tempC: 36.8 })).toBe(true);
    expect(hasMeaningfulVitalMeasurement({ bpSys: 120 })).toBe(true);
    expect(hasMeaningfulVitalMeasurement({ spo2: 98 })).toBe(true);
    expect(hasMeaningfulVitalMeasurement({ painScore: 0 })).toBe(true);
    expect(hasMeaningfulVitalMeasurement({ medoraErTriageV1: { painScale0to10: "0" } })).toBe(true);
  });
});

describe("resolveLatestMeaningfulVitalsReading", () => {
  const nowMs = Date.UTC(2026, 6, 15, 12, 0, 0);

  it("skips voided and context-only rows", () => {
    const latest = resolveLatestMeaningfulVitalsReading(
      [
        {
          id: "empty",
          status: "ACTIVE",
          measuredAt: "2026-07-15T10:00:00.000Z",
          recordedAt: "2026-07-15T10:00:01.000Z",
          vitalsJson: { oxygenDevice: "ROOM_AIR" },
        },
        {
          id: "voided",
          status: "VOIDED",
          measuredAt: "2026-07-15T11:00:00.000Z",
          recordedAt: "2026-07-15T11:00:01.000Z",
          vitalsJson: { hr: 90 },
        },
        {
          id: "good",
          status: "ACTIVE",
          measuredAt: "2026-07-15T09:00:00.000Z",
          recordedAt: "2026-07-15T09:00:01.000Z",
          vitalsJson: { hr: 85, bpSys: 134, bpDia: 78 },
        },
      ],
      { nowMs }
    );
    expect(latest?.id).toBe("good");
  });

  it("orders by measuredAt then recordedAt", () => {
    const latest = resolveLatestMeaningfulVitalsReading(
      [
        {
          id: "a",
          status: "ACTIVE",
          measuredAt: "2026-07-15T09:00:00.000Z",
          recordedAt: "2026-07-15T09:05:00.000Z",
          vitalsJson: { hr: 70 },
        },
        {
          id: "b",
          status: "ACTIVE",
          measuredAt: "2026-07-15T09:00:00.000Z",
          recordedAt: "2026-07-15T09:10:00.000Z",
          vitalsJson: { hr: 71 },
        },
      ],
      { nowMs }
    );
    expect(latest?.id).toBe("b");
  });
});
