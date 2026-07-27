import { describe, expect, it } from "vitest";
import {
  facilityHasServiceLine,
  facilitySupportsObservationAccessForTechnician,
  parseStoredFacilityServiceLines,
  resolveFacilityServiceLines,
} from "./facilityServiceLines.js";

describe("facilityServiceLines (MEDUI.FACILITY.TYPE.1)", () => {
  it("uses configured service lines when valid", () => {
    expect(
      resolveFacilityServiceLines({
        facilityType: "CLINIC",
        configuredServiceLines: ["EMERGENCY", "LABORATORY"],
      })
    ).toEqual(["EMERGENCY", "LABORATORY"]);
  });

  it("falls back to facility type defaults", () => {
    expect(resolveFacilityServiceLines({ facilityType: "FREESTANDING_ER" })).toEqual([
      "EMERGENCY",
      "OBSERVATION",
      "LABORATORY",
      "RADIOLOGY",
    ]);
  });

  it("NULL stored JSON + FREESTANDING_ER uses type defaults (Wayne UC Railway case)", () => {
    const stored = parseStoredFacilityServiceLines(null);
    expect(stored).toBeNull();
    expect(
      resolveFacilityServiceLines({
        facilityType: "FREESTANDING_ER",
        configuredServiceLines: stored,
      })
    ).toEqual(["EMERGENCY", "OBSERVATION", "LABORATORY", "RADIOLOGY"]);
  });

  it("normalizes legacy LAB/RAD/INPATIENT tokens", () => {
    expect(
      resolveFacilityServiceLines({
        facilityType: "CLINIC",
        configuredServiceLines: ["LAB", "RAD", "INPATIENT"],
      })
    ).toEqual(["MEDSURG", "LABORATORY", "RADIOLOGY"]);
  });

  it("dedupes and preserves registry order", () => {
    expect(
      resolveFacilityServiceLines({
        facilityType: "HOSPITAL",
        configuredServiceLines: ["RADIOLOGY", "EMERGENCY", "RADIOLOGY", "LABORATORY"],
      })
    ).toEqual(["EMERGENCY", "LABORATORY", "RADIOLOGY"]);
  });

  it("unknown facility type uses clinic defaults", () => {
    expect(resolveFacilityServiceLines({ facilityType: "NOT_REAL" })).toEqual([
      "CLINIC",
      "LABORATORY",
    ]);
  });

  it("clinic type defaults are ambulatory Clinic + Laboratory (MEDUI.D4C.1)", () => {
    expect(resolveFacilityServiceLines({ facilityType: "CLINIC" })).toEqual([
      "CLINIC",
      "LABORATORY",
    ]);
  });

  it("urgent care type defaults are ambulatory (MEDUI.D4C.1)", () => {
    expect(resolveFacilityServiceLines({ facilityType: "URGENT_CARE" })).toEqual([
      "URGENT_CARE",
      "LABORATORY",
      "RADIOLOGY",
    ]);
  });

  it("parses stored JSON service lines", () => {
    expect(parseStoredFacilityServiceLines(["EMERGENCY", "LAB"])).toEqual(["EMERGENCY", "LABORATORY"]);
  });

  it("facilityHasServiceLine helper", () => {
    expect(
      facilityHasServiceLine({
        facilityType: "OUTSIDE_LABORATORY",
        serviceLine: "LABORATORY",
      })
    ).toBe(true);
    expect(
      facilityHasServiceLine({
        facilityType: "OUTSIDE_LABORATORY",
        serviceLine: "EMERGENCY",
      })
    ).toBe(false);
  });

  it("freestanding ER lab tech gets observation hospital access", () => {
    expect(
      facilitySupportsObservationAccessForTechnician({
        facilityType: "FREESTANDING_ER",
        professionGroup: "TECHNICIAN",
        departmentCode: "LABORATORY",
        roleCodes: ["LAB"],
      })
    ).toBe(true);
  });

  it("freestanding ER rad tech gets observation hospital access", () => {
    expect(
      facilitySupportsObservationAccessForTechnician({
        facilityType: "FREESTANDING_ER",
        professionGroup: "TECHNICIAN",
        departmentCode: "RADIOLOGY",
        roleCodes: ["RADIOLOGY"],
      })
    ).toBe(true);
  });

  it("hospital lab tech does not use freestanding observation rule", () => {
    expect(
      facilitySupportsObservationAccessForTechnician({
        facilityType: "HOSPITAL",
        professionGroup: "TECHNICIAN",
        departmentCode: "LABORATORY",
        roleCodes: ["LAB"],
      })
    ).toBe(false);
  });
});
