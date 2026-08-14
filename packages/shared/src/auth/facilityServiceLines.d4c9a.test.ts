import { describe, expect, it } from "vitest";
import {
  assertServiceLinePrismaDepartmentMapping,
  FACILITY_SERVICE_LINE_DEPARTMENT_MAPPING_INVALID,
  isPrismaDepartmentCodeToken,
  listAllMedoraServiceLinesForProvisioning,
  mapServiceLineToPrismaDepartmentCodes,
  PRISMA_DEPARTMENT_CODE_TOKENS,
  type MedoraServiceLine,
  type PrismaDepartmentCodeToken,
} from "./facilityServiceLines.js";

const EXPECTED_MATRIX: Record<MedoraServiceLine, readonly PrismaDepartmentCodeToken[]> = {
  CLINIC: ["PRIMARY_CARE"],
  URGENT_CARE: ["PRIMARY_CARE"],
  DENTAL: ["DENTAL"],
  EMERGENCY: ["EMERGENCY"],
  ICU: ["ICU"],
  MEDSURG: ["MEDSURG"],
  OBSERVATION: ["OBSERVATION"],
  OBGYN: ["OBGYN"],
  PEDIATRICS: ["PEDIATRICS"],
  BEHAVIORAL_HEALTH: ["BEHAVIORAL_HEALTH"],
  TELEMETRY: ["TELEMETRY"],
  LABORATORY: ["LABORATORY"],
  RADIOLOGY: ["RADIOLOGY"],
  PHARMACY: ["PHARM"],
};

describe("MEDUI.D4C.9A service-line → Prisma DepartmentCode contract", () => {
  it("maps DENTAL to DENTAL only (not PRIMARY_CARE, not specialties)", () => {
    expect(mapServiceLineToPrismaDepartmentCodes("DENTAL")).toEqual(["DENTAL"]);
    expect(mapServiceLineToPrismaDepartmentCodes("DENTAL")).not.toContain("PRIMARY_CARE");
    expect(mapServiceLineToPrismaDepartmentCodes("DENTAL")).not.toContain("ORTHODONTICS");
  });

  it("covers every MedoraServiceLine with Prisma-supported tokens only", () => {
    const lines = listAllMedoraServiceLinesForProvisioning();
    expect(lines.length).toBe(Object.keys(EXPECTED_MATRIX).length);
    for (const line of lines) {
      const codes = assertServiceLinePrismaDepartmentMapping(line);
      expect(codes).toEqual(EXPECTED_MATRIX[line]);
      for (const code of codes) {
        expect(isPrismaDepartmentCodeToken(code)).toBe(true);
        expect(PRISMA_DEPARTMENT_CODE_TOKENS).toContain(code);
      }
    }
  });

  it("never uses unchecked fallthrough string identity for Clinic/UC/Pharmacy", () => {
    expect(mapServiceLineToPrismaDepartmentCodes("CLINIC")).toEqual(["PRIMARY_CARE"]);
    expect(mapServiceLineToPrismaDepartmentCodes("URGENT_CARE")).toEqual(["PRIMARY_CARE"]);
    expect(mapServiceLineToPrismaDepartmentCodes("PHARMACY")).toEqual(["PHARM"]);
  });

  it("exports typed conflict code for API defense-in-depth", () => {
    expect(FACILITY_SERVICE_LINE_DEPARTMENT_MAPPING_INVALID).toBe(
      "FACILITY_SERVICE_LINE_DEPARTMENT_MAPPING_INVALID"
    );
  });
});
