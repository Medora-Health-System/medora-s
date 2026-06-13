import { describe, expect, it } from "vitest";
import {
  isClinicalDepartmentCode,
  mapPrismaDepartmentCodeToClinical,
  resolveDepartmentCode,
} from "./departmentResolver.js";

describe("departmentResolver (MEDUI.AUTH.ROLE.1)", () => {
  it("accepts explicit clinical department codes", () => {
    expect(resolveDepartmentCode({ departmentCode: "ICU" })).toBe("ICU");
    expect(resolveDepartmentCode({ departmentCode: "emergency" })).toBe("EMERGENCY");
    expect(isClinicalDepartmentCode("LABORATORY")).toBe(true);
    expect(isClinicalDepartmentCode("INVALID")).toBe(false);
  });

  it("maps Prisma department codes to clinical taxonomy", () => {
    expect(mapPrismaDepartmentCodeToClinical("LAB")).toBe("LABORATORY");
    expect(mapPrismaDepartmentCodeToClinical("RAD")).toBe("RADIOLOGY");
    expect(mapPrismaDepartmentCodeToClinical("INPATIENT")).toBe("MEDSURG");
    expect(mapPrismaDepartmentCodeToClinical("PRIMARY_CARE")).toBe("OBSERVATION");
    expect(mapPrismaDepartmentCodeToClinical("PHARM")).toBeNull();
  });

  it("prefers explicit department over Prisma mapping", () => {
    expect(
      resolveDepartmentCode({
        departmentCode: "EMERGENCY",
        prismaDepartmentCode: "LAB",
      })
    ).toBe("EMERGENCY");
  });

  it("infers LABORATORY / RADIOLOGY from legacy role codes in GENERAL context", () => {
    expect(resolveDepartmentCode({ roleCodes: ["LAB"], clinicalWorkspace: "GENERAL" })).toBe(
      "LABORATORY"
    );
    expect(
      resolveDepartmentCode({ roleCodes: ["RADIOLOGY"], clinicalWorkspace: "GENERAL" })
    ).toBe("RADIOLOGY");
  });

  it("infers EMERGENCY for clinical roles in ED workspace when unassigned (backward compat)", () => {
    expect(resolveDepartmentCode({ roleCodes: ["LAB"], clinicalWorkspace: "ED" })).toBe(
      "EMERGENCY"
    );
    expect(resolveDepartmentCode({ roleCodes: ["RADIOLOGY"], clinicalWorkspace: "ED" })).toBe(
      "EMERGENCY"
    );
    expect(resolveDepartmentCode({ roleCodes: ["RN"], clinicalWorkspace: "ED" })).toBe("EMERGENCY");
    expect(resolveDepartmentCode({ roleCodes: ["PROVIDER"], clinicalWorkspace: "ED" })).toBe(
      "EMERGENCY"
    );
  });

  it("returns null when department cannot be resolved", () => {
    expect(resolveDepartmentCode({ roleCodes: ["BILLING"] })).toBeNull();
    expect(resolveDepartmentCode({})).toBeNull();
  });
});
