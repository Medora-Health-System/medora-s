import { describe, expect, it } from "vitest";
import { resolveProfessionGroup, resolveProfessionGroupFromRoleCode } from "./professionResolver.js";

describe("professionResolver (MEDUI.AUTH.ROLE.1)", () => {
  it("maps ADMIN and MEDORA_SUPER_ADMIN to ADMIN", () => {
    expect(resolveProfessionGroup({ roleCodes: ["ADMIN"] })).toBe("ADMIN");
    expect(resolveProfessionGroup({ roleCodes: ["MEDORA_SUPER_ADMIN"] })).toBe("ADMIN");
  });

  it("maps PROVIDER to PROVIDER", () => {
    expect(resolveProfessionGroup({ roleCodes: ["PROVIDER"] })).toBe("PROVIDER");
  });

  it("maps RN to RN", () => {
    expect(resolveProfessionGroup({ roleCodes: ["RN"] })).toBe("RN");
  });

  it("maps LAB, RADIOLOGY, and PATIENT_CARE_TECH to TECHNICIAN", () => {
    expect(resolveProfessionGroup({ roleCodes: ["LAB"] })).toBe("TECHNICIAN");
    expect(resolveProfessionGroup({ roleCodes: ["RADIOLOGY"] })).toBe("TECHNICIAN");
    expect(resolveProfessionGroup({ roleCodes: ["PATIENT_CARE_TECH"] })).toBe("TECHNICIAN");
  });

  it("maps PHARMACY, BILLING, FRONT_DESK", () => {
    expect(resolveProfessionGroup({ roleCodes: ["PHARMACY"] })).toBe("PHARMACY");
    expect(resolveProfessionGroup({ roleCodes: ["BILLING"] })).toBe("BILLING");
    expect(resolveProfessionGroup({ roleCodes: ["FRONT_DESK"] })).toBe("FRONT_DESK");
  });

  it("returns UNKNOWN for unrecognized roles", () => {
    expect(resolveProfessionGroup({ roleCodes: ["CUSTOM_ROLE"] })).toBe("UNKNOWN");
    expect(resolveProfessionGroup({ roleCodes: [] })).toBe("UNKNOWN");
  });

  it("respects priority ADMIN > PROVIDER > RN > TECHNICIAN", () => {
    expect(resolveProfessionGroup({ roleCodes: ["ADMIN", "PROVIDER", "RN", "LAB"] })).toBe("ADMIN");
    expect(resolveProfessionGroup({ roleCodes: ["PROVIDER", "RN", "LAB"] })).toBe("PROVIDER");
    expect(resolveProfessionGroup({ roleCodes: ["RN", "LAB"] })).toBe("RN");
  });

  it("supports capability mirrors for legacy callers", () => {
    expect(resolveProfessionGroup({ roleCodes: [], canPrescribe: true })).toBe("PROVIDER");
    expect(resolveProfessionGroup({ roleCodes: [], canAdministerMedication: true })).toBe("RN");
  });

  it("resolveProfessionGroupFromRoleCode handles single code", () => {
    expect(resolveProfessionGroupFromRoleCode("RN")).toBe("RN");
    expect(resolveProfessionGroupFromRoleCode(null)).toBe("UNKNOWN");
  });
});
