import { describe, expect, it } from "vitest";
import {
  isHospitalFloorDepartmentCode,
  resolveHospitalTechnicianWorkspace,
} from "./hospitalTechnicianWorkspace";

describe("hospitalTechnicianWorkspace (MEDUI.HOSP.TECH.1)", () => {
  it("maps floor departments to workspace types", () => {
    expect(resolveHospitalTechnicianWorkspace("ICU")).toBe("ICU");
    expect(resolveHospitalTechnicianWorkspace("MEDSURG")).toBe("MEDSURG");
    expect(resolveHospitalTechnicianWorkspace("OBGYN")).toBe("OBGYN");
    expect(resolveHospitalTechnicianWorkspace("PEDIATRICS")).toBe("PEDIATRICS");
    expect(resolveHospitalTechnicianWorkspace("OBSERVATION")).toBe("OBSERVATION");
    expect(resolveHospitalTechnicianWorkspace("TELEMETRY")).toBe("TELEMETRY");
  });

  it("falls back to MEDSURG for unknown department", () => {
    expect(resolveHospitalTechnicianWorkspace(null)).toBe("MEDSURG");
    expect(resolveHospitalTechnicianWorkspace("EMERGENCY")).toBe("MEDSURG");
    expect(resolveHospitalTechnicianWorkspace("LABORATORY")).toBe("MEDSURG");
  });

  it("recognizes hospital floor department codes", () => {
    expect(isHospitalFloorDepartmentCode("ICU")).toBe(true);
    expect(isHospitalFloorDepartmentCode("telemetry")).toBe(true);
    expect(isHospitalFloorDepartmentCode("EMERGENCY")).toBe(false);
  });
});
