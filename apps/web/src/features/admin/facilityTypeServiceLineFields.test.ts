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
    });
    expect(dto.facilityType).toBe("FREESTANDING_ER");
    expect(dto.serviceLines).toContain("OBSERVATION");
  });
});
