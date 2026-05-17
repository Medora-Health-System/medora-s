import { describe, expect, it } from "vitest";
import { deriveObservationEncounterDisplayStatus } from "@medora/shared";
import { resolveObservationBoardDispositionModel } from "./observationBoardDisposition";

describe("resolveObservationBoardDispositionModel", () => {
  it("uses discharge packet tier when chart display status is DISCHARGE_IN_PROGRESS", () => {
    const model = resolveObservationBoardDispositionModel({
      status: "OPEN",
      type: "INPATIENT",
      admittedAt: "2026-05-16T08:00:00.000Z",
      dischargeSummaryJson: { dischargeMode: "Retour à domicile" },
    });
    expect(model).toEqual({ tier: "discharge_packet_active" });
  });

  it("returns null when observation encounter is discharged (closed)", () => {
    const model = resolveObservationBoardDispositionModel({
      status: "CLOSED",
      type: "INPATIENT",
      admittedAt: "2026-05-16T08:00:00.000Z",
      dischargedAt: "2026-05-17T10:00:00.000Z",
      dischargeSummaryJson: { dischargeMode: "Retour à domicile" },
    });
    expect(model).toBeNull();
  });

  it("aligns board disposition with chart display status for the same payload", () => {
    const payload = {
      type: "INPATIENT",
      status: "OPEN",
      admittedAt: "2026-05-16T08:00:00.000Z",
      dischargeSummaryJson: { dischargeMode: "Retour à domicile" },
    };
    const display = deriveObservationEncounterDisplayStatus(payload);
    const board = resolveObservationBoardDispositionModel(payload);
    expect(display.phase).toBe("DISCHARGE_IN_PROGRESS");
    expect(board).toEqual({ tier: "discharge_packet_active" });
  });
});
