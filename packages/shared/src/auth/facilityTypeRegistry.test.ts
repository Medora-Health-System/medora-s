import { describe, expect, it } from "vitest";
import {
  getDefaultServiceLinesForFacilityType,
  getFacilityTypeLabel,
  isMedoraFacilityType,
  MEDORA_FACILITY_TYPE_REGISTRY,
  normalizeFacilityType,
} from "./facilityTypeRegistry.js";

describe("facilityTypeRegistry (MEDUI.FACILITY.TYPE.1)", () => {
  it("defines all seven facility types", () => {
    expect(MEDORA_FACILITY_TYPE_REGISTRY.map((entry) => entry.code)).toEqual([
      "HOSPITAL",
      "FREESTANDING_ER",
      "URGENT_CARE",
      "CLINIC",
      "OUTSIDE_LABORATORY",
      "OUTSIDE_RADIOLOGY",
      "OUTSIDE_PHARMACY",
    ]);
  });

  it("freestanding ER defaults", () => {
    expect(getDefaultServiceLinesForFacilityType("FREESTANDING_ER")).toEqual([
      "EMERGENCY",
      "OBSERVATION",
      "LABORATORY",
      "RADIOLOGY",
    ]);
  });

  it("hospital defaults include inpatient lines and pharmacy", () => {
    const lines = getDefaultServiceLinesForFacilityType("HOSPITAL");
    expect(lines).toContain("ICU");
    expect(lines).toContain("MEDSURG");
    expect(lines).toContain("PHARMACY");
  });

  it("clinic defaults", () => {
    expect(getDefaultServiceLinesForFacilityType("CLINIC")).toEqual(["OBSERVATION", "LABORATORY"]);
  });

  it("outside lab/rad/pharmacy defaults", () => {
    expect(getDefaultServiceLinesForFacilityType("OUTSIDE_LABORATORY")).toEqual(["LABORATORY"]);
    expect(getDefaultServiceLinesForFacilityType("OUTSIDE_RADIOLOGY")).toEqual(["RADIOLOGY"]);
    expect(getDefaultServiceLinesForFacilityType("OUTSIDE_PHARMACY")).toEqual(["PHARMACY"]);
  });

  it("normalizes unknown facility type to CLINIC", () => {
    expect(normalizeFacilityType("unknown")).toBe("CLINIC");
  });

  it("labels in French", () => {
    expect(getFacilityTypeLabel("FREESTANDING_ER", "fr")).toBe("Urgences autonomes");
  });

  it("isMedoraFacilityType guard", () => {
    expect(isMedoraFacilityType("HOSPITAL")).toBe(true);
    expect(isMedoraFacilityType("NOT_A_TYPE")).toBe(false);
  });
});
