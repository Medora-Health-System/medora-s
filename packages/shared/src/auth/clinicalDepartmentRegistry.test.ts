import { describe, expect, it } from "vitest";
import {
  CLINICAL_DEPARTMENT_REGISTRY,
  getClinicalDepartmentLabel,
  isClinicalDepartmentCode,
  mapClinicalDepartmentCodeToPrismaDepartmentCode,
  mapLegacyPrismaDepartmentCodeToClinicalDepartment,
  resolveClinicalDepartmentArea,
} from "./clinicalDepartmentRegistry.js";

describe("clinicalDepartmentRegistry (MEDUI.AUTH.ROLE.3)", () => {
  it("defines all ten clinical departments", () => {
    expect(CLINICAL_DEPARTMENT_REGISTRY.map((d) => d.code)).toEqual([
      "EMERGENCY",
      "ICU",
      "MEDSURG",
      "OBSERVATION",
      "OBGYN",
      "PEDIATRICS",
      "BEHAVIORAL_HEALTH",
      "TELEMETRY",
      "LABORATORY",
      "RADIOLOGY",
    ]);
  });

  it("maps legacy Prisma codes to clinical taxonomy", () => {
    expect(mapLegacyPrismaDepartmentCodeToClinicalDepartment("LAB")).toBe("LABORATORY");
    expect(mapLegacyPrismaDepartmentCodeToClinicalDepartment("RAD")).toBe("RADIOLOGY");
    expect(mapLegacyPrismaDepartmentCodeToClinicalDepartment("INPATIENT")).toBe("MEDSURG");
    expect(mapLegacyPrismaDepartmentCodeToClinicalDepartment("PRIMARY_CARE")).toBe("OBSERVATION");
    expect(mapLegacyPrismaDepartmentCodeToClinicalDepartment("PHARM")).toBeNull();
  });

  it("accepts expanded clinical enum values directly", () => {
    expect(mapLegacyPrismaDepartmentCodeToClinicalDepartment("ICU")).toBe("ICU");
    expect(mapLegacyPrismaDepartmentCodeToClinicalDepartment("EMERGENCY")).toBe("EMERGENCY");
    expect(mapLegacyPrismaDepartmentCodeToClinicalDepartment("PEDIATRICS")).toBe("PEDIATRICS");
  });

  it("returns French labels by default for product UI", () => {
    expect(getClinicalDepartmentLabel("ICU", "fr")).toBe("Soins intensifs");
    expect(getClinicalDepartmentLabel("EMERGENCY", "en")).toBe("Emergency Department");
  });

  it("resolves navigation areas for workspace routing", () => {
    expect(resolveClinicalDepartmentArea("EMERGENCY")).toBe("EMERGENCY");
    expect(resolveClinicalDepartmentArea("ICU")).toBe("HOSPITAL");
    expect(resolveClinicalDepartmentArea("LABORATORY")).toBe("LABORATORY");
    expect(resolveClinicalDepartmentArea("RADIOLOGY")).toBe("RADIOLOGY");
  });

  it("maps clinical codes to Prisma enum 1:1 after migration", () => {
    for (const entry of CLINICAL_DEPARTMENT_REGISTRY) {
      expect(mapClinicalDepartmentCodeToPrismaDepartmentCode(entry.code)).toBe(entry.code);
      expect(isClinicalDepartmentCode(entry.code)).toBe(true);
    }
  });
});
