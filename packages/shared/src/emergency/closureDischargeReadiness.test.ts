import { describe, expect, it } from "vitest";
import {
  countClosureDischargeInstructionSections,
  hasClosureAdequateDischargeInstructions,
  hasClosureFollowUpDocumented,
  hasClosurePatientInstructionsExplained,
  hasClosureReturnPrecautionsDocumented,
} from "./closureDischargeReadiness.js";

const providerDischargeFixture = {
  dischargeMode: "Domicile",
  dischargeDiagnosisSummary: "Acute bronchitis",
  dischargeInstructions: "Rest and fluids",
  medicationInstructions: "Albuterol inhaler PRN",
  returnPrecautions: "Return if worsening shortness of breath",
  providerDischargeReturnWorkSchool: "May return to work in 2 days",
  providerDischargeFollowUps: [
    {
      id: "fu-1",
      specialty: "PRIMARY_CARE",
      providerOrFacility: "Dr Smith",
      timing: "Within 3 days",
      phone: "555-0100",
      address: "",
      comments: "",
    },
  ],
  providerDischargeDiagnosisDocs: [
    {
      id: "doc-1",
      code: "J20.9",
      displayName: "Acute bronchitis",
      description: "Acute bronchitis",
      diagnosisInstructions: "Rest and fluids",
      medicationTreatment: "Albuterol inhaler PRN",
      returnPrecautions: "Return if worsening shortness of breath",
      followUps: [],
    },
  ],
  patientInstructionsGiven: true,
};

describe("closureDischargeReadiness", () => {
  it("detects no discharge instructions when summary empty", () => {
    expect(hasClosureAdequateDischargeInstructions({}, false)).toBe(false);
    expect(hasClosureFollowUpDocumented({})).toBe(false);
    expect(hasClosureReturnPrecautionsDocumented({})).toBe(false);
    expect(hasClosurePatientInstructionsExplained({})).toBe(false);
  });

  it("detects diagnosis instructions from provider discharge payload", () => {
    expect(countClosureDischargeInstructionSections(providerDischargeFixture, false)).toBeGreaterThanOrEqual(2);
    expect(hasClosureAdequateDischargeInstructions(providerDischargeFixture, false)).toBe(true);
  });

  it("detects follow-up from structured provider rows", () => {
    expect(hasClosureFollowUpDocumented(providerDischargeFixture)).toBe(true);
    expect(hasClosureFollowUpDocumented({ followUp: "PCP in 1 week" })).toBe(true);
    expect(hasClosureFollowUpDocumented({ followUpInstructions: "Cardiology in 48h" })).toBe(true);
  });

  it("detects return precautions from provider and legacy fields", () => {
    expect(hasClosureReturnPrecautionsDocumented(providerDischargeFixture)).toBe(true);
    expect(hasClosureReturnPrecautionsDocumented({ returnIfWorse: "Chest pain" })).toBe(true);
  });

  it("detects patient instructions explained checkbox", () => {
    expect(hasClosurePatientInstructionsExplained(providerDischargeFixture)).toBe(true);
    expect(hasClosurePatientInstructionsExplained({ patientInstructionsGiven: false })).toBe(false);
  });

  it("requires medication section only when medication orders exist", () => {
    const minimal = {
      dischargeDiagnosisSummary: "Test",
      dischargeInstructions: "Instructions",
    };
    expect(hasClosureAdequateDischargeInstructions(minimal, false)).toBe(true);
    expect(hasClosureAdequateDischargeInstructions({ dischargeDiagnosisSummary: "Only one" }, false)).toBe(false);
  });
});
