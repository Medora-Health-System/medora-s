import { describe, expect, it } from "vitest";
import {
  INFUSION_START_MAR_NOTE_PREFIX,
  medicationAdministrationCountsAsCompletedAdministration,
  medicationAdministrationInfusionPhaseChipKind,
  medicationAdministrationRowIsInfusionStart,
  medicationAdministrationRowIsInfusionStop,
  medicationAdministrationRowIsInfusionTerminal,
} from "./medicationAdministrationInfusionMar.js";

describe("medicationAdministrationInfusionMar", () => {
  it("detects infusion start by phase or note prefix", () => {
    expect(medicationAdministrationRowIsInfusionStart(null, "INFUSION_START")).toBe(true);
    expect(medicationAdministrationRowIsInfusionStart(`${INFUSION_START_MAR_NOTE_PREFIX} (14:00)`)).toBe(true);
    expect(medicationAdministrationRowIsInfusionStart("Perfusion IV terminée — durée : 5 min")).toBe(false);
  });

  it("detects infusion stop by phase or terminal note", () => {
    expect(medicationAdministrationRowIsInfusionStop(null, "INFUSION_STOP")).toBe(true);
    expect(medicationAdministrationRowIsInfusionStop("Perfusion IV terminée — durée : 5 min")).toBe(true);
    expect(medicationAdministrationRowIsInfusionStop(`${INFUSION_START_MAR_NOTE_PREFIX}`)).toBe(false);
  });

  it("detects terminal infusion notes", () => {
    expect(medicationAdministrationRowIsInfusionTerminal("Perfusion IV terminée — durée : 45 min")).toBe(true);
    expect(medicationAdministrationRowIsInfusionTerminal("Routine dose")).toBe(false);
  });

  it("resolves phase chip kind for START and STOP only", () => {
    expect(
      medicationAdministrationInfusionPhaseChipKind({
        marAction: "administered",
        infusionPhase: "INFUSION_START",
      })
    ).toBe("start");
    expect(
      medicationAdministrationInfusionPhaseChipKind({
        marAction: "administered",
        infusionPhase: "INFUSION_STOP",
      })
    ).toBe("stop");
    expect(
      medicationAdministrationInfusionPhaseChipKind({ marAction: "administered", notes: "Action: Administré" })
    ).toBe(null);
  });

  it("excludes INFUSION_START from completed administration counts", () => {
    expect(
      medicationAdministrationCountsAsCompletedAdministration({
        marAction: "administered",
        infusionPhase: "INFUSION_START",
      })
    ).toBe(false);
    expect(
      medicationAdministrationCountsAsCompletedAdministration({
        marAction: "administered",
        infusionPhase: "INFUSION_STOP",
      })
    ).toBe(true);
    expect(
      medicationAdministrationCountsAsCompletedAdministration({
        marAction: "administered",
        notes: "Action: Administré",
      })
    ).toBe(true);
  });
});
