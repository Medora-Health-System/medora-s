import { describe, expect, it } from "vitest";
import { snapshotsToVitalSummaryReadings } from "@/components/patients/VitalSummaryPanel";

describe("VitalSummaryPanel pain column", () => {
  it("shows pain from vitalsJson.painScore and legacy medoraErTriageV1", () => {
    const fromScore = snapshotsToVitalSummaryReadings(
      [
        {
          triageId: "t1",
          encounterId: "enc-1",
          encounterType: "EMERGENCY",
          updatedAt: "2026-07-02T12:00:00.000Z",
          triageCompleteAt: "2026-07-02T12:00:00.000Z",
          vitalsJson: { hr: 88, painScore: 8 },
        },
      ],
      "en"
    );
    expect(fromScore[0]?.pain).toBe("8/10");

    const fromLegacy = snapshotsToVitalSummaryReadings(
      [
        {
          triageId: "t2",
          encounterId: "enc-1",
          encounterType: "EMERGENCY",
          updatedAt: "2026-07-02T12:00:00.000Z",
          triageCompleteAt: "2026-07-02T12:00:00.000Z",
          vitalsJson: { hr: 90, medoraErTriageV1: { painScale0to10: 5 } },
        },
      ],
      "en"
    );
    expect(fromLegacy[0]?.pain).toBe("5/10");
  });

  it("surfaces server BY initials and safe legacy fallback", () => {
    const withAttr = snapshotsToVitalSummaryReadings(
      [
        {
          triageId: "t3",
          readingId: "r1",
          encounterId: "enc-1",
          encounterType: "EMERGENCY",
          updatedAt: "2026-07-02T12:00:00.000Z",
          measuredAt: "2026-07-02T11:55:00.000Z",
          triageCompleteAt: null,
          vitalsJson: {
            hr: 72,
            tempC: 37,
            temperatureSite: "ORAL",
            oxygenDevice: "ROOM_AIR",
            spo2: 98,
          },
          recordedByDisplayName: "Ashby Chadis",
          recordedByInitials: "AC",
          recordedByRole: "RN",
        },
      ],
      "en",
      (k) =>
        ({
          "vitalsContext.temperatureSite.ORAL": "Oral",
          "vitalsContext.oxygenDevice.ROOM_AIR": "Room air",
          "vitalsContext.enteredByTitle": "Entered by {name}, {role}",
          "vitalsContext.enteredByUnknown": "Entered by unknown user",
          "vitalsContext.flowUnitShort": "L/min",
          "vitalsContext.fio2Short": "FiO₂",
        } as Record<string, string>)[k] ?? k
    );
    expect(withAttr[0]?.byInitials).toBe("AC");
    expect(withAttr[0]?.byTitle).toContain("Ashby Chadis");
    expect(withAttr[0]?.temp).toContain("Oral");
    expect(withAttr[0]?.spo2).toContain("Room air");

    const legacy = snapshotsToVitalSummaryReadings(
      [
        {
          triageId: "t4",
          encounterId: "enc-1",
          encounterType: "EMERGENCY",
          updatedAt: "2026-07-02T12:00:00.000Z",
          triageCompleteAt: null,
          vitalsJson: { hr: 70 },
        },
      ],
      "en"
    );
    expect(legacy[0]?.byInitials).toBe("—");
  });
});
