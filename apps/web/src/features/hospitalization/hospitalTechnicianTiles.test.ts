import { describe, expect, it } from "vitest";
import {
  getVisibleHospitalTechnicianTiles,
  isHospitalFloorTechnicianProfile,
} from "./hospitalTechnicianTiles";
import { HOSPITAL_TECHNICIAN_ALL_TILE_IDS, HOSPITAL_TECHNICIAN_FUTURE_TILE_IDS } from "./hospitalTechnicianTiles";

describe("hospitalTechnicianTiles (MEDUI.HOSP.TECH.1)", () => {
  it("exposes VITALS, NOTES, SUMMARY only (future placeholders not rendered)", () => {
    expect(HOSPITAL_TECHNICIAN_ALL_TILE_IDS).toEqual(["VITALS", "NOTES", "SUMMARY"]);
    expect(HOSPITAL_TECHNICIAN_FUTURE_TILE_IDS).toEqual(["TASKS", "FLOWSHEET"]);
  });

  it("ICU technician sees floor tiles", () => {
    const input = { roleCodes: ["LAB"], departmentCode: "ICU" };
    expect(isHospitalFloorTechnicianProfile(input)).toBe(true);
    expect(getVisibleHospitalTechnicianTiles(input)).toEqual(["VITALS", "NOTES", "SUMMARY"]);
  });

  it("Med-Surg technician via INPATIENT prisma code", () => {
    const input = { roleCodes: ["RADIOLOGY"], prismaDepartmentCode: "INPATIENT" };
    expect(isHospitalFloorTechnicianProfile(input)).toBe(true);
    expect(getVisibleHospitalTechnicianTiles(input)).toEqual(["VITALS", "NOTES", "SUMMARY"]);
  });

  it("does not expose MAR, Medical Exam, or Diagnostics tiles", () => {
    const tiles = getVisibleHospitalTechnicianTiles({
      roleCodes: ["LAB"],
      departmentCode: "PEDIATRICS",
    });
    expect(tiles).not.toContain("MEDICATIONS");
    expect(tiles).not.toContain("MEDICAL_EXAM");
    expect(tiles).not.toContain("DIAGNOSTICS");
    expect(tiles).not.toContain("MAR");
  });

  it("lab department technician is not a floor technician profile", () => {
    expect(
      isHospitalFloorTechnicianProfile({ roleCodes: ["LAB"], prismaDepartmentCode: "LAB" })
    ).toBe(false);
  });

  it("ED technician without floor department is not floor profile", () => {
    expect(isHospitalFloorTechnicianProfile({ roleCodes: ["LAB"] })).toBe(false);
  });
});
