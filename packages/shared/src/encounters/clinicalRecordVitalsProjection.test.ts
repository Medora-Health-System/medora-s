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

  it("prefers vitals row with richer attribution on duplicate key", () => {
    const rows = dedupeClinicalRecordVitalRows([
      {
        id: "without",
        recordedAt: "2026-07-02T18:00:00.000Z",
        source: "TRIAGE",
        summary: "BP 147/86 · HR 87",
        bloodPressure: "147/86",
        heartRate: "87",
        respiratoryRate: "19",
        spo2: "100",
        temperatureCelsius: "36.7",
        weight: "71.67",
        height: "170.2",
        pain: "8",
        documentedBy: { name: null, role: null, at: "2026-07-02T18:00:00.000Z", initials: null },
      },
      {
        id: "with",
        recordedAt: "2026-07-02T18:00:00.000Z",
        source: "TRIAGE",
        summary: "BP 147/86 · HR 87",
        bloodPressure: "147/86",
        heartRate: "87",
        respiratoryRate: "19",
        spo2: "100",
        temperatureCelsius: "36.7",
        weight: "71.67",
        height: "170.2",
        pain: "8",
        documentedBy: {
          name: "Martine Duval",
          role: "RN",
          at: "2026-07-02T18:00:00.000Z",
          initials: null,
        },
      },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.documentedBy.name).toBe("Martine Duval");
    expect(rows[0]?.documentedBy.role).toBe("RN");
  });

  it("maps recordedBy.displayName and createdByDisplay.name for projection", () => {
    const fromRecordedBy = projectClinicalRecordVitalRow(
      {
        id: "v1",
        recordedAt: "2026-07-02T18:00:00.000Z",
        source: "ENCOUNTER_CHART",
        vitalsJson: { bpSys: 120, bpDia: 80, hr: 88 },
        recordedBy: { displayName: "Bedside RN", role: "RN" },
      },
      0
    );
    expect(fromRecordedBy?.documentedBy.name).toBe("Bedside RN");
    expect(fromRecordedBy?.documentedBy.role).toBe("RN");

    const fromCreatedBy = projectClinicalRecordVitalRow(
      {
        id: "v2",
        recordedAt: "2026-07-02T19:00:00.000Z",
        source: "ENCOUNTER_CHART",
        vitalsJson: { bpSys: 118, bpDia: 76, hr: 90 },
        createdByDisplay: { name: "Quick Entry RN", role: "RN" },
      },
      1
    );
    expect(fromCreatedBy?.documentedBy.name).toBe("Quick Entry RN");
  });
});
