import {
  hasMeaningfulVitalMeasurement,
  resolveLatestMeaningfulVitalsReading,
} from "@medora/shared";

describe("API meaningful vitals gate", () => {
  it("rejects context-only payloads that previously created empty Current rows", () => {
    expect(hasMeaningfulVitalMeasurement({ oxygenDevice: "ROOM_AIR" })).toBe(false);
    expect(
      hasMeaningfulVitalMeasurement({
        oxygenDevice: "ROOM_AIR",
        recordingContext: "TRIAGE",
        temperatureSite: "ORAL",
      })
    ).toBe(false);
  });

  it("accepts pain score 0 and populated clinical sets", () => {
    expect(hasMeaningfulVitalMeasurement({ painScore: 0 })).toBe(true);
    expect(
      hasMeaningfulVitalMeasurement({
        bpSys: 134,
        bpDia: 78,
        hr: 85,
        rr: 16,
        tempC: 36.1,
        spo2: 100,
        weightKg: 79.8,
        oxygenDevice: "ROOM_AIR",
      })
    ).toBe(true);
  });

  it("latest resolver ignores empty and voided", () => {
    const nowMs = Date.UTC(2026, 6, 15, 14, 0, 0);
    const latest = resolveLatestMeaningfulVitalsReading(
      [
        {
          id: "empty",
          status: "ACTIVE",
          measuredAt: "2026-07-15T12:00:00.000Z",
          recordedAt: "2026-07-15T12:00:01.000Z",
          vitalsJson: { oxygenDevice: "ROOM_AIR" },
        },
        {
          id: "good",
          status: "ACTIVE",
          measuredAt: "2026-07-15T11:00:00.000Z",
          recordedAt: "2026-07-15T11:00:01.000Z",
          vitalsJson: { hr: 85 },
        },
      ],
      { nowMs }
    );
    expect(latest?.id).toBe("good");
  });
});
