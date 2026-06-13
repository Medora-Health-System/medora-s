import { describe, expect, it } from "vitest";
import {
  canDocumentEdTriage,
  isEdEncounterClinicalContext,
} from "./canDocumentEdTriage.js";

describe("canDocumentEdTriage (MEDUI.ED.ROLE.1A)", () => {
  it("RN/provider/admin always pass", () => {
    expect(canDocumentEdTriage({ roleCodes: ["RN"], encounterType: "INPATIENT" })).toBe(true);
    expect(canDocumentEdTriage({ roleCodes: ["PROVIDER"], encounterType: "OUTPATIENT" })).toBe(
      true
    );
    expect(canDocumentEdTriage({ roleCodes: ["ADMIN"], encounterType: "INPATIENT" })).toBe(true);
    expect(
      canDocumentEdTriage({ roleCodes: ["MEDORA_SUPER_ADMIN"], encounterType: "INPATIENT" })
    ).toBe(true);
  });

  it("LAB user in ED can document triage", () => {
    expect(
      canDocumentEdTriage({ roleCodes: ["LAB"], encounterType: "EMERGENCY" })
    ).toBe(true);
  });

  it("RADIOLOGY user in ED can document triage", () => {
    expect(
      canDocumentEdTriage({ roleCodes: ["RADIOLOGY"], encounterType: "EMERGENCY" })
    ).toBe(true);
  });

  it("LAB user outside ED cannot document triage", () => {
    expect(canDocumentEdTriage({ roleCodes: ["LAB"], encounterType: "INPATIENT" })).toBe(false);
    expect(canDocumentEdTriage({ roleCodes: ["LAB"], encounterType: "OUTPATIENT" })).toBe(false);
  });

  it("RADIOLOGY user outside ED cannot document triage", () => {
    expect(
      canDocumentEdTriage({ roleCodes: ["RADIOLOGY"], encounterType: "INPATIENT" })
    ).toBe(false);
  });

  it("billing and front desk are denied", () => {
    expect(canDocumentEdTriage({ roleCodes: ["BILLING"], encounterType: "EMERGENCY" })).toBe(
      false
    );
    expect(canDocumentEdTriage({ roleCodes: ["FRONT_DESK"], encounterType: "EMERGENCY" })).toBe(
      false
    );
  });

  it("ED context can resolve from department or unit markers", () => {
    expect(isEdEncounterClinicalContext({ departmentCode: "ED" })).toBe(true);
    expect(isEdEncounterClinicalContext({ facilityUnit: "Emergency" })).toBe(true);
    expect(isEdEncounterClinicalContext({ encounterType: "INPATIENT" })).toBe(false);
  });
});
