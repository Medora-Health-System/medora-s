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
});
