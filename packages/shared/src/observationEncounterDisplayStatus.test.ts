import { describe, expect, it } from "vitest";
import { deriveObservationEncounterDisplayStatus } from "./observationEncounterDisplayStatus.js";

describe("observationEncounterDisplayStatus", () => {
  it("returns DISCHARGED when observation encounter is closed", () => {
    const s = deriveObservationEncounterDisplayStatus({
      type: "INPATIENT",
      status: "CLOSED",
      admittedAt: "2026-05-16T08:00:00.000Z",
      dischargedAt: "2026-05-17T10:00:00.000Z",
      dischargeSummaryJson: { dischargeMode: "Retour à domicile" },
    });
    expect(s.phase).toBe("DISCHARGED");
    expect(s.dischargeMode).toBe("Retour à domicile");
  });

  it("returns DISCHARGE_IN_PROGRESS when discharge packet saved but encounter still open", () => {
    const s = deriveObservationEncounterDisplayStatus({
      type: "INPATIENT",
      status: "OPEN",
      admittedAt: "2026-05-16T08:00:00.000Z",
      dischargeSummaryJson: { dischargeMode: "Retour à domicile" },
    });
    expect(s.phase).toBe("DISCHARGE_IN_PROGRESS");
    expect(s.phase).not.toBe("ACTIVE");
  });

  it("returns ACTIVE for open observation without discharge packet", () => {
    const s = deriveObservationEncounterDisplayStatus({
      type: "INPATIENT",
      status: "OPEN",
      admittedAt: "2026-05-16T08:00:00.000Z",
    });
    expect(s.phase).toBe("ACTIVE");
  });

  it("does not report ACTIVE when discharge packet exists on open encounter", () => {
    const s = deriveObservationEncounterDisplayStatus({
      type: "INPATIENT",
      status: "OPEN",
      admittedAt: "2026-05-16T08:00:00.000Z",
      dischargeSummaryJson: { dischargeMode: "Retour à domicile" },
    });
    expect(s.phase).not.toBe("ACTIVE");
  });
});
