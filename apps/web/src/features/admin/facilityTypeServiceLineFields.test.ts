import { describe, expect, it } from "vitest";
import {
  emptyFacilityTypeServiceLineForm,
  facilityTypeServiceLineFormToDto,
} from "@/components/admin/FacilityTypeServiceLineFields";
import { getDefaultServiceLinesForFacilityType } from "@medora/shared";

describe("FacilityTypeServiceLineFields (MEDUI.FACILITY.TYPE.1)", () => {
  it("defaults clinic service lines from empty form", () => {
    const form = emptyFacilityTypeServiceLineForm();
    expect(form.facilityType).toBe("CLINIC");
    expect(form.serviceLines).toEqual(getDefaultServiceLinesForFacilityType("CLINIC"));
  });

  it("maps form state to create DTO fragment", () => {
    const dto = facilityTypeServiceLineFormToDto({
      facilityType: "FREESTANDING_ER",
      serviceLines: ["EMERGENCY", "OBSERVATION", "LABORATORY", "RADIOLOGY"],
      serviceLinesTouched: true,
      dentalSpecialties: [],
    });
    expect(dto.facilityType).toBe("FREESTANDING_ER");
    expect(dto.serviceLines).toContain("OBSERVATION");
    expect(dto.dentalSpecialties).toEqual([]);
  });

  it("includes dental specialties only when DENTAL service line is enabled", () => {
    const dto = facilityTypeServiceLineFormToDto({
      facilityType: "CLINIC",
      serviceLines: ["CLINIC", "DENTAL", "LABORATORY"],
      serviceLinesTouched: true,
      dentalSpecialties: ["GENERAL_DENTISTRY", "ORTHODONTICS"],
    });
    expect(dto.serviceLines).toContain("DENTAL");
    expect(dto.dentalSpecialties).toEqual(["GENERAL_DENTISTRY", "ORTHODONTICS"]);
  });
});
