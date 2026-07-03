import { describe, expect, it } from "vitest";
import {
  dedupeClinicalRecordVitalRows,
  parseVitalsJsonColumns,
  projectClinicalRecordVitalRow,
} from "./clinicalRecordVitalsProjection.js";

describe("clinicalRecordVitalsProjection", () => {
  it("parses structured vitals columns from vitalsJson", () => {
    const columns = parseVitalsJsonColumns({
      bpSys: 120,
      bpDia: 80,
      hr: 88,
      rr: 18,
      spo2: 98,
      tempC: 37.1,
      painScore: 3,
      weightKg: 72,
      heightCm: 175,
    });
    expect(columns.bloodPressure).toBe("120/80");
    expect(columns.heartRate).toBe("88");
    expect(columns.pain).toBe("3");
    expect(columns.weight).toBe("72");
    expect(columns.height).toBe("175");
  });

  it("projects triage vitals with attribution and pain", () => {
    const row = projectClinicalRecordVitalRow(
      {
        id: "triage-vitals",
        recordedAt: "2026-07-02T17:32:00.000Z",
        source: "TRIAGE",
        vitalsJson: { bpSys: 118, bpDia: 76, hr: 90, painScore: 4 },
        documentedByDisplayName: "Martine Duval",
        documentedByRole: "RN",
      },
      0
    );
    expect(row?.bloodPressure).toBe("118/76");
    expect(row?.pain).toBe("4");
    expect(row?.documentedBy.name).toBe("Martine Duval");
  });

  it("backfills pain from legacy medoraErTriageV1.painScale0to10", () => {
    const columns = parseVitalsJsonColumns({
      hr: 88,
      medoraErTriageV1: { painScale0to10: 6 },
    });
    expect(columns.pain).toBe("6");
  });

  it("dedupes vitals rows by time and summary", () => {
    const rows = dedupeClinicalRecordVitalRows([
      {
        id: "a",
        recordedAt: "2026-07-02T18:00:00.000Z",
        source: "ENCOUNTER_CHART",
        summary: "BP 120/80 · HR 88",
        bloodPressure: "120/80",
        heartRate: "88",
        respiratoryRate: null,
        spo2: null,
        temperatureCelsius: null,
        weight: null,
        height: null,
        pain: null,
        documentedBy: { name: "RN", role: null, at: "2026-07-02T18:00:00.000Z", initials: null },
      },
      {
        id: "b",
        recordedAt: "2026-07-02T18:00:00.000Z",
        source: "ENCOUNTER_CHART",
        summary: "BP 120/80 · HR 88",
        bloodPressure: "120/80",
        heartRate: "88",
        respiratoryRate: null,
        spo2: null,
        temperatureCelsius: null,
        weight: null,
        height: null,
        pain: null,
        documentedBy: { name: "RN", role: null, at: "2026-07-02T18:00:00.000Z", initials: null },
      },
    ]);
    expect(rows).toHaveLength(1);
  });
});
