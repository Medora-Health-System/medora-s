import { describe, expect, it } from "vitest";
import {
  hasMeaningfulVitalMeasurement,
  pickLatestMeaningfulVitalsSnapshot,
  type PatientTriageVitalsSnapshot,
} from "@/lib/patientVitals";
import { snapshotKey } from "@/lib/patientVitals";

function snap(
  partial: Partial<PatientTriageVitalsSnapshot> & {
    readingId: string;
    vitalsJson: Record<string, unknown>;
    measuredAt: string;
  }
): PatientTriageVitalsSnapshot {
  return {
    encounterId: "enc-1",
    encounterType: "EMERGENCY",
    triageId: "t1",
    updatedAt: partial.measuredAt,
    triageCompleteAt: null,
    recordedAt: partial.recordedAt ?? partial.measuredAt,
    status: partial.status ?? "ACTIVE",
    recordedByUserId: partial.recordedByUserId ?? "user-1",
    recordedByDisplayName: partial.recordedByDisplayName ?? "Ashby Chadis",
    recordedByInitials: partial.recordedByInitials ?? "AC",
    recordedByRole: partial.recordedByRole ?? "RN",
    ...partial,
  };
}

describe("latest meaningful vitals projection", () => {
  it("TEST A — populated reading remains current after later Room-air-only row", () => {
    const base = Date.now() - 60 * 60 * 1000;
    const populated = snap({
      readingId: "r-pop",
      measuredAt: new Date(base).toISOString(),
      recordedAt: new Date(base + 5000).toISOString(),
      vitalsJson: {
        bpSys: 134,
        bpDia: 78,
        hr: 85,
        rr: 16,
        tempC: 36.1,
        spo2: 100,
        weightKg: 79.8,
        temperatureSite: "AXILLARY",
        oxygenDevice: "ROOM_AIR",
      },
      recordedByInitials: "AC",
      recordedByDisplayName: "Ashby Chadis",
    });
    const emptyLater = snap({
      readingId: "r-empty",
      measuredAt: new Date(base + 10 * 60 * 1000).toISOString(),
      recordedAt: new Date(base + 10 * 60 * 1000 + 5000).toISOString(),
      vitalsJson: { oxygenDevice: "ROOM_AIR" },
    });
    const latest = pickLatestMeaningfulVitalsSnapshot([emptyLater, populated]);
    expect(latest?.readingId).toBe("r-pop");
    expect(hasMeaningfulVitalMeasurement(emptyLater.vitalsJson)).toBe(false);
    expect(snapshotKey(latest!)).toContain("r-pop");
  });

  it("TEST C — room air alone is not meaningful", () => {
    expect(hasMeaningfulVitalMeasurement({ oxygenDevice: "ROOM_AIR" })).toBe(false);
    expect(hasMeaningfulVitalMeasurement({ temperatureSite: "ORAL", oxygenDevice: "ROOM_AIR" })).toBe(
      false
    );
  });

  it("TEST F — attribution fields survive snapshot pick", () => {
    const latest = pickLatestMeaningfulVitalsSnapshot([
      snap({
        readingId: "r1",
        measuredAt: new Date(Date.now() - 60_000).toISOString(),
        vitalsJson: { hr: 72 },
        recordedByUserId: "u-ashby",
        recordedByDisplayName: "Ashby Chadis",
        recordedByInitials: "AC",
        recordedByRole: "RN",
      }),
    ]);
    expect(latest?.recordedByInitials).toBe("AC");
    expect(latest?.recordedByDisplayName).toBe("Ashby Chadis");
    expect(latest?.recordedByRole).toBe("RN");
  });
});
