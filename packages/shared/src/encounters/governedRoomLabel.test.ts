import { describe, expect, it } from "vitest";
import {
  buildRoomLabelForStorage,
  extractRoomInputFromStorage,
  formatGovernedRoomDisplay,
  parseGovernedRoomStorage,
  resolveEncounterCareUnit,
  normalizeEncounterRoomUnitCodeInput,
} from "./governedRoomLabel.js";

describe("governedRoomLabel (K.10B.10)", () => {
  it("formats ED room label as ED-4", () => {
    expect(
      formatGovernedRoomDisplay({
        roomLabel: "4",
        encounterType: "EMERGENCY",
      }).display
    ).toBe("ED-4");
  });

  it("formats ICU room label as ICU-4", () => {
    expect(
      formatGovernedRoomDisplay({
        roomLabel: "ICU-4",
        encounterType: "INPATIENT",
        unitCode: "ICU",
      }).display
    ).toBe("ICU-4");
  });

  it("formats MS room label as MS-4", () => {
    expect(
      formatGovernedRoomDisplay({
        roomLabel: "4",
        encounterType: "INPATIENT",
      }).display
    ).toBe("MS-4");
  });

  it("formats OBS room label as OBS-4", () => {
    expect(
      formatGovernedRoomDisplay({
        roomLabel: "OBS-4",
        encounterType: "INPATIENT",
        unitCode: "OBS",
      }).display
    ).toBe("OBS-4");
  });

  it("formats unknown unit as Room 4", () => {
    expect(
      formatGovernedRoomDisplay({
        roomLabel: "4",
        encounterType: "OUTPATIENT",
      }).display
    ).toBe("Room 4");
  });

  it("returns empty room label as No room assigned", () => {
    expect(
      formatGovernedRoomDisplay({
        roomLabel: null,
        encounterType: "EMERGENCY",
        emptyLabel: "No room assigned",
      }).display
    ).toBe("No room assigned");
  });

  it("stores ED room without prefix and inpatient with prefix", () => {
    expect(
      buildRoomLabelForStorage({ room: "4", unitCode: "ED", encounterType: "EMERGENCY" })
    ).toBe("4");
    expect(
      buildRoomLabelForStorage({ room: "4", unitCode: "MS", encounterType: "INPATIENT" })
    ).toBe("MS-4");
  });

  it("parses prefixed storage and extracts room input", () => {
    expect(parseGovernedRoomStorage("MS-4").roomNumber).toBe("4");
    expect(extractRoomInputFromStorage("ED-4", "ED")).toBe("4");
    expect(extractRoomInputFromStorage("MS-4", "MS")).toBe("4");
  });

  it("resolveEncounterCareUnit maps service unit tokens", () => {
    expect(
      resolveEncounterCareUnit({
        encounterType: "INPATIENT",
        serviceUnit: "ICU",
      })
    ).toBe("ICU");
    expect(
      resolveEncounterCareUnit({
        encounterType: "EMERGENCY",
      })
    ).toBe("ED");
  });

  it("normalizeEncounterRoomUnitCodeInput maps aliases", () => {
    expect(normalizeEncounterRoomUnitCodeInput("EMERGENCY")).toBe("ED");
    expect(normalizeEncounterRoomUnitCodeInput("ER")).toBe("ED");
    expect(normalizeEncounterRoomUnitCodeInput("MED_SURG")).toBe("MS");
    expect(normalizeEncounterRoomUnitCodeInput("OBSERVATION")).toBe("OBS");
    expect(normalizeEncounterRoomUnitCodeInput(null)).toBeNull();
  });
});
